"""HOOPS AI - Platform Invoice + Line Item Models"""
from datetime import date
from sqlalchemy import String, Integer, Float, Boolean, Date, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin

# Invoice numbering series
INVOICE_NUMBER_SERIES = {
    "tax_invoice": 100000,
    "receipt": 500000,
    "credit_note": 700000,
    "proforma": 800000,
    "quote": 900000,
}

INVOICE_TYPES = list(INVOICE_NUMBER_SERIES.keys())
INVOICE_STATUSES = ["draft", "sent", "paid", "cancelled", "overdue"]


class PlatformInvoice(Base, TimestampMixin):
    __tablename__ = "platform_invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    club_id: Mapped[int] = mapped_column(Integer, ForeignKey("platform_clubs.id"), nullable=False, index=True)
    invoice_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    invoice_type: Mapped[str] = mapped_column(String(20), nullable=False)  # tax_invoice, receipt, credit_note, quote
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")  # draft, sent, paid, cancelled, overdue

    # Billing details
    billing_name: Mapped[str] = mapped_column(String(200), nullable=False)
    billing_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    billing_tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True)  # ע.מ / ח.פ

    # Amounts (ILS)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    vat_rate: Mapped[float] = mapped_column(Float, nullable=False, default=17.0)  # VAT %
    vat_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    total: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="ILS")

    # Dates
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # References
    reference_invoice_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("platform_invoices.id"), nullable=True)  # for credit notes
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    club = relationship("PlatformClub", foreign_keys=[club_id])
    reference_invoice = relationship("PlatformInvoice", remote_side=[id], foreign_keys=[reference_invoice_id])
    line_items = relationship("PlatformInvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")


class PlatformInvoiceLineItem(Base, TimestampMixin):
    __tablename__ = "platform_invoice_line_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(Integer, ForeignKey("platform_invoices.id"), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    total: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    # Relationships
    invoice = relationship("PlatformInvoice", back_populates="line_items")
