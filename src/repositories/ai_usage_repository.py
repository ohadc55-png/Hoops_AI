"""HOOPS AI - AI Usage Repository"""
from datetime import datetime, timedelta
from typing import Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.ai_usage_log import AIUsageLog
from src.repositories.base_repository import BaseRepository


class AIUsageRepository(BaseRepository[AIUsageLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(AIUsageLog, session)

    async def get_by_club(
        self, club_id: int, days: int = 30,
    ) -> Sequence[AIUsageLog]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(AIUsageLog)
            .where(AIUsageLog.club_id == club_id, AIUsageLog.created_at >= cutoff)
            .order_by(AIUsageLog.created_at.desc())
            .limit(500)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_totals_by_agent(self, club_id: int | None = None, days: int = 30) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(
                AIUsageLog.agent_name,
                func.count(AIUsageLog.id).label("calls"),
                func.sum(AIUsageLog.tokens_in).label("total_in"),
                func.sum(AIUsageLog.tokens_out).label("total_out"),
                func.sum(AIUsageLog.cost_estimate).label("total_cost"),
            )
            .where(AIUsageLog.created_at >= cutoff)
            .group_by(AIUsageLog.agent_name)
            .order_by(func.count(AIUsageLog.id).desc())
        )
        if club_id:
            stmt = stmt.where(AIUsageLog.club_id == club_id)
        result = await self.session.execute(stmt)
        return [
            {"agent": row[0], "calls": row[1], "tokens_in": row[2] or 0, "tokens_out": row[3] or 0, "cost": round(float(row[4] or 0), 4)}
            for row in result.all()
        ]

    async def get_platform_totals(self, days: int = 30) -> dict:
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = select(
            func.count(AIUsageLog.id),
            func.sum(AIUsageLog.tokens_in),
            func.sum(AIUsageLog.tokens_out),
            func.sum(AIUsageLog.cost_estimate),
        ).where(AIUsageLog.created_at >= cutoff)
        result = await self.session.execute(stmt)
        row = result.one()
        return {
            "total_calls": row[0] or 0,
            "total_tokens_in": row[1] or 0,
            "total_tokens_out": row[2] or 0,
            "total_cost": round(float(row[3] or 0), 4),
        }

    async def get_daily_totals(self, days: int = 30) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(
                func.date(AIUsageLog.created_at).label("day"),
                func.count(AIUsageLog.id).label("calls"),
                func.sum(AIUsageLog.tokens_in + AIUsageLog.tokens_out).label("tokens"),
                func.sum(AIUsageLog.cost_estimate).label("cost"),
            )
            .where(AIUsageLog.created_at >= cutoff)
            .group_by(func.date(AIUsageLog.created_at))
            .order_by(func.date(AIUsageLog.created_at))
        )
        result = await self.session.execute(stmt)
        return [
            {"date": str(row[0]), "calls": row[1], "tokens": row[2] or 0, "cost": round(float(row[3] or 0), 4)}
            for row in result.all()
        ]
