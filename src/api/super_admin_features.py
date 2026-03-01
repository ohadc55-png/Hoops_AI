"""HOOPS AI - Super Admin Feature Flags API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.super_admin_auth import get_current_super_admin
from src.models.super_admin import SuperAdmin
from src.services.feature_flag_service import FeatureFlagService
from src.models.club_feature_flag import FEATURE_KEYS

router = APIRouter(prefix="/api/super/features", tags=["super-admin-features"])


class SetFlagRequest(BaseModel):
    feature_key: str
    is_enabled: bool


class BulkFlagRequest(BaseModel):
    flags: dict[str, bool]


@router.get("/keys")
async def list_feature_keys(admin: SuperAdmin = Depends(get_current_super_admin)):
    """Return all available feature keys."""
    return {"success": True, "data": FEATURE_KEYS}


@router.get("/{club_id}")
async def get_club_flags(
    club_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = FeatureFlagService(db)
    flags = await service.get_flags_for_club(club_id)
    return {"success": True, "data": flags}


@router.put("/{club_id}")
async def set_club_flag(
    club_id: int,
    req: SetFlagRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = FeatureFlagService(db)
    result = await service.set_flag(club_id, req.feature_key, req.is_enabled)
    await db.commit()
    return {"success": True, "data": result}


@router.put("/{club_id}/bulk")
async def bulk_update_flags(
    club_id: int,
    req: BulkFlagRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = FeatureFlagService(db)
    flags = await service.bulk_update_flags(club_id, req.flags)
    await db.commit()
    return {"success": True, "data": flags}
