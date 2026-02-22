"""HOOPS AI - Scouting Video Model"""
from datetime import datetime
from sqlalchemy import Integer, String, Text, Float, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class ScoutingVideo(Base, TimestampMixin):
    __tablename__ = "scouting_videos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    team_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("teams.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_type: Mapped[str] = mapped_column(String(30), nullable=False, default="game")
    # video_type: game, practice, opponent_scout, highlight, other

    # Cloudinary fields
    cloudinary_public_id: Mapped[str] = mapped_column(String(500), nullable=False)
    cloudinary_url: Mapped[str] = mapped_column(String(500), nullable=False)
    cloudinary_hls_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    original_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    opponent: Mapped[str | None] = mapped_column(String(200), nullable=True)
    game_date: Mapped[str | None] = mapped_column(String(20), nullable=True)  # YYYY-MM-DD
    shared_with_team: Mapped[bool] = mapped_column(Boolean, default=False)
    shared_with_parents: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    keep_forever: Mapped[bool] = mapped_column(Boolean, default=False)
    expiry_notified_48h: Mapped[bool] = mapped_column(Boolean, default=False)
    expiry_notified_6h: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    coach = relationship("Coach", foreign_keys=[coach_id])
    team = relationship("Team", foreign_keys=[team_id])
    clips = relationship("VideoClip", back_populates="video", cascade="all, delete-orphan")
    annotations = relationship("VideoAnnotation", back_populates="video", cascade="all, delete-orphan")
