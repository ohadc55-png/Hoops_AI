"""HOOPS AI - Player Dashboard API"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import select, extract, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.player_auth import get_current_player
from src.models.user import User
from src.models.team_member import TeamMember
from src.models.event import Event
from src.models.drill import Drill
from src.models.player import Player
from src.models.player_report import PlayerReport

router = APIRouter(prefix="/api/player", tags=["player-dashboard"])


async def _get_player_team_coach_ids(db: AsyncSession, user: User):
    """Get team IDs and coach IDs the player belongs to."""
    stmt = select(TeamMember).where(TeamMember.user_id == user.id, TeamMember.is_active == True)
    result = await db.execute(stmt)
    memberships = result.scalars().all()

    team_ids = [m.team_id for m in memberships]
    player_ids = [m.player_id for m in memberships if m.player_id]

    # Get coach IDs from teams (via TeamMember with role_in_team="coach")
    if team_ids:
        stmt = (
            select(TeamMember.user_id)
            .where(TeamMember.team_id.in_(team_ids), TeamMember.role_in_team == "coach", TeamMember.is_active == True)
        )
        result = await db.execute(stmt)
        coach_user_ids = [row[0] for row in result.all()]

        if coach_user_ids:
            from src.models.coach import Coach
            stmt = select(Coach.id).where(Coach.user_id.in_(coach_user_ids))
            result = await db.execute(stmt)
            coach_ids = [row[0] for row in result.all()]
        else:
            coach_ids = []
    else:
        coach_ids = []

    return team_ids, coach_ids, player_ids


@router.get("/schedule")
async def player_schedule(
    year: int | None = Query(None),
    month: int | None = Query(None),
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    """Events for player's team(s) — merges coach Events + admin TeamEvents.
    With year+month: returns all events for that month.
    Without: returns upcoming events (limit 20).
    """
    team_ids, coach_ids, _ = await _get_player_team_coach_ids(db, user)

    all_events = []
    use_month = year is not None and month is not None

    # 1. Coach-created events
    if coach_ids:
        if use_month:
            from src.repositories.event_repository import EventRepository
            event_repo = EventRepository(db)
            events = await event_repo.get_by_month_for_coaches(coach_ids, year, month)
        else:
            today = datetime.now().strftime("%Y-%m-%d")
            stmt = (
                select(Event)
                .where(Event.coach_id.in_(coach_ids), Event.date >= today)
                .order_by(Event.date.asc(), Event.time.asc())
                .limit(20)
            )
            result = await db.execute(stmt)
            events = result.scalars().all()
        for e in events:
            all_events.append({
                "id": e.id, "title": e.title, "date": str(e.date), "time": e.time,
                "event_type": e.event_type, "opponent": e.opponent, "notes": e.notes,
                "source": "coach",
            })

    # 2. Admin-created team events
    if team_ids:
        from src.services.schedule_service import ScheduleService
        sched_service = ScheduleService(db)
        if use_month:
            team_events = await sched_service.get_teams_events_by_month(team_ids, year, month)
        else:
            team_events = await sched_service.get_teams_schedule(team_ids)
        for te in team_events:
            all_events.append({
                "id": te.id, "title": te.title, "date": str(te.date),
                "time": te.time_start,
                "event_type": te.event_type, "opponent": te.opponent, "notes": te.notes,
                "source": "admin", "location": te.location,
                "time_end": te.time_end,
                "is_away": te.is_away, "departure_time": te.departure_time,
                "venue_address": te.venue_address,
            })

    all_events.sort(key=lambda x: x["date"])

    if not use_month:
        all_events = all_events[:20]

    return {"success": True, "data": all_events}


@router.get("/drills")
async def player_drills(
    filter: str | None = Query(None),
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    """Drills assigned to the player (via DrillAssignment)."""
    _, _, player_ids = await _get_player_team_coach_ids(db, user)
    if not player_ids:
        return {"success": True, "data": []}

    from src.models.drill_assignment import DrillAssignment
    stmt = (
        select(DrillAssignment, Drill)
        .join(Drill, DrillAssignment.drill_id == Drill.id)
        .where(DrillAssignment.player_id.in_(player_ids))
    )
    if filter == "pending":
        stmt = stmt.where(DrillAssignment.status.in_(["pending", "rejected"]))
    elif filter == "completed":
        stmt = stmt.where(DrillAssignment.status == "approved")
    elif filter == "video_uploaded":
        stmt = stmt.where(DrillAssignment.status == "video_uploaded")
    stmt = stmt.order_by(DrillAssignment.created_at.desc())

    result = await db.execute(stmt)
    rows = result.all()
    return {
        "success": True,
        "data": [
            {
                "assignment_id": a.id, "drill_id": d.id, "title": d.title,
                "description": d.description, "category": d.category,
                "difficulty": d.difficulty, "duration_minutes": d.duration_minutes,
                "instructions": d.instructions, "coaching_points": d.coaching_points,
                "tags": d.tags, "video_url": d.video_url,
                "coach_note": a.note, "assigned_at": str(a.created_at),
                "is_completed": a.is_completed,
                "completed_at": str(a.completed_at) if a.completed_at else None,
                "status": getattr(a, "status", "pending") or "pending",
                "proof_video_url": getattr(a, "video_url", None),
                "coach_feedback": getattr(a, "coach_feedback", None),
            }
            for a, d in rows
        ],
    }


@router.put("/drills/{assignment_id}/complete")
async def complete_drill(assignment_id: int, user: User = Depends(get_current_player), db: AsyncSession = Depends(get_db)):
    """Mark a drill assignment as completed."""
    _, _, player_ids = await _get_player_team_coach_ids(db, user)
    if not player_ids:
        raise HTTPException(status_code=404, detail="Assignment not found")

    from src.models.drill_assignment import DrillAssignment
    stmt = select(DrillAssignment).where(
        DrillAssignment.id == assignment_id,
        DrillAssignment.player_id.in_(player_ids),
    )
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.is_completed:
        return {"success": True, "data": {"already_completed": True}}

    from datetime import datetime
    assignment.is_completed = True
    assignment.completed_at = datetime.utcnow()
    await db.flush()

    return {"success": True, "data": {"is_completed": True, "completed_at": str(assignment.completed_at)}}


@router.post("/drills/{assignment_id}/upload-proof")
async def upload_drill_proof(
    assignment_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    """Upload video proof for a drill assignment."""
    _, _, player_ids = await _get_player_team_coach_ids(db, user)
    if not player_ids:
        raise HTTPException(status_code=404, detail="Assignment not found")

    from src.services.drill_video_service import DrillVideoService
    service = DrillVideoService(db)
    try:
        result = await service.upload_video_proof(assignment_id, player_ids, file)
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/streak")
async def player_streak(user: User = Depends(get_current_player), db: AsyncSession = Depends(get_db)):
    """Get player's attendance streak data."""
    _, _, player_ids = await _get_player_team_coach_ids(db, user)
    if not player_ids:
        return {"success": True, "data": {"current": 0, "highest": 0}}

    player = await db.get(Player, player_ids[0])
    if not player:
        return {"success": True, "data": {"current": 0, "highest": 0}}

    return {
        "success": True,
        "data": {
            "current": player.current_attendance_streak or 0,
            "highest": player.highest_attendance_streak or 0,
        },
    }


@router.get("/plays")
async def player_plays(
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    """Plays shared with the player's team(s)."""
    team_ids, _, _ = await _get_player_team_coach_ids(db, user)
    if not team_ids:
        return {"success": True, "data": []}

    from src.services.play_service import PlayService
    from src.models.play_view import PlayView
    service = PlayService(db)
    plays = await service.get_shared_plays(team_ids)

    # Get viewed play IDs for this user
    viewed_res = await db.execute(
        select(PlayView.play_id).where(PlayView.user_id == user.id)
    )
    viewed_ids = set(viewed_res.scalars().all())

    return {
        "success": True,
        "data": [
            {
                "id": p.id, "name": p.name, "description": p.description,
                "offense_template": p.offense_template,
                "defense_template": p.defense_template,
                "players": p.players, "actions": p.actions,
                "ball_holder_id": p.ball_holder_id,
                "shared_at": str(p.updated_at),
                "viewed": p.id in viewed_ids,
            }
            for p in plays
        ],
    }


@router.get("/reports")
async def player_reports(user: User = Depends(get_current_player), db: AsyncSession = Depends(get_db)):
    """Player's own reports."""
    _, _, player_ids = await _get_player_team_coach_ids(db, user)
    if not player_ids:
        return {"success": True, "data": []}

    stmt = (
        select(PlayerReport)
        .where(PlayerReport.player_id.in_(player_ids))
        .order_by(PlayerReport.created_at.desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    reports = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": r.id, "period": r.period, "strengths": r.strengths,
                "weaknesses": r.weaknesses, "focus_areas": r.focus_areas,
                "progress_notes": r.progress_notes, "recommendations": r.recommendations,
                "is_ai_generated": r.is_ai_generated, "created_at": str(r.created_at),
            }
            for r in reports
        ],
    }


@router.get("/team")
async def player_team(user: User = Depends(get_current_player), db: AsyncSession = Depends(get_db)):
    """Team info + roster (limited view)."""
    team_ids, coach_ids, _ = await _get_player_team_coach_ids(db, user)
    if not team_ids:
        return {"success": True, "data": []}

    from src.models.team import Team
    from sqlalchemy.orm import selectinload

    stmt = select(Team).where(Team.id.in_(team_ids)).options(selectinload(Team.members))
    result = await db.execute(stmt)
    teams = result.scalars().all()

    # Get players from coaches
    if coach_ids:
        stmt = select(Player).where(Player.coach_id.in_(coach_ids)).order_by(Player.name.asc())
        result = await db.execute(stmt)
        players = result.scalars().all()
    else:
        players = []

    return {
        "success": True,
        "data": {
            "teams": [
                {"id": t.id, "name": t.name, "club_name": t.club_name, "age_group": t.age_group,
                 "member_count": len(t.members) if t.members else 0}
                for t in teams
            ],
            "roster": [
                {"id": p.id, "name": p.name, "jersey_number": p.jersey_number, "position": p.position}
                for p in players
            ],
        },
    }


@router.get("/profile")
async def player_profile(user: User = Depends(get_current_player), db: AsyncSession = Depends(get_db)):
    """Player's full profile."""
    _, _, player_ids = await _get_player_team_coach_ids(db, user)
    player_data = None
    if player_ids:
        player = await db.get(Player, player_ids[0])
        if player:
            player_data = {
                "id": player.id, "name": player.name, "jersey_number": player.jersey_number,
                "position": player.position, "notes": player.notes,
                "current_attendance_streak": player.current_attendance_streak or 0,
                "highest_attendance_streak": player.highest_attendance_streak or 0,
            }

    return {
        "success": True,
        "data": {
            "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
            "player": player_data,
        },
    }


@router.get("/leaderboard")
async def player_leaderboard(user: User = Depends(get_current_player), db: AsyncSession = Depends(get_db)):
    """Team leaderboard: Attendance Kings & Drill Champions."""
    team_ids, coach_ids, player_ids = await _get_player_team_coach_ids(db, user)
    if not coach_ids:
        return {"success": True, "data": {"attendance": [], "drills": [], "my_player_id": None}}

    my_player_id = player_ids[0] if player_ids else None

    # Get all players in the team
    stmt = select(Player).where(Player.coach_id.in_(coach_ids)).order_by(Player.name.asc())
    result = await db.execute(stmt)
    all_players = result.scalars().all()

    # --- Attendance Kings: sort by current_attendance_streak DESC ---
    att_sorted = sorted(all_players, key=lambda p: (p.current_attendance_streak or 0), reverse=True)
    attendance = []
    for i, p in enumerate(att_sorted[:15]):
        attendance.append({
            "rank": i + 1,
            "player_id": p.id,
            "name": p.name,
            "jersey": p.jersey_number,
            "position": p.position,
            "current_streak": p.current_attendance_streak or 0,
            "highest_streak": p.highest_attendance_streak or 0,
            "is_me": p.id == my_player_id,
        })

    # --- Drill Champions: aggregate from DrillAssignment ---
    from src.models.drill_assignment import DrillAssignment

    drill_stmt = (
        select(
            DrillAssignment.player_id,
            func.count(DrillAssignment.id).label("total"),
            func.sum(case((DrillAssignment.status == "approved", 1), else_=0)).label("approved"),
        )
        .where(DrillAssignment.player_id.in_([p.id for p in all_players]))
        .group_by(DrillAssignment.player_id)
    )
    result = await db.execute(drill_stmt)
    drill_stats = {row.player_id: (row.total, int(row.approved or 0)) for row in result.all()}

    # Build drill leaderboard — include all players with assignments
    player_map = {p.id: p for p in all_players}
    drill_entries = []
    for pid, (total, approved) in drill_stats.items():
        p = player_map.get(pid)
        if not p or total == 0:
            continue
        drill_entries.append({
            "player_id": pid,
            "name": p.name,
            "jersey": p.jersey_number,
            "position": p.position,
            "total": total,
            "approved": approved,
            "rate": round(approved / total * 100),
            "is_me": pid == my_player_id,
        })

    drill_entries.sort(key=lambda x: (-x["rate"], -x["approved"]))
    for i, entry in enumerate(drill_entries[:15]):
        entry["rank"] = i + 1

    return {
        "success": True,
        "data": {
            "attendance": attendance,
            "drills": drill_entries[:15],
            "my_player_id": my_player_id,
        },
    }


@router.put("/profile")
async def update_player_profile(user: User = Depends(get_current_player), db: AsyncSession = Depends(get_db)):
    """Update own profile (limited fields) — delegates to /api/player-auth/me."""
    return {"success": True, "data": {"id": user.id, "name": user.name, "email": user.email}}


@router.get("/badge-counts")
async def player_badge_counts(user: User = Depends(get_current_player), db: AsyncSession = Depends(get_db)):
    """Badge counts for player sidebar: drills, plays, videos, messages."""
    from src.models.drill_assignment import DrillAssignment
    from src.models.play import Play
    from src.models.play_view import PlayView
    from src.models.clip_player_tag import ClipPlayerTag
    from src.models.clip_view import ClipView
    from src.models.message_recipient import MessageRecipient
    from src.models.team import Team

    team_ids, _, player_ids = await _get_player_team_coach_ids(db, user)

    # Drills: pending or rejected assignments
    drills_count = 0
    if player_ids:
        res = await db.execute(
            select(func.count(DrillAssignment.id))
            .where(DrillAssignment.player_id.in_(player_ids), DrillAssignment.status.in_(["pending", "rejected"]))
        )
        drills_count = res.scalar() or 0

    # Plays: shared with team, not yet viewed by this user
    plays_count = 0
    if team_ids:
        viewed_subq = select(PlayView.play_id).where(PlayView.user_id == user.id).scalar_subquery()
        res = await db.execute(
            select(func.count(Play.id))
            .where(Play.shared_with_team == True, Play.team_id.in_(team_ids), Play.id.notin_(viewed_subq))
        )
        plays_count = res.scalar() or 0

    # Videos: clips tagged with player, not yet watched
    videos_count = 0
    if player_ids:
        watched_subq = select(ClipView.clip_id).where(ClipView.user_id == user.id).scalar_subquery()
        res = await db.execute(
            select(func.count(ClipPlayerTag.id))
            .where(ClipPlayerTag.player_id.in_(player_ids), ClipPlayerTag.clip_id.notin_(watched_subq))
        )
        videos_count = res.scalar() or 0

    # Messages: unread
    res = await db.execute(
        select(func.count(MessageRecipient.id))
        .where(MessageRecipient.user_id == user.id, MessageRecipient.is_read == False)
    )
    messages_count = res.scalar() or 0

    return {
        "success": True,
        "data": {
            "drills": drills_count,
            "plays": plays_count,
            "videos": videos_count,
            "messages": messages_count,
        },
    }


@router.get("/notifications")
async def player_notifications(user: User = Depends(get_current_player), db: AsyncSession = Depends(get_db)):
    """Notification items for player bell dropdown — recent actionable items."""
    from src.models.drill_assignment import DrillAssignment
    from src.models.play import Play
    from src.models.play_view import PlayView
    from src.models.clip_player_tag import ClipPlayerTag
    from src.models.clip_view import ClipView
    from src.models.video_clip import VideoClip
    from src.models.message_recipient import MessageRecipient
    from src.models.club_message import ClubMessage
    from sqlalchemy.orm import selectinload
    team_ids, _, player_ids = await _get_player_team_coach_ids(db, user)
    items = []

    # 1. New drill assignments (pending/rejected, last 30 days)
    if player_ids:
        cutoff = datetime.utcnow() - timedelta(days=30)
        res = await db.execute(
            select(DrillAssignment)
            .options(selectinload(DrillAssignment.drill))
            .where(
                DrillAssignment.player_id.in_(player_ids),
                DrillAssignment.status.in_(["pending", "rejected"]),
                DrillAssignment.created_at >= cutoff,
            )
            .order_by(DrillAssignment.created_at.desc())
            .limit(10)
        )
        for da in res.scalars().all():
            drill_name = da.drill.title if da.drill else "תרגיל"
            icon = "fitness_center"
            if da.status == "rejected":
                text = f"תרגיל '{drill_name}' — נדחה, נסה שוב"
                icon = "replay"
            else:
                text = f"תרגיל חדש: {drill_name}"
            items.append({
                "type": "drill", "icon": icon, "text": text,
                "link": "/player/drills",
                "time": da.created_at.isoformat() if da.created_at else None,
            })

    # 2. New shared plays (not viewed)
    if team_ids:
        viewed_subq = select(PlayView.play_id).where(PlayView.user_id == user.id).scalar_subquery()
        res = await db.execute(
            select(Play)
            .where(Play.shared_with_team == True, Play.team_id.in_(team_ids), Play.id.notin_(viewed_subq))
            .order_by(Play.updated_at.desc())
            .limit(5)
        )
        for p in res.scalars().all():
            items.append({
                "type": "play", "icon": "sports_basketball",
                "text": f"משחקון חדש: {p.name}",
                "link": "/player/plays",
                "time": p.updated_at.isoformat() if p.updated_at else None,
            })

    # 3. New video clips tagged (not watched)
    if player_ids:
        watched_subq = select(ClipView.clip_id).where(ClipView.user_id == user.id).scalar_subquery()
        res = await db.execute(
            select(ClipPlayerTag, VideoClip)
            .join(VideoClip, ClipPlayerTag.clip_id == VideoClip.id)
            .where(ClipPlayerTag.player_id.in_(player_ids), ClipPlayerTag.clip_id.notin_(watched_subq))
            .order_by(ClipPlayerTag.id.desc())
            .limit(5)
        )
        for tag, clip in res.all():
            clip_title = clip.title or clip.action_type or "קליפ"
            items.append({
                "type": "video", "icon": "videocam",
                "text": f"תויגת בקליפ: {clip_title}",
                "link": "/player/scouting", "time": None,
            })

    # 4. Unread messages (last 30 days)
    cutoff = datetime.utcnow() - timedelta(days=30)
    res = await db.execute(
        select(MessageRecipient, ClubMessage)
        .join(ClubMessage, MessageRecipient.message_id == ClubMessage.id)
        .where(MessageRecipient.user_id == user.id, MessageRecipient.is_read == False, ClubMessage.created_at >= cutoff)
        .order_by(ClubMessage.created_at.desc())
        .limit(5)
    )
    for mr, msg in res.all():
        items.append({
            "type": "message", "icon": "mail",
            "text": f"הודעה: {msg.subject or 'ללא נושא'}",
            "link": "/player/messages",
            "time": msg.created_at.isoformat() if msg.created_at else None,
        })

    # Sort by time descending
    items.sort(key=lambda x: x.get("time") or "", reverse=True)
    return {"success": True, "data": items[:20]}


@router.put("/plays/{play_id}/viewed")
async def mark_play_viewed(play_id: int, user: User = Depends(get_current_player), db: AsyncSession = Depends(get_db)):
    """Mark a play as viewed by the current player."""
    from src.models.play_view import PlayView
    from datetime import datetime

    # Check if already viewed
    existing = await db.execute(
        select(PlayView).where(PlayView.play_id == play_id, PlayView.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        return {"success": True}

    db.add(PlayView(play_id=play_id, user_id=user.id, viewed_at=datetime.utcnow()))
    await db.commit()
    return {"success": True}
