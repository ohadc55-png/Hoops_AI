"""HOOPS AI - Super Admin Auth API"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.super_admin_auth_service import SuperAdminAuthService
from src.models.super_admin import SuperAdmin

router = APIRouter(prefix="/api/super-admin-auth", tags=["super-admin-auth"])
security = HTTPBearer(auto_error=False)


class SuperAdminRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str | None = None


class SuperAdminLoginRequest(BaseModel):
    email: str
    password: str


async def get_current_super_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> SuperAdmin:
    """Auth dependency for super-admin-only endpoints."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    service = SuperAdminAuthService(db)
    admin = await service.get_current_super_admin(credentials.credentials)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid token or not a super admin")
    return admin


@router.post("/register")
async def register_super_admin(req: SuperAdminRegisterRequest, db: AsyncSession = Depends(get_db)):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    service = SuperAdminAuthService(db)
    result = await service.register(name=req.name, email=req.email, password=req.password, phone=req.phone)
    return {
        "success": True,
        "data": {
            "token": result["token"],
            "user": {
                "id": result["admin"].id,
                "name": result["admin"].name,
                "email": result["admin"].email,
                "role": "super_admin",
            },
        },
    }


@router.post("/login")
async def login_super_admin(req: SuperAdminLoginRequest, db: AsyncSession = Depends(get_db)):
    service = SuperAdminAuthService(db)
    result = await service.login(req.email, req.password)
    return {
        "success": True,
        "data": {
            "token": result["token"],
            "user": {
                "id": result["admin"].id,
                "name": result["admin"].name,
                "email": result["admin"].email,
                "role": "super_admin",
            },
        },
    }


@router.get("/profile")
async def super_admin_profile(admin: SuperAdmin = Depends(get_current_super_admin)):
    return {
        "success": True,
        "data": {
            "id": admin.id,
            "name": admin.name,
            "email": admin.email,
            "phone": admin.phone,
            "role": "super_admin",
        },
    }
