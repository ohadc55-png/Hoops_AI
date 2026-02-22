"""HOOPS AI - Drill Assignment Model"""
from datetime import datetime
from sqlalchemy import Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class DrillAssignment(Base, TimestampMixin):
    __tablename__ = "drill_assignments"
    __table_args__ = (UniqueConstraint("drill_id", "player_id", name="uq_drill_player"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    drill_id: Mapped[int] = mapped_column(Integer, ForeignKey("drills.id"), nullable=False, index=True)
    player_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Video Proof fields
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending", nullable=False)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    coach_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    drill = relationship("Drill", back_populates="assignments")
    player = relationship("Player")
