"""HOOPS AI - Payment Plan Service (extracted from BillingService)"""
import logging
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.utils.exceptions import AppError, ValidationError, ForbiddenError, NotFoundError, ConflictError

from src.repositories.billing_repository import (
    PaymentPlanRepository, InstallmentRepository,
)
from src.repositories.team_repository import TeamRepository
from src.models.team_member import TeamMember

logger = logging.getLogger(__name__)


class PaymentPlanService:
    def __init__(self, session: AsyncSession):
        self.plan_repo = PaymentPlanRepository(session)
        self.inst_repo = InstallmentRepository(session)
        self.team_repo = TeamRepository(session)
        self.session = session

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
            raise ValidationError("No active players in team")

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
        """Create PaymentPlan for all teams owned by this admin."""
        teams = await self.team_repo.get_by_admin_id(admin_id)
        if not teams:
            raise NotFoundError("Teams for this admin")
        total_created = 0
        total_skipped = 0
        for team in teams:
            try:
                result = await self.create_plan_for_team(
                    admin_id=admin_id,
                    team_id=team.id,
                    season=season,
                    total_amount=total_amount,
                    num_installments=num_installments,
                    billing_day=billing_day,
                    start_month=start_month,
                    payment_method=payment_method,
                    description=description,
                )
                total_created += result["created"]
                total_skipped += result["skipped"]
            except AppError:
                pass
        return {"created": total_created, "skipped": total_skipped, "teams": len(teams)}

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
            raise NotFoundError("Plan", plan_id)
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
            raise NotFoundError("Plan", plan_id)
        await self._assert_team_owned(admin_id, plan.team_id)
        result = await self.plan_repo.deactivate(plan_id)
        await self.session.commit()
        return result
