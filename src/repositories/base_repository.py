"""
HOOPS AI - Base Repository
Generic CRUD operations for all models.
"""
from typing import TypeVar, Generic, Type, Sequence
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], session: AsyncSession):
        self.model = model
        self.session = session

    async def create(self, **kwargs) -> T:
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def get_by_id(self, id: int) -> T | None:
        return await self.session.get(self.model, id)

    async def get_all(self, limit: int = 100, offset: int = 0) -> Sequence[T]:
        stmt = select(self.model).limit(limit).offset(offset).order_by(self.model.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_coach_id(self, coach_id: int, limit: int = 100, offset: int = 0) -> Sequence[T]:
        stmt = (
            select(self.model)
            .where(self.model.coach_id == coach_id)
            .limit(limit).offset(offset)
            .order_by(self.model.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update(self, id: int, **kwargs) -> T | None:
        instance = await self.get_by_id(id)
        if not instance:
            return None
        for key, value in kwargs.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def delete(self, id: int) -> bool:
        instance = await self.get_by_id(id)
        if not instance:
            return False
        await self.session.delete(instance)
        await self.session.flush()
        return True
