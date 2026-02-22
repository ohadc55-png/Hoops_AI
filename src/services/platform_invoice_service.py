"""HOOPS AI - Platform Invoice Service"""
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.platform_invoice_repository import (
    PlatformInvoiceRepository,
    PlatformPaymentTransactionRepository,
)
from src.models.platform_invoice import (
    PlatformInvoice, PlatformInvoiceLineItem,
    INVOICE_TYPES, INVOICE_STATUSES,
)
from src.models.payment_transaction import PlatformPaymentTransaction
from src.models.platform_club import PlatformClub
from src.models.club_billing_config import ClubBillingConfig
from src.services.platform_club_service import PRICING_TIERS
from src.services.notification_service import NotificationService
from src.services.messaging_service import MessagingService


class PlatformInvoiceService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.invoice_repo = PlatformInvoiceRepository(session)
        self.tx_repo = PlatformPaymentTransactionRepository(session)
        self.notif_service = NotificationService(session)

    # ─── Invoice CRUD ───────────────────────────────────────

    async def create_invoice(
        self,
        club_id: int,
        line_items: list[dict],
        invoice_type: str = "tax_invoice",
        due_date: date | None = None,
        period_start: date | None = None,
        period_end: date | None = None,
        notes: str | None = None,
        vat_rate: float = 18.0,
    ) -> PlatformInvoice:
        """Create a new invoice with line items."""
        if invoice_type not in INVOICE_TYPES:
            raise ValueError(f"Invalid invoice type: {invoice_type}")

        # Get club info for billing details
        club = await self.session.get(PlatformClub, club_id)
        if not club:
            raise ValueError("Club not found")

        invoice_number = await self.invoice_repo.get_next_number(invoice_type)

        # Calculate totals — prices are VAT-inclusive
        # total = sum of line items (the final price the customer pays, VAT included)
        # vat is extracted: vat = total - total / (1 + vat_rate/100)
        total = round(sum(item.get("quantity", 1) * item.get("unit_price", 0) for item in line_items), 2)
        subtotal = round(total / (1 + vat_rate / 100), 2)
        vat_amount = round(total - subtotal, 2)

        if not due_date:
            due_date = date.today() + timedelta(days=30)

        invoice = PlatformInvoice(
            club_id=club_id,
            invoice_number=invoice_number,
            invoice_type=invoice_type,
            status="draft",
            billing_name=club.name,
            billing_email=club.billing_email,
            subtotal=subtotal,
            vat_rate=vat_rate,
            vat_amount=vat_amount,
            total=total,
            issue_date=date.today(),
            due_date=due_date,
            period_start=period_start,
            period_end=period_end,
            notes=notes,
        )
        self.session.add(invoice)
        await self.session.flush()
        await self.session.refresh(invoice)

        # Add line items
        for item in line_items:
            qty = item.get("quantity", 1)
            price = item.get("unit_price", 0)
            li = PlatformInvoiceLineItem(
                invoice_id=invoice.id,
                description=item.get("description", ""),
                quantity=qty,
                unit_price=price,
                total=round(qty * price, 2),
            )
            self.session.add(li)

        await self.session.flush()

        # Notify club admin via messaging
        if club.admin_id and invoice_type == "tax_invoice":
            await self._notify_admin_invoice(club, invoice)

        return invoice

    async def _notify_admin_invoice(self, club: PlatformClub, invoice: PlatformInvoice):
        """Send in-app message + email to the club admin about a new invoice."""
        try:
            from src.models.club_message import ClubMessage
            from src.models.message_recipient import MessageRecipient
            from datetime import datetime, timezone

            type_labels = {"tax_invoice": "חשבונית מס", "receipt": "קבלה", "credit_note": "זיכוי", "quote": "הצעת מחיר"}
            type_label = type_labels.get(invoice.invoice_type, invoice.invoice_type)
            pdf_url = f"/api/billing/platform-invoices/{invoice.id}/pdf"
            due_str = invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else 'לא צוין'

            body = (
                f"שלום,\n\n"
                f"{type_label} חדשה הופקה עבור {club.name}.\n\n"
                f"מספר חשבונית: {invoice.invoice_number}\n"
                f"סכום כולל: ₪{invoice.total:,.2f}\n"
                f"תאריך פירעון: {due_str}\n\n"
                f"להורדת החשבונית כ-PDF:\n{pdf_url}\n\n"
                f"בברכה,\nצוות HOOPS AI"
            )

            # 1) In-app message
            msg = ClubMessage(
                sender_id=club.admin_id,
                sender_role="system",
                subject=f"חשבונית חדשה #{invoice.invoice_number} — ₪{invoice.total:,.2f}",
                body=body,
                message_type="billing_notification",
                target_type="individual",
                target_user_id=club.admin_id,
                is_sent=True,
                sent_at=datetime.now(timezone.utc),
            )
            self.session.add(msg)
            await self.session.flush()
            await self.session.refresh(msg)

            recipient = MessageRecipient(message_id=msg.id, user_id=club.admin_id)
            self.session.add(recipient)
            await self.session.flush()

            # 2) Email with PDF (fire-and-forget)
            # Capture all data now — session may close before task runs
            email_target = club.billing_email
            if not email_target and club.admin:
                email_target = club.admin.email
            if email_target:
                import asyncio
                inv_snapshot = {
                    "id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "invoice_type": invoice.invoice_type,
                    "status": invoice.status,
                    "billing_name": invoice.billing_name,
                    "billing_email": invoice.billing_email,
                    "subtotal": invoice.subtotal,
                    "vat_rate": invoice.vat_rate,
                    "vat_amount": invoice.vat_amount,
                    "total": invoice.total,
                    "currency": invoice.currency,
                    "issue_date": invoice.issue_date.isoformat() if invoice.issue_date else None,
                    "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
                    "notes": invoice.notes,
                    "line_items": [],
                }
                asyncio.create_task(
                    self._send_invoice_email(
                        email_target, club.name, inv_snapshot, due_str,
                    )
                )
        except Exception:
            pass  # Don't fail invoice creation if messaging fails

    @staticmethod
    async def _send_invoice_email(
        to_email: str, club_name: str,
        inv_data: dict, due_str: str,
    ):
        """Generate PDF and send invoice email (runs as background task)."""
        try:
            from src.services.email_service import send_invoice_email
            from src.services.pdf_generator import generate_invoice_pdf

            pdf_bytes = generate_invoice_pdf(inv_data)
            await send_invoice_email(
                to_email=to_email,
                club_name=club_name,
                invoice_number=inv_data["invoice_number"],
                invoice_type=inv_data["invoice_type"],
                total=inv_data["total"],
                due_date_str=due_str,
                pdf_bytes=pdf_bytes,
            )
        except Exception as e:
            print(f"[invoice-email] Failed: {e}")

    async def send_invoice(self, invoice_id: int) -> PlatformInvoice | None:
        """Mark invoice as sent."""
        invoice = await self.invoice_repo.get_by_id(invoice_id)
        if not invoice:
            return None
        if invoice.status not in ("draft",):
            raise ValueError(f"Cannot send invoice in status: {invoice.status}")
        invoice.status = "sent"
        await self.session.flush()
        return invoice

    async def mark_paid(
        self,
        invoice_id: int,
        payment_method: str = "credit_card",
        notes: str | None = None,
    ) -> PlatformInvoice | None:
        """Mark invoice as paid and create a receipt + payment transaction."""
        invoice = await self.invoice_repo.get_with_items(invoice_id)
        if not invoice:
            return None
        if invoice.status not in ("sent", "overdue", "draft"):
            raise ValueError(f"Cannot mark as paid in status: {invoice.status}")

        invoice.status = "paid"
        invoice.paid_date = date.today()
        await self.session.flush()

        # Create payment transaction
        tx = PlatformPaymentTransaction(
            club_id=invoice.club_id,
            invoice_id=invoice.id,
            amount=invoice.total,
            payment_method=payment_method,
            status="completed",
            paid_at=invoice.paid_date,
            notes=notes,
        )
        self.session.add(tx)

        # Auto-create receipt
        receipt_number = await self.invoice_repo.get_next_number("receipt")
        receipt = PlatformInvoice(
            club_id=invoice.club_id,
            invoice_number=receipt_number,
            invoice_type="receipt",
            status="paid",
            billing_name=invoice.billing_name,
            billing_email=invoice.billing_email,
            billing_address=invoice.billing_address,
            billing_tax_id=invoice.billing_tax_id,
            subtotal=invoice.subtotal,
            vat_rate=invoice.vat_rate,
            vat_amount=invoice.vat_amount,
            total=invoice.total,
            issue_date=date.today(),
            paid_date=date.today(),
            reference_invoice_id=invoice.id,
            period_start=invoice.period_start,
            period_end=invoice.period_end,
            notes=f"Receipt for invoice #{invoice.invoice_number}",
        )
        self.session.add(receipt)
        await self.session.flush()
        await self.session.refresh(receipt)

        # Copy line items to receipt
        for item in invoice.line_items:
            li = PlatformInvoiceLineItem(
                invoice_id=receipt.id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total=item.total,
            )
            self.session.add(li)

        await self.session.flush()

        # Notify
        await self.notif_service.create(
            title=f"Payment received: Invoice #{invoice.invoice_number}",
            notification_type="payment_received",
            priority="low",
            body=f"Amount: {invoice.total} ILS via {payment_method}",
            club_id=invoice.club_id,
            action_url=f"/super-admin/billing/{invoice.id}",
        )

        return invoice

    async def cancel_invoice(self, invoice_id: int, reason: str | None = None) -> dict:
        """Cancel an invoice and generate a credit note."""
        invoice = await self.invoice_repo.get_with_items(invoice_id)
        if not invoice:
            raise ValueError("Invoice not found")
        if invoice.status == "cancelled":
            raise ValueError("Invoice is already cancelled")
        if invoice.invoice_type != "tax_invoice":
            raise ValueError("Can only cancel tax invoices")

        invoice.status = "cancelled"
        await self.session.flush()

        # Create credit note
        cn_number = await self.invoice_repo.get_next_number("credit_note")
        credit_note = PlatformInvoice(
            club_id=invoice.club_id,
            invoice_number=cn_number,
            invoice_type="credit_note",
            status="paid",
            billing_name=invoice.billing_name,
            billing_email=invoice.billing_email,
            billing_address=invoice.billing_address,
            billing_tax_id=invoice.billing_tax_id,
            subtotal=-invoice.subtotal,
            vat_rate=invoice.vat_rate,
            vat_amount=-invoice.vat_amount,
            total=-invoice.total,
            issue_date=date.today(),
            reference_invoice_id=invoice.id,
            notes=reason or f"Credit note for cancelled invoice #{invoice.invoice_number}",
        )
        self.session.add(credit_note)
        await self.session.flush()
        await self.session.refresh(credit_note)

        # Copy line items (negated)
        for item in invoice.line_items:
            li = PlatformInvoiceLineItem(
                invoice_id=credit_note.id,
                description=item.description,
                quantity=item.quantity,
                unit_price=-item.unit_price,
                total=-item.total,
            )
            self.session.add(li)

        await self.session.flush()
        return {
            "cancelled_invoice_id": invoice.id,
            "credit_note_id": credit_note.id,
            "credit_note_number": credit_note.invoice_number,
        }

    async def create_quote(
        self,
        club_id: int,
        line_items: list[dict],
        notes: str | None = None,
        vat_rate: float = 18.0,
    ) -> PlatformInvoice:
        """Create a quote (price proposal)."""
        return await self.create_invoice(
            club_id=club_id,
            line_items=line_items,
            invoice_type="quote",
            notes=notes,
            vat_rate=vat_rate,
        )

    # ─── Duplicate / Resend / Reminder ──────────────────────

    async def duplicate_invoice(self, invoice_id: int) -> PlatformInvoice:
        """Create a new draft invoice based on an existing one."""
        source = await self.invoice_repo.get_with_items(invoice_id)
        if not source:
            raise ValueError("Invoice not found")

        line_items = [
            {
                "description": li.description,
                "quantity": li.quantity,
                "unit_price": abs(li.unit_price),
            }
            for li in source.line_items
        ]

        return await self.create_invoice(
            club_id=source.club_id,
            line_items=line_items,
            invoice_type=source.invoice_type if source.invoice_type in ("tax_invoice", "proforma", "quote") else "tax_invoice",
            vat_rate=source.vat_rate,
            notes=f"Duplicated from #{source.invoice_number}",
        )

    async def resend_invoice(self, invoice_id: int) -> bool:
        """Re-send invoice notification email to the club admin."""
        invoice = await self.invoice_repo.get_with_items(invoice_id)
        if not invoice:
            raise ValueError("Invoice not found")
        if invoice.status == "cancelled":
            raise ValueError("Cannot resend a cancelled invoice")

        club = await self.session.get(PlatformClub, invoice.club_id)
        if not club:
            raise ValueError("Club not found")

        await self._notify_admin_invoice(club, invoice)
        return True

    async def send_reminder(self, invoice_id: int) -> bool:
        """Send a payment reminder for an unpaid invoice."""
        invoice = await self.invoice_repo.get_with_items(invoice_id)
        if not invoice:
            raise ValueError("Invoice not found")
        if invoice.status not in ("sent", "overdue"):
            raise ValueError(f"Cannot send reminder for status: {invoice.status}")

        club = await self.session.get(PlatformClub, invoice.club_id)
        if not club or not club.admin_id:
            raise ValueError("Club or admin not found")

        try:
            from src.models.club_message import ClubMessage
            from src.models.message_recipient import MessageRecipient
            from datetime import datetime, timezone

            due_str = invoice.due_date.strftime('%d/%m/%Y') if invoice.due_date else 'לא צוין'
            overdue_text = " (באיחור)" if invoice.status == "overdue" else ""

            body = (
                f"שלום,\n\n"
                f"זוהי תזכורת לתשלום חשבונית #{invoice.invoice_number}{overdue_text}.\n\n"
                f"סכום: ₪{invoice.total:,.2f}\n"
                f"תאריך פירעון: {due_str}\n\n"
                f"נא להסדיר את התשלום בהקדם.\n\n"
                f"בברכה,\nצוות HOOPS AI"
            )

            msg = ClubMessage(
                sender_id=club.admin_id,
                sender_role="system",
                subject=f"תזכורת תשלום — חשבונית #{invoice.invoice_number} — ₪{invoice.total:,.2f}",
                body=body,
                message_type="billing_reminder",
                target_type="individual",
                target_user_id=club.admin_id,
                is_sent=True,
                sent_at=datetime.now(timezone.utc),
            )
            self.session.add(msg)
            await self.session.flush()
            await self.session.refresh(msg)

            recipient = MessageRecipient(message_id=msg.id, user_id=club.admin_id)
            self.session.add(recipient)
            await self.session.flush()
        except Exception:
            pass

        await self.notif_service.create(
            title=f"Payment reminder sent: #{invoice.invoice_number}",
            notification_type="billing_reminder",
            priority="low",
            body=f"Reminder sent to {club.name} for ₪{invoice.total:,.2f}",
            club_id=invoice.club_id,
            action_url=f"/super-admin/billing/{invoice.id}",
        )

        return True

    async def get_linked_receipt_id(self, invoice_id: int) -> int | None:
        """Find the receipt created for a paid invoice."""
        result = await self.session.execute(
            select(PlatformInvoice.id).where(
                PlatformInvoice.reference_invoice_id == invoice_id,
                PlatformInvoice.invoice_type == "receipt",
            )
        )
        row = result.scalar_one_or_none()
        return row

    # ─── Queries ────────────────────────────────────────────

    async def get_invoice_detail(self, invoice_id: int) -> dict | None:
        """Get full invoice with items for display."""
        invoice = await self.invoice_repo.get_with_items(invoice_id)
        if not invoice:
            return None
        data = self._serialize_invoice(invoice, include_items=True)
        # Include linked receipt ID for paid tax invoices
        if invoice.invoice_type == "tax_invoice" and invoice.status == "paid":
            data["receipt_id"] = await self.get_linked_receipt_id(invoice_id)
        # Include linked credit note ID for cancelled invoices
        if invoice.status == "cancelled":
            cn_result = await self.session.execute(
                select(PlatformInvoice.id).where(
                    PlatformInvoice.reference_invoice_id == invoice_id,
                    PlatformInvoice.invoice_type == "credit_note",
                )
            )
            data["credit_note_id"] = cn_result.scalar_one_or_none()
        return data

    async def get_invoices(
        self,
        invoice_type: str | None = None,
        status: str | None = None,
        club_id: int | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        invoices = await self.invoice_repo.get_all_with_filters(
            invoice_type=invoice_type,
            status=status,
            club_id=club_id,
            search=search,
            limit=limit,
            offset=offset,
        )
        result = [self._serialize_invoice(inv) for inv in invoices]

        # Batch-fetch receipt IDs for paid tax invoices
        paid_tax_ids = [
            inv.id for inv in invoices
            if inv.invoice_type == "tax_invoice" and inv.status == "paid"
        ]
        if paid_tax_ids:
            receipt_rows = await self.session.execute(
                select(PlatformInvoice.reference_invoice_id, PlatformInvoice.id)
                .where(
                    PlatformInvoice.reference_invoice_id.in_(paid_tax_ids),
                    PlatformInvoice.invoice_type == "receipt",
                )
            )
            receipt_map = {row[0]: row[1] for row in receipt_rows.all()}
            for item in result:
                if item["id"] in receipt_map:
                    item["receipt_id"] = receipt_map[item["id"]]

        return result

    async def get_billing_overview(self) -> dict:
        """Platform-wide billing overview: MRR, totals, overdue, success rate."""
        totals = await self.invoice_repo.get_billing_totals()

        # MRR from active clubs
        result = await self.session.execute(
            select(PlatformClub).where(PlatformClub.status == "active")
        )
        mrr = 0
        active_clubs = 0
        for club in result.scalars().all():
            active_clubs += 1
            if club.custom_price:
                mrr += club.custom_price
            elif club.pricing_tier and club.pricing_tier in PRICING_TIERS:
                mrr += PRICING_TIERS[club.pricing_tier]["price"]

        # Collection rate
        total_invoiced = totals["total_invoiced"]
        total_paid = totals["total_paid"]
        collection_rate = round(total_paid / total_invoiced * 100, 1) if total_invoiced > 0 else 0

        # Recent invoices
        recent = await self.invoice_repo.get_all_with_filters(limit=10)
        recent_list = [self._serialize_invoice(inv) for inv in recent]

        return {
            "mrr": mrr,
            "active_clubs": active_clubs,
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "total_overdue": totals["total_overdue"],
            "total_outstanding": totals["total_outstanding"],
            "collection_rate": collection_rate,
            "status_counts": totals["status_counts"],
            "recent_invoices": recent_list,
        }

    async def get_club_billing(self, club_id: int) -> dict:
        """Get billing info for a specific club."""
        club = await self.session.get(PlatformClub, club_id)
        if not club:
            raise ValueError("Club not found")

        invoices = await self.invoice_repo.get_by_club(club_id)
        transactions = await self.tx_repo.get_by_club(club_id)

        # Totals for this club
        total_invoiced = sum(
            inv.total for inv in invoices if inv.invoice_type == "tax_invoice"
        )
        total_paid = sum(
            inv.total for inv in invoices
            if inv.invoice_type == "tax_invoice" and inv.status == "paid"
        )
        total_overdue = sum(
            inv.total for inv in invoices
            if inv.invoice_type == "tax_invoice" and inv.status == "overdue"
        )

        tier_info = PRICING_TIERS.get(club.pricing_tier) if club.pricing_tier else None
        monthly_price = club.custom_price or (tier_info["price"] if tier_info else 0)

        return {
            "club_id": club_id,
            "club_name": club.name,
            "pricing_tier": club.pricing_tier,
            "tier_label": tier_info["label"] if tier_info else "Custom",
            "monthly_price": monthly_price,
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "total_overdue": total_overdue,
            "invoices": [self._serialize_invoice(inv) for inv in invoices],
            "transactions": [
                {
                    "id": tx.id,
                    "amount": tx.amount,
                    "payment_method": tx.payment_method,
                    "status": tx.status,
                    "paid_at": tx.paid_at.isoformat() if tx.paid_at else None,
                    "created_at": tx.created_at.isoformat() if tx.created_at else None,
                }
                for tx in transactions
            ],
        }

    # ─── Billing Cycle ──────────────────────────────────────

    async def run_billing_cycle(self) -> int:
        """Check clubs whose next_billing_date is today and create invoices.
        Returns number of invoices created."""
        today = date.today()
        result = await self.session.execute(
            select(ClubBillingConfig)
            .where(
                ClubBillingConfig.is_recurring_active == True,
                ClubBillingConfig.next_billing_date <= today,
            )
        )
        configs = result.scalars().all()
        created = 0

        for config in configs:
            try:
                club = await self.session.get(PlatformClub, config.club_id)
                if not club or club.status != "active":
                    continue

                # Determine price
                tier_info = PRICING_TIERS.get(club.pricing_tier) if club.pricing_tier else None
                price = club.custom_price or (tier_info["price"] if tier_info else 0)
                if price <= 0:
                    continue

                tier_label = tier_info["label"] if tier_info else "Custom"
                period_start = today
                period_end = today + relativedelta(months=1) - timedelta(days=1)

                # Create invoice
                invoice = await self.create_invoice(
                    club_id=club.id,
                    line_items=[{
                        "description": f"HOOPS AI Platform - {tier_label} ({today.strftime('%m/%Y')})",
                        "quantity": 1,
                        "unit_price": price,
                    }],
                    invoice_type="tax_invoice",
                    due_date=today + timedelta(days=14),
                    period_start=period_start,
                    period_end=period_end,
                )

                # Stay as draft for manual review

                # Advance next billing date by 1 month
                config.next_billing_date = today + relativedelta(months=1)
                await self.session.flush()
                created += 1

            except Exception as e:
                print(f"[billing-cycle] Error for club {config.club_id}: {e}")

        if created:
            await self.notif_service.create(
                title=f"Billing cycle: {created} invoice(s) created",
                notification_type="billing_cycle",
                priority="low",
                body=f"Monthly billing cycle ran. {created} invoices generated as drafts for review.",
                action_url="/super-admin/billing",
            )

        return created

    async def mark_overdue_invoices(self) -> int:
        """Mark sent invoices past due date as overdue. Returns count."""
        overdue = await self.invoice_repo.get_overdue_invoices()
        count = 0
        for inv in overdue:
            inv.status = "overdue"
            await self.notif_service.create(
                title=f"Invoice #{inv.invoice_number} overdue",
                notification_type="payment_overdue",
                priority="high",
                body=f"Total: {inv.total} ILS",
                club_id=inv.club_id,
                action_url=f"/super-admin/billing/{inv.id}",
            )
            count += 1
        if count:
            await self.session.flush()
        return count

    # ─── Helpers ─────────────────────────────────────────────

    def _serialize_invoice(self, inv: PlatformInvoice, include_items: bool = False) -> dict:
        data = {
            "id": inv.id,
            "club_id": inv.club_id,
            "invoice_number": inv.invoice_number,
            "invoice_type": inv.invoice_type,
            "status": inv.status,
            "billing_name": inv.billing_name,
            "billing_email": inv.billing_email,
            "subtotal": inv.subtotal,
            "vat_rate": inv.vat_rate,
            "vat_amount": inv.vat_amount,
            "total": inv.total,
            "currency": inv.currency,
            "issue_date": inv.issue_date.isoformat() if inv.issue_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "paid_date": inv.paid_date.isoformat() if inv.paid_date else None,
            "reference_invoice_id": inv.reference_invoice_id,
            "period_start": inv.period_start.isoformat() if inv.period_start else None,
            "period_end": inv.period_end.isoformat() if inv.period_end else None,
            "notes": inv.notes,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        }
        if include_items and inv.line_items:
            data["line_items"] = [
                {
                    "id": li.id,
                    "description": li.description,
                    "quantity": li.quantity,
                    "unit_price": li.unit_price,
                    "total": li.total,
                }
                for li in inv.line_items
            ]
        return data
