"""HOOPS AI - Club Feature Flag Repository"""
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.club_feature_flag import ClubFeatureFlag
from src.repositories.base_repository import BaseRepository


class ClubFeatureFlagRepository(BaseRepository[ClubFeatureFlag]):
    def __init__(self, session: AsyncSession):
        super().__init__(ClubFeatureFlag, session)

    async def get_by_club_id(self, club_id: int) -> Sequence[ClubFeatureFlag]:
        stmt = (
            select(ClubFeatureFlag)
            .where(ClubFeatureFlag.club_id == club_id)
            .order_by(ClubFeatureFlag.feature_key)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_flag(self, club_id: int, feature_key: str) -> ClubFeatureFlag | None:
        stmt = select(ClubFeatureFlag).where(
            ClubFeatureFlag.club_id == club_id,
            ClubFeatureFlag.feature_key == feature_key,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_flag(self, club_id: int, feature_key: str, is_enabled: bool) -> ClubFeatureFlag:
        existing = await self.get_flag(club_id, feature_key)
        if existing:
            existing.is_enabled = is_enabled
            await self.session.flush()
            await self.session.refresh(existing)
            return existing
        return await self.create(club_id=club_id, feature_key=feature_key, is_enabled=is_enabled)
