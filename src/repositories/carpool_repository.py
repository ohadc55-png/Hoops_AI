"""HOOPS AI - Carpool Repositories"""
from datetime import date
from typing import Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.repositories.base_repository import BaseRepository
from src.models.carpool_ride import CarpoolRide
from src.models.carpool_passenger import CarpoolPassenger
from src.models.team_event import TeamEvent


class CarpoolRideRepository(BaseRepository[CarpoolRide]):
    def __init__(self, session: AsyncSession):
        super().__init__(CarpoolRide, session)

    async def get_by_event(self, team_event_id: int) -> Sequence[CarpoolRide]:
        stmt = (
            select(CarpoolRide)
            .where(CarpoolRide.team_event_id == team_event_id, CarpoolRide.is_active == True)
            .options(
                selectinload(CarpoolRide.driver),
                selectinload(CarpoolRide.team_event),
                selectinload(CarpoolRide.team),
                selectinload(CarpoolRide.passengers).selectinload(CarpoolPassenger.passenger),
                selectinload(CarpoolRide.passengers).selectinload(CarpoolPassenger.player),
            )
            .order_by(CarpoolRide.departure_time.asc().nullslast(), CarpoolRide.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_driver(self, driver_user_id: int) -> Sequence[CarpoolRide]:
        today = date.today()
        stmt = (
            select(CarpoolRide)
            .join(TeamEvent, CarpoolRide.team_event_id == TeamEvent.id)
            .where(
                CarpoolRide.driver_user_id == driver_user_id,
                CarpoolRide.is_active == True,
                TeamEvent.date >= today,
                TeamEvent.is_active == True,
            )
            .options(
                selectinload(CarpoolRide.team_event),
                selectinload(CarpoolRide.team),
                selectinload(CarpoolRide.passengers).selectinload(CarpoolPassenger.passenger),
                selectinload(CarpoolRide.passengers).selectinload(CarpoolPassenger.player),
            )
            .order_by(TeamEvent.date.asc(), CarpoolRide.departure_time.asc().nullslast())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_event_and_driver(self, team_event_id: int, driver_user_id: int) -> CarpoolRide | None:
        stmt = select(CarpoolRide).where(
            CarpoolRide.team_event_id == team_event_id,
            CarpoolRide.driver_user_id == driver_user_id,
            CarpoolRide.is_active == True,
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_with_passengers(self, ride_id: int) -> CarpoolRide | None:
        stmt = (
            select(CarpoolRide)
            .where(CarpoolRide.id == ride_id)
            .options(
                selectinload(CarpoolRide.driver),
                selectinload(CarpoolRide.team_event),
                selectinload(CarpoolRide.team),
                selectinload(CarpoolRide.passengers).selectinload(CarpoolPassenger.passenger),
                selectinload(CarpoolRide.passengers).selectinload(CarpoolPassenger.player),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()


class CarpoolPassengerRepository(BaseRepository[CarpoolPassenger]):
    def __init__(self, session: AsyncSession):
        super().__init__(CarpoolPassenger, session)

    async def get_by_user_and_ride(self, ride_id: int, user_id: int) -> CarpoolPassenger | None:
        stmt = select(CarpoolPassenger).where(
            CarpoolPassenger.ride_id == ride_id,
            CarpoolPassenger.passenger_user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_rides_joined_by_user(self, user_id: int) -> Sequence[CarpoolPassenger]:
        today = date.today()
        stmt = (
            select(CarpoolPassenger)
            .join(CarpoolRide, CarpoolPassenger.ride_id == CarpoolRide.id)
            .join(TeamEvent, CarpoolRide.team_event_id == TeamEvent.id)
            .where(
                CarpoolPassenger.passenger_user_id == user_id,
                CarpoolRide.is_active == True,
                TeamEvent.date >= today,
                TeamEvent.is_active == True,
            )
            .options(
                selectinload(CarpoolPassenger.ride).selectinload(CarpoolRide.driver),
                selectinload(CarpoolPassenger.ride).selectinload(CarpoolRide.team_event),
                selectinload(CarpoolPassenger.ride).selectinload(CarpoolRide.team),
                selectinload(CarpoolPassenger.player),
            )
            .order_by(TeamEvent.date.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def count_by_ride(self, ride_id: int) -> int:
        stmt = select(func.count(CarpoolPassenger.id)).where(
            CarpoolPassenger.ride_id == ride_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0
