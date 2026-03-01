"""HOOPS AI - Authorization Helpers

Centralizes common permission checks used across API endpoints.
All model imports are lazy (inside functions) to avoid circular imports.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.exceptions import ForbiddenError, NotFoundError


async def assert_admin_owns_team(session: AsyncSession, admin_id: int, team_id: int):
    """Verify the admin created this team. Returns the Team object.

    Raises:
        NotFoundError: if team_id does not exist.
        ForbiddenError: if the team belongs to a different admin.
    """
    from src.models.team import Team

    team = await session.get(Team, team_id)
    if not team:
        raise NotFoundError("Team", team_id)
    if team.created_by_admin_id != admin_id:
        raise ForbiddenError("Not your team")
    return team


async def get_admin_team_ids(session: AsyncSession, admin_id: int) -> list[int]:
    """Return all active team IDs owned by this admin.

    Common pattern: ``select(Team.id).where(Team.created_by_admin_id == admin.id)``
    Found in admin_contacts, admin_players, admin_practice, scouting, admin_dashboard, etc.
    """
    from sqlalchemy import select
    from src.models.team import Team

    result = await session.execute(
        select(Team.id).where(Team.created_by_admin_id == admin_id, Team.is_active == True)
    )
    return list(result.scalars().all())


async def assert_coach_in_team(session: AsyncSession, user_id: int, team_id: int):
    """Verify the coach is an active member of this team. Returns the TeamMember row.

    Raises:
        ForbiddenError: if no active coach membership exists.
    """
    from sqlalchemy import select
    from src.models.team_member import TeamMember

    result = await session.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
            TeamMember.role_in_team == "coach",
            TeamMember.is_active == True,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise ForbiddenError("Not a member of this team")
    return member


async def get_coach_team_ids(session: AsyncSession, user_id: int) -> list[int]:
    """Return all team IDs where this user is an active coach.

    Common pattern: ``select(TeamMember.team_id).where(user_id, role_in_team="coach", is_active)``
    Found in drills, logistics, evaluations, engagement, etc.
    """
    from sqlalchemy import select
    from src.models.team_member import TeamMember

    result = await session.execute(
        select(TeamMember.team_id).where(
            TeamMember.user_id == user_id,
            TeamMember.role_in_team == "coach",
            TeamMember.is_active == True,
        )
    )
    return list(result.scalars().all())


async def assert_player_in_team(session: AsyncSession, user_id: int, team_id: int):
    """Verify the player is an active member of this team. Returns the TeamMember row.

    Raises:
        ForbiddenError: if no active player membership exists.
    """
    from sqlalchemy import select
    from src.models.team_member import TeamMember

    result = await session.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
            TeamMember.role_in_team == "player",
            TeamMember.is_active == True,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise ForbiddenError("Not a member of this team")
    return member


async def get_player_team_ids(session: AsyncSession, user_id: int) -> list[int]:
    """Return all team IDs where this user is an active player."""
    from sqlalchemy import select
    from src.models.team_member import TeamMember

    result = await session.execute(
        select(TeamMember.team_id).where(
            TeamMember.user_id == user_id,
            TeamMember.role_in_team == "player",
            TeamMember.is_active == True,
        )
    )
    return list(result.scalars().all())


async def get_parent_team_ids(session: AsyncSession, user_id: int) -> list[int]:
    """Return all team IDs where this user is an active parent."""
    from sqlalchemy import select
    from src.models.team_member import TeamMember

    result = await session.execute(
        select(TeamMember.team_id).where(
            TeamMember.user_id == user_id,
            TeamMember.role_in_team == "parent",
            TeamMember.is_active == True,
        )
    )
    return list(result.scalars().all())


async def assert_admin_owns_player(
    session: AsyncSession, admin_id: int, player_id: int
):
    """Verify a player belongs to one of the admin's teams. Returns the TeamMember row.

    Common pattern in admin_players: join TeamMember + Team where
    TeamMember.player_id == X and Team.created_by_admin_id == admin.id.

    Raises:
        ForbiddenError: if the player is not in any of the admin's teams.
    """
    from sqlalchemy import select
    from src.models.team import Team
    from src.models.team_member import TeamMember

    result = await session.execute(
        select(TeamMember)
        .join(Team, Team.id == TeamMember.team_id)
        .where(
            TeamMember.player_id == player_id,
            TeamMember.is_active == True,
            Team.created_by_admin_id == admin_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise ForbiddenError("Player not in your teams")
    return member
