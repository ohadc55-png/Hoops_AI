"""HOOPS AI - Attendance Model"""
from sqlalchemy import Integer, Text, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class Attendance(Base, TimestampMixin):
    __tablename__ = "attendances"
    __table_args__ = (UniqueConstraint("event_id", "player_id", name="uq_attendance_event_player"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    event_id: Mapped[int] = mapped_column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    player_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    present: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    coach = relationship("Coach", back_populates="attendances")
    event = relationship("Event")
    player = relationship("Player")
