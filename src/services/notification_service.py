"""HOOPS AI - Platform Notification Service"""
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.notification_repository import NotificationRepository


class NotificationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = NotificationRepository(session)

    async def create(
        self,
        title: str,
        notification_type: str = "system",
        priority: str = "medium",
        body: str | None = None,
        club_id: int | None = None,
        action_url: str | None = None,
    ) -> dict:
        notif = await self.repo.create(
            title=title,
            type=notification_type,
            priority=priority,
            body=body,
            club_id=club_id,
            action_url=action_url,
        )
        return _serialize(notif)

    async def get_unread(self, limit: int = 50) -> list[dict]:
        notifs = await self.repo.get_unread(limit)
        return [_serialize(n) for n in notifs]

    async def get_unread_count(self) -> int:
        return await self.repo.get_unread_count()

    async def get_all(
        self,
        is_read: bool | None = None,
        priority: str | None = None,
        notification_type: str | None = None,
        club_id: int | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        notifs = await self.repo.get_all_with_filters(
            is_read=is_read,
            priority=priority,
            notification_type=notification_type,
            club_id=club_id,
            limit=limit,
            offset=offset,
        )
        return [_serialize(n) for n in notifs]

    async def mark_read(self, notification_id: int) -> bool:
        return await self.repo.mark_read(notification_id)

    async def mark_all_read(self) -> int:
        return await self.repo.mark_all_read()


def _serialize(n) -> dict:
    return {
        "id": n.id,
        "type": n.type,
        "priority": n.priority,
        "title": n.title,
        "body": n.body,
        "club_id": n.club_id,
        "is_read": n.is_read,
        "action_url": n.action_url,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }
