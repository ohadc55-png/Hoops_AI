"""HOOPS AI - Admin Role Repository"""
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.admin_role import AdminRole
from src.repositories.base_repository import BaseRepository


class AdminRoleRepository(BaseRepository[AdminRole]):
    def __init__(self, session: AsyncSession):
        super().__init__(AdminRole, session)

    async def get_all_active(self) -> Sequence[AdminRole]:
        stmt = (
            select(AdminRole)
            .where(AdminRole.is_active == True)
            .order_by(AdminRole.name)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_name(self, name: str) -> AdminRole | None:
        stmt = select(AdminRole).where(AdminRole.name == name)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
