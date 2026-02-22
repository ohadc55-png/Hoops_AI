"""HOOPS AI - Team Event Repository"""
from datetime import date
from typing import Sequence
from sqlalchemy import select, extract
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.team_event import TeamEvent
from src.models.team import Team
from src.repositories.base_repository import BaseRepository


class TeamEventRepository(BaseRepository[TeamEvent]):
    def __init__(self, session: AsyncSession):
        super().__init__(TeamEvent, session)

    async def get_by_team(self, team_id: int, limit: int = 50) -> Sequence[TeamEvent]:
        stmt = (
            select(TeamEvent)
            .where(TeamEvent.team_id == team_id, TeamEvent.is_active == True)
            .order_by(TeamEvent.date.asc(), TeamEvent.time_start.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_teams(self, team_ids: list[int], limit: int = 50) -> Sequence[TeamEvent]:
        if not team_ids:
            return []
        stmt = (
            select(TeamEvent)
            .where(TeamEvent.team_id.in_(team_ids), TeamEvent.is_active == True)
            .order_by(TeamEvent.date.asc(), TeamEvent.time_start.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_upcoming_by_team(self, team_id: int, limit: int = 20) -> Sequence[TeamEvent]:
        today = date.today()
        stmt = (
            select(TeamEvent)
            .where(TeamEvent.team_id == team_id, TeamEvent.date >= today, TeamEvent.is_active == True)
            .order_by(TeamEvent.date.asc(), TeamEvent.time_start.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_upcoming_by_teams(self, team_ids: list[int], limit: int = 20) -> Sequence[TeamEvent]:
        if not team_ids:
            return []
        today = date.today()
        stmt = (
            select(TeamEvent)
            .where(TeamEvent.team_id.in_(team_ids), TeamEvent.date >= today, TeamEvent.is_active == True)
            .order_by(TeamEvent.date.asc(), TeamEvent.time_start.asc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_admin(self, admin_id: int) -> Sequence[TeamEvent]:
        today = date.today()
        stmt = (
            select(TeamEvent)
            .join(Team, TeamEvent.team_id == Team.id)
            .where(Team.created_by_admin_id == admin_id, TeamEvent.is_active == True, TeamEvent.date >= today)
            .order_by(TeamEvent.date.asc(), TeamEvent.time_start.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_recurrence_group(self, group: str) -> Sequence[TeamEvent]:
        stmt = (
            select(TeamEvent)
            .where(TeamEvent.recurrence_group == group, TeamEvent.is_active == True)
            .order_by(TeamEvent.date.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_month(self, team_id: int, year: int, month: int) -> Sequence[TeamEvent]:
        stmt = (
            select(TeamEvent)
            .where(
                TeamEvent.team_id == team_id,
                TeamEvent.is_active == True,
                extract("year", TeamEvent.date) == year,
                extract("month", TeamEvent.date) == month,
            )
            .order_by(TeamEvent.date.asc(), TeamEvent.time_start.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_upcoming_away_by_admin(self, admin_id: int) -> Sequence[TeamEvent]:
        """Upcoming away games across admin's teams."""
        today = date.today()
        stmt = (
            select(TeamEvent)
            .join(Team, TeamEvent.team_id == Team.id)
            .where(
                Team.created_by_admin_id == admin_id,
                TeamEvent.is_active == True,
                TeamEvent.is_away == True,
                TeamEvent.date >= today,
            )
            .order_by(TeamEvent.date.asc(), TeamEvent.time_start.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_month_for_teams(self, team_ids: list[int], year: int, month: int) -> Sequence[TeamEvent]:
        if not team_ids:
            return []
        stmt = (
            select(TeamEvent)
            .where(
                TeamEvent.team_id.in_(team_ids),
                TeamEvent.is_active == True,
                extract("year", TeamEvent.date) == year,
                extract("month", TeamEvent.date) == month,
            )
            .order_by(TeamEvent.date.asc(), TeamEvent.time_start.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
