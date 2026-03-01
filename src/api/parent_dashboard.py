"""HOOPS AI - Parent Dashboard API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, extract
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.parent_auth import get_current_parent
from src.models.user import User
from src.models.team_member import TeamMember
from src.models.team import Team
from src.models.player import Player
from src.models.coach import Coach
from src.repositories.team_member_repository import TeamMemberRepository
from src.services.schedule_service import ScheduleService
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/api/parent", tags=["parent-dashboard"])


async def _get_parent_context(db: AsyncSession, user: User):
    """Get parent's team, child info."""
    member_repo = TeamMemberRepository(db)
    memberships = await member_repo.get_by_user(user.id)

    team_ids = [m.team_id for m in memberships]
    player_ids = [m.player_id for m in memberships if m.player_id]

    child = None
    if player_ids:
        child = await db.get(Player, player_ids[0])

    team = None
    if team_ids:
        stmt = select(Team).where(Team.id == team_ids[0])
        result = await db.execute(stmt)
        team = result.scalar_one_or_none()

    # Get coach name for team
    coach_name = None
    if team_ids:
        stmt = select(TeamMember).where(
            TeamMember.team_id == team_ids[0],
            TeamMember.role_in_team == "coach",
            TeamMember.is_active == True,
        ).limit(1)
        result = await db.execute(stmt)
        coach_membership = result.scalars().first()
        if coach_membership:
            coach_user = await db.get(User, coach_membership.user_id)
            if coach_user:
                coach_name = coach_user.name

    return team_ids, team, child, coach_name


@router.get("/dashboard")
async def parent_dashboard(user: User = Depends(get_current_parent), db: AsyncSession = Depends(get_db)):
    team_ids, team, child, coach_name = await _get_parent_context(db, user)

    # Get upcoming events
    schedule = []
    if team_ids:
        service = ScheduleService(db)
        events = await service.get_teams_schedule(team_ids)
        schedule = [
            {
                "id": e.id, "title": e.title, "date": str(e.date),
                "time_start": e.time_start, "time_end": e.time_end,
                "event_type": e.event_type, "location": e.location,
                "opponent": e.opponent,
                "is_away": e.is_away, "departure_time": e.departure_time,
                "venue_address": e.venue_address,
            }
            for e in events[:5]
        ]

    return {
        "success": True,
        "data": {
            "parent_name": user.name,
            "child_name": child.name if child else None,
            "team_name": team.name if team else None,
            "coach_name": coach_name,
            "schedule": schedule,
        },
    }


@router.get("/schedule")
async def parent_schedule(
    year: int | None = Query(None),
    month: int | None = Query(None),
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent schedule — with year+month returns monthly view, otherwise upcoming."""
    team_ids, _, _, _ = await _get_parent_context(db, user)
    if not team_ids:
        return {"success": True, "data": []}

    service = ScheduleService(db)
    use_month = year is not None and month is not None

    all_events = []

    # Admin-created team events
    if use_month:
        team_events = await service.get_teams_events_by_month(team_ids, year, month)
    else:
        team_events = await service.get_teams_schedule(team_ids)

    for e in team_events:
        all_events.append({
            "id": e.id, "title": e.title, "date": str(e.date),
            "time": e.time_start, "time_end": e.time_end,
            "event_type": e.event_type, "location": e.location,
            "opponent": e.opponent, "notes": e.notes,
            "source": "admin",
            "is_away": e.is_away, "departure_time": e.departure_time,
            "venue_address": e.venue_address,
        })

    # Coach-created events (parents should see same schedule as players)
    if team_ids:
        from src.models.team_member import TeamMember
        from src.models.coach import Coach
        from src.models.event import Event

        stmt = select(TeamMember.user_id).where(
            TeamMember.team_id.in_(team_ids), TeamMember.role_in_team == "coach", TeamMember.is_active == True
        )
        result = await db.execute(stmt)
        coach_user_ids = [row[0] for row in result.all()]

        if coach_user_ids:
            stmt = select(Coach.id).where(Coach.user_id.in_(coach_user_ids))
            result = await db.execute(stmt)
            coach_ids = [row[0] for row in result.all()]

            if coach_ids:
                if use_month:
                    from src.repositories.event_repository import EventRepository
                    event_repo = EventRepository(db)
                    events = await event_repo.get_by_month_for_coaches(coach_ids, year, month)
                else:
                    from datetime import date as date_type
                    today = date_type.today()
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
                        "id": e.id, "title": e.title, "date": str(e.date),
                        "time": e.time, "event_type": e.event_type,
                        "opponent": e.opponent, "notes": e.notes,
                        "source": "coach",
                    })

    all_events.sort(key=lambda x: x["date"])
    return {"success": True, "data": all_events}


@router.get("/child")
async def parent_child(user: User = Depends(get_current_parent), db: AsyncSession = Depends(get_db)):
    _, _, child, _ = await _get_parent_context(db, user)
    if not child:
        return {"success": True, "data": None}
    return {
        "success": True,
        "data": {
            "id": child.id, "name": child.name,
            "jersey_number": child.jersey_number, "position": child.position,
        },
    }


@router.get("/team")
async def parent_team(user: User = Depends(get_current_parent), db: AsyncSession = Depends(get_db)):
    _, team, _, coach_name = await _get_parent_context(db, user)
    if not team:
        return {"success": True, "data": None}
    return {
        "success": True,
        "data": {
            "id": team.id, "name": team.name,
            "age_group": team.age_group, "club_name": team.club_name,
            "coach_name": coach_name,
        },
    }


@router.get("/badge-counts")
async def parent_badge_counts(user: User = Depends(get_current_parent), db: AsyncSession = Depends(get_db)):
    """Badge counts for parent sidebar: payments, videos, messages."""
    from datetime import date as date_type
    from sqlalchemy import func, or_
    from src.models.installment import Installment
    from src.models.one_time_charge import OneTimeCharge
    from src.models.clip_view import ClipView
    from src.models.scouting_video import ScoutingVideo
    from src.models.video_clip import VideoClip
    from src.models.message_recipient import MessageRecipient

    team_ids, _, child, _ = await _get_parent_context(db, user)
    player_ids = [child.id] if child else []

    # Payments: count distinct plans with any unpaid installment + unpaid charges
    today = date_type.today()
    payments_count = 0
    if player_ids:
        # Count distinct plans that have at least one unpaid installment
        res = await db.execute(
            select(func.count(func.distinct(Installment.plan_id)))
            .where(
                Installment.player_id.in_(player_ids),
                Installment.status.in_(["pending", "overdue"]),
            )
        )
        payments_count = res.scalar() or 0

        res2 = await db.execute(
            select(func.count(OneTimeCharge.id))
            .where(
                OneTimeCharge.player_id.in_(player_ids),
                OneTimeCharge.status.in_(["pending", "overdue"]),
                or_(OneTimeCharge.due_date <= today, OneTimeCharge.due_date.is_(None)),
            )
        )
        payments_count += res2.scalar() or 0

    # Videos: clips shared with parent's teams, not yet watched
    videos_count = 0
    if team_ids:
        watched_subq = select(ClipView.clip_id).where(ClipView.user_id == user.id).scalar_subquery()
        res = await db.execute(
            select(func.count(VideoClip.id))
            .join(ScoutingVideo, VideoClip.video_id == ScoutingVideo.id)
            .where(
                ScoutingVideo.team_id.in_(team_ids),
                ScoutingVideo.shared_with_parents == True,
                VideoClip.id.notin_(watched_subq),
            )
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
            "payments": payments_count,
            "videos": videos_count,
            "messages": messages_count,
        },
    }
