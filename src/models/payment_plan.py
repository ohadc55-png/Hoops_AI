"""HOOPS AI - PaymentPlan (annual payment contract per player)"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class PaymentPlan(Base, TimestampMixin):
    __tablename__ = "payment_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    player_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    created_by_admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    season: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g. "2025-2026"

    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    num_installments: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    billing_day: Mapped[int] = mapped_column(Integer, nullable=False, default=10)  # day of month
    start_month: Mapped[str] = mapped_column(String(7), nullable=False)  # e.g. "2025-09"

    # payment_method: "credit_card", "check", "cash", "bank_transfer"
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False, default="credit_card")

    description: Mapped[str | None] = mapped_column(String(300), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    player = relationship("Player", foreign_keys=[player_id])
    team = relationship("Team", foreign_keys=[team_id])
    created_by = relationship("User", foreign_keys=[created_by_admin_id])
    installments = relationship("Installment", back_populates="plan", cascade="all, delete-orphan", order_by="Installment.installment_number")
