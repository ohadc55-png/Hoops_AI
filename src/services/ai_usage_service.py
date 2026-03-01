"""HOOPS AI - AI Usage Service"""
import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.ai_usage_repository import AIUsageRepository
from src.utils.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


# GPT-4o pricing (per 1K tokens, approximate)
_COST_PER_1K_IN = 0.0025
_COST_PER_1K_OUT = 0.01


async def log_usage_fire_and_forget(
    club_id: int | None = None,
    user_id: int | None = None,
    coach_id: int | None = None,
    agent_name: str | None = None,
    agent_type: str | None = None,
    tokens_in: int = 0,
    tokens_out: int = 0,
    model: str | None = None,
):
    """Fire-and-forget: logs AI usage in a separate DB session. Safe to call from anywhere."""
    try:
        cost = (tokens_in / 1000 * _COST_PER_1K_IN) + (tokens_out / 1000 * _COST_PER_1K_OUT)
        async with AsyncSessionLocal() as session:
            repo = AIUsageRepository(session)
            await repo.create(
                club_id=club_id,
                user_id=user_id,
                coach_id=coach_id,
                agent_name=agent_name,
                agent_type=agent_type,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                model=model,
                cost_estimate=round(cost, 6),
            )
            await session.commit()
    except Exception as e:
        logger.warning(f"AI usage log error: {e}")


class AIUsageService:
    def __init__(self, session: AsyncSession):
        self.repo = AIUsageRepository(session)

    async def get_platform_overview(self, days: int = 30) -> dict:
        totals = await self.repo.get_platform_totals(days)
        by_agent = await self.repo.get_totals_by_agent(days=days)
        daily = await self.repo.get_daily_totals(days)
        return {
            "totals": totals,
            "by_agent": by_agent,
            "daily": daily,
        }

    async def get_club_usage(self, club_id: int, days: int = 30) -> dict:
        by_agent = await self.repo.get_totals_by_agent(club_id=club_id, days=days)
        logs = await self.repo.get_by_club(club_id, days)
        total_tokens = sum(l.tokens_in + l.tokens_out for l in logs)
        total_cost = sum(l.cost_estimate for l in logs)
        return {
            "total_calls": len(logs),
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 4),
            "by_agent": by_agent,
        }
