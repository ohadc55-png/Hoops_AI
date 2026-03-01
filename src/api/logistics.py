"""HOOPS AI - Logistics API (Events, Facilities, Players)"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.logistics_service import LogisticsService
from src.api.auth import get_current_coach

router = APIRouter(prefix="/api", tags=["logistics"])


# --- Request Models ---
class EventRequest(BaseModel):
    date: str
    time: str | None = None
    end_time: str | None = None
    event_type: str
    title: str
    opponent: str | None = None
    location: str | None = None
    facility_id: int | None = None
    notes: str | None = None
    repeat_weeks: int | None = None


class PlayerRequest(BaseModel):
    name: str
    jersey_number: int | None = None
    position: str | None = None
    birth_date: str | None = None
    height: int | None = None
    weight: float | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    parent_phone: str | None = None
    parent_email: str | None = None
    notes: str | None = None


# --- My Teams (for coach) ---
@router.get("/my-teams")
async def my_teams(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """List teams the coach belongs to."""
    if not coach.user_id:
        return {"success": True, "data": []}
    from src.models.team_member import TeamMember
    from src.models.team import Team
    from sqlalchemy import select
    stmt = select(TeamMember.team_id).where(
        TeamMember.user_id == coach.user_id, TeamMember.role_in_team == "coach", TeamMember.is_active == True
    )
    result = await db.execute(stmt)
    team_ids = [row[0] for row in result.all()]
    if not team_ids:
        return {"success": True, "data": []}
    stmt = select(Team).where(Team.id.in_(team_ids))
    result = await db.execute(stmt)
    teams = result.scalars().all()
    return {
        "success": True,
        "data": [{"id": t.id, "name": t.name, "club_name": t.club_name, "age_group": t.age_group} for t in teams],
    }


# --- Events ---
@router.get("/events")
async def list_events(
    year: int | None = Query(None), month: int | None = Query(None),
    coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db),
):
    svc = LogisticsService(db)
    if year and month:
        events = await svc.get_events_by_month(coach.id, year, month)
    else:
        events = await svc.get_events(coach.id)
    all_events = [
        {"id": e.id, "date": str(e.date), "time": e.time, "end_time": e.end_time,
         "event_type": e.event_type, "title": e.title, "opponent": e.opponent,
         "location": e.location, "facility_id": e.facility_id,
         "notes": e.notes, "recurrence_group": e.recurrence_group, "created_at": str(e.created_at),
         "source": "coach"}
        for e in events
    ]

    # Merge admin-created TeamEvents for coach's teams
    if coach.user_id:
        from src.models.team_member import TeamMember
        from sqlalchemy import select
        stmt = select(TeamMember.team_id).where(
            TeamMember.user_id == coach.user_id, TeamMember.is_active == True
        )
        result = await db.execute(stmt)
        team_ids = [row[0] for row in result.all()]
        if team_ids:
            from src.services.schedule_service import ScheduleService
            sched = ScheduleService(db)
            if year and month:
                for tid in team_ids:
                    team_events = await sched.get_team_events_by_month(tid, year, month)
                    for te in team_events:
                        all_events.append({
                            "id": f"te-{te.id}", "date": str(te.date), "time": te.time_start,
                            "event_type": te.event_type, "title": te.title, "opponent": te.opponent,
                            "facility_id": None, "notes": te.notes,
                            "recurrence_group": te.recurrence_group,
                            "created_at": str(te.created_at), "source": "admin",
                            "location": te.location, "time_end": te.time_end,
                            "is_away": te.is_away, "departure_time": te.departure_time,
                            "venue_address": te.venue_address,
                        })
            else:
                team_events = await sched.get_teams_schedule(team_ids)
                for te in team_events:
                    all_events.append({
                        "id": f"te-{te.id}", "date": str(te.date), "time": te.time_start,
                        "event_type": te.event_type, "title": te.title, "opponent": te.opponent,
                        "facility_id": None, "notes": te.notes,
                        "recurrence_group": te.recurrence_group,
                        "created_at": str(te.created_at), "source": "admin",
                        "location": te.location, "time_end": te.time_end,
                        "is_away": te.is_away, "departure_time": te.departure_time,
                        "venue_address": te.venue_address,
                    })

    all_events.sort(key=lambda x: x["date"])
    return {"success": True, "data": all_events}


@router.post("/events")
async def create_event(req: EventRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    from datetime import date
    svc = LogisticsService(db)
    base_data = req.model_dump(exclude={"date", "repeat_weeks"})
    event_date = date.fromisoformat(req.date)
    if req.repeat_weeks and req.repeat_weeks >= 2:
        events = await svc.create_recurring_events(coach.id, req.repeat_weeks, date=event_date, **base_data)
        return {"success": True, "data": {"count": len(events), "recurrence_group": events[0].recurrence_group}}
    event = await svc.create_event(coach.id, date=event_date, **base_data)
    return {"success": True, "data": {"id": event.id, "title": event.title}}


@router.put("/events/{event_id}")
async def update_event(event_id: int, req: EventRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = LogisticsService(db)
    event = await svc.events.get_by_id(event_id)
    if not event or event.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Event not found")
    from datetime import date
    updated = await svc.update_event(event_id, date=date.fromisoformat(req.date), **req.model_dump(exclude={"date"}))
    return {"success": True, "data": {"id": updated.id}}


@router.delete("/events/series/{recurrence_group}")
async def delete_event_series(recurrence_group: str, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = LogisticsService(db)
    count = await svc.delete_recurring_series(coach.id, recurrence_group)
    if count == 0:
        raise HTTPException(status_code=404, detail="Series not found")
    return {"success": True, "data": {"deleted": count}}


@router.delete("/events/{event_id}")
async def delete_event(event_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = LogisticsService(db)
    event = await svc.events.get_by_id(event_id)
    if not event or event.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Event not found")
    await svc.delete_event(event_id)
    return {"success": True}


# --- Facilities (read-only for coaches — resolves through team admin) ---
@router.get("/facilities")
async def list_facilities(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Read-only: list facilities from the admin(s) of coach's teams."""
    if not coach.user_id:
        return {"success": True, "data": []}
    from src.models.team_member import TeamMember
    from src.models.team import Team
    from sqlalchemy import select
    from src.repositories.facility_repository import FacilityRepository
    stmt = select(Team.created_by_admin_id).join(
        TeamMember, TeamMember.team_id == Team.id
    ).where(
        TeamMember.user_id == coach.user_id,
        TeamMember.is_active == True
    ).distinct()
    result = await db.execute(stmt)
    admin_ids = [row[0] for row in result.all()]
    if not admin_ids:
        return {"success": True, "data": []}
    repo = FacilityRepository(db)
    all_facs = []
    seen = set()
    for aid in admin_ids:
        facs = await repo.get_by_admin_id(aid)
        for f in facs:
            if f.id not in seen:
                seen.add(f.id)
                all_facs.append(f)
    return {
        "success": True,
        "data": [{"id": f.id, "name": f.name, "facility_type": f.facility_type,
                   "address": f.address, "capacity": f.capacity, "notes": f.notes} for f in all_facs],
    }


# --- Players ---
@router.get("/players")
async def list_players(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = LogisticsService(db)
    players = await svc.get_players(coach.id)
    return {
        "success": True,
        "data": [
            {"id": p.id, "name": p.name, "jersey_number": p.jersey_number,
             "position": p.position, "birth_date": str(p.birth_date) if p.birth_date else None,
             "height": p.height, "weight": p.weight, "gender": p.gender,
             "phone": p.phone, "email": p.email,
             "parent_phone": p.parent_phone, "parent_email": p.parent_email, "notes": p.notes}
            for p in players
        ],
    }


@router.get("/players/{player_id}/profile")
async def get_player_profile(player_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Comprehensive player profile card data."""
    from src.services.player_profile_service import PlayerProfileService
    service = PlayerProfileService(db)
    profile = await service.get_profile(player_id, coach.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"success": True, "data": profile}


@router.post("/players")
async def create_player(req: PlayerRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    from datetime import date as date_type
    svc = LogisticsService(db)
    data = req.model_dump()
    if data.get("birth_date"):
        data["birth_date"] = date_type.fromisoformat(data["birth_date"])
    player = await svc.create_player(coach.id, **data)
    return {"success": True, "data": {"id": player.id, "name": player.name}}


@router.put("/players/{player_id}")
async def update_player(player_id: int, req: PlayerRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    from datetime import date as date_type
    svc = LogisticsService(db)
    player = await svc.players.get_by_id(player_id)
    if not player or player.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Player not found")
    data = req.model_dump()
    if data.get("birth_date"):
        data["birth_date"] = date_type.fromisoformat(data["birth_date"])
    updated = await svc.update_player(player_id, **data)
    return {"success": True, "data": {"id": updated.id}}


@router.delete("/players/{player_id}")
async def delete_player(player_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = LogisticsService(db)
    player = await svc.players.get_by_id(player_id)
    if not player or player.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Player not found")
    await svc.delete_player(player_id)
    return {"success": True}
