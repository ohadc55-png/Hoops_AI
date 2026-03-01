"""HOOPS AI - Billing API (PaymentPlan + Installments + OneTimeCharges)"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.api.parent_auth import get_current_parent
from src.services.billing_service import BillingService
from src.models.user import User

router = APIRouter(prefix="/api/billing", tags=["billing"])


# ── Request Models ────────────────────────────────────────────────────────

class CreatePlanRequest(BaseModel):
    team_id: int | None = None
    all_teams: bool = False
    season: str                         # e.g. "2025-2026"
    total_amount: float
    num_installments: int = 10
    billing_day: int = 10
    start_month: str                    # e.g. "2025-09"
    payment_method: str = "credit_card"
    description: str | None = None


class AdjustPlanRequest(BaseModel):
    new_total_amount: float


class MarkInstallmentPaidRequest(BaseModel):
    paid_date: str | None = None
    payment_method: str | None = None
    notes: str | None = None


class CreateOneTimeChargeRequest(BaseModel):
    team_id: int | None = None
    all_teams: bool = False
    title: str
    amount: float
    due_date: str | None = None
    player_ids: list[int] | None = None  # None = all active players
    description: str | None = None


class MarkChargePaidRequest(BaseModel):
    paid_date: str | None = None
    payment_method: str | None = None
    notes: str | None = None


# ── Admin: Payment Plans ───────────────────────────────────────────────────

@router.post("/plans")
async def create_plan(
    req: CreatePlanRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.utils.feature_gate import require_feature
    await require_feature("billing_payments", db, admin_id=admin.id)
    service = BillingService(db)
    if req.all_teams:
        result = await service.create_plan_for_all_teams(
            admin_id=admin.id,
            season=req.season,
            total_amount=req.total_amount,
            num_installments=req.num_installments,
            billing_day=req.billing_day,
            start_month=req.start_month,
            payment_method=req.payment_method,
            description=req.description,
        )
    else:
        if not req.team_id:
            raise HTTPException(status_code=400, detail="team_id is required")
        result = await service.create_plan_for_team(
            admin_id=admin.id,
            team_id=req.team_id,
            season=req.season,
            total_amount=req.total_amount,
            num_installments=req.num_installments,
            billing_day=req.billing_day,
            start_month=req.start_month,
            payment_method=req.payment_method,
            description=req.description,
        )
    return {"success": True, "data": result}


@router.get("/plans")
async def get_plans(
    team_id: int | None = Query(None),
    season: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    from src.repositories.billing_repository import PaymentPlanRepository
    repo = PaymentPlanRepository(db)
    if team_id:
        plans = await repo.get_by_team(team_id, season=season)
    else:
        plans = await repo.get_by_admin(admin.id, season=season)
    return {"success": True, "data": [
        {
            "id": p.id,
            "player_id": p.player_id,
            "player_name": p.player.name if p.player else "",
            "team_id": p.team_id,
            "team_name": p.team.name if p.team else "",
            "season": p.season,
            "total_amount": float(p.total_amount),
            "num_installments": p.num_installments,
            "billing_day": p.billing_day,
            "start_month": p.start_month,
            "payment_method": p.payment_method,
        }
        for p in plans
    ]}


@router.put("/plans/{plan_id}")
async def adjust_plan(
    plan_id: int,
    req: AdjustPlanRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    result = await service.adjust_player_plan(admin.id, plan_id, req.new_total_amount)
    return {"success": True, "data": result}


@router.delete("/plans/{plan_id}")
async def cancel_plan(
    plan_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    await service.cancel_plan(admin.id, plan_id)
    return {"success": True}


# ── Admin: Installments ────────────────────────────────────────────────────

@router.put("/installments/{installment_id}/paid")
async def mark_installment_paid(
    installment_id: int,
    req: MarkInstallmentPaidRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    result = await service.mark_installment_paid(
        admin.id, installment_id, req.paid_date, req.payment_method, req.notes
    )
    return {"success": True, "data": result}


# ── Admin: One-Time Charges ───────────────────────────────────────────────

@router.post("/one-time")
async def create_one_time_charge(
    req: CreateOneTimeChargeRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    if req.all_teams:
        count = await service.create_charge_for_all_teams(
            admin_id=admin.id,
            title=req.title,
            amount=req.amount,
            due_date=req.due_date,
            description=req.description,
        )
    else:
        if not req.team_id:
            raise HTTPException(status_code=400, detail="team_id is required")
        count = await service.create_one_time_charge(
            admin_id=admin.id,
            team_id=req.team_id,
            title=req.title,
            amount=req.amount,
            due_date=req.due_date,
            player_ids=req.player_ids,
            description=req.description,
        )
    return {"success": True, "data": {"created": count}}


@router.get("/one-time")
async def get_one_time_charges(
    team_id: int | None = Query(None),
    status: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.repositories.billing_repository import OneTimeChargeRepository
    repo = OneTimeChargeRepository(db)
    charges = await repo.get_by_admin(admin.id, team_id=team_id, status=status)
    return {"success": True, "data": [
        {
            "id": c.id,
            "player_id": c.player_id,
            "player_name": c.player.name if c.player else "",
            "team_id": c.team_id,
            "team_name": c.team.name if c.team else "",
            "title": c.title,
            "amount": float(c.amount),
            "due_date": c.due_date.isoformat() if c.due_date else None,
            "status": c.status,
            "paid_date": c.paid_date.isoformat() if c.paid_date else None,
            "payment_method": c.payment_method,
        }
        for c in charges
    ]}


@router.put("/one-time/{charge_id}/paid")
async def mark_one_time_paid(
    charge_id: int,
    req: MarkChargePaidRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    result = await service.mark_charge_paid(
        admin.id, charge_id, req.paid_date, req.payment_method, req.notes
    )
    return {"success": True, "data": result}


@router.put("/one-time/{charge_id}/cancel")
async def cancel_one_time_charge(
    charge_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    await service.cancel_charge(admin.id, charge_id)
    return {"success": True}


@router.delete("/one-time/{charge_id}")
async def delete_one_time_charge(
    charge_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    await service.delete_charge(admin.id, charge_id)
    return {"success": True}


# ── Admin: Overview & Team Detail ─────────────────────────────────────────

@router.get("/overview")
async def get_overview(
    team_id: int | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    data = await service.get_overview(admin.id, team_id=team_id)
    return {"success": True, "data": data}


@router.get("/team/{team_id}")
async def get_team_billing(
    team_id: int,
    season: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    rows = await service.get_team_billing_detail(admin.id, team_id, season=season)
    return {"success": True, "data": rows}


@router.get("/unpaid")
async def get_unpaid_players(
    team_id: int = Query(...),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    rows = await service.get_unpaid_players(admin.id, team_id)
    return {"success": True, "data": rows}


@router.post("/remind")
async def send_reminders(
    team_id: int = Query(...),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    count = await service.send_reminders(admin.id, team_id)
    return {"success": True, "data": {"sent": count}}


@router.post("/check-overdue")
async def check_overdue(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    result = await service.check_overdue()
    return {"success": True, "data": result}


# ── Admin: New Payments (acknowledgement) ─────────────────────────────────

@router.get("/new-payments")
async def get_new_payments(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    items = await service.get_new_payments(admin.id)
    return {"success": True, "data": items}


class AcknowledgeRequest(BaseModel):
    type: str  # "installment" or "charge"
    id: int


@router.put("/acknowledge")
async def acknowledge_payment(
    req: AcknowledgeRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    await service.acknowledge_payment(admin.id, req.type, req.id)
    return {"success": True}


@router.put("/acknowledge-all")
async def acknowledge_all_payments(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    count = await service.acknowledge_all_payments(admin.id)
    return {"success": True, "data": {"count": count}}


# ── Parent ────────────────────────────────────────────────────────────────

@router.get("/my")
async def get_my_billing(
    parent: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    data = await service.get_parent_billing(parent.id)
    return {"success": True, "data": data}


class ParentPayRequest(BaseModel):
    cardholder_name: str
    id_number: str
    card_number: str
    expiry: str
    cvv: str
    num_payments: int = 1


@router.put("/my/installments/{installment_id}/pay")
async def parent_pay_installment(
    installment_id: int,
    req: ParentPayRequest,
    parent: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    result = await service.parent_pay_installment(parent.id, installment_id, req.model_dump())
    return {"success": True, "data": result}


@router.put("/my/plans/{plan_id}/pay")
async def parent_pay_plan(
    plan_id: int,
    req: ParentPayRequest,
    parent: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    result = await service.parent_pay_plan(parent.id, plan_id, req.model_dump())
    return {"success": True, "data": result}


@router.put("/my/charges/{charge_id}/pay")
async def parent_pay_charge(
    charge_id: int,
    req: ParentPayRequest,
    parent: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    result = await service.parent_pay_charge(parent.id, charge_id, req.model_dump())
    return {"success": True, "data": result}


@router.get("/my/receipt/{receipt_type}/{item_id}")
async def get_receipt_data(
    receipt_type: str,
    item_id: int,
    parent: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    data = await service.get_receipt_data(parent.id, receipt_type, item_id)
    return {"success": True, "data": data}


# ── Platform Invoices (Admin view) ────────────────────────────────────────

@router.get("/platform-invoices")
async def get_my_platform_invoices(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get platform invoices for the admin's club."""
    from src.models.platform_club import PlatformClub
    from sqlalchemy import select
    result = await db.execute(select(PlatformClub).where(PlatformClub.admin_id == admin.id))
    club = result.scalars().first()
    if not club:
        return {"success": True, "data": []}
    from src.services.platform_invoice_service import PlatformInvoiceService
    svc = PlatformInvoiceService(db)
    invoices = await svc.get_invoices(club_id=club.id)
    return {"success": True, "data": invoices}


@router.get("/platform-invoices/{invoice_id}/pdf")
async def download_my_platform_invoice_pdf(
    invoice_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Download a platform invoice PDF (only if it belongs to admin's club)."""
    from src.models.platform_club import PlatformClub
    from src.models.platform_invoice import PlatformInvoice
    from sqlalchemy import select
    result = await db.execute(select(PlatformClub).where(PlatformClub.admin_id == admin.id))
    club = result.scalars().first()
    if not club:
        raise HTTPException(status_code=404, detail="No club found")
    result = await db.execute(select(PlatformInvoice).where(
        PlatformInvoice.id == invoice_id, PlatformInvoice.club_id == club.id
    ))
    invoice = result.scalars().first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    from src.services.platform_invoice_service import PlatformInvoiceService
    svc = PlatformInvoiceService(db)
    data = await svc.get_invoice_detail(invoice_id)
    from src.services.pdf_generator import generate_invoice_pdf
    pdf_bytes = generate_invoice_pdf(data)
    filename = f"{data['invoice_type']}_{data['invoice_number']}.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Team Members for Messaging (admin only) ──────────────────────────────

@router.get("/team-members")
async def get_team_members_for_messaging(
    team_id: int,
    role: str = "",
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get team members filtered by role (coach/player/parent) for messaging."""
    from src.models.team_member import TeamMember
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    stmt = (
        select(TeamMember)
        .where(TeamMember.team_id == team_id, TeamMember.is_active == True)
        .options(selectinload(TeamMember.user))
        .order_by(TeamMember.joined_at.asc())
    )
    if role:
        stmt = stmt.where(TeamMember.role_in_team == role)
    result = await db.execute(stmt)
    members = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "user_id": m.user_id,
                "name": m.user.name if m.user else "Unknown",
                "email": m.user.email if m.user else "",
                "role_in_team": m.role_in_team,
            }
            for m in members if m.user
        ],
    }
