"""HOOPS AI - AI Usage Log Model"""
from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from src.utils.database import Base
from src.models.base import TimestampMixin


class AIUsageLog(Base, TimestampMixin):
    __tablename__ = "ai_usage_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)  # resolved from user's admin
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    coach_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agent_name: Mapped[str | None] = mapped_column(String(50), nullable=True)  # agent key
    agent_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # coach, player, system
    tokens_in: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    model: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cost_estimate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
