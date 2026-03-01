"""HOOPS AI - Drills API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.drill_service import DrillService
from src.api.auth import get_current_coach
from src.models.drill_assignment import DrillAssignment
from src.models.team_member import TeamMember
from src.models.player import Player
from src.models.team import Team

router = APIRouter(prefix="/api/drills", tags=["drills"])


class DrillRequest(BaseModel):
    title: str
    description: str | None = None
    category: str
    difficulty: str
    duration_minutes: int = 10
    instructions: str | None = None
    coaching_points: list | None = None
    tags: list | None = None
    video_url: str | None = None


class GenerateDrillRequest(BaseModel):
    category: str
    difficulty: str
    focus: str = ""


class AssignDrillRequest(BaseModel):
    player_ids: list[int]
    note: str | None = None


def drill_to_dict(d, assignment_count: int | None = None):
    result = {
        "id": d.id, "title": d.title, "description": d.description,
        "category": d.category, "difficulty": d.difficulty,
        "duration_minutes": d.duration_minutes, "instructions": d.instructions,
        "coaching_points": d.coaching_points, "tags": d.tags,
        "video_url": d.video_url,
        "is_ai_generated": d.is_ai_generated, "created_at": str(d.created_at),
    }
    if assignment_count is not None:
        result["assignment_count"] = assignment_count
    return result


@router.get("/my-players")
async def get_my_players(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Get all players in coach's teams (for assignment modal)."""
    # Find teams where this coach is a member
    stmt = select(TeamMember.team_id).where(
        TeamMember.user_id == coach.user_id, TeamMember.role_in_team == "coach", TeamMember.is_active == True
    )
    result = await db.execute(stmt)
    team_ids = [row[0] for row in result.all()]
    if not team_ids:
        return {"success": True, "data": []}

    # Get all player members in those teams
    stmt = (
        select(TeamMember, Player, Team)
        .join(Player, TeamMember.player_id == Player.id)
        .join(Team, TeamMember.team_id == Team.id)
        .where(
            TeamMember.team_id.in_(team_ids),
            TeamMember.role_in_team == "player",
            TeamMember.is_active == True,
            TeamMember.player_id.isnot(None),
        )
        .order_by(Team.name, Player.name)
    )
    result = await db.execute(stmt)
    rows = result.all()

    players = []
    for tm, player, team in rows:
        players.append({
            "id": player.id,
            "name": player.name,
            "jersey_number": player.jersey_number,
            "position": player.position,
            "team_id": team.id,
            "team_name": team.name,
        })

    return {"success": True, "data": players}


@router.get("/player-tracking")
async def player_tracking(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Per-player drill completion stats for coach tracking."""
    # Get coach's team IDs
    stmt = select(TeamMember.team_id).where(
        TeamMember.user_id == coach.user_id, TeamMember.role_in_team == "coach", TeamMember.is_active == True
    )
    result = await db.execute(stmt)
    team_ids = [row[0] for row in result.all()]
    if not team_ids:
        return {"success": True, "data": []}

    # Get all players in coach's teams
    stmt = (
        select(TeamMember, Player, Team)
        .join(Player, TeamMember.player_id == Player.id)
        .join(Team, TeamMember.team_id == Team.id)
        .where(
            TeamMember.team_id.in_(team_ids),
            TeamMember.role_in_team == "player",
            TeamMember.is_active == True,
            TeamMember.player_id.isnot(None),
        )
        .order_by(Team.name, Player.name)
    )
    result = await db.execute(stmt)
    player_rows = result.all()

    player_ids = [p.id for _, p, _ in player_rows]
    if not player_ids:
        return {"success": True, "data": []}

    # Get per-player assignment stats
    from sqlalchemy import case
    stmt = (
        select(
            DrillAssignment.player_id,
            func.count(DrillAssignment.id).label("total"),
            func.sum(case((DrillAssignment.is_completed == True, 1), else_=0)).label("completed"),
            func.max(DrillAssignment.completed_at).label("last_completed"),
        )
        .where(DrillAssignment.player_id.in_(player_ids))
        .group_by(DrillAssignment.player_id)
    )
    result = await db.execute(stmt)
    stats_map = {}
    for row in result.all():
        stats_map[row[0]] = {
            "total": row[1],
            "completed": int(row[2] or 0),
            "last_completed": str(row[3]) if row[3] else None,
        }

    tracking = []
    for tm, player, team in player_rows:
        s = stats_map.get(player.id, {"total": 0, "completed": 0, "last_completed": None})
        pct = round(s["completed"] / s["total"] * 100) if s["total"] > 0 else 0
        tracking.append({
            "player_id": player.id,
            "player_name": player.name,
            "jersey_number": player.jersey_number,
            "position": player.position,
            "team_id": team.id,
            "team_name": team.name,
            "assigned": s["total"],
            "completed": s["completed"],
            "pending": s["total"] - s["completed"],
            "completion_pct": pct,
            "last_completed": s["last_completed"],
        })

    return {"success": True, "data": tracking}


@router.get("")
async def list_drills(
    category: str | None = Query(None), difficulty: str | None = Query(None),
    search: str | None = Query(None), coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db),
):
    service = DrillService(db)
    drills = await service.get_drills(coach.id, category, difficulty, search)

    # Get assignment counts
    drill_ids = [d.id for d in drills]
    counts = {}
    if drill_ids:
        stmt = (
            select(DrillAssignment.drill_id, func.count(DrillAssignment.id))
            .where(DrillAssignment.drill_id.in_(drill_ids))
            .group_by(DrillAssignment.drill_id)
        )
        result = await db.execute(stmt)
        counts = {row[0]: row[1] for row in result.all()}

    return {"success": True, "data": [drill_to_dict(d, counts.get(d.id, 0)) for d in drills]}


@router.post("")
async def create_drill(req: DrillRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = DrillService(db)
    drill = await service.create_drill(coach.id, **req.model_dump())
    return {"success": True, "data": drill_to_dict(drill)}


@router.post("/generate")
async def generate_drill(req: GenerateDrillRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    from src.utils.feature_gate import require_feature
    await require_feature("drill_generator", db, coach_id=coach.id)
    service = DrillService(db)
    try:
        drill = await service.ai_generate_drill(coach.id, req.category, req.difficulty, req.focus)
        return {"success": True, "data": drill_to_dict(drill)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ReviewDrillRequest(BaseModel):
    action: str  # "approve" or "reject"
    feedback: str | None = None


@router.get("/pending-reviews")
async def pending_reviews(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Get all drill assignments with uploaded videos awaiting review."""
    from src.services.drill_video_service import DrillVideoService
    service = DrillVideoService(db)
    reviews = await service.get_pending_reviews(coach.id)
    return {"success": True, "data": reviews}


@router.get("/{drill_id}")
async def get_drill(drill_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = DrillService(db)
    drill = await service.get_drill(drill_id)
    if not drill or drill.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Drill not found")
    return {"success": True, "data": drill_to_dict(drill)}


@router.put("/{drill_id}")
async def update_drill(drill_id: int, req: DrillRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = DrillService(db)
    existing = await service.get_drill(drill_id)
    if not existing or existing.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Drill not found")
    drill = await service.update_drill(drill_id, **req.model_dump())
    return {"success": True, "data": drill_to_dict(drill)}


@router.delete("/{drill_id}")
async def delete_drill(drill_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = DrillService(db)
    existing = await service.get_drill(drill_id)
    if not existing or existing.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Drill not found")
    await service.delete_drill(drill_id)
    return {"success": True}


@router.post("/{drill_id}/assign")
async def assign_drill(drill_id: int, req: AssignDrillRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Assign a drill to specific players."""
    service = DrillService(db)
    drill = await service.get_drill(drill_id)
    if not drill or drill.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Drill not found")

    # Get coach's team IDs
    stmt = select(TeamMember.team_id).where(
        TeamMember.user_id == coach.user_id, TeamMember.role_in_team == "coach", TeamMember.is_active == True
    )
    result = await db.execute(stmt)
    coach_team_ids = [row[0] for row in result.all()]

    # Validate players belong to coach's teams + get their team_id
    stmt = (
        select(TeamMember)
        .where(
            TeamMember.player_id.in_(req.player_ids),
            TeamMember.team_id.in_(coach_team_ids),
            TeamMember.role_in_team == "player",
            TeamMember.is_active == True,
        )
    )
    result = await db.execute(stmt)
    valid_members = result.scalars().all()
    valid_player_map = {m.player_id: m.team_id for m in valid_members}

    created = 0
    assigned_user_ids = []
    for pid in req.player_ids:
        if pid not in valid_player_map:
            continue
        # Check if already assigned
        stmt = select(DrillAssignment).where(
            DrillAssignment.drill_id == drill_id, DrillAssignment.player_id == pid
        )
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            continue
        assignment = DrillAssignment(
            drill_id=drill_id,
            player_id=pid,
            team_id=valid_player_map[pid],
            coach_id=coach.id,
            note=req.note,
        )
        db.add(assignment)
        created += 1

        # Collect user_ids for notification (only players, not parents)
        stmt2 = select(TeamMember.user_id).where(
            TeamMember.player_id == pid,
            TeamMember.role_in_team == "player",
            TeamMember.is_active == True,
        )
        r2 = await db.execute(stmt2)
        for row in r2.all():
            if row[0]:
                assigned_user_ids.append(row[0])

    await db.flush()

    # Send notification to assigned players
    if assigned_user_ids and coach.user_id:
        try:
            from src.services.messaging_service import MessagingService
            msg_service = MessagingService(db)
            for uid in assigned_user_ids:
                await msg_service.send_message(
                    sender_id=coach.user_id,
                    sender_role="coach",
                    subject=f"תרגיל חדש: {drill.title}",
                    body=f"המאמן שלך הקצה לך תרגיל חדש: {drill.title}. כנס לאזור התרגילים כדי לצפות בו.",
                    message_type="update",
                    target_type="individual",
                    target_user_id=uid,
                )
        except Exception:
            pass  # Don't fail assignment if notification fails

    return {"success": True, "data": {"assigned": created}}


@router.get("/{drill_id}/assignments")
async def get_drill_assignments(drill_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Get assignment status for a drill."""
    service = DrillService(db)
    drill = await service.get_drill(drill_id)
    if not drill or drill.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Drill not found")

    stmt = (
        select(DrillAssignment, Player)
        .join(Player, DrillAssignment.player_id == Player.id)
        .where(DrillAssignment.drill_id == drill_id)
        .order_by(Player.name)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return {
        "success": True,
        "data": [
            {
                "id": a.id,
                "player_id": a.player_id,
                "player_name": p.name,
                "is_completed": a.is_completed,
                "completed_at": str(a.completed_at) if a.completed_at else None,
                "assigned_at": str(a.created_at),
                "note": a.note,
                "status": getattr(a, "status", "pending") or "pending",
                "video_url": getattr(a, "video_url", None),
                "coach_feedback": getattr(a, "coach_feedback", None),
            }
            for a, p in rows
        ],
    }


@router.post("/{assignment_id}/review")
async def review_drill_video(
    assignment_id: int,
    req: ReviewDrillRequest,
    coach=Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    """Coach approves or rejects a drill video submission."""
    from src.services.drill_video_service import DrillVideoService
    service = DrillVideoService(db)
    result = await service.review_video(assignment_id, coach.id, req.action, req.feedback)

    # Send notification to player
    if coach.user_id:
        try:
            from src.services.messaging_service import MessagingService
            from src.models.drill import Drill
            assignment = await db.get(DrillAssignment, assignment_id)
            if assignment:
                tm_stmt = select(TeamMember.user_id).where(
                    TeamMember.player_id == assignment.player_id,
                    TeamMember.role_in_team == "player",
                    TeamMember.is_active == True,
                )
                tm_result = await db.execute(tm_stmt)
                for row in tm_result.all():
                    if row[0]:
                        msg_service = MessagingService(db)
                        status_text = "\u05d0\u05d5\u05e9\u05e8" if req.action == "approve" else "\u05e0\u05d3\u05d7\u05d4"
                        drill = await db.get(Drill, assignment.drill_id)
                        drill_title = drill.title if drill else "\u05ea\u05e8\u05d2\u05d9\u05dc"
                        body = f"\u05d4\u05e1\u05e8\u05d8\u05d5\u05df \u05e9\u05dc\u05da \u05dc\u05ea\u05e8\u05d2\u05d9\u05dc '{drill_title}' {status_text}."
                        if req.feedback:
                            body += f"\n\u05de\u05e9\u05d5\u05d1: {req.feedback}"
                        await msg_service.send_message(
                            sender_id=coach.user_id,
                            sender_role="coach",
                            subject=f"\u05ea\u05e8\u05d2\u05d9\u05dc {status_text}: {drill_title}",
                            body=body,
                            message_type="update",
                            target_type="individual",
                            target_user_id=row[0],
                        )
        except Exception:
            pass  # Don't fail review if notification fails

    return {"success": True, "data": result}
