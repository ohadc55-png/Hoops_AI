"""HOOPS AI - Message Recipient (delivery + read tracking)"""
from sqlalchemy import Integer, Boolean, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base


class MessageRecipient(Base):
    __tablename__ = "message_recipients"
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_msg_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message_id: Mapped[int] = mapped_column(Integer, ForeignKey("club_messages.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[str | None] = mapped_column(DateTime, nullable=True)

    message = relationship("ClubMessage", back_populates="recipients")
    user = relationship("User", foreign_keys=[user_id])
