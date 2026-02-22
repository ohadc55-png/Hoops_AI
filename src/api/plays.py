"""HOOPS AI - Plays API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.play_service import PlayService
from src.api.auth import get_current_coach
from src.models.team_member import TeamMember
from src.models.team import Team

router = APIRouter(prefix="/api/plays", tags=["plays"])


class PlayRequest(BaseModel):
    name: str
    description: str | None = None
    offense_template: str | None = None
    defense_template: str | None = None
    players: list | None = None
    actions: list | None = None
    ball_holder_id: str | None = None
    thumbnail: str | None = None


class GeneratePlayRequest(BaseModel):
    description: str


class SharePlayRequest(BaseModel):
    team_id: int


def play_to_dict(p):
    return {
        "id": p.id, "name": p.name, "description": p.description,
        "offense_template": p.offense_template, "defense_template": p.defense_template,
        "players": p.players, "actions": p.actions, "ball_holder_id": p.ball_holder_id,
        "thumbnail": p.thumbnail, "is_ai_generated": p.is_ai_generated,
        "shared_with_team": p.shared_with_team, "team_id": p.team_id,
        "created_at": str(p.created_at),
    }


@router.get("")
async def list_plays(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PlayService(db)
    plays = await service.get_plays(coach.id)
    return {"success": True, "data": [play_to_dict(p) for p in plays]}


@router.post("")
async def create_play(req: PlayRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PlayService(db)
    play = await service.create_play(coach.id, **req.model_dump())
    return {"success": True, "data": play_to_dict(play)}


@router.post("/generate")
async def generate_play(req: GeneratePlayRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    from src.utils.feature_gate import require_feature
    await require_feature("play_creator", db, coach_id=coach.id)
    service = PlayService(db)
    try:
        play = await service.ai_generate_play(coach.id, req.description)
        return {"success": True, "data": play_to_dict(play)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my-teams")
async def get_my_teams(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Get teams where this coach is a member (for share dropdown)."""
    stmt = (
        select(TeamMember, Team)
        .join(Team, TeamMember.team_id == Team.id)
        .where(
            TeamMember.user_id == coach.user_id,
            TeamMember.role_in_team == "coach",
            TeamMember.is_active == True,
        )
    )
    result = await db.execute(stmt)
    rows = result.all()
    return {
        "success": True,
        "data": [{"id": t.id, "name": t.name} for _, t in rows],
    }


@router.get("/{play_id}")
async def get_play(play_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PlayService(db)
    play = await service.get_play(play_id)
    if not play or play.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Play not found")
    return {"success": True, "data": play_to_dict(play)}


@router.put("/{play_id}")
async def update_play(play_id: int, req: PlayRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PlayService(db)
    existing = await service.get_play(play_id)
    if not existing or existing.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Play not found")
    play = await service.update_play(play_id, **req.model_dump())
    return {"success": True, "data": play_to_dict(play)}


@router.delete("/{play_id}")
async def delete_play(play_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PlayService(db)
    existing = await service.get_play(play_id)
    if not existing or existing.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Play not found")
    await service.delete_play(play_id)
    return {"success": True}


@router.post("/{play_id}/share")
async def share_play(play_id: int, req: SharePlayRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Share a play with a team."""
    service = PlayService(db)
    play = await service.get_play(play_id)
    if not play or play.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Play not found")

    # Validate coach belongs to the target team
    stmt = select(TeamMember).where(
        TeamMember.user_id == coach.user_id,
        TeamMember.team_id == req.team_id,
        TeamMember.role_in_team == "coach",
        TeamMember.is_active == True,
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a coach of this team")

    updated = await service.share_play(play_id, req.team_id)
    return {"success": True, "data": play_to_dict(updated)}


@router.post("/{play_id}/unshare")
async def unshare_play(play_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Remove sharing from a play."""
    service = PlayService(db)
    play = await service.get_play(play_id)
    if not play or play.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Play not found")
    updated = await service.unshare_play(play_id)
    return {"success": True, "data": play_to_dict(updated)}
