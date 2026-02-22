"""HOOPS AI - Play Repository"""
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.play import Play
from src.repositories.base_repository import BaseRepository


class PlayRepository(BaseRepository[Play]):
    def __init__(self, session: AsyncSession):
        super().__init__(Play, session)

    async def get_shared_by_team_ids(self, team_ids: list[int], limit: int = 50) -> Sequence[Play]:
        stmt = (
            select(Play)
            .where(Play.team_id.in_(team_ids), Play.shared_with_team == True)
            .order_by(Play.updated_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
