"""HOOPS AI - User Model (unified auth for all roles)"""
from datetime import date
from sqlalchemy import String, Integer, Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", "role", name="uq_user_email_role"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="player")  # admin, coach, player, parent
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Admin sub-role (label only, does not restrict access)
    admin_role_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("admin_roles.id"), nullable=True)

    # Relationships
    team_memberships = relationship("TeamMember", back_populates="user", cascade="all, delete-orphan")
    admin_role = relationship("AdminRole", foreign_keys=[admin_role_id])
