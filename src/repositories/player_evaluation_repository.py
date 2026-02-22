"""HOOPS AI - Player Evaluation Repository"""
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.player_evaluation import PlayerEvaluation
from src.repositories.base_repository import BaseRepository


class PlayerEvaluationRepository(BaseRepository[PlayerEvaluation]):
    def __init__(self, session: AsyncSession):
        super().__init__(PlayerEvaluation, session)

    async def get_by_player(self, coach_id: int, player_id: int) -> Sequence[PlayerEvaluation]:
        stmt = (
            select(PlayerEvaluation)
            .where(PlayerEvaluation.coach_id == coach_id, PlayerEvaluation.player_id == player_id)
            .order_by(PlayerEvaluation.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_player_all_coaches(self, player_id: int) -> Sequence[PlayerEvaluation]:
        """All evaluations for a player across ALL coaches (admin view)."""
        stmt = (
            select(PlayerEvaluation)
            .where(PlayerEvaluation.player_id == player_id)
            .order_by(PlayerEvaluation.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_request(self, request_id: int) -> Sequence[PlayerEvaluation]:
        stmt = (
            select(PlayerEvaluation)
            .where(PlayerEvaluation.report_request_id == request_id)
            .order_by(PlayerEvaluation.player_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_latest_for_player(self, coach_id: int, player_id: int) -> PlayerEvaluation | None:
        stmt = (
            select(PlayerEvaluation)
            .where(PlayerEvaluation.coach_id == coach_id, PlayerEvaluation.player_id == player_id)
            .order_by(PlayerEvaluation.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
