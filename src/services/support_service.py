"""HOOPS AI - Support Ticket Service"""
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.support_repository import SupportTicketRepository, TicketMessageRepository
from src.models.support_ticket import (
    SupportTicket, TicketMessage,
    TICKET_STATUSES, TICKET_CATEGORIES, TICKET_PRIORITIES,
)
from src.utils.feature_gate import get_club_id_for_admin
from src.services.notification_service import NotificationService
from src.utils.exceptions import NotFoundError, ValidationError


class SupportService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.ticket_repo = SupportTicketRepository(session)
        self.msg_repo = TicketMessageRepository(session)
        self.notif_service = NotificationService(session)

    # ─── Club Admin Actions ─────────────────────────────

    async def create_ticket(
        self,
        user_id: int,
        subject: str,
        body: str,
        category: str = "general",
        priority: str = "medium",
        sender_name: str = "",
    ) -> dict:
        """Club admin creates a support ticket."""
        if category not in TICKET_CATEGORIES:
            category = "general"
        if priority not in TICKET_PRIORITIES:
            priority = "medium"

        # Resolve club_id from admin user
        club_id = await get_club_id_for_admin(user_id, self.session)
        if not club_id:
            raise NotFoundError("Club")

        ticket = await self.ticket_repo.create(
            club_id=club_id,
            created_by_user_id=user_id,
            subject=subject,
            category=category,
            priority=priority,
            status="open",
        )

        # Add initial message
        msg = TicketMessage(
            ticket_id=ticket.id,
            sender_type="club_admin",
            sender_id=user_id,
            sender_name=sender_name,
            body=body,
        )
        self.session.add(msg)
        await self.session.flush()

        # Notify super admin
        await self.notif_service.create(
            title=f"New ticket: {subject[:60]}",
            notification_type="new_ticket",
            priority="high" if priority == "urgent" else "medium",
            body=f"Category: {category} | Priority: {priority}",
            club_id=club_id,
            action_url=f"/super-admin/tickets/{ticket.id}",
        )

        return self._serialize_ticket(ticket)

    async def get_club_tickets(self, user_id: int, status: str | None = None) -> list[dict]:
        """Get all tickets for the club admin's club."""
        club_id = await get_club_id_for_admin(user_id, self.session)
        if not club_id:
            return []
        tickets = await self.ticket_repo.get_by_club(club_id, status=status)
        return [self._serialize_ticket(t) for t in tickets]

    async def get_club_ticket_detail(self, user_id: int, ticket_id: int) -> dict | None:
        """Get ticket with messages for club admin (only their club's tickets)."""
        ticket = await self.ticket_repo.get_with_messages(ticket_id)
        if not ticket:
            return None
        # Verify club ownership
        club_id = await get_club_id_for_admin(user_id, self.session)
        if ticket.club_id != club_id:
            return None
        return self._serialize_ticket(ticket, include_messages=True, exclude_internal=True)

    async def club_reply(self, user_id: int, ticket_id: int, body: str, sender_name: str = "") -> dict | None:
        """Club admin replies to a ticket."""
        ticket = await self.ticket_repo.get_by_id(ticket_id)
        if not ticket:
            return None
        club_id = await get_club_id_for_admin(user_id, self.session)
        if ticket.club_id != club_id:
            return None
        if ticket.status in ("closed",):
            raise ValidationError("Cannot reply to a closed ticket")

        msg = TicketMessage(
            ticket_id=ticket_id,
            sender_type="club_admin",
            sender_id=user_id,
            sender_name=sender_name,
            body=body,
        )
        self.session.add(msg)

        # If waiting on club, reopen to open
        if ticket.status == "waiting_on_club":
            ticket.status = "open"

        await self.session.flush()

        # Notify super admin of club reply
        await self.notif_service.create(
            title=f"Ticket #{ticket_id} reply from club",
            notification_type="ticket_reply",
            priority="medium",
            body=body[:120],
            club_id=ticket.club_id,
            action_url=f"/super-admin/tickets/{ticket_id}",
        )

        return {"id": msg.id, "body": msg.body}

    # ─── Super Admin Actions ────────────────────────────

    async def get_all_tickets(
        self,
        status: str | None = None,
        priority: str | None = None,
        category: str | None = None,
        club_id: int | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        tickets = await self.ticket_repo.get_all_with_filters(
            status=status, priority=priority, category=category,
            club_id=club_id, search=search, limit=limit, offset=offset,
        )
        return [self._serialize_ticket(t) for t in tickets]

    async def get_ticket_detail(self, ticket_id: int) -> dict | None:
        """Super admin: get ticket with all messages (including internal)."""
        ticket = await self.ticket_repo.get_with_messages(ticket_id)
        if not ticket:
            return None
        return self._serialize_ticket(ticket, include_messages=True, exclude_internal=False)

    async def admin_reply(
        self,
        ticket_id: int,
        super_admin_id: int,
        body: str,
        sender_name: str = "",
        is_internal: bool = False,
    ) -> dict | None:
        """Super admin replies to a ticket."""
        ticket = await self.ticket_repo.get_by_id(ticket_id)
        if not ticket:
            return None

        msg = TicketMessage(
            ticket_id=ticket_id,
            sender_type="super_admin",
            sender_id=super_admin_id,
            sender_name=sender_name,
            body=body,
            is_internal=is_internal,
        )
        self.session.add(msg)

        # Auto-assign if not assigned
        if not ticket.assigned_to_super_admin_id:
            ticket.assigned_to_super_admin_id = super_admin_id

        # Update status to in_progress if still open
        if ticket.status == "open":
            ticket.status = "in_progress"

        await self.session.flush()
        return {"id": msg.id, "body": msg.body, "is_internal": is_internal}

    async def update_ticket_status(self, ticket_id: int, status: str) -> dict | None:
        if status not in TICKET_STATUSES:
            raise ValidationError(f"Invalid status: {status}")
        ticket = await self.ticket_repo.update(ticket_id, status=status)
        if not ticket:
            return None
        return self._serialize_ticket(ticket)

    async def assign_ticket(self, ticket_id: int, super_admin_id: int) -> dict | None:
        ticket = await self.ticket_repo.update(ticket_id, assigned_to_super_admin_id=super_admin_id)
        if not ticket:
            return None
        return self._serialize_ticket(ticket)

    async def get_ticket_stats(self) -> dict:
        """Ticket queue stats."""
        counts = await self.ticket_repo.count_by_status()
        return {
            "total": sum(counts.values()),
            "open": counts.get("open", 0),
            "in_progress": counts.get("in_progress", 0),
            "waiting_on_club": counts.get("waiting_on_club", 0),
            "resolved": counts.get("resolved", 0),
            "closed": counts.get("closed", 0),
        }

    # ─── Helpers ────────────────────────────────────────

    def _serialize_ticket(self, ticket: SupportTicket, include_messages: bool = False, exclude_internal: bool = False) -> dict:
        data = {
            "id": ticket.id,
            "club_id": ticket.club_id,
            "club_name": ticket.club.name if ticket.club else None,
            "created_by_user_id": ticket.created_by_user_id,
            "created_by_name": ticket.created_by.name if ticket.created_by else None,
            "assigned_to_super_admin_id": ticket.assigned_to_super_admin_id,
            "assigned_to_name": ticket.assigned_to.name if ticket.assigned_to else None,
            "subject": ticket.subject,
            "category": ticket.category,
            "priority": ticket.priority,
            "status": ticket.status,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
        }
        if include_messages and ticket.messages:
            msgs = ticket.messages
            if exclude_internal:
                msgs = [m for m in msgs if not m.is_internal]
            data["messages"] = [
                {
                    "id": m.id,
                    "sender_type": m.sender_type,
                    "sender_name": m.sender_name,
                    "body": m.body,
                    "is_internal": m.is_internal,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in msgs
            ]
        return data
