"""HOOPS AI - Carpool API (Parent Portal)"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.parent_auth import get_current_parent
from src.services.carpool_service import CarpoolService
from src.services.standing_carpool_service import StandingCarpoolService
from src.models.user import User

router = APIRouter(prefix="/api/carpool", tags=["carpool"])


# ── Request Models ──────────────────────────────────────────

class CreateRideRequest(BaseModel):
    event_id: int
    neighborhood: str
    available_seats: int
    departure_time: str | None = None
    meeting_point: str | None = None
    direction: str = "to_event"
    notes: str | None = None


class UpdateRideRequest(BaseModel):
    neighborhood: str | None = None
    available_seats: int | None = None
    departure_time: str | None = None
    meeting_point: str | None = None
    direction: str | None = None
    notes: str | None = None


class JoinRideRequest(BaseModel):
    player_id: int | None = None
    notes: str | None = None


# ── Standing Carpool Request Models ─────────────────────────

class CreateStandingRequest(BaseModel):
    team_id: int
    name: str
    neighborhood: str
    max_members: int = 6
    meeting_point: str | None = None
    notes: str | None = None


class UpdateStandingRequest(BaseModel):
    name: str | None = None
    neighborhood: str | None = None
    max_members: int | None = None
    meeting_point: str | None = None
    notes: str | None = None


class JoinStandingRequest(BaseModel):
    player_id: int | None = None
    notes: str | None = None


class SignupEventRequest(BaseModel):
    event_id: int
    notes: str | None = None


# ── Helper ──────────────────────────────────────────────────

def _format_ride(ride, current_user_id: int | None = None) -> dict:
    passengers = []
    for p in (ride.passengers or []):
        passengers.append({
            "id": p.id,
            "user_id": p.passenger_user_id,
            "user_name": p.passenger.name if p.passenger else "",
            "player_name": p.player.name if p.player else None,
            "notes": p.notes,
        })
    occupied = len(passengers)
    return {
        "id": ride.id,
        "team_event_id": ride.team_event_id,
        "team_id": ride.team_id,
        "driver_user_id": ride.driver_user_id,
        "driver_name": ride.driver.name if ride.driver else "",
        "neighborhood": ride.neighborhood,
        "available_seats": ride.available_seats,
        "occupied_seats": occupied,
        "is_full": occupied >= ride.available_seats,
        "departure_time": ride.departure_time,
        "meeting_point": ride.meeting_point,
        "direction": ride.direction,
        "notes": ride.notes,
        "is_mine": ride.driver_user_id == current_user_id if current_user_id else False,
        "i_joined": any(p["user_id"] == current_user_id for p in passengers) if current_user_id else False,
        "passengers": passengers,
        "event_title": ride.team_event.title if ride.team_event else None,
        "event_date": str(ride.team_event.date) if ride.team_event else None,
        "event_time": ride.team_event.time_start if ride.team_event else None,
        "event_location": ride.team_event.location if ride.team_event else None,
        "team_name": ride.team.name if ride.team else None,
    }


# ── Endpoints ───────────────────────────────────────────────

@router.get("/events")
async def carpool_events(
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    service = CarpoolService(db)
    events = await service.get_upcoming_events(user.id)
    return {
        "success": True,
        "data": [
            {
                "id": e.id,
                "title": e.title,
                "date": str(e.date),
                "time_start": e.time_start,
                "time_end": e.time_end,
                "event_type": e.event_type,
                "location": e.location,
                "team_id": e.team_id,
            }
            for e in events
        ],
    }


@router.get("/rides")
async def get_rides(
    event_id: int = Query(...),
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = CarpoolService(db)
        rides = await service.get_rides_for_event(event_id, user.id)
        return {"success": True, "data": [_format_ride(r, user.id) for r in rides]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rides")
async def create_ride(
    req: CreateRideRequest,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    from src.utils.feature_gate import require_feature
    await require_feature("carpool", db, user_id=user.id)
    try:
        service = CarpoolService(db)
        ride = await service.create_ride(
            parent_user_id=user.id,
            event_id=req.event_id,
            neighborhood=req.neighborhood,
            available_seats=req.available_seats,
            departure_time=req.departure_time,
            meeting_point=req.meeting_point,
            direction=req.direction,
            notes=req.notes,
        )
        return {"success": True, "data": {"id": ride.id}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/rides/{ride_id}")
async def update_ride(
    ride_id: int,
    req: UpdateRideRequest,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = CarpoolService(db)
        updated = await service.update_ride(ride_id, user.id, **req.model_dump(exclude_none=True))
        return {"success": True, "data": {"id": updated.id}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/rides/{ride_id}")
async def cancel_ride(
    ride_id: int,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = CarpoolService(db)
        await service.cancel_ride(ride_id, user.id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rides/{ride_id}/join")
async def join_ride(
    ride_id: int,
    req: JoinRideRequest,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = CarpoolService(db)
        passenger = await service.join_ride(ride_id, user.id, req.player_id, req.notes)
        return {"success": True, "data": {"id": passenger.id}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/rides/{ride_id}/leave")
async def leave_ride(
    ride_id: int,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = CarpoolService(db)
        await service.leave_ride(ride_id, user.id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my")
async def my_rides(
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    service = CarpoolService(db)
    data = await service.get_my_rides(user.id)
    return {
        "success": True,
        "data": {
            "offered": [_format_ride(r, user.id) for r in data["offered"]],
            "joined": [
                {
                    "passenger_id": p.id,
                    "ride": _format_ride(p.ride, user.id) if p.ride else None,
                    "player_name": p.player.name if p.player else None,
                    "notes": p.notes,
                }
                for p in data["joined"]
            ],
        },
    }


# ═══════════════════════════════════════════════════════════
# Standing Carpools
# ═══════════════════════════════════════════════════════════

def _format_standing(carpool, current_user_id: int | None = None) -> dict:
    members = [
        {
            "id": m.id,
            "user_id": m.user_id,
            "user_name": m.user.name if m.user else "",
            "player_name": m.player.name if m.player else None,
            "is_organizer": m.user_id == carpool.organizer_user_id,
        }
        for m in (carpool.members or [])
    ]
    # All upcoming signups grouped by event
    signups_by_event: dict[int, list[dict]] = {}
    for s in (carpool.signups or []):
        if s.team_event:
            eid = s.team_event_id
            if eid not in signups_by_event:
                signups_by_event[eid] = []
            signups_by_event[eid].append({
                "user_id": s.user_id,
                "user_name": s.user.name if s.user else "",
            })

    is_member = any(m["user_id"] == current_user_id for m in members) if current_user_id else False
    is_organizer = carpool.organizer_user_id == current_user_id if current_user_id else False

    # Build event signup list (only events that have at least one signup, or all upcoming - handled in JS)
    event_signups = [
        {
            "event_id": eid,
            "signups": sigs,
            "i_signed_up": any(s["user_id"] == current_user_id for s in sigs) if current_user_id else False,
        }
        for eid, sigs in signups_by_event.items()
    ]

    # Also collect all event_ids where current user is signed up
    my_event_signups = [
        s.team_event_id
        for s in (carpool.signups or [])
        if s.user_id == current_user_id
    ] if current_user_id else []

    return {
        "id": carpool.id,
        "team_id": carpool.team_id,
        "team_name": carpool.team.name if carpool.team else None,
        "organizer_user_id": carpool.organizer_user_id,
        "organizer_name": carpool.organizer.name if carpool.organizer else "",
        "name": carpool.name,
        "neighborhood": carpool.neighborhood,
        "max_members": carpool.max_members,
        "meeting_point": carpool.meeting_point,
        "notes": carpool.notes,
        "member_count": len(members),
        "is_full": len(members) >= carpool.max_members,
        "is_member": is_member,
        "is_organizer": is_organizer,
        "members": members,
        "event_signups": event_signups,
        "my_event_signups": my_event_signups,
    }


@router.get("/standing")
async def list_standing(
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    service = StandingCarpoolService(db)
    carpools = await service.get_for_parent(user.id)
    return {"success": True, "data": [_format_standing(c, user.id) for c in carpools]}


@router.post("/standing")
async def create_standing(
    req: CreateStandingRequest,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = StandingCarpoolService(db)
        carpool = await service.create(
            parent_user_id=user.id,
            team_id=req.team_id,
            name=req.name,
            neighborhood=req.neighborhood,
            max_members=req.max_members,
            meeting_point=req.meeting_point,
            notes=req.notes,
        )
        return {"success": True, "data": {"id": carpool.id}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/standing/{carpool_id}")
async def update_standing(
    carpool_id: int,
    req: UpdateStandingRequest,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = StandingCarpoolService(db)
        updated = await service.update(carpool_id, user.id, **req.model_dump(exclude_none=True))
        return {"success": True, "data": {"id": updated.id}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/standing/{carpool_id}")
async def delete_standing(
    carpool_id: int,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = StandingCarpoolService(db)
        await service.delete(carpool_id, user.id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/standing/{carpool_id}/join")
async def join_standing(
    carpool_id: int,
    req: JoinStandingRequest,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = StandingCarpoolService(db)
        member = await service.join(carpool_id, user.id, req.player_id, req.notes)
        return {"success": True, "data": {"id": member.id}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/standing/{carpool_id}/leave")
async def leave_standing(
    carpool_id: int,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = StandingCarpoolService(db)
        await service.leave(carpool_id, user.id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/standing/{carpool_id}/signup")
async def signup_for_event(
    carpool_id: int,
    req: SignupEventRequest,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = StandingCarpoolService(db)
        signup = await service.signup_for_event(carpool_id, user.id, req.event_id, req.notes)
        return {"success": True, "data": {"id": signup.id}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/standing/{carpool_id}/signup/{event_id}")
async def cancel_signup(
    carpool_id: int,
    event_id: int,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    try:
        service = StandingCarpoolService(db)
        await service.cancel_signup(carpool_id, user.id, event_id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
