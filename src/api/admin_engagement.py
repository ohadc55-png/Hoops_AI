"""HOOPS AI - Admin Coach Engagement API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.engagement_service import EngagementService
from src.api.admin_auth import get_current_admin
from src.models.user import User
from src.models.coach import Coach
from src.models.team_member import TeamMember
from src.models.team import Team
from src.models.player_evaluation import PlayerEvaluation
from src.models.player_report import PlayerReport
from src.models.game_report import GameReport
from src.models.drill import Drill
from src.models.club_message import ClubMessage
from src.models.player import Player

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


@router.get("/activity-detail/{activity_type}/{item_id}")
async def get_activity_detail(
    activity_type: str,
    item_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Fetch full detail of a single activity item for admin view."""
    async def _player_name(pid: int) -> str:
        p = await db.get(Player, pid)
        return p.name if p else f"#{pid}"

    async def _coach_name(cid: int) -> str:
        c = await db.get(Coach, cid)
        return c.name if c else ""

    if activity_type == "evaluation":
        ev = await db.get(PlayerEvaluation, item_id)
        if not ev:
            raise HTTPException(status_code=404, detail="Not found")
        cats = [
            ("התקפה", ev.offensive_rating, ev.offensive_notes),
            ("הגנה", ev.defensive_rating, ev.defensive_notes),
            ("IQ כדורסלי", ev.iq_rating, ev.iq_notes),
            ("חברתי", ev.social_rating, ev.social_notes),
            ("מנהיגות", ev.leadership_rating, ev.leadership_notes),
            ("מוסר עבודה", ev.work_ethic_rating, ev.work_ethic_notes),
            ("כושר", ev.fitness_rating, ev.fitness_notes),
            ("שיפור", ev.improvement_rating, ev.improvement_notes),
            ("סיכון עזיבה", ev.leaving_risk, ev.leaving_risk_notes),
        ]
        return {"success": True, "data": {
            "type": "evaluation",
            "title": f"הערכת שחקן: {await _player_name(ev.player_id)}",
            "date": str(ev.created_at),
            "coach": await _coach_name(ev.coach_id),
            "period": ev.period_label,
            "categories": [{"label": c[0], "rating": c[1], "notes": c[2]} for c in cats if c[1] is not None],
            "overall_notes": ev.overall_notes,
            "personal_improvement_rating": ev.personal_improvement_rating,
            "personal_improvement_notes": ev.personal_improvement_notes,
            "team_contribution_rating": ev.team_contribution_rating,
            "team_contribution_notes": ev.team_contribution_notes,
        }}

    elif activity_type == "player_report":
        r = await db.get(PlayerReport, item_id)
        if not r:
            raise HTTPException(status_code=404, detail="Not found")
        return {"success": True, "data": {
            "type": "player_report",
            "title": f"דוח שחקן תקופתי: {await _player_name(r.player_id)}",
            "date": str(r.created_at),
            "coach": await _coach_name(r.coach_id),
            "period": r.period,
            "is_ai_generated": r.is_ai_generated,
            "overall_rating": r.overall_rating,
            "personal_improvement_rating": r.personal_improvement_rating,
            "personal_improvement_notes": r.personal_improvement_notes,
            "team_contribution_rating": r.team_contribution_rating,
            "team_contribution_notes": r.team_contribution_notes,
            "strengths": r.strengths if isinstance(r.strengths, list) else [],
            "weaknesses": r.weaknesses if isinstance(r.weaknesses, list) else [],
            "focus_areas": r.focus_areas if isinstance(r.focus_areas, list) else [],
            "progress_notes": r.progress_notes,
            "recommendations": r.recommendations,
        }}

    elif activity_type == "game_report":
        g = await db.get(GameReport, item_id)
        if not g:
            raise HTTPException(status_code=404, detail="Not found")
        result_label = "ניצחון" if g.result == "win" else "הפסד" if g.result == "loss" else "תיקו"
        return {"success": True, "data": {
            "type": "game_report",
            "title": f"דוח משחק: מול {g.opponent}",
            "date": str(g.date),
            "coach": await _coach_name(g.coach_id),
            "result": result_label,
            "score": f"{g.score_us or '?'}-{g.score_them or '?'}",
            "location": g.location,
            "standout_players": g.standout_players if isinstance(g.standout_players, list) else [],
            "areas_to_improve": g.areas_to_improve if isinstance(g.areas_to_improve, list) else [],
            "notable_events": g.notable_events,
            "notes": g.notes,
        }}

    elif activity_type == "drill":
        d = await db.get(Drill, item_id)
        if not d:
            raise HTTPException(status_code=404, detail="Not found")
        return {"success": True, "data": {
            "type": "drill",
            "title": f"תרגיל: {d.title}",
            "date": str(d.created_at),
            "coach": await _coach_name(d.coach_id),
            "category": d.category,
            "difficulty": d.difficulty,
            "duration": d.duration_minutes,
            "description": d.description,
            "instructions": d.instructions,
            "tags": d.tags if isinstance(d.tags, list) else [],
            "is_ai_generated": d.is_ai_generated,
        }}

    elif activity_type == "message":
        m = await db.get(ClubMessage, item_id)
        if not m:
            raise HTTPException(status_code=404, detail="Not found")
        return {"success": True, "data": {
            "type": "message",
            "title": f"הודעה: {m.subject}",
            "date": str(m.created_at),
            "body": m.body,
            "target_type": m.target_type,
        }}

    raise HTTPException(status_code=400, detail="Unknown activity type")


@router.get("/{coach_id}/profile")
async def get_coach_profile(
    coach_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Coach profile page data: basic info + engagement scores + team + activity."""
    # Verify coach belongs to admin's teams
    coach = await db.get(Coach, coach_id)
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")

    # Verify coach is in one of admin's teams
    stmt = (
        select(TeamMember, Team)
        .join(Team, TeamMember.team_id == Team.id)
        .where(
            TeamMember.user_id == coach.user_id,
            TeamMember.role_in_team == "coach",
            Team.created_by_admin_id == admin.id,
            TeamMember.is_active == True,
        )
        .options(selectinload(TeamMember.team))
    )
    result = await db.execute(stmt)
    rows = result.all()
    if not rows:
        raise HTTPException(status_code=403, detail="Not authorized")

    teams = [{"id": r[1].id, "name": r[1].name, "age_group": r[1].age_group} for r in rows]

    # Get engagement scores
    service = EngagementService(db)
    activity = await service.get_coach_activity(admin.id, coach_id)

    # Get coach user info
    coach_user = await db.get(User, coach.user_id) if coach.user_id else None

    return {
        "success": True,
        "data": {
            "coach_id": coach_id,
            "name": coach_user.name if coach_user else coach.name,
            "email": coach_user.email if coach_user else coach.email,
            "phone": coach_user.phone if coach_user else None,
            "teams": teams,
            "activity": activity,
        },
    }
