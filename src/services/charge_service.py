"""HOOPS AI - Charge Service (extracted from BillingService)"""
import logging
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.utils.exceptions import AppError, ValidationError, ForbiddenError, NotFoundError, ConflictError

from src.repositories.billing_repository import OneTimeChargeRepository
from src.repositories.team_repository import TeamRepository
from src.models.team_member import TeamMember

logger = logging.getLogger(__name__)


class ChargeService:
    def __init__(self, session: AsyncSession):
        self.charge_repo = OneTimeChargeRepository(session)
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
            raise ValidationError("No target players found")

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

    async def create_charge_for_all_teams(
        self,
        admin_id: int,
        title: str,
        amount: float,
        due_date: str | None = None,
        description: str | None = None,
    ) -> int:
        """Create one-time charge for all players across all teams owned by this admin."""
        teams = await self.team_repo.get_by_admin_id(admin_id)
        if not teams:
            raise NotFoundError("Teams for this admin")
        total = 0
        for team in teams:
            try:
                count = await self.create_one_time_charge(
                    admin_id=admin_id,
                    team_id=team.id,
                    title=title,
                    amount=amount,
                    due_date=due_date,
                    description=description,
                )
                total += count
            except AppError:
                pass
        return total

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
            raise NotFoundError("Charge", charge_id)
        await self._assert_team_owned(admin_id, charge.team_id)
        if charge.status == "paid":
            raise ConflictError("Already paid")

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
            raise NotFoundError("Charge", charge_id)
        await self._assert_team_owned(admin_id, charge.team_id)
        await self.charge_repo.update(charge_id, status="cancelled")
        await self.session.commit()
        return True

    async def delete_charge(self, admin_id: int, charge_id: int) -> bool:
        charge = await self.charge_repo.get_by_id(charge_id)
        if not charge:
            raise NotFoundError("Charge", charge_id)
        await self._assert_team_owned(admin_id, charge.team_id)
        result = await self.charge_repo.delete(charge_id)
        await self.session.commit()
        return result
