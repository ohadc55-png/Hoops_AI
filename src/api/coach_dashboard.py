"""HOOPS AI - Coach Dashboard API"""
from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.utils.database import get_db
from src.api.auth import get_current_coach
from src.models.player import Player
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.event import Event
from src.models.team_event import TeamEvent
from src.models.game_report import GameReport
from src.models.attendance import Attendance
from src.models.drill_assignment import DrillAssignment
from src.models.practice_session import PracticeSession

router = APIRouter(prefix="/api/coach", tags=["coach-dashboard"])


@router.get("/dashboard")
async def coach_dashboard(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Rich aggregated data for coach dashboard."""

    today = date.today()
    week_ahead = today + timedelta(days=7)

    # --- Teams (via TeamMember, same pattern as drills.py) ---
    teams = []
    team_ids = []
    if coach.user_id:
        teams_result = await db.execute(
            select(TeamMember.team_id, Team.name)
            .join(Team, TeamMember.team_id == Team.id)
            .where(
                TeamMember.user_id == coach.user_id,
                TeamMember.role_in_team == "coach",
                TeamMember.is_active == True,
            )
        )
        for row in teams_result.all():
            teams.append({"id": row[0], "name": row[1]})
            team_ids.append(row[0])

    # --- Players (via TeamMember → Player, same pattern as drills.py /my-players) ---
    player_map = {}
    player_ids = []
    if team_ids:
        players_result = await db.execute(
            select(TeamMember, Player, Team)
            .join(Player, TeamMember.player_id == Player.id)
            .join(Team, TeamMember.team_id == Team.id)
            .where(
                TeamMember.team_id.in_(team_ids),
                TeamMember.role_in_team == "player",
                TeamMember.is_active == True,
                TeamMember.player_id.isnot(None),
            )
            .order_by(Player.name)
        )
        for tm, player, team in players_result.all():
            player_map[player.id] = player
            if player.id not in player_ids:
                player_ids.append(player.id)

    total_players = len(player_ids)

    # --- Upcoming events (merge coach Event + admin TeamEvent) ---
    upcoming_events = []

    # Coach personal events
    coach_events_result = await db.execute(
        select(Event)
        .where(
            Event.coach_id == coach.id,
            Event.date >= today,
            Event.date <= week_ahead,
        )
        .order_by(Event.date, Event.time)
        .limit(10)
    )
    for e in coach_events_result.scalars().all():
        upcoming_events.append({
            "title": e.title, "event_type": e.event_type,
            "date": e.date.isoformat(), "time_start": e.time,
            "time_end": None, "location": None,
            "opponent": e.opponent, "source": "coach",
        })

    # Admin team events
    if team_ids:
        team_events_result = await db.execute(
            select(TeamEvent)
            .where(
                TeamEvent.team_id.in_(team_ids),
                TeamEvent.date >= today,
                TeamEvent.date <= week_ahead,
                TeamEvent.is_active == True,
            )
            .order_by(TeamEvent.date, TeamEvent.time_start)
            .limit(10)
        )
        for te in team_events_result.scalars().all():
            upcoming_events.append({
                "title": te.title, "event_type": te.event_type,
                "date": te.date.isoformat(), "time_start": te.time_start,
                "time_end": te.time_end, "location": te.location,
                "opponent": te.opponent, "source": "admin",
            })

    # Sort merged events by date+time, take first 4
    upcoming_events.sort(key=lambda x: (x["date"], x["time_start"] or ""))
    total_upcoming = len(upcoming_events)
    upcoming_events = upcoming_events[:4]

    # --- Recent game reports (last 3) ---
    games_result = await db.execute(
        select(GameReport)
        .where(GameReport.coach_id == coach.id)
        .order_by(GameReport.date.desc())
        .limit(3)
    )
    recent_games = [{
        "date": g.date.isoformat(), "opponent": g.opponent,
        "result": g.result, "score_us": g.score_us, "score_them": g.score_them,
    } for g in games_result.scalars().all()]

    # Win rate
    all_games_result = await db.execute(
        select(
            func.count(GameReport.id).label("total"),
            func.sum(case((GameReport.result == "win", 1), else_=0)).label("wins"),
        )
        .where(GameReport.coach_id == coach.id)
    )
    games_row = all_games_result.one()
    total_games = games_row[0] or 0
    total_wins = int(games_row[1] or 0)
    win_rate = round(total_wins / total_games * 100) if total_games > 0 else 0

    # --- Attendance stats (per player) ---
    attendance_stats = []
    if player_ids:
        att_result = await db.execute(
            select(
                Attendance.player_id,
                func.count(Attendance.id).label("total"),
                func.sum(case((Attendance.present == True, 1), else_=0)).label("attended"),
            )
            .where(Attendance.coach_id == coach.id, Attendance.player_id.in_(player_ids))
            .group_by(Attendance.player_id)
        )
        for row in att_result.all():
            p = player_map.get(row[0])
            if not p:
                continue
            total = row[1]
            attended = int(row[2] or 0)
            attendance_stats.append({
                "player_id": row[0],
                "player_name": p.name,
                "jersey_number": p.jersey_number,
                "total": total,
                "attended": attended,
                "percentage": round(attended / total * 100) if total > 0 else 0,
            })
        attendance_stats.sort(key=lambda x: x["percentage"], reverse=True)

    # --- Drill leaderboard ---
    drill_leaderboard = []
    if player_ids:
        drill_result = await db.execute(
            select(
                DrillAssignment.player_id,
                func.count(DrillAssignment.id).label("assigned"),
                func.sum(case((DrillAssignment.is_completed == True, 1), else_=0)).label("completed"),
            )
            .where(DrillAssignment.player_id.in_(player_ids))
            .group_by(DrillAssignment.player_id)
        )
        for row in drill_result.all():
            p = player_map.get(row[0])
            if not p:
                continue
            assigned = row[1]
            completed = int(row[2] or 0)
            drill_leaderboard.append({
                "player_id": row[0],
                "player_name": p.name,
                "jersey_number": p.jersey_number,
                "assigned": assigned,
                "completed": completed,
                "completion_pct": round(completed / assigned * 100) if assigned > 0 else 0,
            })
        drill_leaderboard.sort(key=lambda x: x["completion_pct"], reverse=True)

    # --- Recent practices (last 3 with segments) ---
    practices_result = await db.execute(
        select(PracticeSession)
        .options(selectinload(PracticeSession.segments))
        .where(PracticeSession.coach_id == coach.id)
        .order_by(PracticeSession.date.desc())
        .limit(3)
    )
    recent_practices = []
    for ps in practices_result.scalars().all():
        seg_types = []
        for seg in (ps.segments or []):
            if seg.segment_type and seg.segment_type not in seg_types:
                seg_types.append(seg.segment_type)
        recent_practices.append({
            "id": ps.id,
            "date": ps.date.isoformat() if ps.date else "",
            "title": ps.title,
            "focus": ps.focus,
            "total_duration": ps.total_duration,
            "segments_summary": seg_types,
        })

    # --- Drill completion count (for stats card) ---
    drills_completed = 0
    if player_ids:
        dc_result = await db.execute(
            select(func.count(DrillAssignment.id))
            .where(DrillAssignment.player_id.in_(player_ids), DrillAssignment.is_completed == True)
        )
        drills_completed = dc_result.scalar() or 0

    return {
        "success": True,
        "data": {
            "total_players": total_players,
            "total_upcoming": total_upcoming,
            "drills_completed": drills_completed,
            "win_rate": win_rate,
            "total_games": total_games,
            "teams": teams,
            "upcoming_events": upcoming_events,
            "recent_games": recent_games,
            "attendance_stats": attendance_stats,
            "drill_leaderboard": drill_leaderboard,
            "recent_practices": recent_practices,
        },
    }
