"""HOOPS AI - Billing Service (PaymentPlan + Installments + OneTimeCharges)"""
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.billing_repository import (
    PaymentPlanRepository, InstallmentRepository, OneTimeChargeRepository,
)
from src.repositories.team_repository import TeamRepository
from src.models.team_member import TeamMember
from src.models.player import Player


class BillingService:
    def __init__(self, session: AsyncSession):
        self.plan_repo = PaymentPlanRepository(session)
        self.inst_repo = InstallmentRepository(session)
        self.charge_repo = OneTimeChargeRepository(session)
        self.team_repo = TeamRepository(session)
        self.session = session

    # ── helpers ──────────────────────────────────────────────────────────────

    async def _assert_team_owned(self, admin_id: int, team_id: int):
        team = await self.team_repo.get_by_id(team_id)
        if not team or team.created_by_admin_id != admin_id:
            raise ValueError("Team not found or not authorized")
        return team

    async def _get_active_player_ids(self, team_id: int) -> list[int]:
        result = await self.session.execute(
            select(TeamMember.player_id)
            .where(
                TeamMember.team_id == team_id,
                TeamMember.role_in_team == "player",
                TeamMember.player_id.isnot(None),
                TeamMember.is_active == True,
            )
        )
        return [row[0] for row in result.all()]

    def _generate_installment_dates(self, start_month: str, billing_day: int, num: int) -> list[date]:
        """Generate N due_date values starting from start_month."""
        year, month = int(start_month[:4]), int(start_month[5:7])
        day = min(billing_day, 28)
        dates = []
        for i in range(num):
            m = month + i
            y = year + (m - 1) // 12
            m = (m - 1) % 12 + 1
            dates.append(date(y, m, day))
        return dates

    async def _get_parent_player_ids(self, parent_user_id: int) -> list[int]:
        result = await self.session.execute(
            select(TeamMember.player_id)
            .where(
                TeamMember.user_id == parent_user_id,
                TeamMember.role_in_team == "parent",
                TeamMember.player_id.isnot(None),
            )
        )
        return [row[0] for row in result.all()]

    # ── Payment Plans ─────────────────────────────────────────────────────

    async def create_plan_for_team(
        self,
        admin_id: int,
        team_id: int,
        season: str,
        total_amount: float,
        num_installments: int,
        billing_day: int,
        start_month: str,
        payment_method: str = "credit_card",
        description: str | None = None,
    ) -> dict:
        """Create PaymentPlan + Installments for every active player in the team.
        Returns how many plans were created (skips players who already have a plan for this season)."""
        await self._assert_team_owned(admin_id, team_id)

        player_ids = await self._get_active_player_ids(team_id)
        if not player_ids:
            raise ValueError("No active players in team")

        due_dates = self._generate_installment_dates(start_month, billing_day, num_installments)
        installment_amount = round(total_amount / num_installments, 2)

        created = 0
        for pid in player_ids:
            if await self.plan_repo.exists_for_player_season(pid, team_id, season):
                continue

            plan = await self.plan_repo.create(
                player_id=pid,
                team_id=team_id,
                created_by_admin_id=admin_id,
                season=season,
                total_amount=total_amount,
                num_installments=num_installments,
                billing_day=billing_day,
                start_month=start_month,
                payment_method=payment_method,
                description=description,
                is_active=True,
            )

            for i, due in enumerate(due_dates, start=1):
                await self.inst_repo.create(
                    plan_id=plan.id,
                    player_id=pid,
                    team_id=team_id,
                    installment_number=i,
                    amount=installment_amount,
                    due_date=due,
                    status="pending",
                )
            created += 1

        await self.session.commit()
        return {"created": created, "skipped": len(player_ids) - created}

    async def adjust_player_plan(
        self,
        admin_id: int,
        plan_id: int,
        new_total_amount: float,
    ) -> dict:
        """Adjust a specific player's plan total (e.g., discount).
        Updates all unpaid installments proportionally."""
        plan = await self.plan_repo.get_by_id(plan_id)
        if not plan:
            raise ValueError("Plan not found")
        await self._assert_team_owned(admin_id, plan.team_id)

        await self.plan_repo.update(plan_id, total_amount=new_total_amount)

        installments = plan.installments
        new_amount = round(new_total_amount / len(installments), 2)
        for inst in installments:
            if inst.status != "paid":
                await self.inst_repo.update(inst.id, amount=new_amount)

        await self.session.commit()
        return {"plan_id": plan_id, "new_total": new_total_amount}

    async def cancel_plan(self, admin_id: int, plan_id: int) -> bool:
        plan = await self.plan_repo.get_by_id(plan_id)
        if not plan:
            raise ValueError("Plan not found")
        await self._assert_team_owned(admin_id, plan.team_id)
        result = await self.plan_repo.deactivate(plan_id)
        await self.session.commit()
        return result

    # ── Installments ──────────────────────────────────────────────────────

    async def mark_installment_paid(
        self,
        admin_id: int,
        installment_id: int,
        paid_date: str | None = None,
        payment_method: str | None = None,
        notes: str | None = None,
    ) -> dict:
        inst = await self.inst_repo.get_by_id(installment_id)
        if not inst:
            raise ValueError("Installment not found")
        await self._assert_team_owned(admin_id, inst.team_id)
        if inst.status == "paid":
            raise ValueError("Already paid")

        actual_date = date.fromisoformat(paid_date) if paid_date else date.today()
        await self.inst_repo.update(
            installment_id,
            status="paid",
            paid_date=actual_date,
            payment_method=payment_method,
            notes=notes,
            marked_by_admin_id=admin_id,
        )
        await self.session.commit()
        return {"installment_id": installment_id, "status": "paid"}

    async def check_overdue(self) -> dict:
        """Background task — marks pending installments + one-time charges past due."""
        inst_count = await self.inst_repo.mark_all_overdue()
        charge_count = await self.charge_repo.mark_all_overdue()
        await self.session.commit()
        return {"installments_updated": inst_count, "charges_updated": charge_count}

    # ── One-Time Charges ──────────────────────────────────────────────────

    async def create_one_time_charge(
        self,
        admin_id: int,
        team_id: int,
        title: str,
        amount: float,
        due_date: str | None = None,
        player_ids: list[int] | None = None,
        description: str | None = None,
    ) -> int:
        """Create one-time charge for all active players or specific players.
        Returns count of charges created."""
        await self._assert_team_owned(admin_id, team_id)

        targets = player_ids if player_ids else await self._get_active_player_ids(team_id)
        if not targets:
            raise ValueError("No target players found")

        parsed_due = date.fromisoformat(due_date) if due_date else None
        for pid in targets:
            await self.charge_repo.create(
                player_id=pid,
                team_id=team_id,
                created_by_admin_id=admin_id,
                title=title,
                description=description,
                amount=amount,
                due_date=parsed_due,
                status="pending",
            )

        await self.session.commit()
        return len(targets)

    async def mark_charge_paid(
        self,
        admin_id: int,
        charge_id: int,
        paid_date: str | None = None,
        payment_method: str | None = None,
        notes: str | None = None,
    ) -> dict:
        charge = await self.charge_repo.get_by_id(charge_id)
        if not charge:
            raise ValueError("Charge not found")
        await self._assert_team_owned(admin_id, charge.team_id)
        if charge.status == "paid":
            raise ValueError("Already paid")

        actual_date = date.fromisoformat(paid_date) if paid_date else date.today()
        await self.charge_repo.update(
            charge_id,
            status="paid",
            paid_date=actual_date,
            payment_method=payment_method,
            notes=notes,
            marked_by_admin_id=admin_id,
        )
        await self.session.commit()
        return {"charge_id": charge_id, "status": "paid"}

    async def cancel_charge(self, admin_id: int, charge_id: int) -> bool:
        charge = await self.charge_repo.get_by_id(charge_id)
        if not charge:
            raise ValueError("Charge not found")
        await self._assert_team_owned(admin_id, charge.team_id)
        await self.charge_repo.update(charge_id, status="cancelled")
        await self.session.commit()
        return True

    async def delete_charge(self, admin_id: int, charge_id: int) -> bool:
        charge = await self.charge_repo.get_by_id(charge_id)
        if not charge:
            raise ValueError("Charge not found")
        await self._assert_team_owned(admin_id, charge.team_id)
        result = await self.charge_repo.delete(charge_id)
        await self.session.commit()
        return result

    # ── Overview & Reminders ──────────────────────────────────────────────

    async def get_overview(self, admin_id: int, team_id: int | None = None) -> dict:
        """Summary stats for admin dashboard. Aggregated across all teams or one team."""
        plans = await self.plan_repo.get_by_admin(admin_id)
        charges = await self.charge_repo.get_by_admin(admin_id, team_id=team_id)

        if team_id:
            plans = [p for p in plans if p.team_id == team_id]

        total_expected = sum(float(p.total_amount) for p in plans)
        total_paid = 0.0
        total_pending = 0.0
        total_overdue = 0.0

        for p in plans:
            for inst in p.installments:
                amt = float(inst.amount)
                if inst.status == "paid":
                    total_paid += amt
                elif inst.status == "overdue":
                    total_overdue += amt
                else:
                    total_pending += amt

        for c in charges:
            if team_id and c.team_id != team_id:
                continue
            amt = float(c.amount)
            if c.status == "paid":
                total_paid += amt
            elif c.status == "overdue":
                total_overdue += amt
            elif c.status == "pending":
                total_pending += amt

        collection_rate = round(total_paid / total_expected * 100) if total_expected > 0 else 0
        return {
            "total_expected": total_expected,
            "total_charged": total_expected,   # alias used by financial_agent
            "total_paid": total_paid,
            "total_pending": total_pending,
            "total_overdue": total_overdue,
            "collection_rate": collection_rate,
        }

    async def get_team_billing_detail(self, admin_id: int, team_id: int, season: str | None = None) -> list[dict]:
        """Returns per-player billing summary for admin team view."""
        await self._assert_team_owned(admin_id, team_id)

        plans = await self.plan_repo.get_by_team(team_id, season=season)
        one_time = await self.charge_repo.get_by_team(team_id)

        charges_by_player: dict[int, list] = {}
        for c in one_time:
            charges_by_player.setdefault(c.player_id, []).append(c)

        rows = []
        for plan in plans:
            installments = plan.installments
            paid_count = sum(1 for i in installments if i.status == "paid")
            paid_amount = sum(float(i.amount) for i in installments if i.status == "paid")
            overdue_count = sum(1 for i in installments if i.status == "overdue")
            player_charges = charges_by_player.get(plan.player_id, [])

            # Overall status
            if paid_count == len(installments) and all(c.status == "paid" or c.status == "cancelled" for c in player_charges):
                status = "paid"
            elif overdue_count > 0 or any(c.status == "overdue" for c in player_charges):
                status = "overdue"
            elif paid_count > 0:
                status = "partial"
            else:
                status = "pending"

            rows.append({
                "plan_id": plan.id,
                "player_id": plan.player_id,
                "player_name": plan.player.name if plan.player else "",
                "season": plan.season,
                "total_amount": float(plan.total_amount),
                "paid_amount": paid_amount,
                "balance": float(plan.total_amount) - paid_amount,
                "paid_count": paid_count,
                "total_count": len(installments),
                "payment_method": plan.payment_method,
                "status": status,
                "installments": [
                    {
                        "id": i.id,
                        "number": i.installment_number,
                        "amount": float(i.amount),
                        "due_date": i.due_date.isoformat() if i.due_date else None,
                        "status": i.status,
                        "paid_date": i.paid_date.isoformat() if i.paid_date else None,
                        "payment_method": i.payment_method,
                    }
                    for i in installments
                ],
                "one_time_charges": [
                    {
                        "id": c.id,
                        "title": c.title,
                        "amount": float(c.amount),
                        "due_date": c.due_date.isoformat() if c.due_date else None,
                        "status": c.status,
                        "paid_date": c.paid_date.isoformat() if c.paid_date else None,
                    }
                    for c in player_charges
                ],
            })

        # Players with only one-time charges (no plan)
        plan_player_ids = {p.player_id for p in plans}
        for pid, player_charges in charges_by_player.items():
            if pid in plan_player_ids:
                continue
            # get player name
            player = await self.session.get(Player, pid)
            rows.append({
                "plan_id": None,
                "player_id": pid,
                "player_name": player.name if player else str(pid),
                "season": season,
                "total_amount": 0,
                "paid_amount": sum(float(c.amount) for c in player_charges if c.status == "paid"),
                "balance": sum(float(c.amount) for c in player_charges if c.status != "paid" and c.status != "cancelled"),
                "paid_count": 0,
                "total_count": 0,
                "payment_method": None,
                "status": "overdue" if any(c.status == "overdue" for c in player_charges) else "pending",
                "installments": [],
                "one_time_charges": [
                    {
                        "id": c.id,
                        "title": c.title,
                        "amount": float(c.amount),
                        "due_date": c.due_date.isoformat() if c.due_date else None,
                        "status": c.status,
                        "paid_date": c.paid_date.isoformat() if c.paid_date else None,
                    }
                    for c in player_charges
                ],
            })

        rows.sort(key=lambda r: r["player_name"])
        return rows

    async def get_unpaid_players(self, admin_id: int, team_id: int) -> list[dict]:
        """Return players with unpaid/overdue installments or charges — for reminder preview."""
        await self._assert_team_owned(admin_id, team_id)

        rows = await self.get_team_billing_detail(admin_id, team_id)
        return [r for r in rows if r["status"] in ("pending", "overdue", "partial")]

    async def send_reminders(self, admin_id: int, team_id: int) -> int:
        """Send a payment reminder message to parents of all unpaid players.
        Returns number of messages sent."""
        await self._assert_team_owned(admin_id, team_id)

        unpaid_rows = await self.get_unpaid_players(admin_id, team_id)
        unpaid_player_ids = {r["player_id"] for r in unpaid_rows}
        if not unpaid_player_ids:
            return 0

        # Find parent user_ids for these players
        result = await self.session.execute(
            select(TeamMember.user_id, TeamMember.player_id)
            .where(
                TeamMember.team_id == team_id,
                TeamMember.role_in_team == "parent",
                TeamMember.player_id.in_(unpaid_player_ids),
                TeamMember.is_active == True,
            )
        )
        parent_rows = result.all()

        if not parent_rows:
            return 0

        # Build player_id → name map
        player_map = {r["player_id"]: r["player_name"] for r in unpaid_rows}

        # Import here to avoid circular deps
        from src.models.club_message import ClubMessage
        from src.models.message_recipient import MessageRecipient

        sent = 0
        for parent_user_id, player_id in parent_rows:
            player_name = player_map.get(player_id, "")
            player_row = next((r for r in unpaid_rows if r["player_id"] == player_id), None)
            if not player_row:
                continue
            balance = player_row["balance"]
            body = (
                f"תזכורת לתשלום עבור {player_name}.\n"
                f"יתרה לתשלום: ₪{balance:,.0f}.\n"
                f"אנא צרו קשר עם מנהל המועדון לתיאום תשלום."
            )
            msg = ClubMessage(
                sender_id=admin_id,
                sender_role="admin",
                subject="תזכורת לתשלום",
                body=body,
                message_type="general",
                target_type="individual",
                target_user_id=parent_user_id,
                is_sent=True,
            )
            self.session.add(msg)
            await self.session.flush()
            recipient = MessageRecipient(message_id=msg.id, user_id=parent_user_id)
            self.session.add(recipient)
            sent += 1

        await self.session.commit()
        return sent

    # ── Parent view ───────────────────────────────────────────────────────

    async def get_parent_billing(self, parent_user_id: int) -> dict:
        """Return payment plans (with installments) and one-time charges for parent's child."""
        player_ids = await self._get_parent_player_ids(parent_user_id)
        if not player_ids:
            return {"plans": [], "one_time_charges": [], "summary": {}}

        # Assume single child (take first)
        player_id = player_ids[0]

        plans = await self.plan_repo.get_by_player(player_id)
        one_time = await self.charge_repo.get_by_player(player_id)

        total_expected = sum(float(p.total_amount) for p in plans)
        total_paid = 0.0
        total_pending = 0.0
        total_overdue = 0.0

        plan_data = []
        for plan in plans:
            installments = plan.installments
            paid_amount = sum(float(i.amount) for i in installments if i.status == "paid")
            pending_amount = sum(float(i.amount) for i in installments if i.status == "pending")
            overdue_amount = sum(float(i.amount) for i in installments if i.status == "overdue")
            total_paid += paid_amount
            total_pending += pending_amount
            total_overdue += overdue_amount

            plan_data.append({
                "plan_id": plan.id,
                "season": plan.season,
                "total_amount": float(plan.total_amount),
                "num_installments": plan.num_installments,
                "billing_day": plan.billing_day,
                "payment_method": plan.payment_method,
                "description": plan.description,
                "team_name": plan.team.name if plan.team else "",
                "paid_amount": paid_amount,
                "balance": float(plan.total_amount) - paid_amount,
                "installments": [
                    {
                        "id": i.id,
                        "number": i.installment_number,
                        "amount": float(i.amount),
                        "due_date": i.due_date.isoformat() if i.due_date else None,
                        "status": i.status,
                        "paid_date": i.paid_date.isoformat() if i.paid_date else None,
                    }
                    for i in installments
                ],
            })

        charge_data = []
        for c in one_time:
            amt = float(c.amount)
            if c.status == "paid":
                total_paid += amt
            elif c.status == "overdue":
                total_overdue += amt
            elif c.status == "pending":
                total_pending += amt
            charge_data.append({
                "id": c.id,
                "title": c.title,
                "amount": amt,
                "due_date": c.due_date.isoformat() if c.due_date else None,
                "status": c.status,
                "paid_date": c.paid_date.isoformat() if c.paid_date else None,
            })

        return {
            "plans": plan_data,
            "one_time_charges": charge_data,
            "summary": {
                "total_expected": total_expected,
                "total_paid": total_paid,
                "total_pending": total_pending,
                "total_overdue": total_overdue,
            },
        }
