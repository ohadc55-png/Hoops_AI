"""HOOPS AI - Club Registration Repository"""
from datetime import datetime
from typing import Sequence
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.models.platform_club import ClubRegistrationLink
from src.repositories.base_repository import BaseRepository


class ClubRegistrationRepository(BaseRepository[ClubRegistrationLink]):
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

    async def deactivate_expired(self) -> int:
        """Deactivate all expired registration links. Returns count affected."""
        now = datetime.utcnow()
        stmt = (
            update(ClubRegistrationLink)
            .where(
                ClubRegistrationLink.is_active == True,
                ClubRegistrationLink.expires_at < now,
            )
            .values(is_active=False)
        )
        result = await self.session.execute(stmt)
        return result.rowcount
