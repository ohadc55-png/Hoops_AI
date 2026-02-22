"""
HOOPS AI - Player Model
"""
from sqlalchemy import String, Integer, Float, Text, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin
from datetime import date


class Player(Base, TimestampMixin):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    jersey_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    position: Mapped[str | None] = mapped_column(String(20), nullable=True)  # PG, SG, SF, PF, C
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)  # cm
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)  # kg
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)  # male, female, other
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    parent_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    parent_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, unique=True)

    # Gamification — Attendance Streak
    current_attendance_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    highest_attendance_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    coach = relationship("Coach", back_populates="players")
