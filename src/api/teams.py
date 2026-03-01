"""HOOPS AI - Teams API (Admin only)"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.services.team_service import TeamService
from src.models.user import User

router = APIRouter(prefix="/api/teams", tags=["teams"])


class CreateTeamRequest(BaseModel):
    name: str
    club_name: str | None = None
    age_group: str | None = None
    level: str | None = None


def _team_to_dict(team, include_members=False):
    d = {
        "id": team.id,
        "name": team.name,
        "club_name": team.club_name,
        "age_group": team.age_group,
        "level": team.level,
        "coach_invite_code": team.coach_invite_code,
        "coach_invite_token": team.coach_invite_token,
        "player_invite_code": team.player_invite_code,
        "player_invite_token": team.player_invite_token,
        "parent_invite_code": getattr(team, 'parent_invite_code', None),
        "parent_invite_token": getattr(team, 'parent_invite_token', None),
        "is_active": team.is_active,
        "created_at": str(team.created_at),
    }
    if include_members and hasattr(team, "members") and team.members is not None:
        d["members"] = [
            {
                "id": m.id,
                "user_id": m.user_id,
                "name": m.user.name if m.user else None,
                "email": m.user.email if m.user else None,
                "role_in_team": m.role_in_team,
                "player_id": m.player_id,
                "child_name": m.player.name if m.player else None,
                "joined_at": str(m.joined_at),
                "is_active": m.is_active,
            }
            for m in team.members
        ]
        d["member_count"] = len(team.members)
    return d


# --- Admin creates team ---
@router.post("")
async def create_team(req: CreateTeamRequest, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Team name is required")
    service = TeamService(db)
    team = await service.create_team(
        admin_id=admin.id, name=req.name, club_name=req.club_name,
        age_group=req.age_group, level=req.level,
    )
    return {"success": True, "data": _team_to_dict(team)}


# --- Admin lists teams ---
@router.get("")
async def list_teams(admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    teams = await service.get_admin_teams(admin.id)
    return {"success": True, "data": [_team_to_dict(t, include_members=True) for t in teams]}


# --- Admin gets team detail ---
@router.get("/{team_id}")
async def get_team(team_id: int, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    team = await service.get_team_detail(team_id)
    if not team or team.created_by_admin_id != admin.id:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"success": True, "data": _team_to_dict(team, include_members=True)}


# --- Admin regenerates coach invite ---
@router.post("/{team_id}/regenerate-coach-code")
async def regenerate_coach_code(team_id: int, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    team = await service.regenerate_coach_invite(team_id, admin.id)
    return {"success": True, "data": _team_to_dict(team)}


# --- Admin regenerates player invite ---
@router.post("/{team_id}/regenerate-player-code")
async def regenerate_player_code(team_id: int, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    team = await service.regenerate_player_invite(team_id, admin.id)
    return {"success": True, "data": _team_to_dict(team)}


# --- Admin regenerates parent invite ---
@router.post("/{team_id}/regenerate-parent-code")
async def regenerate_parent_code(team_id: int, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    team = await service.regenerate_parent_invite(team_id, admin.id)
    return {"success": True, "data": _team_to_dict(team)}


# --- Admin removes member ---
@router.delete("/{team_id}/members/{member_id}")
async def remove_member(team_id: int, member_id: int, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    await service.remove_member(team_id, member_id, admin.id)
    return {"success": True}


# --- Public: validate invite link ---
@router.get("/validate/{token}")
async def validate_invite(token: str, db: AsyncSession = Depends(get_db)):
    service = TeamService(db)
    info = await service.validate_invite_link(token)
    if not info:
        raise HTTPException(status_code=404, detail="Invalid or expired invite link")
    return {"success": True, "data": info}
