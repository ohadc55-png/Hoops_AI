"""HOOPS AI - Report Request (admin requests coaches to fill evaluations)"""
from datetime import date as date_type
from sqlalchemy import String, Integer, Text, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class ReportRequest(Base, TimestampMixin):
    __tablename__ = "report_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    coach_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=True, index=True)  # null = all coaches in team
    team_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("teams.id"), nullable=True, index=True)

    report_type: Mapped[str] = mapped_column(String(30), nullable=False, default="player_evaluation")
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)  # weekly, monthly, semi_annual, annual
    due_date: Mapped[date_type] = mapped_column(Date, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status: pending, completed, overdue
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)

    # Relationships
    admin = relationship("User", foreign_keys=[admin_id])
    coach = relationship("Coach", backref="report_requests")
    team = relationship("Team")
    evaluations = relationship("PlayerEvaluation", back_populates="report_request")
