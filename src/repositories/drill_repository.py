"""HOOPS AI - Drill Repository"""
from typing import Sequence
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.drill import Drill
from src.repositories.base_repository import BaseRepository


class DrillRepository(BaseRepository[Drill]):
    def __init__(self, session: AsyncSession):
        super().__init__(Drill, session)

    async def filter_drills(
        self,
        coach_id: int,
        category: str | None = None,
        difficulty: str | None = None,
        search: str | None = None,
    ) -> Sequence[Drill]:
        stmt = select(Drill).where(Drill.coach_id == coach_id)
        if category:
            stmt = stmt.where(Drill.category == category)
        if difficulty:
            stmt = stmt.where(Drill.difficulty == difficulty)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(or_(Drill.title.ilike(pattern), Drill.description.ilike(pattern)))
        stmt = stmt.order_by(Drill.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()
