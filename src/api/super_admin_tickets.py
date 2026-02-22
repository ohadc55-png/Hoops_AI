"""HOOPS AI - Super Admin Support Tickets API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.super_admin_auth import get_current_super_admin
from src.models.super_admin import SuperAdmin
from src.services.support_service import SupportService

router = APIRouter(prefix="/api/super/tickets", tags=["super-admin-tickets"])


class AdminReplyRequest(BaseModel):
    body: str
    is_internal: bool = False


class UpdateStatusRequest(BaseModel):
    status: str


class AssignRequest(BaseModel):
    super_admin_id: int


@router.get("/stats")
async def ticket_stats(
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = SupportService(db)
    stats = await service.get_ticket_stats()
    return {"success": True, "data": stats}


@router.get("")
async def list_tickets(
    status: str | None = None,
    priority: str | None = None,
    category: str | None = None,
    club_id: int | None = None,
    search: str | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = SupportService(db)
    tickets = await service.get_all_tickets(
        status=status, priority=priority, category=category,
        club_id=club_id, search=search, limit=limit, offset=offset,
    )
    return {"success": True, "data": tickets}


@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = SupportService(db)
    data = await service.get_ticket_detail(ticket_id)
    if not data:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"success": True, "data": data}


@router.post("/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: int,
    req: AdminReplyRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = SupportService(db)
    result = await service.admin_reply(
        ticket_id=ticket_id,
        super_admin_id=admin.id,
        body=req.body,
        sender_name=admin.name,
        is_internal=req.is_internal,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.commit()
    return {"success": True, "data": result}


@router.put("/{ticket_id}/status")
async def update_status(
    ticket_id: int,
    req: UpdateStatusRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = SupportService(db)
    try:
        result = await service.update_ticket_status(ticket_id, req.status)
        if not result:
            raise HTTPException(status_code=404, detail="Ticket not found")
        await db.commit()
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: int,
    req: AssignRequest,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    service = SupportService(db)
    result = await service.assign_ticket(ticket_id, req.super_admin_id)
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.commit()
    return {"success": True, "data": result}
