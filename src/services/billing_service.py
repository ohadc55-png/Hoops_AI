"""HOOPS AI - Billing Service (PaymentPlan + Installments + OneTimeCharges)

Delegates plan creation/management to PaymentPlanService and
one-time charge CRUD to ChargeService while keeping the same public API.
"""
import logging
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.utils.exceptions import AppError, ValidationError, ForbiddenError, NotFoundError, ConflictError

from src.repositories.billing_repository import (
    PaymentPlanRepository, InstallmentRepository, OneTimeChargeRepository,
)
from src.repositories.team_repository import TeamRepository
from src.models.team_member import TeamMember
from src.models.player import Player

from src.services.payment_plan_service import PaymentPlanService
from src.services.charge_service import ChargeService

logger = logging.getLogger(__name__)


class BillingService:
    def __init__(self, session: AsyncSession):
        self.plan_repo = PaymentPlanRepository(session)
        self.inst_repo = InstallmentRepository(session)
        self.charge_repo = OneTimeChargeRepository(session)
        self.team_repo = TeamRepository(session)
        self.session = session
        # Sub-services
        self._plan_svc = PaymentPlanService(session)
        self._charge_svc = ChargeService(session)

    # ── helpers ──────────────────────────────────────────────────────────────

    async def _assert_team_owned(self, admin_id: int, team_id: int):
        team = await self.team_repo.get_by_id(team_id)
        if not team or team.created_by_admin_id != admin_id:
            raise ForbiddenError("Team not found or not authorized")
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

    # ── Payment Plans (delegated to PaymentPlanService) ──────────────────

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
        return await self._plan_svc.create_plan_for_team(
            admin_id, team_id, season, total_amount,
            num_installments, billing_day, start_month,
            payment_method, description,
        )

    async def create_plan_for_all_teams(
        self,
        admin_id: int,
        season: str,
        total_amount: float,
        num_installments: int,
        billing_day: int,
        start_month: str,
        payment_method: str = "credit_card",
        description: str | None = None,
    ) -> dict:
        return await self._plan_svc.create_plan_for_all_teams(
            admin_id, season, total_amount,
            num_installments, billing_day, start_month,
            payment_method, description,
        )

    async def adjust_player_plan(
        self,
        admin_id: int,
        plan_id: int,
        new_total_amount: float,
    ) -> dict:
        return await self._plan_svc.adjust_player_plan(admin_id, plan_id, new_total_amount)

    async def cancel_plan(self, admin_id: int, plan_id: int) -> bool:
        return await self._plan_svc.cancel_plan(admin_id, plan_id)

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
            raise NotFoundError("Installment", installment_id)
        await self._assert_team_owned(admin_id, inst.team_id)
        if inst.status == "paid":
            raise ConflictError("Already paid")

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

    # ── One-Time Charges (delegated to ChargeService) ───────────────────

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
        return await self._charge_svc.create_one_time_charge(
            admin_id, team_id, title, amount, due_date, player_ids, description,
        )

    async def create_charge_for_all_teams(
        self,
        admin_id: int,
        title: str,
        amount: float,
        due_date: str | None = None,
        description: str | None = None,
    ) -> int:
        return await self._charge_svc.create_charge_for_all_teams(
            admin_id, title, amount, due_date, description,
        )

    async def mark_charge_paid(
        self,
        admin_id: int,
        charge_id: int,
        paid_date: str | None = None,
        payment_method: str | None = None,
        notes: str | None = None,
    ) -> dict:
        return await self._charge_svc.mark_charge_paid(
            admin_id, charge_id, paid_date, payment_method, notes,
        )

    async def cancel_charge(self, admin_id: int, charge_id: int) -> bool:
        return await self._charge_svc.cancel_charge(admin_id, charge_id)

    async def delete_charge(self, admin_id: int, charge_id: int) -> bool:
        return await self._charge_svc.delete_charge(admin_id, charge_id)

    # ── Overview & Reminders ──────────────────────────────────────────────

    async def get_overview(self, admin_id: int, team_id: int | None = None) -> dict:
        """Summary stats for admin dashboard. Aggregated across all teams or one team."""
        plans = await self.plan_repo.get_by_admin(admin_id)
        charges = await self.charge_repo.get_by_admin(admin_id, team_id=team_id)

        if team_id:
            plans = [p for p in plans if p.team_id == team_id]

        total_expected = 0.0
        total_paid = 0.0
        total_pending = 0.0
        total_overdue = 0.0

        # Calculate from actual installment amounts (not plan.total_amount)
        # so that total_expected always equals paid + pending + overdue
        for p in plans:
            for inst in p.installments:
                amt = float(inst.amount)
                total_expected += amt
                if inst.status == "paid":
                    total_paid += amt
                elif inst.status == "overdue":
                    total_overdue += amt
                else:
                    total_pending += amt

        for c in charges:
            if team_id and c.team_id != team_id:
                continue
            if c.status == "cancelled":
                continue
            amt = float(c.amount)
            total_expected += amt
            if c.status == "paid":
                total_paid += amt
            elif c.status == "overdue":
                total_overdue += amt
            else:
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
        """Returns per-player billing summary for admin team view.
        Groups all plans per player into a single row."""
        await self._assert_team_owned(admin_id, team_id)

        plans = await self.plan_repo.get_by_team(team_id, season=season)
        one_time = await self.charge_repo.get_by_team(team_id)

        charges_by_player: dict[int, list] = {}
        for c in one_time:
            charges_by_player.setdefault(c.player_id, []).append(c)

        # Group plans by player
        plans_by_player: dict[int, list] = {}
        for plan in plans:
            plans_by_player.setdefault(plan.player_id, []).append(plan)

        rows = []
        for pid, player_plans in plans_by_player.items():
            all_installments = []
            total_paid_count = 0
            total_inst_count = 0
            total_paid_amount = 0.0
            total_amount = 0.0
            total_overdue = 0
            player_name = ""
            plan_details = []

            for plan in player_plans:
                installments = plan.installments
                paid_count = sum(1 for i in installments if i.status == "paid")
                paid_amount = sum(float(i.amount) for i in installments if i.status == "paid")
                overdue_count = sum(1 for i in installments if i.status == "overdue")

                total_paid_count += paid_count
                total_inst_count += len(installments)
                total_paid_amount += paid_amount
                total_amount += float(plan.total_amount)
                total_overdue += overdue_count
                player_name = plan.player.name if plan.player else ""

                plan_details.append({
                    "plan_id": plan.id,
                    "season": plan.season,
                    "total_amount": float(plan.total_amount),
                    "payment_method": plan.payment_method,
                })

                for i in installments:
                    label = f" ({plan.season})" if len(player_plans) > 1 and plan.season else ""
                    all_installments.append({
                        "id": i.id,
                        "number": i.installment_number,
                        "amount": float(i.amount),
                        "due_date": i.due_date.isoformat() if i.due_date else None,
                        "status": i.status,
                        "paid_date": i.paid_date.isoformat() if i.paid_date else None,
                        "payment_method": i.payment_method,
                        "season": plan.season or "",
                    })

            player_charges = charges_by_player.get(pid, [])

            # Overall status
            if total_paid_count == total_inst_count and all(
                c.status in ("paid", "cancelled") for c in player_charges
            ):
                status = "paid"
            elif total_overdue > 0 or any(c.status == "overdue" for c in player_charges):
                status = "overdue"
            elif total_paid_count > 0:
                status = "partial"
            else:
                status = "pending"

            rows.append({
                "plan_id": player_plans[0].id,
                "player_id": pid,
                "player_name": player_name,
                "season": player_plans[0].season if len(player_plans) == 1 else ", ".join(
                    p.season for p in player_plans if p.season
                ),
                "total_amount": total_amount,
                "paid_amount": total_paid_amount,
                "balance": total_amount - total_paid_amount,
                "paid_count": total_paid_count,
                "total_count": total_inst_count,
                "payment_method": player_plans[0].payment_method,
                "status": status,
                "plans": plan_details,
                "installments": all_installments,
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
        plan_player_ids = set(plans_by_player.keys())
        for pid, player_charges in charges_by_player.items():
            if pid in plan_player_ids:
                continue
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
                "plans": [],
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

        total_expected = 0.0
        total_paid = 0.0
        total_pending = 0.0
        total_overdue = 0.0

        plan_data = []
        for plan in plans:
            installments = plan.installments
            paid_amount = sum(float(i.amount) for i in installments if i.status == "paid")
            pending_amount = sum(float(i.amount) for i in installments if i.status == "pending")
            overdue_amount = sum(float(i.amount) for i in installments if i.status == "overdue")
            total_expected += paid_amount + pending_amount + overdue_amount
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
                        "notes": i.notes,
                    }
                    for i in installments
                ],
            })

        charge_data = []
        for c in one_time:
            amt = float(c.amount)
            if c.status != "cancelled":
                total_expected += amt
                if c.status == "paid":
                    total_paid += amt
                elif c.status == "overdue":
                    total_overdue += amt
                else:
                    total_pending += amt
            charge_data.append({
                "id": c.id,
                "title": c.title,
                "amount": amt,
                "due_date": c.due_date.isoformat() if c.due_date else None,
                "status": c.status,
                "paid_date": c.paid_date.isoformat() if c.paid_date else None,
                "notes": c.notes,
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

    # ── Parent Payment ─────────────────────────────────────────────────────

    async def parent_pay_plan(
        self,
        parent_user_id: int,
        plan_id: int,
        payment_details: dict,
    ) -> dict:
        """Parent pays entire plan balance (mock — marks all unpaid installments as paid)."""
        from src.models.payment_plan import PaymentPlan
        from sqlalchemy.orm import selectinload

        result = await self.session.execute(
            select(PaymentPlan)
            .options(selectinload(PaymentPlan.installments))
            .where(PaymentPlan.id == plan_id)
        )
        plan = result.scalar_one_or_none()
        if not plan:
            raise NotFoundError("Plan", plan_id)

        # Verify parent owns this player
        player_ids = await self._get_parent_player_ids(parent_user_id)
        if plan.player_id not in player_ids:
            raise ForbiddenError("Not authorized")

        # Find all unpaid installments
        unpaid = [i for i in plan.installments if i.status != "paid"]
        if not unpaid:
            raise ConflictError("Already fully paid")

        card_last4 = payment_details.get("card_number", "")[-4:]
        num_payments = payment_details.get("num_payments", 1)
        cardholder = payment_details.get("cardholder_name", "")

        notes = f"כרטיס אשראי ****{card_last4}"
        if num_payments > 1:
            notes += f" ({num_payments} תשלומים)"
        if cardholder:
            notes += f" — {cardholder}"

        total_paid = 0.0
        for inst in unpaid:
            await self.inst_repo.update(
                inst.id,
                status="paid",
                paid_date=date.today(),
                payment_method="credit_card",
                notes=notes,
                admin_acknowledged=False,
            )
            total_paid += float(inst.amount)

        # Send receipt to parent (admin sees it via new-payments badge)
        player = await self.session.get(Player, plan.player_id)
        description = plan.season or plan.description or f"תוכנית #{plan.id}"
        if player:
            description += f" — {player.name}"

        await self._send_payment_receipt_message(
            parent_user_id, total_paid, description, card_last4, plan.team_id,
            receipt_type="plan", item_id=plan_id,
        )

        await self.session.commit()
        return {"plan_id": plan_id, "status": "paid", "amount_paid": total_paid}

    async def parent_pay_installment(
        self,
        parent_user_id: int,
        installment_id: int,
        payment_details: dict,
    ) -> dict:
        """Parent pays an installment (mock — no real charge, marks as paid)."""
        inst = await self.inst_repo.get_by_id(installment_id)
        if not inst:
            raise NotFoundError("Installment", installment_id)
        if inst.status == "paid":
            raise ConflictError("Already paid")

        # Verify parent owns this player
        player_ids = await self._get_parent_player_ids(parent_user_id)
        if inst.player_id not in player_ids:
            raise ForbiddenError("Not authorized")

        card_last4 = payment_details.get("card_number", "")[-4:]
        num_payments = payment_details.get("num_payments", 1)
        cardholder = payment_details.get("cardholder_name", "")

        notes = f"כרטיס אשראי ****{card_last4}"
        if num_payments > 1:
            notes += f" ({num_payments} תשלומים)"
        if cardholder:
            notes += f" — {cardholder}"

        await self.inst_repo.update(
            installment_id,
            status="paid",
            paid_date=date.today(),
            payment_method="credit_card",
            notes=notes,
            admin_acknowledged=False,
        )

        # Send receipt + notify admin
        player = await self.session.get(Player, inst.player_id)
        description = f"תשלום {inst.installment_number}/{inst.plan_id}"
        if player:
            description = f"תשלום {inst.installment_number} — {player.name}"

        await self._send_payment_receipt_message(
            parent_user_id, float(inst.amount), description, card_last4, inst.team_id,
            receipt_type="plan", item_id=inst.plan_id,
        )

        await self.session.commit()
        return {"installment_id": installment_id, "status": "paid"}

    async def parent_pay_charge(
        self,
        parent_user_id: int,
        charge_id: int,
        payment_details: dict,
    ) -> dict:
        """Parent pays a one-time charge (mock — no real charge, marks as paid)."""
        charge = await self.charge_repo.get_by_id(charge_id)
        if not charge:
            raise NotFoundError("Charge", charge_id)
        if charge.status == "paid":
            raise ConflictError("Already paid")

        player_ids = await self._get_parent_player_ids(parent_user_id)
        if charge.player_id not in player_ids:
            raise ForbiddenError("Not authorized")

        card_last4 = payment_details.get("card_number", "")[-4:]
        num_payments = payment_details.get("num_payments", 1)
        cardholder = payment_details.get("cardholder_name", "")

        notes = f"כרטיס אשראי ****{card_last4}"
        if num_payments > 1:
            notes += f" ({num_payments} תשלומים)"
        if cardholder:
            notes += f" — {cardholder}"

        await self.charge_repo.update(
            charge_id,
            status="paid",
            paid_date=date.today(),
            payment_method="credit_card",
            notes=notes,
            admin_acknowledged=False,
        )

        player = await self.session.get(Player, charge.player_id)
        description = charge.title
        if player:
            description = f"{charge.title} — {player.name}"

        await self._send_payment_receipt_message(
            parent_user_id, float(charge.amount), description, card_last4, charge.team_id,
            receipt_type="charge", item_id=charge_id,
        )

        await self.session.commit()
        return {"charge_id": charge_id, "status": "paid"}

    # ── New Payments (admin acknowledgement) ─────────────────────────────────

    async def get_new_payments(self, admin_id: int) -> list[dict]:
        """Get all paid items not yet acknowledged by admin."""
        from src.models.installment import Installment
        from src.models.one_time_charge import OneTimeCharge
        from src.models.team import Team
        from sqlalchemy.orm import selectinload

        # Get admin's team IDs
        teams = await self.team_repo.get_by_admin_id(admin_id)
        team_ids = [t.id for t in teams]
        if not team_ids:
            return []

        items = []

        # Unacknowledged installments
        result = await self.session.execute(
            select(Installment)
            .options(selectinload(Installment.player), selectinload(Installment.team))
            .where(
                Installment.team_id.in_(team_ids),
                Installment.status == "paid",
                Installment.admin_acknowledged == False,
            )
            .order_by(Installment.paid_date.desc())
        )
        for inst in result.scalars().all():
            items.append({
                "id": inst.id,
                "type": "installment",
                "player_name": inst.player.name if inst.player else "",
                "team_name": inst.team.name if inst.team else "",
                "amount": float(inst.amount),
                "paid_date": inst.paid_date.isoformat() if inst.paid_date else "",
                "description": inst.notes or f"תשלום {inst.installment_number}",
            })

        # Unacknowledged charges
        result = await self.session.execute(
            select(OneTimeCharge)
            .options(selectinload(OneTimeCharge.player), selectinload(OneTimeCharge.team))
            .where(
                OneTimeCharge.team_id.in_(team_ids),
                OneTimeCharge.status == "paid",
                OneTimeCharge.admin_acknowledged == False,
            )
            .order_by(OneTimeCharge.paid_date.desc())
        )
        for c in result.scalars().all():
            items.append({
                "id": c.id,
                "type": "charge",
                "player_name": c.player.name if c.player else "",
                "team_name": c.team.name if c.team else "",
                "amount": float(c.amount),
                "paid_date": c.paid_date.isoformat() if c.paid_date else "",
                "description": c.title,
            })

        return items

    async def acknowledge_payment(self, admin_id: int, item_type: str, item_id: int) -> bool:
        """Mark a single payment as acknowledged by admin."""
        if item_type == "installment":
            await self.inst_repo.update(item_id, admin_acknowledged=True)
        elif item_type == "charge":
            await self.charge_repo.update(item_id, admin_acknowledged=True)
        else:
            raise ValidationError("Invalid type")
        return True

    async def acknowledge_all_payments(self, admin_id: int) -> int:
        """Mark all unacknowledged payments as acknowledged."""
        from src.models.installment import Installment
        from src.models.one_time_charge import OneTimeCharge
        from sqlalchemy import update

        teams = await self.team_repo.get_by_admin_id(admin_id)
        team_ids = [t.id for t in teams]
        if not team_ids:
            return 0

        count = 0
        result = await self.session.execute(
            update(Installment)
            .where(Installment.team_id.in_(team_ids), Installment.admin_acknowledged == False)
            .values(admin_acknowledged=True)
        )
        count += result.rowcount

        result = await self.session.execute(
            update(OneTimeCharge)
            .where(OneTimeCharge.team_id.in_(team_ids), OneTimeCharge.admin_acknowledged == False)
            .values(admin_acknowledged=True)
        )
        count += result.rowcount

        return count

    async def _get_club_for_team(self, team_id: int) -> dict:
        """Resolve PlatformClub details from a team's admin."""
        from src.models.team import Team
        from src.models.platform_club import PlatformClub

        team = await self.session.get(Team, team_id)
        if not team:
            return {"name": "", "tax_id": "", "address": "", "phone": "", "email": ""}

        # Try 1: Find club where admin_id = team.created_by_admin_id
        result = await self.session.execute(
            select(PlatformClub).where(PlatformClub.admin_id == team.created_by_admin_id)
        )
        club = result.scalar_one_or_none()

        # Try 2: Fallback — find any active PlatformClub (single-club setups)
        if not club:
            result = await self.session.execute(
                select(PlatformClub).where(PlatformClub.status == "active").limit(1)
            )
            club = result.scalar_one_or_none()

        if club:
            return {
                "name": club.name or "",
                "tax_id": club.billing_tax_id or "",
                "address": club.billing_address or "",
                "phone": club.billing_phone or "",
                "email": club.billing_email or "",
            }
        return {"name": team.name, "tax_id": "", "address": "", "phone": "", "email": ""}

    async def get_receipt_data(
        self,
        parent_user_id: int,
        receipt_type: str,  # "plan" or "charge"
        item_id: int,
    ) -> dict:
        """Build receipt data for a paid plan or charge."""
        from src.models.payment_plan import PaymentPlan
        from src.models.team import Team
        from src.models.user import User
        from sqlalchemy.orm import selectinload

        player_ids = await self._get_parent_player_ids(parent_user_id)
        if not player_ids:
            raise ForbiddenError("Not authorized")

        parent = await self.session.get(User, parent_user_id)

        if receipt_type == "plan":
            result = await self.session.execute(
                select(PaymentPlan)
                .options(selectinload(PaymentPlan.installments))
                .where(PaymentPlan.id == item_id)
            )
            plan = result.scalar_one_or_none()
            if not plan or plan.player_id not in player_ids:
                raise NotFoundError("Plan")

            paid_installments = [i for i in plan.installments if i.status == "paid"]
            if not paid_installments:
                raise ValidationError("Not paid yet")

            amount = sum(float(i.amount) for i in paid_installments)
            paid_date = max(i.paid_date for i in paid_installments if i.paid_date)
            notes = paid_installments[0].notes or ""

            player = await self.session.get(Player, plan.player_id)
            team = await self.session.get(Team, plan.team_id)
            club = await self._get_club_for_team(plan.team_id)

            return {
                "receipt_number": f"R-{plan.id:04d}",
                "date": paid_date.strftime("%d/%m/%Y") if paid_date else date.today().strftime("%d/%m/%Y"),
                "parent_name": parent.name if parent else "",
                "parent_id_number": parent.phone or "",
                "player_name": player.name if player else "",
                "team_name": team.name if team else "",
                "description": plan.season or plan.description or f"תוכנית #{plan.id}",
                "amount": amount,
                "payment_method": notes,
                "club_name": club["name"],
                "club_tax_id": club["tax_id"],
                "club_address": club["address"],
                "club_phone": club["phone"],
                "club_email": club["email"],
            }
        else:
            charge = await self.charge_repo.get_by_id(item_id)
            if not charge or charge.player_id not in player_ids:
                raise NotFoundError("Charge")
            if charge.status != "paid":
                raise ValidationError("Not paid yet")

            player = await self.session.get(Player, charge.player_id)
            team = await self.session.get(Team, charge.team_id)
            club = await self._get_club_for_team(charge.team_id)

            return {
                "receipt_number": f"C-{charge.id:04d}",
                "date": charge.paid_date.strftime("%d/%m/%Y") if charge.paid_date else date.today().strftime("%d/%m/%Y"),
                "parent_name": parent.name if parent else "",
                "parent_id_number": parent.phone or "",
                "player_name": player.name if player else "",
                "team_name": team.name if team else "",
                "description": charge.title,
                "amount": float(charge.amount),
                "payment_method": charge.notes or "כרטיס אשראי",
                "club_name": club["name"],
                "club_tax_id": club["tax_id"],
                "club_address": club["address"],
                "club_phone": club["phone"],
                "club_email": club["email"],
            }

    async def _send_payment_receipt_message(
        self,
        parent_user_id: int,
        amount: float,
        description: str,
        card_last4: str,
        team_id: int,
        receipt_type: str = "plan",
        item_id: int = 0,
    ):
        """Send receipt message to parent after payment."""
        from src.models.club_message import ClubMessage
        from src.models.message_recipient import MessageRecipient
        from src.models.team import Team

        team = await self.session.get(Team, team_id)
        admin_id = team.created_by_admin_id if team else None

        receipt_url = f"/parent/receipt/{receipt_type}/{item_id}"
        body = (
            f"קבלה על תשלום\n"
            f"סכום: ₪{amount:,.0f}\n"
            f"תאריך: {date.today().strftime('%d/%m/%Y')}\n"
            f"אמצעי תשלום: כרטיס אשראי (****{card_last4})\n"
            f"{description}\n\n"
            f"[receipt:{receipt_url}]"
        )

        msg = ClubMessage(
            sender_id=admin_id,
            sender_role="admin",
            subject="קבלה על תשלום",
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

    async def _notify_admin_payment(
        self,
        team_id: int,
        parent_user_id: int,
        player_id: int,
        amount: float,
        description: str,
    ):
        """Notify admin about a new payment."""
        from src.models.club_message import ClubMessage
        from src.models.message_recipient import MessageRecipient
        from src.models.team import Team
        from src.models.user import User

        team = await self.session.get(Team, team_id)
        admin_id = team.created_by_admin_id if team else None
        if not admin_id:
            return

        parent = await self.session.get(User, parent_user_id)
        player = await self.session.get(Player, player_id)
        parent_name = parent.name if parent else "הורה"
        player_name = player.name if player else ""

        body = (
            f"התקבל תשלום חדש!\n"
            f"הורה: {parent_name}\n"
            f"שחקן: {player_name}\n"
            f"סכום: ₪{amount:,.0f}\n"
            f"{description}"
        )

        msg = ClubMessage(
            sender_id=parent_user_id,
            sender_role="parent",
            subject="תשלום חדש התקבל",
            body=body,
            message_type="general",
            target_type="admin_individual",
            target_user_id=admin_id,
            is_sent=True,
        )
        self.session.add(msg)
        await self.session.flush()
        recipient = MessageRecipient(message_id=msg.id, user_id=admin_id)
        self.session.add(recipient)
