"""HOOPS AI - Reports API (Attendance, Game Reports, Player Reports)"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.report_service import ReportService
from src.api.auth import get_current_coach

router = APIRouter(prefix="/api/reports", tags=["reports"])


# --- Request Models ---
class AttendanceRecord(BaseModel):
    player_id: int
    present: bool = False
    notes: str | None = None


class AttendanceBatch(BaseModel):
    records: list[AttendanceRecord]


class GameReportRequest(BaseModel):
    date: str
    opponent: str
    location: str | None = None
    result: str  # win, loss, draw
    score_us: int | None = None
    score_them: int | None = None
    standout_players: list[int] | None = None  # Player IDs
    areas_to_improve: list[str] | None = None
    notable_events: str | None = None
    notes: str | None = None
    event_id: int | None = None
    team_event_id: int | None = None


class PlayerReportRequest(BaseModel):
    player_id: int
    period: str
    strengths: list[str] | None = None
    weaknesses: list[str] | None = None
    focus_areas: list[str] | None = None
    progress_notes: str | None = None
    recommendations: str | None = None
    overall_rating: int | None = None
    personal_improvement_rating: int | None = None
    personal_improvement_notes: str | None = None
    team_contribution_rating: int | None = None
    team_contribution_notes: str | None = None


class GeneratePlayerReportRequest(BaseModel):
    player_id: int
    period: str


# --- Attendance ---
@router.get("/attendance/stats")
async def attendance_stats(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    stats = await svc.get_attendance_stats(coach.id)

    # Enrich with streak data
    from src.models.player import Player
    for s in stats:
        player = await db.get(Player, s["player_id"])
        if player:
            s["current_streak"] = getattr(player, "current_attendance_streak", 0) or 0
            s["highest_streak"] = getattr(player, "highest_attendance_streak", 0) or 0
        else:
            s["current_streak"] = 0
            s["highest_streak"] = 0

    return {"success": True, "data": stats}


@router.get("/attendance/{event_id}")
async def get_attendance(event_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    records = await svc.get_attendance_for_event(coach.id, event_id)
    return {
        "success": True,
        "data": [
            {"player_id": r.player_id, "present": r.present, "notes": r.notes}
            for r in records
        ],
    }


@router.post("/attendance/{event_id}")
async def save_attendance(event_id: int, req: AttendanceBatch, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    from src.utils.feature_gate import require_feature
    await require_feature("reports_evaluations", db, coach_id=coach.id)
    svc = ReportService(db)
    await svc.save_attendance(coach.id, event_id, [r.model_dump() for r in req.records])
    return {"success": True}


# --- Game Reports ---
def game_report_to_dict(r, player_map: dict | None = None):
    """Convert GameReport to dict. player_map resolves standout player IDs to names."""
    standouts_raw = r.standout_players if isinstance(r.standout_players, list) else []
    standout_ids = []
    standout_names = []
    for s in standouts_raw:
        if isinstance(s, int):
            standout_ids.append(s)
            standout_names.append(player_map.get(s, f"#{s}") if player_map else f"#{s}")
        else:
            # Legacy string name (backward compat)
            standout_names.append(str(s))
    return {
        "id": r.id, "date": str(r.date), "opponent": r.opponent,
        "location": r.location, "result": r.result,
        "score_us": r.score_us, "score_them": r.score_them,
        "standout_players": standout_ids if standout_ids else standouts_raw,
        "standout_player_names": standout_names,
        "areas_to_improve": r.areas_to_improve if isinstance(r.areas_to_improve, list) else [],
        "notable_events": r.notable_events, "notes": r.notes,
        "event_id": r.event_id, "team_event_id": r.team_event_id,
        "created_at": str(r.created_at),
    }


async def _build_player_map(db: AsyncSession, coach_id: int) -> dict[int, str]:
    """Build {player_id: name} map for resolving standout player IDs."""
    from src.repositories.player_repository import PlayerRepository
    players = await PlayerRepository(db).get_by_coach_id(coach_id)
    return {p.id: p.name for p in players}


@router.get("/games")
async def list_game_reports(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    reports = await svc.get_game_reports(coach.id)
    player_map = await _build_player_map(db, coach.id)
    return {"success": True, "data": [game_report_to_dict(r, player_map) for r in reports]}


@router.get("/games/pending")
async def pending_game_reports(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Return past game/tournament events that don't have game reports yet."""
    svc = ReportService(db)
    pending = await svc.get_pending_game_events(coach.id)
    return {"success": True, "data": pending}


@router.post("/games")
async def create_game_report(req: GameReportRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    report = await svc.create_game_report(
        coach.id, date=date.fromisoformat(req.date),
        **req.model_dump(exclude={"date"}),
    )
    player_map = await _build_player_map(db, coach.id)
    return {"success": True, "data": game_report_to_dict(report, player_map)}


@router.put("/games/{report_id}")
async def update_game_report(report_id: int, req: GameReportRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    existing = await svc.game_reports.get_by_id(report_id)
    if not existing or existing.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Report not found")
    updated = await svc.update_game_report(
        report_id, date=date.fromisoformat(req.date),
        **req.model_dump(exclude={"date"}),
    )
    player_map = await _build_player_map(db, coach.id)
    return {"success": True, "data": game_report_to_dict(updated, player_map)}


@router.delete("/games/{report_id}")
async def delete_game_report(report_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    existing = await svc.game_reports.get_by_id(report_id)
    if not existing or existing.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Report not found")
    await svc.delete_game_report(report_id)
    return {"success": True}


# --- Player Reports ---
def player_report_to_dict(r):
    return {
        "id": r.id, "player_id": r.player_id, "period": r.period,
        "strengths": r.strengths if isinstance(r.strengths, list) else [],
        "weaknesses": r.weaknesses if isinstance(r.weaknesses, list) else [],
        "focus_areas": r.focus_areas if isinstance(r.focus_areas, list) else [],
        "progress_notes": r.progress_notes, "recommendations": r.recommendations,
        "is_ai_generated": r.is_ai_generated, "created_at": str(r.created_at),
        "overall_rating": r.overall_rating,
        "personal_improvement_rating": r.personal_improvement_rating,
        "personal_improvement_notes": r.personal_improvement_notes,
        "team_contribution_rating": r.team_contribution_rating,
        "team_contribution_notes": r.team_contribution_notes,
    }


@router.get("/players")
async def list_player_reports(player_id: int | None = None, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    reports = await svc.get_player_reports(coach.id, player_id)
    return {"success": True, "data": [player_report_to_dict(r) for r in reports]}


@router.post("/players")
async def create_player_report(req: PlayerReportRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    report = await svc.create_player_report(coach.id, **req.model_dump())
    return {"success": True, "data": player_report_to_dict(report)}


@router.post("/players/generate")
async def generate_player_report(req: GeneratePlayerReportRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    try:
        report = await svc.ai_generate_player_report(coach.id, req.player_id, req.period)
        return {"success": True, "data": player_report_to_dict(report)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/players/{report_id}")
async def update_player_report(report_id: int, req: PlayerReportRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    existing = await svc.player_reports.get_by_id(report_id)
    if not existing or existing.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Report not found")
    data = req.model_dump()
    for k, v in data.items():
        if hasattr(existing, k):
            setattr(existing, k, v)
    return {"success": True, "data": player_report_to_dict(existing)}


@router.delete("/players/{report_id}")
async def delete_player_report(report_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    svc = ReportService(db)
    existing = await svc.player_reports.get_by_id(report_id)
    if not existing or existing.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Report not found")
    await svc.delete_player_report(report_id)
    return {"success": True}
