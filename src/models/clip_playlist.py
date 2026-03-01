"""HOOPS AI - Clip Playlist Models (collections of clips across videos)"""
from sqlalchemy import Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class ClipPlaylist(Base, TimestampMixin):
    __tablename__ = "clip_playlists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    team_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("teams.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    shared_with_team: Mapped[bool] = mapped_column(Boolean, default=False)
    shared_with_parents: Mapped[bool] = mapped_column(Boolean, default=False)

    items = relationship("PlaylistItem", back_populates="playlist", cascade="all, delete-orphan", order_by="PlaylistItem.sort_order")


class PlaylistItem(Base, TimestampMixin):
    __tablename__ = "playlist_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    playlist_id: Mapped[int] = mapped_column(Integer, ForeignKey("clip_playlists.id", ondelete="CASCADE"), nullable=False, index=True)
    clip_id: Mapped[int] = mapped_column(Integer, ForeignKey("video_clips.id", ondelete="CASCADE"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    playlist = relationship("ClipPlaylist", back_populates="items")
    clip = relationship("VideoClip")
