"""HOOPS AI - Club Message Repository"""
from typing import Sequence
from datetime import datetime, timezone
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.club_message import ClubMessage
from src.models.message_recipient import MessageRecipient
from src.repositories.base_repository import BaseRepository


class ClubMessageRepository(BaseRepository[ClubMessage]):
    def __init__(self, session: AsyncSession):
        super().__init__(ClubMessage, session)

    async def get_sent_by_user(self, user_id: int, limit: int = 50) -> Sequence[ClubMessage]:
        stmt = (
            select(ClubMessage)
            .where(ClubMessage.sender_id == user_id, ClubMessage.is_active == True)
            .order_by(ClubMessage.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_scheduled_unsent(self) -> Sequence[ClubMessage]:
        stmt = (
            select(ClubMessage)
            .where(
                ClubMessage.is_scheduled == True,
                ClubMessage.is_sent == False,
                ClubMessage.is_active == True,
                ClubMessage.scheduled_at <= datetime.now(timezone.utc),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_scheduled_by_sender(self, sender_id: int) -> Sequence[ClubMessage]:
        stmt = (
            select(ClubMessage)
            .where(
                ClubMessage.sender_id == sender_id,
                ClubMessage.is_scheduled == True,
                ClubMessage.is_sent == False,
                ClubMessage.is_active == True,
            )
            .order_by(ClubMessage.scheduled_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()


class MessageRecipientRepository(BaseRepository[MessageRecipient]):
    def __init__(self, session: AsyncSession):
        super().__init__(MessageRecipient, session)

    async def get_inbox(self, user_id: int, unread_only: bool = False, limit: int = 50) -> Sequence[MessageRecipient]:
        stmt = (
            select(MessageRecipient)
            .join(ClubMessage, MessageRecipient.message_id == ClubMessage.id)
            .where(
                MessageRecipient.user_id == user_id,
                ClubMessage.is_active == True,
                ClubMessage.is_sent == True,
            )
            .options(
                selectinload(MessageRecipient.message).selectinload(ClubMessage.sender),
            )
            .order_by(ClubMessage.created_at.desc())
            .limit(limit)
        )
        if unread_only:
            stmt = stmt.where(MessageRecipient.is_read == False)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_unread_count(self, user_id: int) -> int:
        stmt = (
            select(func.count(MessageRecipient.id))
            .join(ClubMessage, MessageRecipient.message_id == ClubMessage.id)
            .where(
                MessageRecipient.user_id == user_id,
                MessageRecipient.is_read == False,
                ClubMessage.is_active == True,
                ClubMessage.is_sent == True,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def mark_as_read(self, message_id: int, user_id: int) -> bool:
        stmt = (
            update(MessageRecipient)
            .where(
                MessageRecipient.message_id == message_id,
                MessageRecipient.user_id == user_id,
            )
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0

    async def mark_all_read(self, user_id: int) -> int:
        stmt = (
            update(MessageRecipient)
            .where(
                MessageRecipient.user_id == user_id,
                MessageRecipient.is_read == False,
            )
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount

    async def get_recipients_for_message(self, message_id: int) -> Sequence[MessageRecipient]:
        stmt = (
            select(MessageRecipient)
            .where(MessageRecipient.message_id == message_id)
            .options(selectinload(MessageRecipient.user))
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
