"""HOOPS AI - Player Auth API"""
from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.player_auth_service import PlayerAuthService
from src.models.user import User

router = APIRouter(prefix="/api/player-auth", tags=["player-auth"])
security = HTTPBearer(auto_error=False)


class PlayerRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str | None = None
    date_of_birth: str | None = None  # ISO "YYYY-MM-DD"
    invite_code: str | None = None
    invite_link_token: str | None = None


class PlayerLoginRequest(BaseModel):
    email: str
    password: str


class PlayerProfileUpdateRequest(BaseModel):
    name: str | None = None


async def get_current_player(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Like get_current_coach but for player users."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    service = PlayerAuthService(db)
    user = await service.get_current_player(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token or not a player")
    return user


@router.post("/register")
async def register_player(req: PlayerRegisterRequest, db: AsyncSession = Depends(get_db)):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not req.invite_code and not req.invite_link_token:
        raise HTTPException(status_code=400, detail="Invite code or invite link is required")
    try:
        dob = date_type.fromisoformat(req.date_of_birth) if req.date_of_birth else None
        service = PlayerAuthService(db)
        result = await service.register_player(
            name=req.name, email=req.email, password=req.password,
            phone=req.phone, date_of_birth=dob,
            invite_code=req.invite_code, invite_link_token=req.invite_link_token,
        )
        return {
            "success": True,
            "data": {
                "token": result["token"],
                "user": {"id": result["user"].id, "name": result["user"].name, "email": result["user"].email, "role": result["user"].role},
                "team": {"id": result["team"].id, "name": result["team"].name},
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


@router.post("/login")
async def login_player(req: PlayerLoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        service = PlayerAuthService(db)
        result = await service.login_player(req.email, req.password)
        return {
            "success": True,
            "data": {
                "token": result["token"],
                "user": {
                    "id": result["user"].id,
                    "name": result["user"].name,
                    "email": result["user"].email,
                    "role": result["user"].role,
                },
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
async def player_me(user: User = Depends(get_current_player)):
    return {
        "success": True,
        "data": {
            "id": user.id, "name": user.name, "email": user.email, "role": user.role,
        },
    }


@router.put("/me")
async def update_player_profile(req: PlayerProfileUpdateRequest, user: User = Depends(get_current_player),
                                 db: AsyncSession = Depends(get_db)):
    service = PlayerAuthService(db)
    updated = await service.update_profile(user.id, req.model_dump(exclude_none=True))
    return {
        "success": True,
        "data": {
            "id": updated.id, "name": updated.name, "email": updated.email, "role": updated.role,
        },
    }
