"""HOOPS AI - Club Message Model"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class ClubMessage(Base, TimestampMixin):
    __tablename__ = "club_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Who sent it
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sender_role: Mapped[str] = mapped_column(String(20), nullable=False)

    # Content
    subject: Mapped[str | None] = mapped_column(String(200), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(String(20), nullable=False, default="general")

    # Targeting
    target_type: Mapped[str] = mapped_column(String(30), nullable=False)
    target_team_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    # Scheduling (admin only)
    is_scheduled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scheduled_at: Mapped[str | None] = mapped_column(DateTime, nullable=True)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sent_at: Mapped[str | None] = mapped_column(DateTime, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    recipients = relationship("MessageRecipient", back_populates="message", cascade="all, delete-orphan")
