"""
HOOPS AI - Event Model (Calendar)
"""
from sqlalchemy import String, Integer, Text, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date as date_type
from src.utils.database import Base
from src.models.base import TimestampMixin


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    time: Mapped[str | None] = mapped_column(String(10), nullable=True)  # "HH:MM"
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)  # practice, game, tournament, meeting
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    opponent: Mapped[str | None] = mapped_column(String(100), nullable=True)
    facility_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("facilities.id"), nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurrence_group: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    coach = relationship("Coach", back_populates="events")
    facility = relationship("Facility", foreign_keys=[facility_id])
