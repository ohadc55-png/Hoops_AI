"""HOOPS AI - Carpool Service"""
from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.carpool_repository import CarpoolRideRepository, CarpoolPassengerRepository
from src.repositories.team_event_repository import TeamEventRepository
from src.models.team_member import TeamMember


class CarpoolService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.ride_repo = CarpoolRideRepository(session)
        self.passenger_repo = CarpoolPassengerRepository(session)
        self.event_repo = TeamEventRepository(session)

    # ── Helpers ─────────────────────────────────────────────────

    async def _get_parent_team_ids(self, parent_user_id: int) -> list[int]:
        stmt = select(TeamMember.team_id).where(
            TeamMember.user_id == parent_user_id,
            TeamMember.role_in_team == "parent",
            TeamMember.is_active == True,
        )
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]

    async def _get_parent_player_ids(self, parent_user_id: int) -> list[int]:
        stmt = select(TeamMember.player_id).where(
            TeamMember.user_id == parent_user_id,
            TeamMember.role_in_team == "parent",
            TeamMember.player_id.isnot(None),
            TeamMember.is_active == True,
        )
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]

    # ── Events ─────────────────────────────────────────────────

    async def get_upcoming_events(self, parent_user_id: int):
        team_ids = await self._get_parent_team_ids(parent_user_id)
        if not team_ids:
            return []
        limit_date = date.today() + timedelta(days=30)
        events = await self.event_repo.get_upcoming_by_teams(team_ids, limit=30)
        return [e for e in events if e.date <= limit_date]

    # ── Rides CRUD ─────────────────────────────────────────────

    async def get_rides_for_event(self, event_id: int, parent_user_id: int):
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise ValueError("Event not found")
        team_ids = await self._get_parent_team_ids(parent_user_id)
        if event.team_id not in team_ids:
            raise ValueError("Not authorized")
        return await self.ride_repo.get_by_event(event_id)

    async def create_ride(self, parent_user_id: int, event_id: int,
                          neighborhood: str, available_seats: int,
                          departure_time: str | None = None,
                          meeting_point: str | None = None,
                          direction: str = "to_event",
                          notes: str | None = None):
        event = await self.event_repo.get_by_id(event_id)
        if not event or not event.is_active:
            raise ValueError("Event not found")

        team_ids = await self._get_parent_team_ids(parent_user_id)
        if event.team_id not in team_ids:
            raise ValueError("Not authorized")

        if event.date < date.today():
            raise ValueError("Cannot offer ride for past event")

        if available_seats < 1 or available_seats > 8:
            raise ValueError("Seats must be between 1 and 8")

        if direction not in ("to_event", "from_event", "both"):
            raise ValueError("Invalid direction")

        existing = await self.ride_repo.get_by_event_and_driver(event_id, parent_user_id)
        if existing and existing.direction == direction:
            raise ValueError("You already offered a ride for this event")

        return await self.ride_repo.create(
            team_event_id=event_id,
            team_id=event.team_id,
            driver_user_id=parent_user_id,
            neighborhood=neighborhood,
            available_seats=available_seats,
            departure_time=departure_time,
            meeting_point=meeting_point,
            direction=direction,
            notes=notes,
        )

    async def update_ride(self, ride_id: int, parent_user_id: int, **kwargs):
        ride = await self.ride_repo.get_by_id(ride_id)
        if not ride or not ride.is_active:
            raise ValueError("Ride not found")
        if ride.driver_user_id != parent_user_id:
            raise ValueError("Not your ride")
        allowed = {"neighborhood", "available_seats", "departure_time", "meeting_point", "direction", "notes"}
        filtered = {k: v for k, v in kwargs.items() if k in allowed}
        return await self.ride_repo.update(ride_id, **filtered)

    async def cancel_ride(self, ride_id: int, parent_user_id: int):
        ride = await self.ride_repo.get_by_id(ride_id)
        if not ride or not ride.is_active:
            raise ValueError("Ride not found")
        if ride.driver_user_id != parent_user_id:
            raise ValueError("Not your ride")
        return await self.ride_repo.update(ride_id, is_active=False)

    # ── Join / Leave ───────────────────────────────────────────

    async def join_ride(self, ride_id: int, parent_user_id: int,
                        player_id: int | None = None,
                        notes: str | None = None):
        ride = await self.ride_repo.get_by_id(ride_id)
        if not ride or not ride.is_active:
            raise ValueError("Ride not found")

        team_ids = await self._get_parent_team_ids(parent_user_id)
        if ride.team_id not in team_ids:
            raise ValueError("Not authorized")

        if ride.driver_user_id == parent_user_id:
            raise ValueError("Cannot join your own ride")

        existing = await self.passenger_repo.get_by_user_and_ride(ride_id, parent_user_id)
        if existing:
            raise ValueError("Already joined this ride")

        current_count = await self.passenger_repo.count_by_ride(ride_id)
        if current_count >= ride.available_seats:
            raise ValueError("Ride is full")

        if player_id:
            player_ids = await self._get_parent_player_ids(parent_user_id)
            if player_id not in player_ids:
                raise ValueError("Not your child")

        return await self.passenger_repo.create(
            ride_id=ride_id,
            passenger_user_id=parent_user_id,
            player_id=player_id,
            notes=notes,
        )

    async def leave_ride(self, ride_id: int, parent_user_id: int):
        passenger = await self.passenger_repo.get_by_user_and_ride(ride_id, parent_user_id)
        if not passenger:
            raise ValueError("Not joined to this ride")
        await self.session.delete(passenger)
        await self.session.flush()
        return True

    # ── My rides ───────────────────────────────────────────────

    async def get_my_rides(self, parent_user_id: int) -> dict:
        offered = await self.ride_repo.get_by_driver(parent_user_id)
        joined = await self.passenger_repo.get_rides_joined_by_user(parent_user_id)
        return {"offered": offered, "joined": joined}
