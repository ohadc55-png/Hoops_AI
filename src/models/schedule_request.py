"""HOOPS AI - Schedule Request (coach submits, admin approves/rejects)"""
from datetime import date as date_type, datetime
from sqlalchemy import String, Integer, ForeignKey, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class ScheduleRequest(Base, TimestampMixin):
    __tablename__ = "schedule_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    time_start: Mapped[str | None] = mapped_column(String(5), nullable=True)
    time_end: Mapped[str | None] = mapped_column(String(5), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    opponent: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    repeat_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Status: pending, approved, rejected
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    admin_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by_admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # FK to the created TeamEvent (set when approved)
    created_event_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("team_events.id"), nullable=True)

    # Relationships
    coach = relationship("Coach", backref="schedule_requests")
    team = relationship("Team")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_admin_id])
