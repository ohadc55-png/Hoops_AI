"""HOOPS AI - Team Event (admin-managed schedule)"""
from datetime import date as date_type
from sqlalchemy import String, Integer, Boolean, ForeignKey, Date, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class TeamEvent(Base, TimestampMixin):
    __tablename__ = "team_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    created_by_admin_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # event_type values: "practice", "game", "meeting", "tournament", "other"
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    time_start: Mapped[str | None] = mapped_column(String(5), nullable=True)   # "20:00"
    time_end: Mapped[str | None] = mapped_column(String(5), nullable=True)     # "21:30"
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    facility_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("facilities.id"), nullable=True)
    opponent: Mapped[str | None] = mapped_column(String(100), nullable=True)   # for games
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Away game transport
    is_away: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    departure_time: Mapped[str | None] = mapped_column(String(5), nullable=True)     # "18:30" HH:MM
    venue_address: Mapped[str | None] = mapped_column(String(500), nullable=True)    # Full address for Google Maps

    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recurrence_group: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    team = relationship("Team", foreign_keys=[team_id])
    created_by = relationship("User", foreign_keys=[created_by_admin_id])
    facility = relationship("Facility", foreign_keys=[facility_id])
