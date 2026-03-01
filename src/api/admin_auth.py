"""HOOPS AI - Admin Auth API"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.admin_auth_service import AdminAuthService
from src.models.user import User

router = APIRouter(prefix="/api/admin-auth", tags=["admin-auth"])
security = HTTPBearer(auto_error=False)


class AdminRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str | None = None


class AdminLoginRequest(BaseModel):
    email: str
    password: str


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Auth dependency for admin-only endpoints."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    service = AdminAuthService(db)
    user = await service.get_current_admin(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token or not an admin")
    return user


@router.post("/register")
async def register_admin(req: AdminRegisterRequest, db: AsyncSession = Depends(get_db)):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    service = AdminAuthService(db)
    result = await service.register_admin(name=req.name, email=req.email, password=req.password, phone=req.phone)
    return {
        "success": True,
        "data": {
            "token": result["token"],
            "user": {"id": result["user"].id, "name": result["user"].name, "email": result["user"].email, "role": "admin"},
        },
    }


@router.post("/login")
async def login_admin(req: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    service = AdminAuthService(db)
    result = await service.login_admin(req.email, req.password)
    user = result["user"]
    role_perms = user.admin_role.permissions if user.admin_role else None
    return {
        "success": True,
        "data": {
            "token": result["token"],
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": "admin",
                "admin_role": user.admin_role.name if user.admin_role else None,
                "permissions": role_perms,
            },
            "language": user.preferred_language,
        },
    }


@router.get("/me")
async def admin_me(user: User = Depends(get_current_admin)):
    return {
        "success": True,
        "data": {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "language": user.preferred_language},
    }


class LanguageRequest(BaseModel):
    language: str


@router.put("/language")
async def update_admin_language(req: LanguageRequest, user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    if req.language not in ("he", "en"):
        raise HTTPException(status_code=400, detail="Language must be 'he' or 'en'")
    from src.repositories.user_repository import UserRepository
    await UserRepository(db).update(user.id, preferred_language=req.language)
    return {"success": True, "data": {"language": req.language}}
