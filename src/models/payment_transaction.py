"""HOOPS AI - Platform Payment Transaction Model"""
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


TRANSACTION_STATUSES = ["pending", "completed", "failed", "refunded"]
PAYMENT_METHODS = ["credit_card", "bank_transfer", "cash", "check", "other"]


class PlatformPaymentTransaction(Base, TimestampMixin):
    __tablename__ = "platform_payment_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(Integer, ForeignKey("platform_clubs.id"), nullable=False, index=True)
    invoice_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("platform_invoices.id"), nullable=True, index=True)

    # Payment details
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="ILS")
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False, default="credit_card")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    # Gateway details (for future Tranzila/Grow integration)
    gateway_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gateway_transaction_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    gateway_response: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    club = relationship("PlatformClub", foreign_keys=[club_id])
    invoice = relationship("PlatformInvoice", foreign_keys=[invoice_id])
