"""HOOPS AI - Clip View Model (player watch confirmation)"""
from datetime import datetime
from sqlalchemy import Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base


class ClipView(Base):
    __tablename__ = "clip_views"
    __table_args__ = (UniqueConstraint("clip_id", "user_id", name="uq_clip_user_view"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clip_id: Mapped[int] = mapped_column(Integer, ForeignKey("video_clips.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    watched_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    clip = relationship("VideoClip", back_populates="views")
    user = relationship("User")
