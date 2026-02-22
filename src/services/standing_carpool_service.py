"""HOOPS AI - Standing Carpool Service"""
from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.standing_carpool_repository import (
    StandingCarpoolRepository,
    StandingCarpoolMemberRepository,
    StandingCarpoolSignupRepository,
)
from src.repositories.team_event_repository import TeamEventRepository
from src.models.team_member import TeamMember


class StandingCarpoolService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.carpool_repo = StandingCarpoolRepository(session)
        self.member_repo = StandingCarpoolMemberRepository(session)
        self.signup_repo = StandingCarpoolSignupRepository(session)
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

    # ── List ─────────────────────────────────────────────────────

    async def get_for_parent(self, parent_user_id: int):
        """Return all active standing carpools across parent's teams."""
        team_ids = await self._get_parent_team_ids(parent_user_id)
        if not team_ids:
            return []
        return await self.carpool_repo.get_by_teams(team_ids)

    # ── Create ───────────────────────────────────────────────────

    async def create(self, parent_user_id: int, team_id: int, name: str,
                     neighborhood: str, max_members: int,
                     meeting_point: str | None = None,
                     notes: str | None = None):
        team_ids = await self._get_parent_team_ids(parent_user_id)
        if team_id not in team_ids:
            raise ValueError("Not authorized for this team")
        if max_members < 2 or max_members > 8:
            raise ValueError("Max members must be between 2 and 8")

        carpool = await self.carpool_repo.create(
            team_id=team_id,
            organizer_user_id=parent_user_id,
            name=name,
            neighborhood=neighborhood,
            max_members=max_members,
            meeting_point=meeting_point,
            notes=notes,
        )
        # Organizer is automatically the first member
        await self.member_repo.create(
            carpool_id=carpool.id,
            user_id=parent_user_id,
        )
        return carpool

    # ── Update ───────────────────────────────────────────────────

    async def update(self, carpool_id: int, parent_user_id: int, **kwargs):
        carpool = await self.carpool_repo.get_by_id(carpool_id)
        if not carpool or not carpool.is_active:
            raise ValueError("Carpool not found")
        if carpool.organizer_user_id != parent_user_id:
            raise ValueError("Only the organizer can edit this carpool")
        allowed = {"name", "neighborhood", "max_members", "meeting_point", "notes"}
        filtered = {k: v for k, v in kwargs.items() if k in allowed}
        return await self.carpool_repo.update(carpool_id, **filtered)

    # ── Delete ───────────────────────────────────────────────────

    async def delete(self, carpool_id: int, parent_user_id: int):
        carpool = await self.carpool_repo.get_by_id(carpool_id)
        if not carpool or not carpool.is_active:
            raise ValueError("Carpool not found")
        if carpool.organizer_user_id != parent_user_id:
            raise ValueError("Only the organizer can delete this carpool")
        await self.carpool_repo.update(carpool_id, is_active=False)

    # ── Join ─────────────────────────────────────────────────────

    async def join(self, carpool_id: int, parent_user_id: int,
                   player_id: int | None = None, notes: str | None = None):
        carpool = await self.carpool_repo.get_by_id(carpool_id)
        if not carpool or not carpool.is_active:
            raise ValueError("Carpool not found")

        team_ids = await self._get_parent_team_ids(parent_user_id)
        if carpool.team_id not in team_ids:
            raise ValueError("Not authorized")

        existing = await self.member_repo.get_by_carpool_and_user(carpool_id, parent_user_id)
        if existing:
            raise ValueError("Already a member of this carpool")

        current_count = await self.member_repo.count_by_carpool(carpool_id)
        if current_count >= carpool.max_members:
            raise ValueError("Carpool is full")

        return await self.member_repo.create(
            carpool_id=carpool_id,
            user_id=parent_user_id,
            player_id=player_id,
            notes=notes,
        )

    # ── Leave ────────────────────────────────────────────────────

    async def leave(self, carpool_id: int, parent_user_id: int):
        carpool = await self.carpool_repo.get_by_id(carpool_id)
        if not carpool or not carpool.is_active:
            raise ValueError("Carpool not found")

        if carpool.organizer_user_id == parent_user_id:
            # Organizer leaving → soft-delete the whole carpool
            await self.carpool_repo.update(carpool_id, is_active=False)
        else:
            member = await self.member_repo.get_by_carpool_and_user(carpool_id, parent_user_id)
            if not member:
                raise ValueError("Not a member of this carpool")
            # Remove all their signups first, then the membership
            await self.signup_repo.delete_all_for_user_in_carpool(carpool_id, parent_user_id)
            await self.member_repo.delete_by_carpool_and_user(carpool_id, parent_user_id)

    # ── Event Signup ─────────────────────────────────────────────

    async def signup_for_event(self, carpool_id: int, parent_user_id: int,
                                event_id: int, notes: str | None = None):
        carpool = await self.carpool_repo.get_by_id(carpool_id)
        if not carpool or not carpool.is_active:
            raise ValueError("Carpool not found")

        # Must be a member
        member = await self.member_repo.get_by_carpool_and_user(carpool_id, parent_user_id)
        if not member:
            raise ValueError("You must join this carpool first")

        # Event must belong to same team
        event = await self.event_repo.get_by_id(event_id)
        if not event or not event.is_active:
            raise ValueError("Event not found")
        if event.team_id != carpool.team_id:
            raise ValueError("Event does not belong to this carpool's team")
        if event.date < date.today():
            raise ValueError("Cannot sign up for a past event")

        # Check duplicate
        existing = await self.signup_repo.get_by_carpool_user_event(carpool_id, parent_user_id, event_id)
        if existing:
            raise ValueError("Already signed up for this event")

        return await self.signup_repo.create(
            carpool_id=carpool_id,
            user_id=parent_user_id,
            team_event_id=event_id,
            notes=notes,
        )

    # ── Cancel Signup ────────────────────────────────────────────

    async def cancel_signup(self, carpool_id: int, parent_user_id: int, event_id: int):
        existing = await self.signup_repo.get_by_carpool_user_event(carpool_id, parent_user_id, event_id)
        if not existing:
            raise ValueError("Signup not found")
        await self.signup_repo.delete_by_carpool_user_event(carpool_id, parent_user_id, event_id)

    # ── Upcoming events for a carpool ────────────────────────────

    async def get_upcoming_events(self, carpool_id: int) -> list:
        """Return upcoming events for a carpool's team (next 30 days)."""
        carpool = await self.carpool_repo.get_by_id(carpool_id)
        if not carpool:
            return []
        limit_date = date.today() + timedelta(days=30)
        events = await self.event_repo.get_upcoming_by_team(carpool.team_id, limit=30)
        return [e for e in events if e.date <= limit_date]
