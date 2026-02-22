"""HOOPS AI - Super Admin Analytics API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.super_admin_auth import get_current_super_admin
from src.models.super_admin import SuperAdmin
from src.services.ai_usage_service import AIUsageService

router = APIRouter(prefix="/api/super/analytics", tags=["super-admin-analytics"])


@router.get("/ai-usage")
async def ai_usage_overview(
    days: int = Query(default=30, le=365),
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide AI usage analytics."""
    service = AIUsageService(db)
    data = await service.get_platform_overview(days)
    return {"success": True, "data": data}


@router.get("/ai-usage/club/{club_id}")
async def ai_usage_per_club(
    club_id: int,
    days: int = Query(default=30, le=365),
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """AI usage for a specific club."""
    service = AIUsageService(db)
    data = await service.get_club_usage(club_id, days)
    return {"success": True, "data": data}
