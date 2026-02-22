"""HOOPS AI - Admin Dashboard API"""
from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.models.user import User
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.team_event import TeamEvent
from src.models.schedule_request import ScheduleRequest
from src.models.game_report import GameReport
from src.models.attendance import Attendance
from src.models.coach import Coach

router = APIRouter(prefix="/api/admin", tags=["admin-dashboard"])


@router.get("/dashboard")
async def admin_dashboard(admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Rich aggregated data for admin dashboard."""

    # --- Get admin's teams ---
    teams_result = await db.execute(
        select(Team).where(Team.created_by_admin_id == admin.id, Team.is_active == True)
    )
    admin_teams = teams_result.scalars().all()
    admin_team_ids = [t.id for t in admin_teams]
    team_names = {t.id: t.name for t in admin_teams}

    empty = {
        "total_teams": 0, "total_coaches": 0, "total_players": 0, "total_parents": 0,
        "todays_events": [], "upcoming_events": [], "pending_requests": [],
        "recent_games": [], "new_members": [], "attendance_by_team": [],
    }
    if not admin_team_ids:
        return {"success": True, "data": empty}

    # --- Member counts ---
    counts_result = await db.execute(
        select(TeamMember.role_in_team, func.count(TeamMember.id))
        .where(TeamMember.team_id.in_(admin_team_ids), TeamMember.is_active == True)
        .group_by(TeamMember.role_in_team)
    )
    role_counts = {row[0]: row[1] for row in counts_result.all()}

    # --- Coach mapping (user_id → team_id, coach.id → team_id) ---
    coach_members_result = await db.execute(
        select(TeamMember.user_id, TeamMember.team_id)
        .where(
            TeamMember.team_id.in_(admin_team_ids),
            TeamMember.role_in_team == "coach",
            TeamMember.is_active == True,
        )
    )
    coach_user_to_team = {row[0]: row[1] for row in coach_members_result.all()}

    coach_id_to_team = {}
    coach_id_to_name = {}
    if coach_user_to_team:
        coaches_result = await db.execute(
            select(Coach).where(Coach.user_id.in_(list(coach_user_to_team.keys())))
        )
        for c in coaches_result.scalars().all():
            if c.user_id in coach_user_to_team:
                coach_id_to_team[c.id] = coach_user_to_team[c.user_id]
                coach_id_to_name[c.id] = c.name

    coach_ids = list(coach_id_to_team.keys())

    today = date.today()
    week_ahead = today + timedelta(days=7)
    week_ago = datetime.utcnow() - timedelta(days=7)

    # --- Today's events ---
    todays_result = await db.execute(
        select(TeamEvent)
        .where(TeamEvent.team_id.in_(admin_team_ids), TeamEvent.date == today, TeamEvent.is_active == True)
        .order_by(TeamEvent.time_start)
    )
    todays_events = [{
        "id": e.id, "title": e.title, "event_type": e.event_type,
        "time_start": e.time_start, "time_end": e.time_end,
        "location": e.location, "team_name": team_names.get(e.team_id, ""),
        "opponent": e.opponent,
    } for e in todays_result.scalars().all()]

    # --- Upcoming events (next 7 days, excluding today) ---
    upcoming_result = await db.execute(
        select(TeamEvent)
        .where(
            TeamEvent.team_id.in_(admin_team_ids),
            TeamEvent.date > today,
            TeamEvent.date <= week_ahead,
            TeamEvent.is_active == True,
        )
        .order_by(TeamEvent.date, TeamEvent.time_start)
        .limit(10)
    )
    upcoming_events = [{
        "id": e.id, "title": e.title, "event_type": e.event_type,
        "date": e.date.isoformat(), "time_start": e.time_start, "time_end": e.time_end,
        "location": e.location, "team_name": team_names.get(e.team_id, ""),
        "opponent": e.opponent,
    } for e in upcoming_result.scalars().all()]

    # --- Pending schedule requests ---
    pending_result = await db.execute(
        select(ScheduleRequest, Coach.name.label("coach_name"))
        .join(Coach, ScheduleRequest.coach_id == Coach.id)
        .where(ScheduleRequest.team_id.in_(admin_team_ids), ScheduleRequest.status == "pending")
        .order_by(ScheduleRequest.created_at.desc())
    )
    pending_requests = [{
        "id": row[0].id, "title": row[0].title, "event_type": row[0].event_type,
        "date": row[0].date.isoformat(), "time_start": row[0].time_start,
        "coach_name": row[1], "team_name": team_names.get(row[0].team_id, ""),
    } for row in pending_result.all()]

    # --- Recent game reports ---
    recent_games = []
    if coach_ids:
        games_result = await db.execute(
            select(GameReport)
            .where(GameReport.coach_id.in_(coach_ids))
            .order_by(GameReport.date.desc())
            .limit(5)
        )
        for g in games_result.scalars().all():
            team_id = coach_id_to_team.get(g.coach_id)
            recent_games.append({
                "date": g.date.isoformat(), "opponent": g.opponent,
                "result": g.result, "score_us": g.score_us, "score_them": g.score_them,
                "team_name": team_names.get(team_id, "") if team_id else "",
            })

    # --- New members (last 7 days) ---
    new_members_result = await db.execute(
        select(TeamMember, User)
        .join(User, TeamMember.user_id == User.id)
        .where(
            TeamMember.team_id.in_(admin_team_ids),
            TeamMember.joined_at >= week_ago,
            TeamMember.is_active == True,
        )
        .order_by(TeamMember.joined_at.desc())
        .limit(10)
    )
    new_members = [{
        "name": row[1].name, "role": row[0].role_in_team,
        "team_name": team_names.get(row[0].team_id, ""),
        "joined_at": row[0].joined_at.isoformat() if row[0].joined_at else "",
    } for row in new_members_result.all()]

    # --- Attendance by team ---
    attendance_by_team = []
    if coach_ids:
        att_total_result = await db.execute(
            select(Attendance.coach_id, func.count(Attendance.id).label("total"))
            .where(Attendance.coach_id.in_(coach_ids))
            .group_by(Attendance.coach_id)
        )
        att_present_result = await db.execute(
            select(Attendance.coach_id, func.count(Attendance.id).label("present"))
            .where(Attendance.coach_id.in_(coach_ids), Attendance.present == True)
            .group_by(Attendance.coach_id)
        )
        total_by_coach = {row[0]: row[1] for row in att_total_result.all()}
        present_by_coach = {row[0]: row[1] for row in att_present_result.all()}

        # Aggregate per team
        team_att = {}
        for cid, tid in coach_id_to_team.items():
            if cid not in total_by_coach:
                continue
            if tid not in team_att:
                team_att[tid] = {"total": 0, "present": 0}
            team_att[tid]["total"] += total_by_coach.get(cid, 0)
            team_att[tid]["present"] += present_by_coach.get(cid, 0)

        for tid, att in team_att.items():
            rate = round((att["present"] / att["total"] * 100) if att["total"] > 0 else 0)
            attendance_by_team.append({
                "team_name": team_names.get(tid, ""),
                "total": att["total"], "present": att["present"], "rate": rate,
            })
        attendance_by_team.sort(key=lambda x: x["rate"], reverse=True)

    return {
        "success": True,
        "data": {
            "total_teams": len(admin_teams),
            "total_coaches": role_counts.get("coach", 0),
            "total_players": role_counts.get("player", 0),
            "total_parents": role_counts.get("parent", 0),
            "todays_events": todays_events,
            "upcoming_events": upcoming_events,
            "pending_requests": pending_requests,
            "recent_games": recent_games,
            "new_members": new_members,
            "attendance_by_team": attendance_by_team,
        },
    }
