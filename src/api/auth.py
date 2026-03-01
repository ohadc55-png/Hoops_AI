"""HOOPS AI - Auth API"""
from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    age_group: str | None = None
    level: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


async def get_current_coach(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    service = AuthService(db)
    coach = await service.get_current_coach(credentials.credentials)
    if not coach:
        raise HTTPException(status_code=401, detail="Invalid token")
    return coach


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    try:
        service = AuthService(db)
        result = await service.register(
            name=req.name, email=req.email, password=req.password,
            age_group=req.age_group, level=req.level,
        )
        return {
            "success": True,
            "data": {
                "token": result["token"],
                "coach": {"id": result["coach"].id, "name": result["coach"].name, "email": result["coach"].email},
            },
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


class CoachInviteRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str | None = None
    date_of_birth: str | None = None  # ISO "YYYY-MM-DD"
    invite_code: str | None = None
    invite_link_token: str | None = None


@router.post("/register-with-invite")
async def register_with_invite(req: CoachInviteRegisterRequest, db: AsyncSession = Depends(get_db)):
    """One-step coach registration + team join via invite."""
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not req.invite_code and not req.invite_link_token:
        raise HTTPException(status_code=400, detail="Invite code or link required")
    try:
        dob = date_type.fromisoformat(req.date_of_birth) if req.date_of_birth else None
        service = AuthService(db)
        result = await service.register_and_join_team(
            session=db, name=req.name, email=req.email, password=req.password,
            phone=req.phone, date_of_birth=dob,
            invite_code=req.invite_code, invite_link_token=req.invite_link_token,
        )
        return {
            "success": True,
            "data": {
                "token": result["token"],
                "coach": {"id": result["coach"].id, "name": result["coach"].name, "email": result["coach"].email},
                "team": {"id": result["team"].id, "name": result["team"].name},
            },
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.login(req.email, req.password)
    coach = result["coach"]
    language = "he"
    if coach.user_id:
        from src.repositories.user_repository import UserRepository
        user = await UserRepository(db).get_by_id(coach.user_id)
        if user:
            language = user.preferred_language
    return {
        "success": True,
        "data": {
            "token": result["token"],
            "coach": {
                "id": coach.id,
                "name": coach.name,
                "email": coach.email,
                "age_group": coach.age_group,
                "level": coach.level,
            },
            "language": language,
        },
    }


@router.get("/me")
async def me(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    language = "he"
    if coach.user_id:
        from src.repositories.user_repository import UserRepository
        user = await UserRepository(db).get_by_id(coach.user_id)
        if user:
            language = user.preferred_language
    return {
        "success": True,
        "data": {
            "id": coach.id, "name": coach.name, "email": coach.email,
            "age_group": coach.age_group, "level": coach.level,
            "language": language,
        },
    }


class JoinTeamRequest(BaseModel):
    invite_code: str | None = None
    invite_token: str | None = None


@router.post("/join-team")
async def join_team(req: JoinTeamRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    """Coach joins a team using coach_invite_code or coach_invite_token."""
    from src.repositories.team_repository import TeamRepository
    from src.repositories.user_repository import UserRepository
    from src.repositories.team_member_repository import TeamMemberRepository

    if not req.invite_code and not req.invite_token:
        raise HTTPException(status_code=400, detail="invite_code or invite_token required")

    team_repo = TeamRepository(db)
    team = None
    if req.invite_token:
        team = await team_repo.get_by_coach_invite_token(req.invite_token.strip())
    if not team and req.invite_code:
        team = await team_repo.get_by_coach_invite_code(req.invite_code.strip().upper())
    if not team:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    # Ensure coach has a linked User record
    if not coach.user_id:
        user_repo = UserRepository(db)
        existing_user = await user_repo.get_by_email(coach.email)
        if existing_user:
            coach_user = existing_user
        else:
            coach_user = await user_repo.create(
                name=coach.name, email=coach.email,
                password_hash=coach.password_hash, role="coach",
            )
        from src.repositories.coach_repository import CoachRepository
        coach_repo = CoachRepository(db)
        await coach_repo.update(coach.id, user_id=coach_user.id)
        coach.user_id = coach_user.id
    else:
        user_repo = UserRepository(db)
        coach_user = await user_repo.get_by_id(coach.user_id)

    # Create TeamMember
    member_repo = TeamMemberRepository(db)
    existing = await member_repo.get_membership(team.id, coach.user_id)
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this team")
    await member_repo.create(team_id=team.id, user_id=coach.user_id, role_in_team="coach")

    return {
        "success": True,
        "data": {"team_id": team.id, "team_name": team.name},
    }


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    age_group: str | None = None
    level: str | None = None


@router.put("/me")
async def update_me(req: UpdateProfileRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    updated = await service.update_profile(coach.id, req.model_dump(exclude_none=True))
    return {
        "success": True,
        "data": {
            "id": updated.id, "name": updated.name, "email": updated.email,
            "age_group": updated.age_group, "level": updated.level,
        },
    }


class LanguageRequest(BaseModel):
    language: str


@router.put("/language")
async def update_language(req: LanguageRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    if req.language not in ("he", "en"):
        raise HTTPException(status_code=400, detail="Language must be 'he' or 'en'")
    if not coach.user_id:
        raise HTTPException(status_code=400, detail="No linked user account")
    from src.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    await user_repo.update(coach.user_id, preferred_language=req.language)
    return {"success": True, "data": {"language": req.language}}
