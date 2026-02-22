"""
HOOPS AI - Coach Model
"""
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class Coach(Base, TimestampMixin):
    __tablename__ = "coaches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    team_name: Mapped[str] = mapped_column(String(100), nullable=True)
    age_group: Mapped[str] = mapped_column(String(50), nullable=True)
    level: Mapped[str] = mapped_column(String(50), nullable=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, unique=True)

    # Relationships
    conversations = relationship("Conversation", back_populates="coach", cascade="all, delete-orphan")
    drills = relationship("Drill", back_populates="coach", cascade="all, delete-orphan")
    practice_sessions = relationship("PracticeSession", back_populates="coach", cascade="all, delete-orphan")
    plays = relationship("Play", back_populates="coach", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="coach", cascade="all, delete-orphan")
    players = relationship("Player", back_populates="coach", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="coach", cascade="all, delete-orphan")
    game_reports = relationship("GameReport", back_populates="coach", cascade="all, delete-orphan")
    player_reports = relationship("PlayerReport", back_populates="coach", cascade="all, delete-orphan")
