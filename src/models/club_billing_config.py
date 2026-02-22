"""HOOPS AI - Club Billing Config Model"""
from datetime import date
from sqlalchemy import String, Integer, Boolean, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class ClubBillingConfig(Base, TimestampMixin):
    __tablename__ = "club_billing_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(Integer, ForeignKey("platform_clubs.id"), unique=True, nullable=False)
    payment_method_token: Mapped[str | None] = mapped_column(String(500), nullable=True)  # token from Tranzila/Grow
    billing_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_day: Mapped[int] = mapped_column(Integer, nullable=False, default=10)  # day of month
    next_billing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_recurring_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    club = relationship("PlatformClub", back_populates="billing_config")
