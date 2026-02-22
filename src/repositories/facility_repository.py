"""HOOPS AI - Facility Repository"""
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.facility import Facility
from src.repositories.base_repository import BaseRepository


class FacilityRepository(BaseRepository[Facility]):
    def __init__(self, session: AsyncSession):
        super().__init__(Facility, session)

    async def get_by_admin_id(self, admin_id: int) -> Sequence[Facility]:
        stmt = (
            select(Facility)
            .where(Facility.admin_id == admin_id)
            .order_by(Facility.name.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
