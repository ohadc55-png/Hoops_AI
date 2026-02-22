"""HOOPS AI - Club Feature Flag Model"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class ClubFeatureFlag(Base, TimestampMixin):
    __tablename__ = "club_feature_flags"
    __table_args__ = (UniqueConstraint("club_id", "feature_key", name="uq_club_feature"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(Integer, ForeignKey("platform_clubs.id"), nullable=False, index=True)
    feature_key: Mapped[str] = mapped_column(String(50), nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    club = relationship("PlatformClub", back_populates="feature_flags")


# All controllable feature keys
FEATURE_KEYS = [
    "ai_chat_coach_full",       # Coach AI chat with all 8 agents (OFF = only 3 core agents)
    "ai_chat_player",           # Player AI chat (5 agents)
    "play_creator",             # Interactive play design tool
    "drill_generator",          # AI drill creation + player assignment
    "practice_planner",         # AI practice session planning
    "reports_evaluations",      # Attendance, game reports, player assessments
    "video_room",               # Video hosting, clips, telestrator, scouting
    "knowledge_base",           # RAG document upload + AI integration
    "billing_payments",         # Parent payment collection system
    "messaging",                # Universal messaging
    "carpool",                  # Parent carpool coordination
    "media_gallery",            # Team photo/video galleries
    "ai_insights",              # Admin-level financial + professional AI reports
    "schedule_management",      # Events, calendar, coach schedule requests
]
