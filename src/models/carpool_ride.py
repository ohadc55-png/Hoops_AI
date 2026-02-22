"""HOOPS AI - Carpool Ride (parent offers ride to team event)"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class CarpoolRide(Base, TimestampMixin):
    __tablename__ = "carpool_rides"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_event_id: Mapped[int] = mapped_column(Integer, ForeignKey("team_events.id"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    driver_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    neighborhood: Mapped[str] = mapped_column(String(100), nullable=False)
    available_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    departure_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    meeting_point: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    direction: Mapped[str] = mapped_column(String(20), nullable=False, default="to_event")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    team_event = relationship("TeamEvent", foreign_keys=[team_event_id])
    team = relationship("Team", foreign_keys=[team_id])
    driver = relationship("User", foreign_keys=[driver_user_id])
    passengers = relationship("CarpoolPassenger", back_populates="ride", cascade="all, delete-orphan")
