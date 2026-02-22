"""HOOPS AI - Team Repository"""
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.team import Team
from src.models.team_member import TeamMember
from src.repositories.base_repository import BaseRepository


class TeamRepository(BaseRepository[Team]):
    def __init__(self, session: AsyncSession):
        super().__init__(Team, session)

    # --- Coach invite lookups ---
    async def get_by_coach_invite_code(self, code: str) -> Team | None:
        stmt = select(Team).where(Team.coach_invite_code == code, Team.is_active == True)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_coach_invite_token(self, token: str) -> Team | None:
        stmt = select(Team).where(Team.coach_invite_token == token, Team.is_active == True)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # --- Player invite lookups ---
    async def get_by_player_invite_code(self, code: str) -> Team | None:
        stmt = select(Team).where(Team.player_invite_code == code, Team.is_active == True)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_player_invite_token(self, token: str) -> Team | None:
        stmt = select(Team).where(Team.player_invite_token == token, Team.is_active == True)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # --- Parent invite lookups ---
    async def get_by_parent_invite_code(self, code: str) -> Team | None:
        stmt = select(Team).where(Team.parent_invite_code == code, Team.is_active == True)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_parent_invite_token(self, token: str) -> Team | None:
        stmt = select(Team).where(Team.parent_invite_token == token, Team.is_active == True)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # --- Admin queries ---
    async def get_by_admin_id(self, admin_id: int, limit: int = 100) -> Sequence[Team]:
        stmt = (
            select(Team)
            .where(Team.created_by_admin_id == admin_id)
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
                selectinload(Team.members).selectinload(TeamMember.player),
            )
            .order_by(Team.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_with_members(self, team_id: int) -> Team | None:
        stmt = (
            select(Team)
            .where(Team.id == team_id)
            .options(
                selectinload(Team.members).selectinload(TeamMember.user),
                selectinload(Team.members).selectinload(TeamMember.player),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
