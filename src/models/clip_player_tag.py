"""HOOPS AI - Clip Player Tag Model (join table)"""
from sqlalchemy import Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base


class ClipPlayerTag(Base):
    __tablename__ = "clip_player_tags"
    __table_args__ = (UniqueConstraint("clip_id", "player_id", name="uq_clip_player"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clip_id: Mapped[int] = mapped_column(Integer, ForeignKey("video_clips.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False, index=True)

    clip = relationship("VideoClip", back_populates="player_tags")
    player = relationship("Player")
