"""HOOPS AI - Schedule Requests API (coach requests + admin approval)"""
import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.auth import get_current_coach
from src.api.admin_auth import get_current_admin
from src.services.schedule_service import ScheduleService
from src.models.coach import Coach
from src.models.user import User

router = APIRouter(prefix="/api/schedule-requests", tags=["schedule-requests"])


class CreateScheduleRequestBody(BaseModel):
    team_id: int
    title: str
    event_type: str
    date: datetime.date
    time_start: str | None = None
    time_end: str | None = None
    location: str | None = None
    opponent: str | None = None
    notes: str | None = None
    repeat_weeks: int | None = None


class ReviewRequestBody(BaseModel):
    response: str | None = None


def _request_to_dict(r):
    return {
        "id": r.id,
        "coach_id": r.coach_id,
        "team_id": r.team_id,
        "title": r.title,
        "event_type": r.event_type,
        "date": str(r.date),
        "time_start": r.time_start,
        "time_end": r.time_end,
        "location": r.location,
        "opponent": r.opponent,
        "notes": r.notes,
        "repeat_weeks": r.repeat_weeks,
        "status": r.status,
        "admin_response": r.admin_response,
        "reviewed_at": str(r.reviewed_at) if r.reviewed_at else None,
        "created_at": str(r.created_at),
    }


# --- Coach endpoints ---

@router.post("")
async def create_request(req: CreateScheduleRequestBody, coach: Coach = Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Coach submits a schedule request."""
    from src.utils.feature_gate import require_feature
    await require_feature("schedule_management", db, coach_id=coach.id)
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    service = ScheduleService(db)
    try:
        result = await service.create_schedule_request(
            coach_id=coach.id,
            team_id=req.team_id,
            title=req.title.strip(),
            event_type=req.event_type,
            date=req.date,
            time_start=req.time_start,
            time_end=req.time_end,
            location=req.location,
            opponent=req.opponent,
            notes=req.notes,
            repeat_weeks=req.repeat_weeks,
        )
        return {"success": True, "data": _request_to_dict(result)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my")
async def my_requests(coach: Coach = Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Coach's own requests (all statuses)."""
    service = ScheduleService(db)
    requests = await service.get_coach_requests(coach.id)
    return {"success": True, "data": [_request_to_dict(r) for r in requests]}


# --- Admin endpoints ---

@router.get("/pending")
async def pending_requests(admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Pending requests for admin's teams."""
    service = ScheduleService(db)
    requests = await service.get_pending_requests_for_admin(admin.id)
    return {"success": True, "data": [_request_to_dict(r) for r in requests]}


@router.put("/{request_id}/approve")
async def approve_request(request_id: int, body: ReviewRequestBody, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = ScheduleService(db)
    try:
        result = await service.approve_request(request_id, admin.id, body.response)
        return {"success": True, "data": _request_to_dict(result)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{request_id}/reject")
async def reject_request(request_id: int, body: ReviewRequestBody, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = ScheduleService(db)
    try:
        result = await service.reject_request(request_id, admin.id, body.response)
        return {"success": True, "data": _request_to_dict(result)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
