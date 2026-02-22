"""HOOPS AI - Super Admin Repository"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.super_admin import SuperAdmin
from src.repositories.base_repository import BaseRepository


class SuperAdminRepository(BaseRepository[SuperAdmin]):
    def __init__(self, session: AsyncSession):
        super().__init__(SuperAdmin, session)

    async def get_by_email(self, email: str) -> SuperAdmin | None:
        stmt = select(SuperAdmin).where(SuperAdmin.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
