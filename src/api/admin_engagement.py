"""HOOPS AI - Admin Coach Engagement API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.engagement_service import EngagementService
from src.api.admin_auth import get_current_admin
from src.models.user import User

router = APIRouter(prefix="/api/admin/coaches", tags=["admin-engagement"])


@router.get("/engagement")
async def get_coach_engagement(
    team_id: int | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = EngagementService(db)
    data = await service.get_engagement_for_admin(admin.id, team_id)
    return {"success": True, "data": data}


@router.get("/{coach_id}/activity")
async def get_coach_activity(
    coach_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = EngagementService(db)
    data = await service.get_coach_activity(admin.id, coach_id)
    if not data:
        raise HTTPException(status_code=404, detail="Coach not found")
    return {"success": True, "data": data}
