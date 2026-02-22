"""HOOPS AI - Game Report Repository"""
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.game_report import GameReport
from src.repositories.base_repository import BaseRepository


class GameReportRepository(BaseRepository[GameReport]):
    def __init__(self, session: AsyncSession):
        super().__init__(GameReport, session)

    async def get_by_coach(self, coach_id: int) -> Sequence[GameReport]:
        stmt = (
            select(GameReport)
            .where(GameReport.coach_id == coach_id)
            .order_by(GameReport.date.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_reported_team_event_ids(self, coach_id: int) -> set[int]:
        """Return set of team_event_ids that already have game reports for this coach."""
        stmt = (
            select(GameReport.team_event_id)
            .where(GameReport.coach_id == coach_id, GameReport.team_event_id.isnot(None))
        )
        result = await self.session.execute(stmt)
        return {row[0] for row in result.fetchall()}
