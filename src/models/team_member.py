"""HOOPS AI - Team Membership Model"""
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base


class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_in_team: Mapped[str] = mapped_column(String(20), nullable=False, default="player")  # coach, player, parent
    player_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("players.id"), nullable=True, index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")
    player = relationship("Player", foreign_keys=[player_id])
