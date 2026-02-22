"""HOOPS AI - AI Insight Report (saved weekly/manual reports from AI agents)"""
from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class InsightReport(Base, TimestampMixin):
    __tablename__ = "insight_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    agent_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # "financial" or "professional"
    report_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # "weekly_auto", "weekly_manual", "custom"
    content: Mapped[str] = mapped_column(Text, nullable=False)

    admin = relationship("User", foreign_keys=[admin_id])
