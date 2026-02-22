"""HOOPS AI - Support Ticket Repository"""
from typing import Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.repositories.base_repository import BaseRepository
from src.models.support_ticket import SupportTicket, TicketMessage


class SupportTicketRepository(BaseRepository[SupportTicket]):
    def __init__(self, session: AsyncSession):
        super().__init__(SupportTicket, session)

    async def get_with_messages(self, ticket_id: int) -> SupportTicket | None:
        stmt = (
            select(SupportTicket)
            .options(selectinload(SupportTicket.messages))
            .where(SupportTicket.id == ticket_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_club(self, club_id: int, status: str | None = None, limit: int = 100) -> Sequence[SupportTicket]:
        stmt = select(SupportTicket).where(SupportTicket.club_id == club_id)
        if status:
            stmt = stmt.where(SupportTicket.status == status)
        stmt = stmt.order_by(SupportTicket.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_all_with_filters(
        self,
        status: str | None = None,
        priority: str | None = None,
        category: str | None = None,
        club_id: int | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[SupportTicket]:
        stmt = select(SupportTicket)
        if status:
            stmt = stmt.where(SupportTicket.status == status)
        if priority:
            stmt = stmt.where(SupportTicket.priority == priority)
        if category:
            stmt = stmt.where(SupportTicket.category == category)
        if club_id:
            stmt = stmt.where(SupportTicket.club_id == club_id)
        if search:
            stmt = stmt.where(SupportTicket.subject.ilike(f"%{search}%"))
        stmt = stmt.order_by(SupportTicket.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def count_by_status(self) -> dict[str, int]:
        result = await self.session.execute(
            select(SupportTicket.status, func.count(SupportTicket.id))
            .group_by(SupportTicket.status)
        )
        return {row[0]: row[1] for row in result.all()}


class TicketMessageRepository(BaseRepository[TicketMessage]):
    def __init__(self, session: AsyncSession):
        super().__init__(TicketMessage, session)

    async def get_by_ticket(self, ticket_id: int) -> Sequence[TicketMessage]:
        stmt = (
            select(TicketMessage)
            .where(TicketMessage.ticket_id == ticket_id)
            .order_by(TicketMessage.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
