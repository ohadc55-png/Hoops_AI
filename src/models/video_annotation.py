"""HOOPS AI - Video Annotation Model (Telestrator strokes)"""
from sqlalchemy import Integer, String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin, JSONText


class VideoAnnotation(Base, TimestampMixin):
    __tablename__ = "video_annotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    video_id: Mapped[int] = mapped_column(Integer, ForeignKey("scouting_videos.id", ondelete="CASCADE"), nullable=False, index=True)
    clip_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("video_clips.id", ondelete="SET NULL"), nullable=True, index=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)

    annotation_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # annotation_type: arrow, circle, freehand, text
    timestamp: Mapped[float] = mapped_column(Float, nullable=False)  # video time (seconds)
    duration: Mapped[float] = mapped_column(Float, nullable=False, default=3.0)
    stroke_data: Mapped[dict | None] = mapped_column(JSONText, nullable=True)
    # stroke_data JSON (coords as % 0-100):
    #   freehand: {points: [{x, y}, ...]}
    #   arrow:    {x1, y1, x2, y2}
    #   circle:   {cx, cy, r}
    #   text:     {x, y, fontSize}
    color: Mapped[str] = mapped_column(String(10), nullable=False, default="#FF0000")
    stroke_width: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    text_content: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    video = relationship("ScoutingVideo", back_populates="annotations")
    clip = relationship("VideoClip", back_populates="annotations")
