"""HOOPS AI - Messaging API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.auth_service import decode_token
from src.services.messaging_service import MessagingService
from src.models.user import User
from src.repositories.user_repository import UserRepository

router = APIRouter(prefix="/api/messages", tags=["messaging"])
security = HTTPBearer(auto_error=False)


async def get_messaging_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Universal auth for messaging — works for admin, coach, player, parent.
    Also supports legacy coach tokens (no role field, sub=coach_id) if coach has user_id."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    role = payload.get("role")
    user_id = int(payload.get("sub", 0))

    if role in ("admin", "coach", "player", "parent"):
        user = await UserRepository(db).get_by_id(user_id)
        if user and user.is_active:
            return user

    # Fallback: legacy coach token (no role, sub=coach_id)
    if not role and user_id:
        from src.repositories.coach_repository import CoachRepository
        coach_repo = CoachRepository(db)
        coach = await coach_repo.get_by_id(user_id)
        if coach:
            if coach.user_id:
                user = await UserRepository(db).get_by_id(coach.user_id)
                if user and user.is_active:
                    return user
            else:
                # Auto-create User record for legacy coach (same as join-team flow)
                user_repo = UserRepository(db)
                try:
                    existing_user = await user_repo.get_by_email_and_role(coach.email, "coach")
                    if existing_user:
                        coach_user = existing_user
                    else:
                        coach_user = await user_repo.create(
                            name=coach.name, email=coach.email,
                            password_hash=coach.password_hash, role="coach",
                        )
                        await db.flush()
                except Exception:
                    # Race condition: another request already created the user
                    await db.rollback()
                    coach_user = await user_repo.get_by_email_and_role(coach.email, "coach")
                    if not coach_user:
                        raise HTTPException(status_code=401, detail="Could not resolve user")
                await coach_repo.update(coach.id, user_id=coach_user.id)
                await db.flush()
                return coach_user

    raise HTTPException(status_code=401, detail="Invalid token or role")


# --- Request schemas ---

class SendMessageRequest(BaseModel):
    subject: str | None = None
    body: str
    message_type: str = "general"
    target_type: str
    target_team_ids: list[int] | None = None
    target_user_id: int | None = None
    scheduled_at: str | None = None


# --- TARGETING HELPERS (defined before parameterized routes to avoid /{message_id} conflicts) ---

@router.get("/targets")
async def get_targets(user: User = Depends(get_messaging_user)):
    targets = {
        "admin": ["all_club", "all_coaches", "all_players", "all_parents",
                   "team", "team_players", "team_parents", "team_coaches", "individual"],
        "coach": ["my_team", "my_team_players", "my_team_parents", "my_coach", "admin"],
        "player": ["my_team", "my_coach", "admin"],
        "parent": ["my_team", "my_coach", "admin"],
    }
    return {"success": True, "data": targets.get(user.role, [])}


@router.get("/targets/teams")
async def get_target_teams(
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from src.repositories.team_repository import TeamRepository
    teams = await TeamRepository(db).get_by_admin_id(user.id)
    return {
        "success": True,
        "data": [{"id": t.id, "name": t.name, "age_group": t.age_group} for t in teams],
    }


@router.get("/targets/users")
async def search_users(
    search: str = "",
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    stmt = (
        select(User)
        .where(User.name.ilike(f"%{search}%"), User.is_active == True)
        .limit(20)
    )
    result = await db.execute(stmt)
    users = result.scalars().all()
    return {
        "success": True,
        "data": [
            {"id": u.id, "name": u.name, "email": u.email, "role": u.role}
            for u in users
        ],
    }


@router.get("/targets/team-members")
async def get_team_members_by_role(
    team_id: int,
    role: str = "",
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    """Get team members filtered by role (coach/player/parent)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from src.models.team_member import TeamMember
    from sqlalchemy.orm import selectinload
    stmt = (
        select(TeamMember)
        .where(TeamMember.team_id == team_id, TeamMember.is_active == True)
        .options(selectinload(TeamMember.user))
        .order_by(TeamMember.joined_at.asc())
    )
    if role:
        stmt = stmt.where(TeamMember.role_in_team == role)
    result = await db.execute(stmt)
    members = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "user_id": m.user_id,
                "name": m.user.name if m.user else "Unknown",
                "email": m.user.email if m.user else "",
                "role_in_team": m.role_in_team,
            }
            for m in members if m.user
        ],
    }


# --- SEND ---

@router.post("/send")
async def send_message(
    req: SendMessageRequest,
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    from src.utils.feature_gate import require_feature
    await require_feature("messaging", db, user_id=user.id)
    service = MessagingService(db)
    try:
        msg = await service.send_message(
            sender_id=user.id,
            sender_role=user.role,
            subject=req.subject,
            body=req.body,
            message_type=req.message_type,
            target_type=req.target_type,
            target_team_ids=req.target_team_ids,
            target_user_id=req.target_user_id,
            scheduled_at=req.scheduled_at,
        )
        return {"success": True, "data": {"id": msg.id, "is_scheduled": msg.is_scheduled}}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


# --- INBOX ---

@router.get("/inbox")
async def get_inbox(
    unread_only: bool = False,
    limit: int = 50,
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    service = MessagingService(db)
    items = await service.get_inbox(user.id, unread_only, limit)
    return {
        "success": True,
        "data": [
            {
                "id": r.message.id,
                "sender_name": r.message.sender.name if r.message.sender else "System",
                "sender_role": r.message.sender_role,
                "subject": r.message.subject,
                "body": r.message.body,
                "message_type": r.message.message_type,
                "is_read": r.is_read,
                "created_at": str(r.message.created_at),
            }
            for r in items
        ],
    }


@router.get("/inbox/count")
async def inbox_count(
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    service = MessagingService(db)
    count = await service.get_unread_count(user.id)
    return {"success": True, "data": {"unread": count}}


# --- READ ---

@router.put("/{message_id}/read")
async def mark_read(
    message_id: int,
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    service = MessagingService(db)
    await service.mark_read(message_id, user.id)
    return {"success": True}


@router.put("/read-all")
async def mark_all_read(
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    service = MessagingService(db)
    await service.mark_all_read(user.id)
    return {"success": True}


# --- SENT ---

@router.get("/sent")
async def get_sent(
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    service = MessagingService(db)
    msgs = await service.get_sent(user.id)
    return {
        "success": True,
        "data": [
            {
                "id": m.id,
                "subject": m.subject,
                "body": m.body,
                "target_type": m.target_type,
                "message_type": m.message_type,
                "is_sent": m.is_sent,
                "created_at": str(m.created_at),
            }
            for m in msgs
        ],
    }


@router.get("/{message_id}/stats")
async def message_stats(
    message_id: int,
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    service = MessagingService(db)
    try:
        stats = await service.get_message_stats(message_id, user.id)
        return {"success": True, "data": stats}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- SCHEDULED (admin only) ---

@router.get("/scheduled")
async def get_scheduled(
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    service = MessagingService(db)
    msgs = await service.get_scheduled(user.id)
    return {
        "success": True,
        "data": [
            {
                "id": m.id,
                "subject": m.subject,
                "target_type": m.target_type,
                "scheduled_at": str(m.scheduled_at) if m.scheduled_at else None,
                "created_at": str(m.created_at),
            }
            for m in msgs
        ],
    }


@router.delete("/scheduled/{message_id}")
async def cancel_scheduled(
    message_id: int,
    user: User = Depends(get_messaging_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    service = MessagingService(db)
    try:
        await service.cancel_scheduled(message_id, user.id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

