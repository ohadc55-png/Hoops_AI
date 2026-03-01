"""HOOPS AI - Player Chat Service"""
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.conversation import Conversation
from src.models.message import Message
from src.agents.player_agent import PlayerAgent, route_to_player_agent
from src.constants.player_agents import PLAYER_AGENTS
from src.services.player_context_service import PlayerContextService
from src.utils.exceptions import NotFoundError


class PlayerChatService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def send_message(
        self,
        user_id: int,
        content: str,
        conversation_id: int | None = None,
        player_context: dict | None = None,
    ) -> dict:
        # Create or get conversation
        if not conversation_id:
            conv = Conversation(
                user_id=user_id,
                title=content[:80] + ("..." if len(content) > 80 else ""),
            )
            self.session.add(conv)
            await self.session.flush()
            await self.session.refresh(conv)
            conversation_id = conv.id
        else:
            conv = await self._get_conversation(conversation_id)
            if not conv or conv.user_id != user_id:
                raise NotFoundError("Conversation")

        # Save user message
        user_msg = Message(conversation_id=conversation_id, role="user", content=content)
        self.session.add(user_msg)
        await self.session.flush()

        # Route to agent and enrich context with player data
        agent_key = route_to_player_agent(content)
        ctx_svc = PlayerContextService(self.session)
        enriched = await ctx_svc.build_context(user_id, agent_key, content)
        full_context = {**(player_context or {}), **enriched}
        agent = PlayerAgent(agent_key, full_context)

        # Build conversation history (last 20 messages)
        full_conv = await self._get_conversation_with_messages(conversation_id)
        history = [
            {"role": m.role, "content": m.content}
            for m in (full_conv.messages[-20:] if full_conv else [])
        ]

        # Get agent response (with AI usage tracking)
        usage_ctx = {
            "user_id": user_id,
            "agent_name": agent_key,
            "agent_type": "player",
        }
        response_text = await agent.chat(history, usage_context=usage_ctx)

        # Save assistant message
        assistant_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=response_text,
            agent=agent_key,
        )
        self.session.add(assistant_msg)
        await self.session.flush()

        return {
            "conversation_id": conversation_id,
            "agent": agent_key,
            "agent_meta": PLAYER_AGENTS[agent_key],
            "response": response_text,
        }

    async def get_conversations(self, user_id: int):
        """List all conversations for a player."""
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_conversation_messages(self, conversation_id: int) -> Conversation | None:
        """Load a conversation with all its messages."""
        return await self._get_conversation_with_messages(conversation_id)

    async def _get_conversation(self, conversation_id: int) -> Conversation | None:
        return await self.session.get(Conversation, conversation_id)

    async def _get_conversation_with_messages(self, conversation_id: int) -> Conversation | None:
        stmt = (
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.id == conversation_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
