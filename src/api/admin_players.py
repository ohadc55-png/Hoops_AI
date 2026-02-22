"""HOOPS AI - Admin Player Profile API"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.models.user import User
from src.models.player import Player
from src.models.coach import Coach
from src.models.team_member import TeamMember
from src.models.team import Team
from src.repositories.player_report_repository import PlayerReportRepository

router = APIRouter(prefix="/api/admin/players", tags=["admin-players"])


@router.get("/")
async def list_admin_players(
    team_id: int | None = Query(None),
    position: str | None = Query(None),
    search: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all players across admin's teams with optional filters."""
    # Get admin's team IDs
    team_stmt = select(Team.id).where(Team.created_by_admin_id == admin.id)
    result = await db.execute(team_stmt)
    admin_team_ids = [row[0] for row in result.all()]

    if not admin_team_ids:
        return {"success": True, "data": [], "total": 0}

    # Query team members with player role
    stmt = (
        select(TeamMember)
        .where(
            TeamMember.team_id.in_(admin_team_ids),
            TeamMember.role_in_team == "player",
            TeamMember.is_active == True,
        )
        .options(
            selectinload(TeamMember.player),
            selectinload(TeamMember.team),
        )
    )

    if team_id:
        stmt = stmt.where(TeamMember.team_id == team_id)

    result = await db.execute(stmt)
    members = result.scalars().all()

    players = []
    today = date.today()
    for m in members:
        if not m.player:
            continue
        p = m.player

        # Position filter (in-memory since position is on Player, not TeamMember)
        if position and p.position != position:
            continue

        # Name search
        if search and search.lower() not in (p.name or "").lower():
            continue

        age = None
        if p.birth_date:
            age = today.year - p.birth_date.year
            if (today.month, today.day) < (p.birth_date.month, p.birth_date.day):
                age -= 1

        players.append({
            "player_id": p.id,
            "name": p.name,
            "position": p.position,
            "jersey_number": p.jersey_number,
            "age": age,
            "team_id": m.team_id,
            "team_name": m.team.name if m.team else None,
            "birth_date": str(p.birth_date) if p.birth_date else None,
            "height": p.height,
            "weight": p.weight,
        })

    players.sort(key=lambda x: (x["team_name"] or "", x["name"] or ""))
    return {"success": True, "data": players, "total": len(players)}


@router.get("/{player_id}/profile")
async def get_player_profile_admin(
    player_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Comprehensive player profile card data (admin access)."""
    # Verify player belongs to admin's teams via TeamMember
    stmt = (
        select(TeamMember.team_id)
        .join(Team, TeamMember.team_id == Team.id)
        .where(
            TeamMember.player_id == player_id,
            TeamMember.is_active == True,
            Team.created_by_admin_id == admin.id,
        )
    )
    result = await db.execute(stmt)
    if not result.first():
        raise HTTPException(status_code=404, detail="Player not found")

    # Get the player to find coach_id
    player = await db.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    from src.services.player_profile_service import PlayerProfileService
    service = PlayerProfileService(db)
    profile = await service.get_profile(player_id, player.coach_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"success": True, "data": profile}


@router.get("/{player_id}/reports")
async def get_player_reports_admin(
    player_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """All historical reports for a player across all coaches (admin access)."""
    # Verify player belongs to admin's teams
    stmt = (
        select(TeamMember.team_id)
        .join(Team, TeamMember.team_id == Team.id)
        .where(
            TeamMember.player_id == player_id,
            TeamMember.is_active == True,
            Team.created_by_admin_id == admin.id,
        )
    )
    result = await db.execute(stmt)
    if not result.first():
        raise HTTPException(status_code=404, detail="Player not found")

    repo = PlayerReportRepository(db)
    reports = await repo.get_all_by_player(player_id)

    # Collect unique coach IDs and batch-fetch
    coach_ids = list({r.coach_id for r in reports})
    coaches = {}
    for cid in coach_ids:
        c = await db.get(Coach, cid)
        if c:
            coaches[cid] = c.name

    data = []
    for r in reports:
        data.append({
            "id": r.id,
            "player_id": r.player_id,
            "coach_id": r.coach_id,
            "coach_name": coaches.get(r.coach_id, "Unknown"),
            "period": r.period,
            "strengths": r.strengths if isinstance(r.strengths, list) else [],
            "weaknesses": r.weaknesses if isinstance(r.weaknesses, list) else [],
            "focus_areas": r.focus_areas if isinstance(r.focus_areas, list) else [],
            "progress_notes": r.progress_notes,
            "recommendations": r.recommendations,
            "is_ai_generated": r.is_ai_generated,
            "created_at": str(r.created_at),
        })

    return {"success": True, "data": data}
