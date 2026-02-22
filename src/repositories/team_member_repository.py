"""HOOPS AI - Team Member Repository"""
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.team_member import TeamMember
from src.repositories.base_repository import BaseRepository


class TeamMemberRepository(BaseRepository[TeamMember]):
    def __init__(self, session: AsyncSession):
        super().__init__(TeamMember, session)

    async def get_by_team(self, team_id: int) -> Sequence[TeamMember]:
        stmt = (
            select(TeamMember)
            .where(TeamMember.team_id == team_id, TeamMember.is_active == True)
            .options(selectinload(TeamMember.user))
            .order_by(TeamMember.joined_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_user(self, user_id: int) -> Sequence[TeamMember]:
        stmt = (
            select(TeamMember)
            .where(TeamMember.user_id == user_id, TeamMember.is_active == True)
            .options(selectinload(TeamMember.team))
            .order_by(TeamMember.joined_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_membership(self, team_id: int, user_id: int) -> TeamMember | None:
        stmt = select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
