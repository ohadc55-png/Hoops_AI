"""HOOPS AI - Super Admin Billing API"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.super_admin_auth import get_current_super_admin
from src.models.super_admin import SuperAdmin
from src.services.platform_invoice_service import PlatformInvoiceService
from src.services.pdf_generator import generate_invoice_pdf

router = APIRouter(prefix="/api/super/billing", tags=["super-admin-billing"])


# ─── Request Models ─────────────────────────────────────

class LineItemRequest(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float


class CreateInvoiceRequest(BaseModel):
    club_id: int
    line_items: list[LineItemRequest]
    invoice_type: str = "tax_invoice"
    due_date: str | None = None  # ISO date string
    period_start: str | None = None
    period_end: str | None = None
    notes: str | None = None
    vat_rate: float = 17.0


class MarkPaidRequest(BaseModel):
    payment_method: str = "credit_card"
    notes: str | None = None


class CancelInvoiceRequest(BaseModel):
    reason: str | None = None


# ─── Billing Overview ───────────────────────────────────

@router.get("/overview")
async def billing_overview(
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide billing overview: MRR, totals, collection rate."""
    service = PlatformInvoiceService(db)
    data = await service.get_billing_overview()
    return {"success": True, "data": data}


# ─── Invoice CRUD ───────────────────────────────────────

@router.get("/invoices")
async def list_invoices(
    invoice_type: str | None = None,
    status: str | None = None,
    club_id: int | None = None,
    search: str | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformInvoiceService(db)
    invoices = await service.get_invoices(
        invoice_type=invoice_type, status=status, club_id=club_id,
        search=search, limit=limit, offset=offset,
    )
    return {"success": True, "data": invoices}


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformInvoiceService(db)
    data = await service.get_invoice_detail(invoice_id)
    if not data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"success": True, "data": data}


@router.post("/invoices")
async def create_invoice(
    req: CreateInvoiceRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformInvoiceService(db)
    try:
        due = date.fromisoformat(req.due_date) if req.due_date else None
        ps = date.fromisoformat(req.period_start) if req.period_start else None
        pe = date.fromisoformat(req.period_end) if req.period_end else None

        invoice = await service.create_invoice(
            club_id=req.club_id,
            line_items=[item.model_dump() for item in req.line_items],
            invoice_type=req.invoice_type,
            due_date=due,
            period_start=ps,
            period_end=pe,
            notes=req.notes,
            vat_rate=req.vat_rate,
        )
        await db.commit()
        detail = await service.get_invoice_detail(invoice.id)
        return {"success": True, "data": detail}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformInvoiceService(db)
    try:
        invoice = await service.send_invoice(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        await db.commit()
        return {"success": True, "message": "Invoice sent"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invoices/{invoice_id}/pay")
async def mark_invoice_paid(
    invoice_id: int,
    req: MarkPaidRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformInvoiceService(db)
    try:
        invoice = await service.mark_paid(
            invoice_id, payment_method=req.payment_method, notes=req.notes,
        )
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        await db.commit()
        return {"success": True, "message": "Invoice marked as paid, receipt created"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invoices/{invoice_id}/cancel")
async def cancel_invoice(
    invoice_id: int,
    req: CancelInvoiceRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformInvoiceService(db)
    try:
        result = await service.cancel_invoice(invoice_id, reason=req.reason)
        await db.commit()
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── PDF Download ───────────────────────────────────────

@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformInvoiceService(db)
    data = await service.get_invoice_detail(invoice_id)
    if not data:
        raise HTTPException(status_code=404, detail="Invoice not found")

    pdf_bytes = generate_invoice_pdf(data)
    filename = f"{data['invoice_type']}_{data['invoice_number']}.pdf"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ─── Club-Specific Billing ─────────────────────────────

@router.get("/clubs/{club_id}")
async def get_club_billing(
    club_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformInvoiceService(db)
    try:
        data = await service.get_club_billing(club_id)
        return {"success": True, "data": data}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ─── Manual Charge ──────────────────────────────────────

@router.post("/clubs/{club_id}/charge")
async def manual_charge(
    club_id: int,
    req: CreateInvoiceRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create and auto-send an invoice for a club (manual charge)."""
    service = PlatformInvoiceService(db)
    try:
        due = date.fromisoformat(req.due_date) if req.due_date else None
        invoice = await service.create_invoice(
            club_id=club_id,
            line_items=[item.model_dump() for item in req.line_items],
            invoice_type="tax_invoice",
            due_date=due,
            notes=req.notes,
            vat_rate=req.vat_rate,
        )
        await service.send_invoice(invoice.id)
        await db.commit()
        detail = await service.get_invoice_detail(invoice.id)
        return {"success": True, "data": detail}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
