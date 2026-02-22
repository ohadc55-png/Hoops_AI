"""HOOPS AI - Player Chat API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.player_chat_service import PlayerChatService
from src.api.player_auth import get_current_player
from src.models.user import User
from src.models.player import Player
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.coach import Coach

router = APIRouter(prefix="/api/player-chat", tags=["player-chat"])


class PlayerSendMessageRequest(BaseModel):
    message: str
    conversation_id: int | None = None


async def _build_player_context(db: AsyncSession, user: User) -> dict:
    """Build basic player context (name, position, team) for agent prompts."""
    context = {"player_name": user.name, "position": "", "team_name": ""}

    # Get player's team memberships
    stmt = select(TeamMember).where(TeamMember.user_id == user.id, TeamMember.is_active == True)
    result = await db.execute(stmt)
    memberships = result.scalars().all()
    if not memberships:
        return context

    # Get player profile (position)
    player_ids = [m.player_id for m in memberships if m.player_id]
    if player_ids:
        player = await db.get(Player, player_ids[0])
        if player:
            context["position"] = player.position or ""

    # Get team name
    team_ids = [m.team_id for m in memberships]
    if team_ids:
        team = await db.get(Team, team_ids[0])
        if team:
            context["team_name"] = team.name or ""

    return context


@router.post("/send")
async def send_message(
    req: PlayerSendMessageRequest,
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    from src.utils.feature_gate import require_feature
    await require_feature("ai_chat_player", db, user_id=user.id)
    service = PlayerChatService(db)
    player_context = await _build_player_context(db, user)

    try:
        result = await service.send_message(user.id, req.message, req.conversation_id, player_context)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations")
async def list_conversations(
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    service = PlayerChatService(db)
    convs = await service.get_conversations(user.id)
    return {
        "success": True,
        "data": [
            {"id": c.id, "title": c.title, "created_at": str(c.created_at)}
            for c in convs
        ],
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: int,
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    service = PlayerChatService(db)
    conv = await service.get_conversation_messages(conversation_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "success": True,
        "data": {
            "id": conv.id,
            "title": conv.title,
            "messages": [
                {
                    "id": m.id, "role": m.role, "content": m.content,
                    "agent": m.agent, "created_at": str(m.created_at),
                }
                for m in conv.messages
            ],
        },
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    service = PlayerChatService(db)
    conv = await service.get_conversation_messages(conversation_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.flush()
    return {"success": True}
