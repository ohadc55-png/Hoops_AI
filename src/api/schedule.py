"""HOOPS AI - Schedule API (admin-managed team events)"""
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.services.schedule_service import ScheduleService
from src.models.user import User
from src.models.team_member import TeamMember
from src.repositories.team_member_repository import TeamMemberRepository
from src.services.auth_service import decode_token
from src.repositories.user_repository import UserRepository
from sqlalchemy import select

router = APIRouter(prefix="/api/schedule", tags=["schedule"])
security = HTTPBearer(auto_error=False)


class CreateEventRequest(BaseModel):
    team_id: int
    title: str
    event_type: str
    date: datetime.date
    time_start: str | None = None
    time_end: str | None = None
    location: str | None = None
    facility_id: int | None = None
    opponent: str | None = None
    notes: str | None = None
    repeat_weeks: int | None = None
    is_away: bool = False
    departure_time: str | None = None
    venue_address: str | None = None


class UpdateEventRequest(BaseModel):
    title: str | None = None
    event_type: str | None = None
    date: datetime.date | None = None
    time_start: str | None = None
    time_end: str | None = None
    location: str | None = None
    facility_id: int | None = None
    opponent: str | None = None
    notes: str | None = None
    is_away: bool | None = None
    departure_time: str | None = None
    venue_address: str | None = None


def _event_to_dict(e):
    return {
        "id": e.id,
        "team_id": e.team_id,
        "title": e.title,
        "event_type": e.event_type,
        "date": str(e.date),
        "time_start": e.time_start,
        "time_end": e.time_end,
        "location": e.location,
        "facility_id": e.facility_id,
        "opponent": e.opponent,
        "notes": e.notes,
        "is_recurring": e.is_recurring,
        "recurrence_group": e.recurrence_group,
        "is_away": e.is_away,
        "departure_time": e.departure_time,
        "venue_address": e.venue_address,
        "created_at": str(e.created_at),
    }


# --- Admin endpoints ---

@router.post("/events")
async def create_event(req: CreateEventRequest, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    from src.utils.feature_gate import require_feature
    await require_feature("schedule_management", db, admin_id=admin.id)
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    if req.event_type not in ("practice", "game", "meeting", "tournament", "team_building", "team_dinner", "social", "tactical_video", "other"):
        raise HTTPException(status_code=400, detail="Invalid event type")
    service = ScheduleService(db)
    kwargs = dict(
        title=req.title.strip(),
        event_type=req.event_type,
        date=req.date,
        time_start=req.time_start,
        time_end=req.time_end,
        location=req.location,
        facility_id=req.facility_id,
        opponent=req.opponent,
        notes=req.notes,
        is_away=req.is_away,
        departure_time=req.departure_time,
        venue_address=req.venue_address,
    )
    if req.repeat_weeks and req.repeat_weeks > 1:
        events = await service.create_recurring_events(
            admin_id=admin.id, team_id=req.team_id,
            repeat_weeks=req.repeat_weeks, **kwargs,
        )
        return {"success": True, "data": [_event_to_dict(e) for e in events]}
    else:
        event = await service.create_event(admin_id=admin.id, team_id=req.team_id, **kwargs)
        return {"success": True, "data": _event_to_dict(event)}


@router.get("/events")
async def list_admin_events(
    year: int | None = Query(None),
    month: int | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = ScheduleService(db)
    if year and month:
        # Get all admin's teams, then fetch events by month
        from src.repositories.team_repository import TeamRepository
        team_repo = TeamRepository(db)
        teams = await team_repo.get_by_admin_id(admin.id)
        team_ids = [t.id for t in teams]
        events = await service.get_teams_events_by_month(team_ids, year, month)
    else:
        events = await service.get_admin_schedule(admin.id)
    return {"success": True, "data": [_event_to_dict(e) for e in events]}


@router.get("/events/team/{team_id}")
async def list_team_events(team_id: int, year: int | None = None, month: int | None = None,
                            admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = ScheduleService(db)
    if year and month:
        events = await service.get_team_events_by_month(team_id, year, month)
    else:
        events = await service.get_team_schedule(team_id)
    return {"success": True, "data": [_event_to_dict(e) for e in events]}


@router.put("/events/{event_id}")
async def update_event(event_id: int, req: UpdateEventRequest, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = ScheduleService(db)
    updates = req.model_dump(exclude_unset=True)
    event = await service.update_event(event_id, admin.id, **updates)
    return {"success": True, "data": _event_to_dict(event)}


@router.delete("/events/{event_id}")
async def delete_event(event_id: int, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = ScheduleService(db)
    await service.delete_event(event_id, admin.id)
    return {"success": True}


@router.delete("/events/series/{recurrence_group}")
async def delete_series(recurrence_group: str, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = ScheduleService(db)
    count = await service.delete_series(recurrence_group, admin.id)
    return {"success": True, "data": {"deleted": count}}


# --- Public read endpoint (any role) ---

async def get_current_user_any_role(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode JWT and return User regardless of role."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = int(payload.get("sub", 0))
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("/my")
async def my_schedule(user: User = Depends(get_current_user_any_role), db: AsyncSession = Depends(get_db)):
    """Upcoming events for current user's team(s). Works for any role."""
    member_repo = TeamMemberRepository(db)
    memberships = await member_repo.get_by_user(user.id)
    team_ids = [m.team_id for m in memberships]
    if not team_ids:
        return {"success": True, "data": [], "team_ids": []}
    service = ScheduleService(db)
    events = await service.get_teams_schedule(team_ids)
    return {"success": True, "data": [_event_to_dict(e) for e in events], "team_ids": team_ids}
