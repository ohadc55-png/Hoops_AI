"""HOOPS AI - Admin Practice Plans API"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.models.user import User
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.coach import Coach
from src.models.practice_session import PracticeSession, SessionSegment

router = APIRouter(prefix="/api/admin/practice-plans", tags=["admin-practice"])


@router.get("")
async def get_practice_plans(
    team_id: int | None = None,
    days: int = 30,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return practice sessions (with summaries) for all teams managed by this admin."""
    # Get admin's teams
    teams_stmt = select(Team.id, Team.name).where(Team.created_by_admin_id == admin.id)
    teams_result = await db.execute(teams_stmt)
    admin_teams = {r[0]: r[1] for r in teams_result.all()}

    teams_list = [{"id": k, "name": v} for k, v in admin_teams.items()]

    if not admin_teams:
        return {"success": True, "data": {"teams": [], "sessions": []}}

    target_team_ids = [team_id] if (team_id and team_id in admin_teams) else list(admin_teams.keys())

    # Get coaches in those teams
    coaches_stmt = (
        select(Coach.id, Coach.name, TeamMember.team_id)
        .join(TeamMember, (TeamMember.user_id == Coach.user_id) & (TeamMember.role_in_team == "coach"))
        .where(
            TeamMember.team_id.in_(target_team_ids),
            TeamMember.is_active == True,
            Coach.user_id.isnot(None),
        )
    )
    coaches_result = await db.execute(coaches_stmt)
    coach_map = {}  # coach_id -> (name, team_id)
    for coach_id, coach_name, t_id in coaches_result.all():
        if coach_id not in coach_map:
            coach_map[coach_id] = (coach_name, t_id)

    if not coach_map:
        return {"success": True, "data": {"teams": teams_list, "sessions": []}}

    # Get practice sessions for those coaches within time window
    cutoff = datetime.now() - timedelta(days=max(days, 1))
    sessions_stmt = (
        select(PracticeSession)
        .where(
            PracticeSession.coach_id.in_(list(coach_map.keys())),
            PracticeSession.created_at >= cutoff,
        )
        .order_by(PracticeSession.date.desc())
    )
    sessions_result = await db.execute(sessions_stmt)
    sessions = sessions_result.scalars().all()

    # Count segments per session
    segment_counts = {}
    if sessions:
        seg_stmt = (
            select(SessionSegment.session_id, func.count(SessionSegment.id))
            .where(SessionSegment.session_id.in_([s.id for s in sessions]))
            .group_by(SessionSegment.session_id)
        )
        seg_result = await db.execute(seg_stmt)
        for s_id, count in seg_result.all():
            segment_counts[s_id] = count

    session_data = []
    for s in sessions:
        coach_name, t_id = coach_map.get(s.coach_id, ("", 0))
        session_data.append({
            "id": s.id,
            "date": str(s.date),
            "title": s.title,
            "focus": s.focus,
            "total_duration": s.total_duration,
            "coach_id": s.coach_id,
            "coach_name": coach_name,
            "team_id": t_id,
            "team_name": admin_teams.get(t_id, ""),
            "is_ai_generated": s.is_ai_generated,
            "goal_achieved": s.goal_achieved,
            "what_worked": s.what_worked,
            "what_didnt_work": s.what_didnt_work,
            "standout_players": s.standout_players or [],
            "attention_players": s.attention_players or [],
            "segments_count": segment_counts.get(s.id, 0),
            "created_at": str(s.created_at),
        })

    return {
        "success": True,
        "data": {
            "teams": teams_list,
            "sessions": session_data,
        },
    }


@router.get("/{session_id}")
async def get_practice_plan_detail(
    session_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return a single practice session with full segments for admin view."""
    # Load session with segments
    stmt = (
        select(PracticeSession)
        .options(selectinload(PracticeSession.segments))
        .where(PracticeSession.id == session_id)
    )
    result = await db.execute(stmt)
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify the coach belongs to one of the admin's teams
    admin_teams_stmt = select(Team.id).where(Team.created_by_admin_id == admin.id)
    admin_teams_result = await db.execute(admin_teams_stmt)
    admin_team_ids = [r[0] for r in admin_teams_result.all()]

    coach_team_stmt = (
        select(TeamMember.team_id)
        .join(Coach, Coach.user_id == TeamMember.user_id)
        .where(
            Coach.id == session.coach_id,
            TeamMember.role_in_team == "coach",
            TeamMember.team_id.in_(admin_team_ids),
        )
    )
    coach_team_result = await db.execute(coach_team_stmt)
    coach_team = coach_team_result.scalars().first()
    if not coach_team:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get coach name
    coach_stmt = select(Coach.name).where(Coach.id == session.coach_id)
    coach_result = await db.execute(coach_stmt)
    coach_name = coach_result.scalars().first() or ""

    segments = sorted(session.segments, key=lambda x: x.order_index) if session.segments else []

    return {
        "success": True,
        "data": {
            "id": session.id,
            "date": str(session.date),
            "title": session.title,
            "focus": session.focus,
            "notes": session.notes,
            "total_duration": session.total_duration,
            "is_ai_generated": session.is_ai_generated,
            "coach_name": coach_name,
            "goal_achieved": session.goal_achieved,
            "what_worked": session.what_worked,
            "what_didnt_work": session.what_didnt_work,
            "standout_players": session.standout_players or [],
            "attention_players": session.attention_players or [],
            "segments": [
                {
                    "segment_type": seg.segment_type,
                    "title": seg.title,
                    "duration_minutes": seg.duration_minutes,
                    "notes": seg.notes,
                    "order_index": seg.order_index,
                }
                for seg in segments
            ],
        },
    }
