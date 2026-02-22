"""HOOPS AI - Platform Notification Model"""
from sqlalchemy import Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from src.utils.database import Base
from src.models.base import TimestampMixin


NOTIFICATION_TYPES = [
    "storage_threshold",   # Club approaching storage limit
    "tier_threshold",      # Club approaching player tier limit
    "payment_overdue",     # Invoice overdue
    "payment_received",    # Payment confirmed
    "new_ticket",          # New support ticket from club
    "ticket_reply",        # Club replied to support ticket
    "club_registered",     # New club admin registered
    "billing_cycle",       # Billing cycle ran (invoices created)
    "system",              # Generic system notification
]

NOTIFICATION_PRIORITIES = ["low", "medium", "high", "urgent"]


class PlatformNotification(Base, TimestampMixin):
    __tablename__ = "platform_notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="system")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    club_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("platform_clubs.id"), nullable=True, index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
