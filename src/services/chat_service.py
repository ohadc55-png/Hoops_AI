"""HOOPS AI - Chat Service"""
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.conversation_repository import ConversationRepository
from src.models.message import Message
from src.agents.base_agent import BaseAgent, route_to_agent
from src.constants.agents import AGENTS
from src.services.context_service import ContextService


class ChatService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.conv_repo = ConversationRepository(session)

    async def send_message(
        self,
        coach_id: int,
        content: str,
        conversation_id: int | None = None,
        coach_context: dict | None = None,
    ) -> dict:
        # Create or get conversation
        if not conversation_id:
            conv = await self.conv_repo.create(
                coach_id=coach_id,
                title=content[:80] + ("..." if len(content) > 80 else ""),
            )
            conversation_id = conv.id
        else:
            conv = await self.conv_repo.get_by_id(conversation_id)
            if not conv:
                raise ValueError("Conversation not found")

        # Save user message
        user_msg = Message(conversation_id=conversation_id, role="user", content=content)
        self.session.add(user_msg)
        await self.session.flush()

        # Route to agent and enrich context with team data
        agent_key = route_to_agent(content)
        ctx_svc = ContextService(self.session)
        enriched = await ctx_svc.build_context(coach_id, agent_key, content)
        coach_context = {**(coach_context or {}), **enriched}
        agent = BaseAgent(agent_key, coach_context)

        # Build conversation history
        full_conv = await self.conv_repo.get_with_messages(conversation_id)
        history = [{"role": m.role, "content": m.content} for m in (full_conv.messages[-20:] if full_conv else [])]

        # Get agent response (with AI usage tracking)
        usage_ctx = {
            "coach_id": coach_id,
            "agent_name": agent_key,
            "agent_type": "coach",
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
            "agent_meta": AGENTS[agent_key],
            "response": response_text,
        }

    async def get_conversations(self, coach_id: int):
        return await self.conv_repo.get_by_coach_id(coach_id)

    async def get_conversation_messages(self, conversation_id: int):
        conv = await self.conv_repo.get_with_messages(conversation_id)
        return conv
