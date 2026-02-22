"""HOOPS AI - Practice API"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.practice_service import PracticeService
from src.api.auth import get_current_coach

router = APIRouter(prefix="/api/practice", tags=["practice"])


class SessionRequest(BaseModel):
    date: str
    title: str
    focus: str | None = None
    notes: str | None = None
    total_duration: int = 90


class SegmentRequest(BaseModel):
    segment_type: str
    title: str
    duration_minutes: int = 10
    notes: str | None = None
    drill_id: int | None = None
    order_index: int = 0


class ReorderRequest(BaseModel):
    segment_ids: list[int]


class GenerateRequest(BaseModel):
    focus: str
    duration: int = 90
    date: str | None = None


def session_to_dict(s):
    data = {
        "id": s.id, "date": str(s.date), "title": s.title,
        "focus": s.focus, "notes": s.notes,
        "total_duration": s.total_duration,
        "is_ai_generated": s.is_ai_generated, "created_at": str(s.created_at),
    }
    if hasattr(s, "segments") and s.segments:
        data["segments"] = [
            {
                "id": seg.id, "segment_type": seg.segment_type, "title": seg.title,
                "duration_minutes": seg.duration_minutes, "notes": seg.notes,
                "drill_id": seg.drill_id, "order_index": seg.order_index,
            }
            for seg in sorted(s.segments, key=lambda x: x.order_index)
        ]
    return data


@router.get("")
async def list_sessions(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PracticeService(db)
    sessions = await service.get_sessions(coach.id)
    return {"success": True, "data": [session_to_dict(s) for s in sessions]}


@router.post("")
async def create_session(req: SessionRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PracticeService(db)
    session = await service.create_session(
        coach.id, date=date.fromisoformat(req.date), title=req.title,
        focus=req.focus, notes=req.notes, total_duration=req.total_duration,
    )
    return {"success": True, "data": session_to_dict(session)}


@router.get("/{session_id}")
async def get_session(session_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PracticeService(db)
    session = await service.get_session(session_id)
    if not session or session.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "data": session_to_dict(session)}


@router.delete("/{session_id}")
async def delete_session(session_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PracticeService(db)
    existing = await service.get_session(session_id)
    if not existing or existing.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Session not found")
    await service.delete_session(session_id)
    return {"success": True}


@router.post("/{session_id}/segments")
async def add_segment(session_id: int, req: SegmentRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PracticeService(db)
    existing = await service.get_session(session_id)
    if not existing or existing.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Session not found")
    segment = await service.add_segment(session_id, **req.model_dump())
    return {"success": True, "data": {"id": segment.id, "title": segment.title}}


@router.put("/{session_id}/segments/reorder")
async def reorder_segments(session_id: int, req: ReorderRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = PracticeService(db)
    await service.reorder_segments(session_id, req.segment_ids)
    return {"success": True}


@router.post("/generate")
async def generate_session(req: GenerateRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    from src.utils.feature_gate import require_feature
    await require_feature("practice_planner", db, coach_id=coach.id)
    service = PracticeService(db)
    try:
        d = date.fromisoformat(req.date) if req.date else None
        session = await service.ai_generate_session(coach.id, req.focus, req.duration, d)
        return {"success": True, "data": session_to_dict(session)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
