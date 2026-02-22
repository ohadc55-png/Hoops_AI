"""HOOPS AI - Chat API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.services.chat_service import ChatService
from src.api.auth import get_current_coach

router = APIRouter(prefix="/api/chat", tags=["chat"])


class SendMessageRequest(BaseModel):
    message: str
    conversation_id: int | None = None


@router.post("/send")
async def send_message(req: SendMessageRequest, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    from src.utils.feature_gate import require_feature
    await require_feature("ai_chat_coach_full", db, coach_id=coach.id)
    service = ChatService(db)
    context = {
        "name": coach.name, "team_name": coach.team_name,
        "age_group": coach.age_group, "level": coach.level,
    }
    try:
        result = await service.send_message(coach.id, req.message, req.conversation_id, context)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations")
async def list_conversations(coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = ChatService(db)
    convs = await service.get_conversations(coach.id)
    return {
        "success": True,
        "data": [{"id": c.id, "title": c.title, "created_at": str(c.created_at)} for c in convs],
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = ChatService(db)
    conv = await service.get_conversation_messages(conversation_id)
    if not conv or conv.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "success": True,
        "data": {
            "id": conv.id, "title": conv.title,
            "messages": [
                {"id": m.id, "role": m.role, "content": m.content, "agent": m.agent, "created_at": str(m.created_at)}
                for m in conv.messages
            ],
        },
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int, coach=Depends(get_current_coach), db: AsyncSession = Depends(get_db)):
    service = ChatService(db)
    conv = await service.get_conversation_messages(conversation_id)
    if not conv or conv.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await service.conv_repo.delete(conversation_id)
    return {"success": True}
