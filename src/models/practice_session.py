"""
HOOPS AI - Practice Session & Segment Models
"""
from sqlalchemy import String, Integer, Text, Boolean, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date as date_type
from src.utils.database import Base
from src.models.base import TimestampMixin, JSONText


class PracticeSession(Base, TimestampMixin):
    __tablename__ = "practice_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    focus: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    # Post-practice summary (structured)
    goal_achieved: Mapped[str | None] = mapped_column(String(20), nullable=True)   # 'yes' | 'partial' | 'no'
    what_worked: Mapped[str | None] = mapped_column(Text, nullable=True)
    what_didnt_work: Mapped[str | None] = mapped_column(Text, nullable=True)
    standout_players: Mapped[list | None] = mapped_column(JSONText, nullable=True)  # max 2 names
    attention_players: Mapped[list | None] = mapped_column(JSONText, nullable=True) # max 2 names

    coach = relationship("Coach", back_populates="practice_sessions")
    segments = relationship("SessionSegment", back_populates="session", cascade="all, delete-orphan", order_by="SessionSegment.order_index")


class SessionSegment(Base, TimestampMixin):
    __tablename__ = "session_segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("practice_sessions.id"), nullable=False, index=True)
    drill_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("drills.id"), nullable=True)
    segment_type: Mapped[str] = mapped_column(String(30), nullable=False)  # warmup, drill, scrimmage, cooldown, break, film_study
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    session = relationship("PracticeSession", back_populates="segments")
    drill = relationship("Drill", back_populates="segments")
