"""HOOPS AI - Video Clip Model"""
from sqlalchemy import Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class VideoClip(Base, TimestampMixin):
    __tablename__ = "video_clips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    video_id: Mapped[int] = mapped_column(Integer, ForeignKey("scouting_videos.id", ondelete="CASCADE"), nullable=False, index=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # action_type: pick_and_roll, isolation, fast_break, defense, transition,
    # three_pointer, post_up, screen, turnover, rebound, free_throw, out_of_bounds, other
    rating: Mapped[str | None] = mapped_column(String(10), nullable=True)  # "positive" or "negative"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    video = relationship("ScoutingVideo", back_populates="clips")
    player_tags = relationship("ClipPlayerTag", back_populates="clip", cascade="all, delete-orphan")
    annotations = relationship("VideoAnnotation", back_populates="clip")
    views = relationship("ClipView", back_populates="clip", cascade="all, delete-orphan")
