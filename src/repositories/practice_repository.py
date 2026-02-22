"""HOOPS AI - Practice Repository"""
from typing import Sequence
from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.practice_session import PracticeSession
from src.repositories.base_repository import BaseRepository


class PracticeRepository(BaseRepository[PracticeSession]):
    def __init__(self, session: AsyncSession):
        super().__init__(PracticeSession, session)

    async def get_with_segments(self, session_id: int) -> PracticeSession | None:
        stmt = (
            select(PracticeSession)
            .options(selectinload(PracticeSession.segments))
            .where(PracticeSession.id == session_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_with_segments(self, coach_id: int) -> Sequence[PracticeSession]:
        stmt = (
            select(PracticeSession)
            .options(selectinload(PracticeSession.segments))
            .where(PracticeSession.coach_id == coach_id)
            .order_by(PracticeSession.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_date_range(self, coach_id: int, start: date, end: date) -> Sequence[PracticeSession]:
        stmt = (
            select(PracticeSession)
            .options(selectinload(PracticeSession.segments))
            .where(
                PracticeSession.coach_id == coach_id,
                PracticeSession.date >= start,
                PracticeSession.date <= end,
            )
            .order_by(PracticeSession.date)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
