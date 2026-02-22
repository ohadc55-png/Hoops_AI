"""HOOPS AI - AI Insights API (Financial + Professional agents for admin)"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.models.user import User

router = APIRouter(prefix="/api/insights", tags=["ai-insights"])


class ChatRequest(BaseModel):
    message: str
    history: list[dict] | None = None


# ===== FINANCIAL AGENT =====

@router.get("/financial/dashboard")
async def financial_dashboard(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.utils.feature_gate import require_feature
    await require_feature("ai_insights", db, admin_id=admin.id)
    from src.services.financial_agent import FinancialAgent
    agent = FinancialAgent(db)
    try:
        result = await agent.get_dashboard_insights(admin.id)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/financial/report")
async def financial_report(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.services.financial_agent import FinancialAgent
    from src.models.insight_report import InsightReport
    agent = FinancialAgent(db)
    try:
        report = await agent.generate_weekly_report(admin.id)
        # Save to DB
        db.add(InsightReport(
            admin_id=admin.id,
            agent_type="financial",
            report_type="weekly_manual",
            content=report,
        ))
        await db.flush()
        return {"success": True, "data": {"report": report}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/financial/chat")
async def financial_chat(
    req: ChatRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.services.financial_agent import FinancialAgent
    agent = FinancialAgent(db)
    try:
        response = await agent.chat(admin.id, req.message, req.history)
        return {"success": True, "data": {"response": response}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/financial/send-reminders")
async def financial_send_reminders(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.services.financial_agent import FinancialAgent
    agent = FinancialAgent(db)
    try:
        sent = await agent.send_payment_reminders(admin.id)
        return {"success": True, "data": {"sent": sent}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== PROFESSIONAL AGENT =====

@router.get("/professional/dashboard")
async def professional_dashboard(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.services.professional_agent import ProfessionalAgent
    agent = ProfessionalAgent(db)
    try:
        result = await agent.get_dashboard_insights(admin.id)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/professional/report")
async def professional_report(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.services.professional_agent import ProfessionalAgent
    from src.models.insight_report import InsightReport
    agent = ProfessionalAgent(db)
    try:
        report = await agent.generate_weekly_report(admin.id)
        db.add(InsightReport(
            admin_id=admin.id,
            agent_type="professional",
            report_type="weekly_manual",
            content=report,
        ))
        await db.flush()
        return {"success": True, "data": {"report": report}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/professional/chat")
async def professional_chat(
    req: ChatRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.services.professional_agent import ProfessionalAgent
    agent = ProfessionalAgent(db)
    try:
        response = await agent.chat(admin.id, req.message, req.history)
        return {"success": True, "data": {"response": response}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/professional/player-card/{player_id}")
async def professional_player_card(
    player_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.services.professional_agent import ProfessionalAgent
    agent = ProfessionalAgent(db)
    try:
        result = await agent.get_player_card(player_id)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== SHARED =====

@router.get("/reports")
async def list_reports(
    agent_type: str | None = None,
    limit: int = 10,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from src.models.insight_report import InsightReport
    stmt = (
        select(InsightReport)
        .where(InsightReport.admin_id == admin.id)
        .order_by(InsightReport.created_at.desc())
        .limit(limit)
    )
    if agent_type:
        stmt = stmt.where(InsightReport.agent_type == agent_type)
    result = await db.execute(stmt)
    reports = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": r.id,
                "agent_type": r.agent_type,
                "report_type": r.report_type,
                "created_at": str(r.created_at),
                "preview": r.content[:200] + "..." if len(r.content) > 200 else r.content,
            }
            for r in reports
        ],
    }


@router.get("/reports/{report_id}")
async def get_report(
    report_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.models.insight_report import InsightReport
    report = await db.get(InsightReport, report_id)
    if not report or report.admin_id != admin.id:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "success": True,
        "data": {
            "id": report.id,
            "agent_type": report.agent_type,
            "report_type": report.report_type,
            "content": report.content,
            "created_at": str(report.created_at),
        },
    }


@router.get("/players")
async def list_players_for_card(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    from src.services.insight_data_collector import InsightDataCollector
    collector = InsightDataCollector(db)
    players = await collector.get_admin_players_list(admin.id)
    return {"success": True, "data": players}
