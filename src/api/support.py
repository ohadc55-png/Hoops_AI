"""HOOPS AI - Club Admin Support API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.models.user import User
from src.services.support_service import SupportService

router = APIRouter(prefix="/api/support", tags=["support"])


class CreateTicketRequest(BaseModel):
    subject: str
    body: str
    category: str = "general"
    priority: str = "medium"


class ReplyRequest(BaseModel):
    body: str


@router.post("/tickets")
async def create_ticket(
    req: CreateTicketRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Club admin creates a support ticket."""
    if not req.subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    if not req.body.strip():
        raise HTTPException(status_code=400, detail="Message body is required")

    service = SupportService(db)
    try:
        result = await service.create_ticket(
            user_id=admin.id,
            subject=req.subject.strip(),
            body=req.body.strip(),
            category=req.category,
            priority=req.priority,
            sender_name=admin.name,
        )
        await db.commit()
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tickets")
async def list_my_tickets(
    status: str | None = None,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get all support tickets for the current admin's club."""
    service = SupportService(db)
    tickets = await service.get_club_tickets(admin.id, status=status)
    return {"success": True, "data": tickets}


@router.get("/tickets/{ticket_id}")
async def get_my_ticket(
    ticket_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific ticket with messages (club admin view — no internal notes)."""
    service = SupportService(db)
    data = await service.get_club_ticket_detail(admin.id, ticket_id)
    if not data:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"success": True, "data": data}


@router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: int,
    req: ReplyRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Club admin replies to their ticket."""
    if not req.body.strip():
        raise HTTPException(status_code=400, detail="Message body is required")

    service = SupportService(db)
    try:
        result = await service.club_reply(
            user_id=admin.id,
            ticket_id=ticket_id,
            body=req.body.strip(),
            sender_name=admin.name,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Ticket not found")
        await db.commit()
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
