"""HOOPS AI - Platform Club Repository"""
from typing import Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.models.platform_club import PlatformClub, ClubRegistrationLink
from src.repositories.base_repository import BaseRepository


class PlatformClubRepository(BaseRepository[PlatformClub]):
    def __init__(self, session: AsyncSession):
        super().__init__(PlatformClub, session)

    async def get_by_admin_id(self, admin_id: int) -> PlatformClub | None:
        stmt = select(PlatformClub).where(PlatformClub.admin_id == admin_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_status(self, status: str, limit: int = 100, offset: int = 0) -> Sequence[PlatformClub]:
        stmt = (
            select(PlatformClub)
            .where(PlatformClub.status == status)
            .limit(limit).offset(offset)
            .order_by(PlatformClub.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_all_with_filters(
        self, status: str | None = None, region_id: int | None = None,
        search: str | None = None, limit: int = 100, offset: int = 0,
    ) -> Sequence[PlatformClub]:
        stmt = select(PlatformClub)
        if status:
            stmt = stmt.where(PlatformClub.status == status)
        if region_id:
            stmt = stmt.where(PlatformClub.region_id == region_id)
        if search:
            stmt = stmt.where(PlatformClub.name.ilike(f"%{search}%"))
        stmt = stmt.limit(limit).offset(offset).order_by(PlatformClub.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_with_details(self, club_id: int) -> PlatformClub | None:
        stmt = (
            select(PlatformClub)
            .where(PlatformClub.id == club_id)
            .options(
                selectinload(PlatformClub.feature_flags),
                selectinload(PlatformClub.billing_config),
                selectinload(PlatformClub.region),
                selectinload(PlatformClub.admin),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_by_status(self) -> dict:
        stmt = select(PlatformClub.status, func.count(PlatformClub.id)).group_by(PlatformClub.status)
        result = await self.session.execute(stmt)
        return {row[0]: row[1] for row in result.all()}


class ClubRegistrationLinkRepository(BaseRepository[ClubRegistrationLink]):
    def __init__(self, session: AsyncSession):
        super().__init__(ClubRegistrationLink, session)

    async def get_by_token(self, token: str) -> ClubRegistrationLink | None:
        stmt = (
            select(ClubRegistrationLink)
            .where(ClubRegistrationLink.token == token)
            .options(selectinload(ClubRegistrationLink.club))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_by_club(self, club_id: int) -> Sequence[ClubRegistrationLink]:
        stmt = (
            select(ClubRegistrationLink)
            .where(ClubRegistrationLink.club_id == club_id, ClubRegistrationLink.is_active == True)
            .order_by(ClubRegistrationLink.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
