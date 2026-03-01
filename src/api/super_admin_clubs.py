"""HOOPS AI - Super Admin Clubs API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.super_admin_auth import get_current_super_admin
from src.models.super_admin import SuperAdmin
from src.services.platform_club_service import PlatformClubService

router = APIRouter(prefix="/api/super/clubs", tags=["super-admin-clubs"])


class CreateClubRequest(BaseModel):
    name: str
    pricing_tier: int | None = None
    custom_price: float | None = None
    max_players: int = 150
    region_id: int | None = None
    billing_email: str | None = None
    billing_tax_id: str | None = None
    billing_address: str | None = None
    billing_phone: str | None = None
    notes: str | None = None


class UpdateClubRequest(BaseModel):
    name: str | None = None
    pricing_tier: int | None = None
    custom_price: float | None = None
    max_players: int | None = None
    region_id: int | None = None
    billing_email: str | None = None
    billing_tax_id: str | None = None
    billing_address: str | None = None
    billing_phone: str | None = None
    notes: str | None = None
    storage_quota_video_gb: int | None = None
    storage_quota_media_gb: int | None = None


@router.get("")
async def list_clubs(
    status: str | None = None,
    region_id: int | None = None,
    search: str | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformClubService(db)
    clubs = await service.get_all_clubs_with_stats(
        status=status, region_id=region_id, search=search, limit=limit, offset=offset,
    )
    return {"success": True, "data": clubs}


@router.post("")
async def create_club(
    req: CreateClubRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Club name is required")
    if req.pricing_tier and req.pricing_tier not in (1, 2, 3, 4):
        raise HTTPException(status_code=400, detail="Invalid pricing tier (1-4)")
    service = PlatformClubService(db)
    club = await service.create_club(
        name=req.name.strip(),
        pricing_tier=req.pricing_tier,
        custom_price=req.custom_price,
        max_players=req.max_players,
        region_id=req.region_id,
        billing_email=req.billing_email,
        billing_tax_id=req.billing_tax_id,
        billing_address=req.billing_address,
        billing_phone=req.billing_phone,
        notes=req.notes,
    )
    await db.commit()
    return {
        "success": True,
        "data": {"id": club.id, "name": club.name, "status": club.status},
    }


@router.get("/{club_id}")
async def get_club_detail(
    club_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformClubService(db)
    detail = await service.get_club_detail(club_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Club not found")
    return {"success": True, "data": detail}


@router.put("/{club_id}")
async def update_club(
    club_id: int,
    req: UpdateClubRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    service = PlatformClubService(db)
    club = await service.update_club(club_id, **updates)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    await db.commit()
    return {"success": True, "data": {"id": club.id, "name": club.name, "status": club.status}}


@router.post("/{club_id}/suspend")
async def suspend_club(
    club_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformClubService(db)
    club = await service.suspend_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    await db.commit()
    return {"success": True, "data": {"id": club.id, "status": club.status}}


@router.post("/{club_id}/activate")
async def activate_club(
    club_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformClubService(db)
    club = await service.activate_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    await db.commit()
    return {"success": True, "data": {"id": club.id, "status": club.status}}


@router.post("/{club_id}/terminate")
async def terminate_club(
    club_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformClubService(db)
    club = await service.terminate_club(club_id)
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    await db.commit()
    return {"success": True, "data": {"id": club.id, "status": club.status}}


@router.post("/{club_id}/registration-link")
async def generate_registration_link(
    club_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformClubService(db)
    link = await service.generate_registration_link(club_id)
    await db.commit()
    return {"success": True, "data": link}


@router.delete("/registration-link/{link_id}")
async def deactivate_link(
    link_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = PlatformClubService(db)
    ok = await service.deactivate_registration_link(link_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Link not found")
    await db.commit()
    return {"success": True}
