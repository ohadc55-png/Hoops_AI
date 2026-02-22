"""HOOPS AI - Standing Carpool (persistent carpool group, not event-specific)"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class StandingCarpool(Base, TimestampMixin):
    __tablename__ = "standing_carpools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    organizer_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    neighborhood: Mapped[str] = mapped_column(String(100), nullable=False)
    max_members: Mapped[int] = mapped_column(Integer, nullable=False, default=6)
    meeting_point: Mapped[str | None] = mapped_column(String(200), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    team = relationship("Team", foreign_keys=[team_id])
    organizer = relationship("User", foreign_keys=[organizer_user_id])
    members = relationship("StandingCarpoolMember", back_populates="carpool", cascade="all, delete-orphan")
    signups = relationship("StandingCarpoolSignup", back_populates="carpool", cascade="all, delete-orphan")


class StandingCarpoolMember(Base, TimestampMixin):
    __tablename__ = "standing_carpool_members"
    __table_args__ = (
        UniqueConstraint("carpool_id", "user_id", name="uq_sc_member"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    carpool_id: Mapped[int] = mapped_column(Integer, ForeignKey("standing_carpools.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    player_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("players.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    carpool = relationship("StandingCarpool", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    player = relationship("Player", foreign_keys=[player_id])


class StandingCarpoolSignup(Base, TimestampMixin):
    __tablename__ = "standing_carpool_signups"
    __table_args__ = (
        UniqueConstraint("carpool_id", "user_id", "team_event_id", name="uq_sc_signup"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    carpool_id: Mapped[int] = mapped_column(Integer, ForeignKey("standing_carpools.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    team_event_id: Mapped[int] = mapped_column(Integer, ForeignKey("team_events.id"), nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    carpool = relationship("StandingCarpool", back_populates="signups")
    user = relationship("User", foreign_keys=[user_id])
    team_event = relationship("TeamEvent", foreign_keys=[team_event_id])
