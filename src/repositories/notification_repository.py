"""HOOPS AI - Platform Notification Repository"""
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.base_repository import BaseRepository
from src.models.platform_notification import PlatformNotification


class NotificationRepository(BaseRepository[PlatformNotification]):
    def __init__(self, session: AsyncSession):
        super().__init__(PlatformNotification, session)

    async def get_unread(self, limit: int = 50) -> list[PlatformNotification]:
        stmt = (
            select(PlatformNotification)
            .where(PlatformNotification.is_read == False)
            .order_by(PlatformNotification.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_unread_count(self) -> int:
        stmt = select(func.count(PlatformNotification.id)).where(
            PlatformNotification.is_read == False
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_all_with_filters(
        self,
        is_read: bool | None = None,
        priority: str | None = None,
        notification_type: str | None = None,
        club_id: int | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[PlatformNotification]:
        stmt = select(PlatformNotification)
        if is_read is not None:
            stmt = stmt.where(PlatformNotification.is_read == is_read)
        if priority:
            stmt = stmt.where(PlatformNotification.priority == priority)
        if notification_type:
            stmt = stmt.where(PlatformNotification.type == notification_type)
        if club_id:
            stmt = stmt.where(PlatformNotification.club_id == club_id)
        stmt = stmt.order_by(PlatformNotification.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def mark_read(self, notification_id: int) -> bool:
        notif = await self.get_by_id(notification_id)
        if not notif:
            return False
        notif.is_read = True
        await self.session.flush()
        return True

    async def mark_all_read(self) -> int:
        stmt = (
            update(PlatformNotification)
            .where(PlatformNotification.is_read == False)
            .values(is_read=True)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount

    async def get_by_priority(self, priority: str, limit: int = 50) -> list[PlatformNotification]:
        stmt = (
            select(PlatformNotification)
            .where(PlatformNotification.priority == priority)
            .order_by(PlatformNotification.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
