"""HOOPS AI - Super Admin Notifications API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.super_admin_auth import get_current_super_admin
from src.models.super_admin import SuperAdmin
from src.services.notification_service import NotificationService

router = APIRouter(prefix="/api/super/notifications", tags=["super-admin-notifications"])


@router.get("/unread-count")
async def unread_count(
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get unread notification count (used for badge polling)."""
    service = NotificationService(db)
    count = await service.get_unread_count()
    return {"success": True, "data": {"count": count}}


@router.get("/unread")
async def unread_notifications(
    limit: int = Query(20, ge=1, le=100),
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get unread notifications for the dropdown."""
    service = NotificationService(db)
    notifs = await service.get_unread(limit)
    return {"success": True, "data": notifs}


@router.get("")
async def list_notifications(
    is_read: bool | None = None,
    priority: str | None = None,
    notification_type: str | None = None,
    club_id: int | None = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all notifications with optional filters."""
    service = NotificationService(db)
    notifs = await service.get_all(
        is_read=is_read,
        priority=priority,
        notification_type=notification_type,
        club_id=club_id,
        limit=limit,
        offset=offset,
    )
    return {"success": True, "data": notifs}


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    service = NotificationService(db)
    ok = await service.mark_read(notification_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.commit()
    return {"success": True}


@router.put("/read-all")
async def mark_all_read(
    admin: SuperAdmin = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    service = NotificationService(db)
    count = await service.mark_all_read()
    await db.commit()
    return {"success": True, "data": {"marked": count}}
