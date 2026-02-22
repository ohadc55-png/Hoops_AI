"""HOOPS AI - Schedule Request Repository"""
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.schedule_request import ScheduleRequest
from src.models.team import Team
from src.repositories.base_repository import BaseRepository


class ScheduleRequestRepository(BaseRepository[ScheduleRequest]):
    def __init__(self, session: AsyncSession):
        super().__init__(ScheduleRequest, session)

    async def get_by_coach(self, coach_id: int) -> Sequence[ScheduleRequest]:
        stmt = (
            select(ScheduleRequest)
            .where(ScheduleRequest.coach_id == coach_id)
            .order_by(ScheduleRequest.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_pending_by_admin(self, admin_id: int) -> Sequence[ScheduleRequest]:
        """All pending requests for teams this admin manages."""
        stmt = (
            select(ScheduleRequest)
            .join(Team, ScheduleRequest.team_id == Team.id)
            .where(
                Team.created_by_admin_id == admin_id,
                ScheduleRequest.status == "pending",
            )
            .order_by(ScheduleRequest.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_team(self, team_id: int) -> Sequence[ScheduleRequest]:
        stmt = (
            select(ScheduleRequest)
            .where(ScheduleRequest.team_id == team_id)
            .order_by(ScheduleRequest.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
