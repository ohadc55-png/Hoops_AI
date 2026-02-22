"""HOOPS AI - Feature Flag Service"""
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.club_feature_flag_repository import ClubFeatureFlagRepository
from src.models.club_feature_flag import FEATURE_KEYS


class FeatureFlagService:
    def __init__(self, session: AsyncSession):
        self.repo = ClubFeatureFlagRepository(session)
        self.session = session

    async def get_flags_for_club(self, club_id: int) -> dict[str, bool]:
        """Return all feature flags for a club, filling defaults for missing keys."""
        flags = await self.repo.get_by_club_id(club_id)
        flag_map = {f.feature_key: f.is_enabled for f in flags}
        # Default: enabled if no record exists
        return {key: flag_map.get(key, True) for key in FEATURE_KEYS}

    async def set_flag(self, club_id: int, feature_key: str, is_enabled: bool) -> dict:
        if feature_key not in FEATURE_KEYS:
            raise ValueError(f"Unknown feature key: {feature_key}")
        flag = await self.repo.upsert_flag(club_id, feature_key, is_enabled)
        return {"feature_key": flag.feature_key, "is_enabled": flag.is_enabled}

    async def bulk_update_flags(self, club_id: int, flags: dict[str, bool]) -> dict[str, bool]:
        """Update multiple flags at once. Returns full flag map."""
        for key, enabled in flags.items():
            if key not in FEATURE_KEYS:
                raise ValueError(f"Unknown feature key: {key}")
            await self.repo.upsert_flag(club_id, key, enabled)
        return await self.get_flags_for_club(club_id)

    async def initialize_default_flags(self, club_id: int) -> None:
        """Create default flag records for a new club (all enabled)."""
        for key in FEATURE_KEYS:
            await self.repo.upsert_flag(club_id, key, True)
