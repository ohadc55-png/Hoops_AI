"""HOOPS AI - Feature Flag Gate Utility"""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.club_feature_flag import ClubFeatureFlag
from src.models.team_member import TeamMember
from src.models.team import Team
from src.models.coach import Coach
from src.models.platform_club import PlatformClub


async def get_club_id_for_user(user_id: int, db: AsyncSession) -> int | None:
    """Resolve a user_id (any role) to their club's platform_club.id via admin ownership."""
    # Find which team(s) the user belongs to
    tm_result = await db.execute(
        select(TeamMember.team_id)
        .where(TeamMember.user_id == user_id, TeamMember.is_active == True)
        .limit(1)
    )
    tm_row = tm_result.first()
    if not tm_row:
        return None

    # Get the team's admin
    team = await db.get(Team, tm_row[0])
    if not team or not team.created_by_admin_id:
        return None

    # Find the platform club linked to that admin
    club_result = await db.execute(
        select(PlatformClub.id).where(PlatformClub.admin_id == team.created_by_admin_id).limit(1)
    )
    club_row = club_result.first()
    return club_row[0] if club_row else None


async def get_club_id_for_coach(coach_id: int, db: AsyncSession) -> int | None:
    """Resolve a coach_id (legacy Coach table) to platform_club.id."""
    coach = await db.get(Coach, coach_id)
    if not coach or not coach.user_id:
        return None
    return await get_club_id_for_user(coach.user_id, db)


async def get_club_id_for_admin(admin_id: int, db: AsyncSession) -> int | None:
    """Resolve an admin user_id to platform_club.id."""
    club_result = await db.execute(
        select(PlatformClub.id).where(PlatformClub.admin_id == admin_id).limit(1)
    )
    club_row = club_result.first()
    return club_row[0] if club_row else None


async def check_feature(key: str, club_id: int | None, db: AsyncSession) -> bool:
    """Check if a feature is enabled for a club. Returns True if no club or no flag record (default enabled)."""
    if not club_id:
        return True  # No club association = allow (backwards compat)
    result = await db.execute(
        select(ClubFeatureFlag.is_enabled)
        .where(ClubFeatureFlag.club_id == club_id, ClubFeatureFlag.feature_key == key)
    )
    row = result.first()
    if row is None:
        return True  # No record = default enabled
    return row[0]


async def require_feature(key: str, db: AsyncSession, user_id: int | None = None, coach_id: int | None = None, admin_id: int | None = None):
    """Raise 403 if feature is disabled for the user's club."""
    club_id = None
    if admin_id:
        club_id = await get_club_id_for_admin(admin_id, db)
    elif coach_id:
        club_id = await get_club_id_for_coach(coach_id, db)
    elif user_id:
        club_id = await get_club_id_for_user(user_id, db)

    if not await check_feature(key, club_id, db):
        raise HTTPException(
            status_code=403,
            detail=f"Feature '{key}' is not enabled for your club. Contact your platform administrator.",
        )
