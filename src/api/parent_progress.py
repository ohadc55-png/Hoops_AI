"""HOOPS AI - Parent Progress API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.parent_auth import get_current_parent
from src.api.parent_dashboard import _get_parent_context
from src.models.user import User
from src.services.parent_progress_service import ParentProgressService

router = APIRouter(prefix="/api/parent/progress", tags=["parent-progress"])


@router.get("")
async def get_progress(
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Main progress data: player info, attendance, drills, proud moments, charts."""
    team_ids, team, child, coach_name = await _get_parent_context(db, user)
    if not child:
        return {"success": True, "data": None, "message": "No child linked"}

    service = ParentProgressService(db)
    data = await service.get_progress_data(child.id, team_ids)
    data["coach_name"] = coach_name
    return {"success": True, "data": data}


@router.get("/ai-reports")
async def get_ai_reports(
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Get stored AI progress reports + rate limit info."""
    _, _, child, _ = await _get_parent_context(db, user)
    if not child:
        return {"success": True, "data": {"reports": [], "limits": {"can_generate": False, "season_remaining": 0, "season_used": 0, "last_generated": None, "next_available": None}}}

    service = ParentProgressService(db)
    reports = await service.get_ai_reports(child.id)
    limits = await service.get_report_limits(child.id, user.id)
    return {"success": True, "data": {"reports": reports, "limits": limits}}


@router.post("/ai-reports/generate")
async def generate_ai_report(
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new AI progress report (rate-limited: 1/2mo, 5/season)."""
    team_ids, _, child, _ = await _get_parent_context(db, user)
    if not child:
        raise HTTPException(status_code=400, detail="No child linked to this account")

    service = ParentProgressService(db)
    report = await service.generate_ai_report(child.id, user.id, team_ids)
    await db.commit()
    return {"success": True, "data": report}
