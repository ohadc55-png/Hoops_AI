"""HOOPS AI - Team Subscription (monthly fee per team)"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class TeamSubscription(Base, TimestampMixin):
    __tablename__ = "team_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    created_by_admin_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="ILS", nullable=False)
    billing_day: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    team = relationship("Team", foreign_keys=[team_id])
    created_by = relationship("User", foreign_keys=[created_by_admin_id])
