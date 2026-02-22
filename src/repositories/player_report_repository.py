"""HOOPS AI - Player Report Repository"""
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.player_report import PlayerReport
from src.repositories.base_repository import BaseRepository


class PlayerReportRepository(BaseRepository[PlayerReport]):
    def __init__(self, session: AsyncSession):
        super().__init__(PlayerReport, session)

    async def get_by_player(self, coach_id: int, player_id: int) -> Sequence[PlayerReport]:
        stmt = (
            select(PlayerReport)
            .where(PlayerReport.coach_id == coach_id, PlayerReport.player_id == player_id)
            .order_by(PlayerReport.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_all_by_player(self, player_id: int) -> Sequence[PlayerReport]:
        """All reports for a player across ALL coaches."""
        stmt = (
            select(PlayerReport)
            .where(PlayerReport.player_id == player_id)
            .order_by(PlayerReport.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_period(self, coach_id: int, period: str) -> Sequence[PlayerReport]:
        stmt = (
            select(PlayerReport)
            .where(PlayerReport.coach_id == coach_id, PlayerReport.period == period)
            .order_by(PlayerReport.player_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
