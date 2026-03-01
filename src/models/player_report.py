"""HOOPS AI - Player Report Model (Semi-Annual)"""
from sqlalchemy import String, Integer, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin, JSONText


class PlayerReport(Base, TimestampMixin):
    __tablename__ = "player_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    player_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    period: Mapped[str] = mapped_column(String(20), nullable=False)  # "2025-H2", "2026-H1"
    strengths: Mapped[list | None] = mapped_column(JSONText, nullable=True)
    weaknesses: Mapped[list | None] = mapped_column(JSONText, nullable=True)
    focus_areas: Mapped[list | None] = mapped_column(JSONText, nullable=True)
    progress_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendations: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Structured ratings (added for progress tracking)
    overall_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-10
    personal_improvement_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-10
    personal_improvement_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    team_contribution_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-10
    team_contribution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    coach = relationship("Coach", back_populates="player_reports")
    player = relationship("Player")
