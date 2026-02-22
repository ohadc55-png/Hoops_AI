"""HOOPS AI - Game Report Model"""
from sqlalchemy import String, Integer, Text, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date as date_type
from src.utils.database import Base
from src.models.base import TimestampMixin, JSONText


class GameReport(Base, TimestampMixin):
    __tablename__ = "game_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    event_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("events.id"), nullable=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    opponent: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    result: Mapped[str] = mapped_column(String(10), nullable=False)  # win, loss, draw
    score_us: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_them: Mapped[int | None] = mapped_column(Integer, nullable=True)
    standout_players: Mapped[list | None] = mapped_column(JSONText, nullable=True)
    areas_to_improve: Mapped[list | None] = mapped_column(JSONText, nullable=True)
    notable_events: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    team_event_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("team_events.id"), nullable=True, index=True)

    coach = relationship("Coach", back_populates="game_reports")
    event = relationship("Event")
    team_event = relationship("TeamEvent", foreign_keys=[team_event_id])
