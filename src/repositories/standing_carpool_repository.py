"""HOOPS AI - Standing Carpool Repositories"""
from datetime import date
from typing import Sequence
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.repositories.base_repository import BaseRepository
from src.models.standing_carpool import StandingCarpool, StandingCarpoolMember, StandingCarpoolSignup
from src.models.team_event import TeamEvent


class StandingCarpoolRepository(BaseRepository[StandingCarpool]):
    def __init__(self, session: AsyncSession):
        super().__init__(StandingCarpool, session)

    async def get_by_teams(self, team_ids: list[int]) -> Sequence[StandingCarpool]:
        """Get all active standing carpools for given teams, fully loaded."""
        if not team_ids:
            return []
        stmt = (
            select(StandingCarpool)
            .where(StandingCarpool.team_id.in_(team_ids), StandingCarpool.is_active == True)
            .options(
                selectinload(StandingCarpool.organizer),
                selectinload(StandingCarpool.team),
                selectinload(StandingCarpool.members).selectinload(StandingCarpoolMember.user),
                selectinload(StandingCarpool.members).selectinload(StandingCarpoolMember.player),
                selectinload(StandingCarpool.signups).selectinload(StandingCarpoolSignup.user),
                selectinload(StandingCarpool.signups).selectinload(StandingCarpoolSignup.team_event),
            )
            .order_by(StandingCarpool.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_with_details(self, carpool_id: int) -> StandingCarpool | None:
        stmt = (
            select(StandingCarpool)
            .where(StandingCarpool.id == carpool_id)
            .options(
                selectinload(StandingCarpool.organizer),
                selectinload(StandingCarpool.team),
                selectinload(StandingCarpool.members).selectinload(StandingCarpoolMember.user),
                selectinload(StandingCarpool.members).selectinload(StandingCarpoolMember.player),
                selectinload(StandingCarpool.signups).selectinload(StandingCarpoolSignup.user),
                selectinload(StandingCarpool.signups).selectinload(StandingCarpoolSignup.team_event),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()


class StandingCarpoolMemberRepository(BaseRepository[StandingCarpoolMember]):
    def __init__(self, session: AsyncSession):
        super().__init__(StandingCarpoolMember, session)

    async def get_by_carpool_and_user(self, carpool_id: int, user_id: int) -> StandingCarpoolMember | None:
        stmt = select(StandingCarpoolMember).where(
            StandingCarpoolMember.carpool_id == carpool_id,
            StandingCarpoolMember.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_by_carpool_and_user(self, carpool_id: int, user_id: int) -> None:
        stmt = delete(StandingCarpoolMember).where(
            StandingCarpoolMember.carpool_id == carpool_id,
            StandingCarpoolMember.user_id == user_id,
        )
        await self.session.execute(stmt)

    async def count_by_carpool(self, carpool_id: int) -> int:
        from sqlalchemy import func
        stmt = select(func.count(StandingCarpoolMember.id)).where(
            StandingCarpoolMember.carpool_id == carpool_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0


class StandingCarpoolSignupRepository(BaseRepository[StandingCarpoolSignup]):
    def __init__(self, session: AsyncSession):
        super().__init__(StandingCarpoolSignup, session)

    async def get_by_carpool_user_event(
        self, carpool_id: int, user_id: int, event_id: int
    ) -> StandingCarpoolSignup | None:
        stmt = select(StandingCarpoolSignup).where(
            StandingCarpoolSignup.carpool_id == carpool_id,
            StandingCarpoolSignup.user_id == user_id,
            StandingCarpoolSignup.team_event_id == event_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_by_carpool_user_event(
        self, carpool_id: int, user_id: int, event_id: int
    ) -> None:
        stmt = delete(StandingCarpoolSignup).where(
            StandingCarpoolSignup.carpool_id == carpool_id,
            StandingCarpoolSignup.user_id == user_id,
            StandingCarpoolSignup.team_event_id == event_id,
        )
        await self.session.execute(stmt)

    async def delete_all_for_user_in_carpool(self, carpool_id: int, user_id: int) -> None:
        """Remove all signups for a user when they leave a carpool."""
        stmt = delete(StandingCarpoolSignup).where(
            StandingCarpoolSignup.carpool_id == carpool_id,
            StandingCarpoolSignup.user_id == user_id,
        )
        await self.session.execute(stmt)

    async def get_upcoming_for_carpool(self, carpool_id: int) -> Sequence[StandingCarpoolSignup]:
        """Get all upcoming signups for a carpool (used for display)."""
        today = date.today()
        stmt = (
            select(StandingCarpoolSignup)
            .join(TeamEvent, StandingCarpoolSignup.team_event_id == TeamEvent.id)
            .where(
                StandingCarpoolSignup.carpool_id == carpool_id,
                TeamEvent.date >= today,
                TeamEvent.is_active == True,
            )
            .options(
                selectinload(StandingCarpoolSignup.user),
                selectinload(StandingCarpoolSignup.team_event),
            )
            .order_by(TeamEvent.date.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
