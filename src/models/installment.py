"""HOOPS AI - Installment (single payment within a PaymentPlan)"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, Numeric, Text, Date, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class Installment(Base, TimestampMixin):
    __tablename__ = "installments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("payment_plans.id"), nullable=False, index=True)
    # Denormalized for easy querying
    player_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)

    installment_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..N
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    due_date: Mapped[str | None] = mapped_column(Date, nullable=True)

    # status: "pending", "paid", "overdue"
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    paid_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    # payment_method can override the plan's default
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    marked_by_admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    admin_acknowledged: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default=text("true"))

    # Relationships
    plan = relationship("PaymentPlan", back_populates="installments")
    player = relationship("Player", foreign_keys=[player_id])
    team = relationship("Team", foreign_keys=[team_id])
    marked_by = relationship("User", foreign_keys=[marked_by_admin_id])
