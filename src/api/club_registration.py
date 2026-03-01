"""HOOPS AI - Club Registration API (public, no auth required)"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.club_registration_service import ClubRegistrationService

router = APIRouter(prefix="/api/club-register", tags=["club-registration"])


class ClubAdminRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str | None = None
    role_title: str | None = None  # Chairman, CEO, Secretary, Treasurer, GM


@router.get("/{token}")
async def validate_registration_link(token: str, db: AsyncSession = Depends(get_db)):
    """Public: validate a club registration link and return club info."""
    service = ClubRegistrationService(db)
    data = await service.validate_link(token)
    return {"success": True, "data": data}


@router.post("/{token}")
async def register_club_admin(
    token: str,
    req: ClubAdminRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public: register as club admin via registration link."""
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    service = ClubRegistrationService(db)
    result = await service.register_admin(
        token=token,
        name=req.name.strip(),
        email=req.email.strip().lower(),
        password=req.password,
        phone=req.phone,
        role_title=req.role_title,
    )
    await db.commit()
    return {"success": True, "data": result}
