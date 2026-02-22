"""HOOPS AI - Support Ticket + Ticket Message Models"""
from sqlalchemy import String, Integer, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


TICKET_STATUSES = ["open", "in_progress", "waiting_on_club", "resolved", "closed"]
TICKET_PRIORITIES = ["low", "medium", "high", "urgent"]
TICKET_CATEGORIES = [
    "billing", "technical", "feature_request", "account",
    "bug_report", "general", "onboarding",
]


class SupportTicket(Base, TimestampMixin):
    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(Integer, ForeignKey("platform_clubs.id"), nullable=False, index=True)
    created_by_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_super_admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("super_admins.id"), nullable=True)

    subject: Mapped[str] = mapped_column(String(300), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="general")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="open")

    # Relationships
    club = relationship("PlatformClub", foreign_keys=[club_id])
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    assigned_to = relationship("SuperAdmin", foreign_keys=[assigned_to_super_admin_id])
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at.asc()")


class TicketMessage(Base, TimestampMixin):
    __tablename__ = "ticket_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[int] = mapped_column(Integer, ForeignKey("support_tickets.id"), nullable=False, index=True)
    sender_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "club_admin" or "super_admin"
    sender_id: Mapped[int] = mapped_column(Integer, nullable=False)  # user_id or super_admin_id
    sender_name: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)  # internal notes (super admin only)

    # Relationships
    ticket = relationship("SupportTicket", back_populates="messages")
