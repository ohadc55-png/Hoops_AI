"""HOOPS AI - Admin Evaluations API (report requests + view evaluations)"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.evaluation_service import EvaluationService
from src.api.admin_auth import get_current_admin
from src.models.user import User
from src.models.coach import Coach

router = APIRouter(prefix="/api/admin/evaluations", tags=["admin-evaluations"])


class ReportRequestCreate(BaseModel):
    coach_id: int | None = None  # null = all coaches in team
    team_id: int | None = None
    period_type: str  # weekly, monthly, semi_annual, annual
    due_date: str  # YYYY-MM-DD
    instructions: str | None = None


@router.post("/requests")
async def create_report_request(
    req: ReportRequestCreate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date
    try:
        due = date.fromisoformat(req.due_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid due_date format (YYYY-MM-DD)")

    service = EvaluationService(db)
    rr = await service.create_request(
        admin_id=admin.id,
        coach_id=req.coach_id,
        team_id=req.team_id,
        period_type=req.period_type,
        due_date=due,
        instructions=req.instructions,
    )
    await db.commit()

    # Send notification to targeted coach(es)
    try:
        from src.services.messaging_service import MessagingService
        from src.models.team_member import TeamMember
        from sqlalchemy import select

        msg_service = MessagingService(db)
        period_labels = {
            "weekly": "\u05e9\u05d1\u05d5\u05e2\u05d9",
            "monthly": "\u05d7\u05d5\u05d3\u05e9\u05d9",
            "semi_annual": "\u05d7\u05e6\u05d9 \u05e9\u05e0\u05ea\u05d9",
            "annual": "\u05e9\u05e0\u05ea\u05d9",
        }
        period_he = period_labels.get(req.period_type, req.period_type)

        if req.coach_id:
            # Notify specific coach
            coach = await db.get(Coach, req.coach_id)
            if coach and coach.user_id:
                await msg_service.send_message(
                    sender_id=admin.id, sender_role="admin",
                    subject=f"\u05d1\u05e7\u05e9\u05d4 \u05dc\u05de\u05d9\u05dc\u05d5\u05d9 \u05d3\u05d5\u05d7 {period_he}",
                    body=f"\u05d4\u05e0\u05d4\u05dc\u05d4 \u05de\u05d1\u05e7\u05e9\u05ea \u05dc\u05de\u05dc\u05d0 \u05d3\u05d5\u05d7\u05d5\u05ea \u05d4\u05e2\u05e8\u05db\u05d4 \u05e2\u05d3 {req.due_date}.\n\n{req.instructions or ''}\n\n\u05d4\u05d9\u05db\u05e0\u05e1\u05d5 \u05dc\u05e2\u05de\u05d5\u05d3 Reports \u05db\u05d3\u05d9 \u05dc\u05de\u05dc\u05d0 \u05d0\u05ea \u05d4\u05d3\u05d5\u05d7\u05d5\u05ea.",
                    message_type="update",
                    target_type="individual", target_user_id=coach.user_id,
                )
        elif req.team_id:
            # Notify all coaches in team
            stmt = select(TeamMember).where(
                TeamMember.team_id == req.team_id,
                TeamMember.role_in_team == "coach",
                TeamMember.is_active == True,
            )
            result = await db.execute(stmt)
            coaches = result.scalars().all()
            for tm in coaches:
                if tm.user_id:
                    await msg_service.send_message(
                        sender_id=admin.id, sender_role="admin",
                        subject=f"\u05d1\u05e7\u05e9\u05d4 \u05dc\u05de\u05d9\u05dc\u05d5\u05d9 \u05d3\u05d5\u05d7 {period_he}",
                        body=f"\u05d4\u05e0\u05d4\u05dc\u05d4 \u05de\u05d1\u05e7\u05e9\u05ea \u05dc\u05de\u05dc\u05d0 \u05d3\u05d5\u05d7\u05d5\u05ea \u05d4\u05e2\u05e8\u05db\u05d4 \u05e2\u05d3 {req.due_date}.\n\n{req.instructions or ''}\n\n\u05d4\u05d9\u05db\u05e0\u05e1\u05d5 \u05dc\u05e2\u05de\u05d5\u05d3 Reports \u05db\u05d3\u05d9 \u05dc\u05de\u05dc\u05d0 \u05d0\u05ea \u05d4\u05d3\u05d5\u05d7\u05d5\u05ea.",
                        message_type="update",
                        target_type="individual", target_user_id=tm.user_id,
                    )
        await db.commit()
    except Exception:
        pass  # Don't fail request creation if notification fails

    return {
        "success": True,
        "data": {
            "id": rr.id,
            "period_type": rr.period_type,
            "due_date": str(rr.due_date),
            "status": rr.status,
            "instructions": rr.instructions,
        },
    }


@router.get("/requests")
async def list_report_requests(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = EvaluationService(db)
    requests = await service.get_requests_for_admin(admin.id)
    data = []
    for r in requests:
        data.append({
            "id": r.id,
            "coach_id": r.coach_id,
            "team_id": r.team_id,
            "period_type": r.period_type,
            "due_date": str(r.due_date),
            "instructions": r.instructions,
            "status": r.status,
            "created_at": str(r.created_at),
        })
    return {"success": True, "data": data}


@router.delete("/requests/{request_id}")
async def cancel_report_request(
    request_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = EvaluationService(db)
    ok = await service.cancel_request(admin.id, request_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Request not found")
    await db.commit()
    return {"success": True}


@router.get("")
async def list_admin_evaluations(
    player_id: int | None = Query(None),
    team_id: int | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    service = EvaluationService(db)
    evals = await service.get_evaluations_for_admin(admin.id, player_id, team_id)

    # Batch fetch coach names
    coach_ids = list({e.coach_id for e in evals})
    coaches = {}
    for cid in coach_ids:
        c = await db.get(Coach, cid)
        if c:
            coaches[cid] = c.name

    data = []
    for ev in evals:
        data.append({
            "id": ev.id,
            "coach_id": ev.coach_id,
            "coach_name": coaches.get(ev.coach_id, "Unknown"),
            "player_id": ev.player_id,
            "period_type": ev.period_type,
            "period_label": ev.period_label,
            "offensive_rating": ev.offensive_rating,
            "defensive_rating": ev.defensive_rating,
            "iq_rating": ev.iq_rating,
            "social_rating": ev.social_rating,
            "leaving_risk": ev.leaving_risk,
            "leadership_rating": ev.leadership_rating,
            "work_ethic_rating": ev.work_ethic_rating,
            "fitness_rating": ev.fitness_rating,
            "improvement_rating": ev.improvement_rating,
            "overall_notes": ev.overall_notes,
            "potential_notes": ev.potential_notes,
            "created_at": str(ev.created_at),
        })
    return {"success": True, "data": data}
