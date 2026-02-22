"""HOOPS AI - Play View Model (player view tracking)"""
from datetime import datetime
from sqlalchemy import Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base


class PlayView(Base):
    __tablename__ = "play_views"
    __table_args__ = (UniqueConstraint("play_id", "user_id", name="uq_play_user_view"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    play_id: Mapped[int] = mapped_column(Integer, ForeignKey("plays.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    viewed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    play = relationship("Play")
    user = relationship("User")
