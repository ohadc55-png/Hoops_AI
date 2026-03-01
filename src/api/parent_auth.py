"""HOOPS AI - Parent Auth API"""
from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.parent_auth_service import ParentAuthService
from src.models.user import User

router = APIRouter(prefix="/api/parent-auth", tags=["parent-auth"])
security = HTTPBearer(auto_error=False)


class ParentRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str | None = None
    date_of_birth: str | None = None  # ISO "YYYY-MM-DD"
    invite_code: str | None = None
    invite_link_token: str | None = None


class ParentLoginRequest(BaseModel):
    email: str
    password: str


async def get_current_parent(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Auth dependency for parent-only endpoints."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    service = ParentAuthService(db)
    user = await service.get_current_parent(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token or not a parent")
    return user


@router.post("/register")
async def register_parent(req: ParentRegisterRequest, db: AsyncSession = Depends(get_db)):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not req.invite_code and not req.invite_link_token:
        raise HTTPException(status_code=400, detail="Invite code or invite link is required")
    try:
        dob = date_type.fromisoformat(req.date_of_birth) if req.date_of_birth else None
        service = ParentAuthService(db)
        result = await service.register_parent(
            name=req.name, email=req.email, password=req.password,
            phone=req.phone, date_of_birth=dob,
            invite_code=req.invite_code, invite_link_token=req.invite_link_token,
        )
        return {
            "success": True,
            "data": {
                "token": result["token"],
                "user": {"id": result["user"].id, "name": result["user"].name, "email": result["user"].email, "role": "parent"},
                "team": {"id": result["team"].id, "name": result["team"].name},
            },
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


@router.post("/login")
async def login_parent(req: ParentLoginRequest, db: AsyncSession = Depends(get_db)):
    service = ParentAuthService(db)
    result = await service.login_parent(req.email, req.password)
    user = result["user"]
    return {
        "success": True,
        "data": {
            "token": result["token"],
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            },
            "language": user.preferred_language,
        },
    }


@router.get("/me")
async def parent_me(user: User = Depends(get_current_parent)):
    return {
        "success": True,
        "data": {
            "id": user.id, "name": user.name, "email": user.email, "role": user.role,
            "language": user.preferred_language,
        },
    }


class LanguageRequest(BaseModel):
    language: str


@router.put("/language")
async def update_parent_language(req: LanguageRequest, user: User = Depends(get_current_parent), db: AsyncSession = Depends(get_db)):
    if req.language not in ("he", "en"):
        raise HTTPException(status_code=400, detail="Language must be 'he' or 'en'")
    from src.repositories.user_repository import UserRepository
    await UserRepository(db).update(user.id, preferred_language=req.language)
    return {"success": True, "data": {"language": req.language}}
