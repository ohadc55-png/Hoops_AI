"""HOOPS AI - Player Evaluation Model (structured coaching assessment)"""
from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class PlayerEvaluation(Base, TimestampMixin):
    __tablename__ = "player_evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    player_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False, index=True)

    # Period
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)  # weekly, monthly, semi_annual, annual
    period_label: Mapped[str] = mapped_column(String(30), nullable=False)  # "2026-W08", "2026-02", "2026-H1", "2025-2026"

    # 9 rating categories (1-10 each + free text notes)
    offensive_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    offensive_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    defensive_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    defensive_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    iq_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    iq_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    social_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    social_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    leaving_risk: Mapped[int | None] = mapped_column(Integer, nullable=True)
    leaving_risk_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    leadership_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    leadership_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    work_ethic_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    work_ethic_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    fitness_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fitness_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    improvement_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    improvement_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # General text fields
    overall_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    potential_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Optional link to admin report request
    report_request_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("report_requests.id"), nullable=True, index=True)

    # Relationships
    coach = relationship("Coach", backref="player_evaluations")
    player = relationship("Player")
    report_request = relationship("ReportRequest", back_populates="evaluations")
