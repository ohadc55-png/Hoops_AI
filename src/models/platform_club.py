"""HOOPS AI - Platform Club + Registration Link Models"""
import uuid
from datetime import datetime, timedelta
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


def _generate_token():
    return str(uuid.uuid4())


def _default_expiry():
    return datetime.utcnow() + timedelta(days=10)


class PlatformClub(Base, TimestampMixin):
    __tablename__ = "platform_clubs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active, suspended, terminated, pending
    region_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("regions.id"), nullable=True)
    pricing_tier: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-4, null if custom
    custom_price: Mapped[float | None] = mapped_column(Float, nullable=True)  # overrides tier pricing
    max_players: Mapped[int] = mapped_column(Integer, nullable=False, default=150)
    storage_quota_video_gb: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    storage_quota_media_gb: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)  # primary admin
    billing_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    region = relationship("Region", foreign_keys=[region_id])
    admin = relationship("User", foreign_keys=[admin_id])
    registration_links = relationship("ClubRegistrationLink", back_populates="club", cascade="all, delete-orphan")
    feature_flags = relationship("ClubFeatureFlag", back_populates="club", cascade="all, delete-orphan")
    billing_config = relationship("ClubBillingConfig", back_populates="club", uselist=False, cascade="all, delete-orphan")


class ClubRegistrationLink(Base, TimestampMixin):
    __tablename__ = "club_registration_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(Integer, ForeignKey("platform_clubs.id"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True, default=_generate_token)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_default_expiry)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    club = relationship("PlatformClub", back_populates="registration_links")
