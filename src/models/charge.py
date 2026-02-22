"""HOOPS AI - Charge (billing item per player — both parents see the same charge)"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, Numeric, Text, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class Charge(Base, TimestampMixin):
    __tablename__ = "charges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Which player this charge belongs to (primary link — both parents see it)
    player_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    # Legacy / optional: which parent was originally billed (nullable)
    parent_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)

    # Who created it
    created_by_admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    # Charge details
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    charge_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # charge_type: "monthly", "registration", "event", "equipment", "other"

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="ILS", nullable=False)

    # Billing period (for monthly charges)
    billing_month: Mapped[str | None] = mapped_column(String(7), nullable=True)

    due_date: Mapped[str | None] = mapped_column(Date, nullable=True)

    # Payment status: "pending", "paid", "overdue", "cancelled"
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    # Payment details (when paid)
    paid_at: Mapped[str | None] = mapped_column(DateTime, nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    # payment_method: "cash", "check", "bank_transfer", "credit_card", "other"
    payment_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Who confirmed payment: "parent" or "admin"
    confirmed_by: Mapped[str | None] = mapped_column(String(20), nullable=True)
    confirmed_by_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    # Gateway (future)
    gateway_transaction_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gateway_status: Mapped[str | None] = mapped_column(String(30), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    player = relationship("Player", foreign_keys=[player_id])
    parent_user = relationship("User", foreign_keys=[parent_user_id])
    team = relationship("Team", foreign_keys=[team_id])
    created_by = relationship("User", foreign_keys=[created_by_admin_id])
    confirmed_by_user = relationship("User", foreign_keys=[confirmed_by_user_id])
