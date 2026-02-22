"""HOOPS AI - Team Model"""
import uuid
import random
import string
from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


def _generate_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def _generate_uuid():
    return str(uuid.uuid4())


class Team(Base, TimestampMixin):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    club_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    age_group: Mapped[str | None] = mapped_column(String(50), nullable=True)
    level: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Admin who created this team (FK to users table, not coaches!)
    created_by_admin_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Coach invite — admin gives this to a coach so they can join the team
    coach_invite_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, default=_generate_code)
    coach_invite_token: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, default=_generate_uuid)

    # Player invite — coach gives this to players so they can join
    player_invite_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, default=_generate_code)
    player_invite_token: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, default=_generate_uuid)

    # Parent invite — coach gives this to parents
    parent_invite_code: Mapped[str | None] = mapped_column(String(10), unique=True, nullable=True, default=_generate_code)
    parent_invite_token: Mapped[str | None] = mapped_column(String(36), unique=True, nullable=True, default=_generate_uuid)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    created_by_admin = relationship("User", foreign_keys=[created_by_admin_id])
