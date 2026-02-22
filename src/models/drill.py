"""
HOOPS AI - Drill Model
"""
from sqlalchemy import String, Integer, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin, JSONText


class Drill(Base, TimestampMixin):
    __tablename__ = "drills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # offense, defense, shooting, etc.
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)  # beginner, intermediate, advanced
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    coaching_points: Mapped[dict | None] = mapped_column(JSONText, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSONText, nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    coach = relationship("Coach", back_populates="drills")
    assignments = relationship("DrillAssignment", back_populates="drill", cascade="all, delete-orphan")
    segments = relationship("SessionSegment", back_populates="drill")
