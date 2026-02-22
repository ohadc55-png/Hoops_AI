"""HOOPS AI - Super Admin Dashboard API"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.super_admin_auth import get_current_super_admin
from src.models.super_admin import SuperAdmin
from src.services.platform_club_service import PlatformClubService

router = APIRouter(prefix="/api/super/dashboard", tags=["super-admin-dashboard"])


@router.get("")
async def dashboard_stats(
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide dashboard stats."""
    service = PlatformClubService(db)
    data = await service.get_dashboard_stats()
    return {"success": True, "data": data}
