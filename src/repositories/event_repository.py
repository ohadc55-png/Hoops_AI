"""HOOPS AI - Event Repository"""
from typing import Sequence
from datetime import date
from sqlalchemy import select, extract
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.event import Event
from src.repositories.base_repository import BaseRepository


class EventRepository(BaseRepository[Event]):
    def __init__(self, session: AsyncSession):
        super().__init__(Event, session)

    async def get_by_date_range(self, coach_id: int, start: date, end: date) -> Sequence[Event]:
        stmt = (
            select(Event)
            .where(Event.coach_id == coach_id, Event.date >= start, Event.date <= end)
            .order_by(Event.date, Event.time)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_month(self, coach_id: int, year: int, month: int) -> Sequence[Event]:
        stmt = (
            select(Event)
            .where(
                Event.coach_id == coach_id,
                extract("year", Event.date) == year,
                extract("month", Event.date) == month,
            )
            .order_by(Event.date, Event.time)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_recurrence_group(self, coach_id: int, group: str) -> Sequence[Event]:
        stmt = (
            select(Event)
            .where(Event.coach_id == coach_id, Event.recurrence_group == group)
            .order_by(Event.date)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_month_for_coaches(self, coach_ids: list[int], year: int, month: int) -> Sequence[Event]:
        if not coach_ids:
            return []
        stmt = (
            select(Event)
            .where(
                Event.coach_id.in_(coach_ids),
                extract("year", Event.date) == year,
                extract("month", Event.date) == month,
            )
            .order_by(Event.date, Event.time)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def delete_by_recurrence_group(self, coach_id: int, group: str) -> int:
        events = await self.get_by_recurrence_group(coach_id, group)
        count = len(events)
        for e in events:
            await self.session.delete(e)
        await self.session.flush()
        return count
