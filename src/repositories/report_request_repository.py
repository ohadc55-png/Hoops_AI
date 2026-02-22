"""HOOPS AI - Report Request Repository"""
from typing import Sequence
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.report_request import ReportRequest
from src.models.team import Team
from src.models.team_member import TeamMember
from src.repositories.base_repository import BaseRepository


class ReportRequestRepository(BaseRepository[ReportRequest]):
    def __init__(self, session: AsyncSession):
        super().__init__(ReportRequest, session)

    async def get_by_admin(self, admin_id: int) -> Sequence[ReportRequest]:
        stmt = (
            select(ReportRequest)
            .where(ReportRequest.admin_id == admin_id)
            .order_by(ReportRequest.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_pending_for_coach(self, coach_id: int, user_id: int) -> Sequence[ReportRequest]:
        """Pending requests targeting this specific coach OR all coaches in their teams."""
        # Get team IDs for this coach
        team_stmt = (
            select(TeamMember.team_id)
            .where(TeamMember.user_id == user_id, TeamMember.role_in_team == "coach", TeamMember.is_active == True)
        )
        team_result = await self.session.execute(team_stmt)
        team_ids = [r[0] for r in team_result.all()]

        if not team_ids:
            return []

        stmt = (
            select(ReportRequest)
            .where(
                ReportRequest.status == "pending",
                or_(
                    ReportRequest.coach_id == coach_id,  # targeted to this coach
                    (ReportRequest.coach_id.is_(None)) & (ReportRequest.team_id.in_(team_ids)),  # all coaches in team
                ),
            )
            .order_by(ReportRequest.due_date.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_pending_for_admin(self, admin_id: int) -> Sequence[ReportRequest]:
        """All pending requests for admin's teams."""
        stmt = (
            select(ReportRequest)
            .where(ReportRequest.admin_id == admin_id, ReportRequest.status == "pending")
            .order_by(ReportRequest.due_date.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
