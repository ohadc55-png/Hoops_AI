"""HOOPS AI - Player Evaluations API (Coach endpoints)"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.evaluation_service import EvaluationService
from src.api.auth import get_current_coach

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


# --- Request Models ---
class EvaluationRequest(BaseModel):
    player_id: int
    period_type: str  # weekly, monthly, semi_annual, annual
    period_label: str | None = None
    offensive_rating: int | None = None
    offensive_notes: str | None = None
    defensive_rating: int | None = None
    defensive_notes: str | None = None
    iq_rating: int | None = None
    iq_notes: str | None = None
    social_rating: int | None = None
    social_notes: str | None = None
    leaving_risk: int | None = None
    leaving_risk_notes: str | None = None
    leadership_rating: int | None = None
    leadership_notes: str | None = None
    work_ethic_rating: int | None = None
    work_ethic_notes: str | None = None
    fitness_rating: int | None = None
    fitness_notes: str | None = None
    improvement_rating: int | None = None
    improvement_notes: str | None = None
    overall_notes: str | None = None
    potential_notes: str | None = None
    report_request_id: int | None = None


def _eval_to_dict(ev) -> dict:
    return {
        "id": ev.id,
        "coach_id": ev.coach_id,
        "player_id": ev.player_id,
        "period_type": ev.period_type,
        "period_label": ev.period_label,
        "offensive_rating": ev.offensive_rating,
        "offensive_notes": ev.offensive_notes,
        "defensive_rating": ev.defensive_rating,
        "defensive_notes": ev.defensive_notes,
        "iq_rating": ev.iq_rating,
        "iq_notes": ev.iq_notes,
        "social_rating": ev.social_rating,
        "social_notes": ev.social_notes,
        "leaving_risk": ev.leaving_risk,
        "leaving_risk_notes": ev.leaving_risk_notes,
        "leadership_rating": ev.leadership_rating,
        "leadership_notes": ev.leadership_notes,
        "work_ethic_rating": ev.work_ethic_rating,
        "work_ethic_notes": ev.work_ethic_notes,
        "fitness_rating": ev.fitness_rating,
        "fitness_notes": ev.fitness_notes,
        "improvement_rating": ev.improvement_rating,
        "improvement_notes": ev.improvement_notes,
        "overall_notes": ev.overall_notes,
        "potential_notes": ev.potential_notes,
        "report_request_id": ev.report_request_id,
        "created_at": str(ev.created_at),
    }


@router.post("")
async def create_evaluation(
    req: EvaluationRequest,
    coach=Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.utils.feature_gate import require_feature
    await require_feature("reports_evaluations", db, coach_id=coach.id)
    service = EvaluationService(db)
    try:
        ev = await service.create_evaluation(
            coach_id=coach.id,
            **req.model_dump(exclude_none=False),
        )
        await db.commit()
        return {"success": True, "data": _eval_to_dict(ev)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("")
async def list_evaluations(
    player_id: int | None = Query(None),
    coach=Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    service = EvaluationService(db)
    evals = await service.get_evaluations(coach.id, player_id)
    return {"success": True, "data": [_eval_to_dict(e) for e in evals]}


@router.get("/requests")
async def list_pending_requests(
    coach=Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    service = EvaluationService(db)
    requests = await service.get_pending_requests_for_coach(coach.id, coach.user_id)
    data = []
    for r in requests:
        data.append({
            "id": r.id,
            "period_type": r.period_type,
            "due_date": str(r.due_date),
            "instructions": r.instructions,
            "status": r.status,
            "team_id": r.team_id,
            "created_at": str(r.created_at),
        })
    return {"success": True, "data": data}


@router.get("/{evaluation_id}")
async def get_evaluation(
    evaluation_id: int,
    coach=Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    service = EvaluationService(db)
    ev = await service.get_evaluation_by_id(evaluation_id)
    if not ev or ev.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return {"success": True, "data": _eval_to_dict(ev)}


@router.put("/{evaluation_id}")
async def update_evaluation(
    evaluation_id: int,
    req: EvaluationRequest,
    coach=Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    service = EvaluationService(db)
    try:
        ev = await service.update_evaluation(evaluation_id, coach.id, **req.model_dump(exclude_none=False))
        if not ev:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        await db.commit()
        return {"success": True, "data": _eval_to_dict(ev)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{evaluation_id}")
async def delete_evaluation(
    evaluation_id: int,
    coach=Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    service = EvaluationService(db)
    ok = await service.delete_evaluation(evaluation_id, coach.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    await db.commit()
    return {"success": True}
