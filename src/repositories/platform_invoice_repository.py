"""HOOPS AI - Platform Invoice Repository"""
from typing import Sequence
from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.repositories.base_repository import BaseRepository
from src.models.platform_invoice import (
    PlatformInvoice, PlatformInvoiceLineItem, INVOICE_NUMBER_SERIES,
)
from src.models.payment_transaction import PlatformPaymentTransaction


class PlatformInvoiceRepository(BaseRepository[PlatformInvoice]):
    def __init__(self, session: AsyncSession):
        super().__init__(PlatformInvoice, session)

    async def get_with_items(self, invoice_id: int) -> PlatformInvoice | None:
        stmt = (
            select(PlatformInvoice)
            .options(selectinload(PlatformInvoice.line_items))
            .where(PlatformInvoice.id == invoice_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_club(
        self,
        club_id: int,
        invoice_type: str | None = None,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[PlatformInvoice]:
        stmt = select(PlatformInvoice).where(PlatformInvoice.club_id == club_id)
        if invoice_type:
            stmt = stmt.where(PlatformInvoice.invoice_type == invoice_type)
        if status:
            stmt = stmt.where(PlatformInvoice.status == status)
        stmt = stmt.order_by(PlatformInvoice.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_type(self, invoice_type: str, limit: int = 100, offset: int = 0) -> Sequence[PlatformInvoice]:
        stmt = (
            select(PlatformInvoice)
            .where(PlatformInvoice.invoice_type == invoice_type)
            .order_by(PlatformInvoice.created_at.desc())
            .limit(limit).offset(offset)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_status(self, status: str, limit: int = 100, offset: int = 0) -> Sequence[PlatformInvoice]:
        stmt = (
            select(PlatformInvoice)
            .where(PlatformInvoice.status == status)
            .order_by(PlatformInvoice.created_at.desc())
            .limit(limit).offset(offset)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_number(self, invoice_number: str) -> PlatformInvoice | None:
        stmt = (
            select(PlatformInvoice)
            .options(selectinload(PlatformInvoice.line_items))
            .where(PlatformInvoice.invoice_number == invoice_number)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_next_number(self, invoice_type: str) -> str:
        """Generate next invoice number in the series (e.g., 100001, 500001)."""
        base = INVOICE_NUMBER_SERIES.get(invoice_type, 100000)
        result = await self.session.execute(
            select(func.max(PlatformInvoice.invoice_number))
            .where(PlatformInvoice.invoice_type == invoice_type)
        )
        last_number = result.scalar()
        if last_number:
            next_num = int(last_number) + 1
        else:
            next_num = base + 1
        return str(next_num)

    async def get_all_with_filters(
        self,
        invoice_type: str | None = None,
        status: str | None = None,
        club_id: int | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[PlatformInvoice]:
        stmt = select(PlatformInvoice)
        if invoice_type:
            stmt = stmt.where(PlatformInvoice.invoice_type == invoice_type)
        if status:
            stmt = stmt.where(PlatformInvoice.status == status)
        if club_id:
            stmt = stmt.where(PlatformInvoice.club_id == club_id)
        if search:
            stmt = stmt.where(
                PlatformInvoice.billing_name.ilike(f"%{search}%")
                | PlatformInvoice.invoice_number.ilike(f"%{search}%")
            )
        stmt = stmt.order_by(PlatformInvoice.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_overdue_invoices(self) -> Sequence[PlatformInvoice]:
        """Get invoices past due date that are still in sent status."""
        stmt = (
            select(PlatformInvoice)
            .where(
                PlatformInvoice.status == "sent",
                PlatformInvoice.due_date < date.today(),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_billing_totals(self) -> dict:
        """Get platform-wide billing summary."""
        # Total invoiced
        result = await self.session.execute(
            select(func.sum(PlatformInvoice.total))
            .where(PlatformInvoice.invoice_type == "tax_invoice")
        )
        total_invoiced = result.scalar() or 0

        # Total paid
        result = await self.session.execute(
            select(func.sum(PlatformInvoice.total))
            .where(
                PlatformInvoice.invoice_type == "tax_invoice",
                PlatformInvoice.status == "paid",
            )
        )
        total_paid = result.scalar() or 0

        # Total overdue
        result = await self.session.execute(
            select(func.sum(PlatformInvoice.total))
            .where(
                PlatformInvoice.invoice_type == "tax_invoice",
                PlatformInvoice.status == "overdue",
            )
        )
        total_overdue = result.scalar() or 0

        # Count by status
        status_result = await self.session.execute(
            select(PlatformInvoice.status, func.count(PlatformInvoice.id))
            .where(PlatformInvoice.invoice_type == "tax_invoice")
            .group_by(PlatformInvoice.status)
        )
        status_counts = {row[0]: row[1] for row in status_result.all()}

        return {
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "total_overdue": total_overdue,
            "total_outstanding": total_invoiced - total_paid,
            "status_counts": status_counts,
        }


class PlatformPaymentTransactionRepository(BaseRepository[PlatformPaymentTransaction]):
    def __init__(self, session: AsyncSession):
        super().__init__(PlatformPaymentTransaction, session)

    async def get_by_club(self, club_id: int, limit: int = 50) -> Sequence[PlatformPaymentTransaction]:
        stmt = (
            select(PlatformPaymentTransaction)
            .where(PlatformPaymentTransaction.club_id == club_id)
            .order_by(PlatformPaymentTransaction.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_invoice(self, invoice_id: int) -> Sequence[PlatformPaymentTransaction]:
        stmt = (
            select(PlatformPaymentTransaction)
            .where(PlatformPaymentTransaction.invoice_id == invoice_id)
            .order_by(PlatformPaymentTransaction.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_pending(self) -> Sequence[PlatformPaymentTransaction]:
        stmt = (
            select(PlatformPaymentTransaction)
            .where(PlatformPaymentTransaction.status == "pending")
            .order_by(PlatformPaymentTransaction.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
