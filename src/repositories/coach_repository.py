"""HOOPS AI - Coach Repository"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.coach import Coach
from src.repositories.base_repository import BaseRepository


class CoachRepository(BaseRepository[Coach]):
    def __init__(self, session: AsyncSession):
        super().__init__(Coach, session)

    async def get_by_email(self, email: str) -> Coach | None:
        stmt = select(Coach).where(Coach.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
