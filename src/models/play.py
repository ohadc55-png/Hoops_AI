"""
HOOPS AI - Play Model (Basketball Play Creator)
"""
from sqlalchemy import String, Integer, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin, JSONText


class Play(Base, TimestampMixin):
    __tablename__ = "plays"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    offense_template: Mapped[str | None] = mapped_column(String(50), nullable=True)
    defense_template: Mapped[str | None] = mapped_column(String(50), nullable=True)
    players: Mapped[list | None] = mapped_column(JSONText, nullable=True)
    actions: Mapped[list | None] = mapped_column(JSONText, nullable=True)
    ball_holder_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    thumbnail: Mapped[str | None] = mapped_column(Text, nullable=True)  # base64 or URL
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    shared_with_team: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    team_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("teams.id"), nullable=True, index=True)

    coach = relationship("Coach", back_populates="plays")
    team = relationship("Team", foreign_keys=[team_id])
