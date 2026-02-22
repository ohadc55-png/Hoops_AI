"""HOOPS AI - Logistics Service"""
import uuid
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.event_repository import EventRepository
from src.repositories.player_repository import PlayerRepository


class LogisticsService:
    def __init__(self, session: AsyncSession):
        self.events = EventRepository(session)
        self.players = PlayerRepository(session)

    # Events
    async def get_events(self, coach_id: int):
        return await self.events.get_by_coach_id(coach_id)

    async def get_events_by_month(self, coach_id: int, year: int, month: int):
        return await self.events.get_by_month(coach_id, year, month)

    async def create_event(self, coach_id: int, **kwargs):
        return await self.events.create(coach_id=coach_id, **kwargs)

    async def update_event(self, event_id: int, **kwargs):
        return await self.events.update(event_id, **kwargs)

    async def delete_event(self, event_id: int):
        return await self.events.delete(event_id)

    async def create_recurring_events(self, coach_id: int, repeat_weeks: int, **kwargs):
        group = str(uuid.uuid4())
        base_date = kwargs.pop("date")
        created = []
        for i in range(repeat_weeks):
            event_date = base_date + timedelta(weeks=i)
            event = await self.events.create(
                coach_id=coach_id, date=event_date, recurrence_group=group, **kwargs
            )
            created.append(event)
        return created

    async def delete_recurring_series(self, coach_id: int, group: str):
        return await self.events.delete_by_recurrence_group(coach_id, group)

    # Players
    async def get_players(self, coach_id: int):
        return await self.players.get_by_coach_id(coach_id)

    async def create_player(self, coach_id: int, **kwargs):
        return await self.players.create(coach_id=coach_id, **kwargs)

    async def update_player(self, player_id: int, **kwargs):
        return await self.players.update(player_id, **kwargs)

    async def delete_player(self, player_id: int):
        return await self.players.delete(player_id)
