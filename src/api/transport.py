"""HOOPS AI - Transport API (admin away-game management)"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.models.user import User
from src.repositories.team_event_repository import TeamEventRepository
from src.repositories.team_repository import TeamRepository

router = APIRouter(prefix="/api/transport", tags=["transport"])


@router.get("/away-games")
async def list_away_games(admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """List all upcoming away games across admin's teams."""
    repo = TeamEventRepository(db)
    team_repo = TeamRepository(db)
    events = await repo.get_upcoming_away_by_admin(admin.id)

    # Build team name map
    teams = await team_repo.get_by_admin_id(admin.id)
    team_map = {t.id: t.name for t in teams}

    return {
        "success": True,
        "data": [
            {
                "id": e.id,
                "team_id": e.team_id,
                "team_name": team_map.get(e.team_id, ""),
                "title": e.title,
                "event_type": e.event_type,
                "date": str(e.date),
                "time_start": e.time_start,
                "time_end": e.time_end,
                "location": e.location,
                "opponent": e.opponent,
                "notes": e.notes,
                "is_away": e.is_away,
                "departure_time": e.departure_time,
                "venue_address": e.venue_address,
            }
            for e in events
        ],
    }


@router.get("/away-games/{event_id}")
async def get_away_game_detail(event_id: int, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Single away game detail with transport info."""
    repo = TeamEventRepository(db)
    event = await repo.get_by_id(event_id)
    if not event or not event.is_active:
        raise HTTPException(status_code=404, detail="Event not found")

    # Verify admin owns the team
    team_repo = TeamRepository(db)
    team = await team_repo.get_by_id(event.team_id)
    if not team or team.created_by_admin_id != admin.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return {
        "success": True,
        "data": {
            "id": event.id,
            "team_id": event.team_id,
            "team_name": team.name,
            "title": event.title,
            "event_type": event.event_type,
            "date": str(event.date),
            "time_start": event.time_start,
            "time_end": event.time_end,
            "location": event.location,
            "opponent": event.opponent,
            "notes": event.notes,
            "is_away": event.is_away,
            "departure_time": event.departure_time,
            "venue_address": event.venue_address,
        },
    }
