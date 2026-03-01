"""HOOPS AI - Evaluation Service (structured player evaluations + report requests)"""
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.player_evaluation_repository import PlayerEvaluationRepository
from src.repositories.report_request_repository import ReportRequestRepository
from src.repositories.player_repository import PlayerRepository
from src.utils.exceptions import ValidationError


RATING_FIELDS = [
    "offensive_rating", "defensive_rating", "iq_rating", "social_rating",
    "leaving_risk", "leadership_rating", "work_ethic_rating",
    "fitness_rating", "improvement_rating",
    "personal_improvement_rating", "team_contribution_rating",
]


class EvaluationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.evaluations = PlayerEvaluationRepository(session)
        self.requests = ReportRequestRepository(session)
        self.players = PlayerRepository(session)

    # --- Period label helpers ---
    @staticmethod
    def calculate_period_label(period_type: str, ref_date: date | None = None) -> str:
        d = ref_date or date.today()
        if period_type == "weekly":
            return f"{d.year}-W{d.isocalendar()[1]:02d}"
        elif period_type == "monthly":
            return f"{d.year}-{d.month:02d}"
        elif period_type == "semi_annual":
            half = "H1" if d.month <= 6 else "H2"
            return f"{d.year}-{half}"
        elif period_type == "annual":
            start_year = d.year if d.month >= 8 else d.year - 1
            return f"{start_year}-{start_year + 1}"
        return f"{d.year}"

    # --- Evaluations ---
    async def create_evaluation(self, coach_id: int, **kwargs):
        # Validate ratings are 1-10
        for field in RATING_FIELDS:
            val = kwargs.get(field)
            if val is not None:
                try:
                    val = int(val)
                except (ValueError, TypeError):
                    raise ValidationError(f"{field} must be a number between 1 and 10")
                if val < 1 or val > 10:
                    raise ValidationError(f"{field} must be between 1 and 10")
                kwargs[field] = val

        # Auto-calculate period_label if not provided
        if not kwargs.get("period_label"):
            kwargs["period_label"] = self.calculate_period_label(kwargs["period_type"])

        evaluation = await self.evaluations.create(coach_id=coach_id, **kwargs)

        # Check if linked to a report request
        if kwargs.get("report_request_id"):
            await self._check_request_completion(kwargs["report_request_id"])

        # Notify parent
        await self._notify_parent_progress(coach_id, kwargs.get("player_id"))

        return evaluation

    async def update_evaluation(self, evaluation_id: int, coach_id: int, **kwargs):
        ev = await self.evaluations.get_by_id(evaluation_id)
        if not ev or ev.coach_id != coach_id:
            return None
        for field in RATING_FIELDS:
            val = kwargs.get(field)
            if val is not None:
                try:
                    val = int(val)
                except (ValueError, TypeError):
                    raise ValidationError(f"{field} must be a number between 1 and 10")
                if val < 1 or val > 10:
                    raise ValidationError(f"{field} must be between 1 and 10")
                kwargs[field] = val
        return await self.evaluations.update(evaluation_id, **kwargs)

    async def get_evaluations(self, coach_id: int, player_id: int | None = None):
        if player_id:
            return await self.evaluations.get_by_player(coach_id, player_id)
        return await self.evaluations.get_by_coach_id(coach_id)

    async def get_evaluation_by_id(self, evaluation_id: int):
        return await self.evaluations.get_by_id(evaluation_id)

    async def delete_evaluation(self, evaluation_id: int, coach_id: int):
        ev = await self.evaluations.get_by_id(evaluation_id)
        if not ev or ev.coach_id != coach_id:
            return False
        return await self.evaluations.delete(evaluation_id)

    async def get_evaluations_for_admin(self, admin_id: int, player_id: int | None = None, team_id: int | None = None):
        """Get evaluations across admin's teams."""
        from src.models.team import Team
        from src.models.team_member import TeamMember
        from src.models.player_evaluation import PlayerEvaluation
        from src.models.coach import Coach
        from sqlalchemy import select

        # Get admin's team IDs
        stmt = select(Team.id).where(Team.created_by_admin_id == admin_id)
        result = await self.session.execute(stmt)
        admin_team_ids = [r[0] for r in result.all()]
        if not admin_team_ids:
            return []

        if team_id and team_id not in admin_team_ids:
            return []

        target_team_ids = [team_id] if team_id else admin_team_ids

        # Get coach IDs in those teams
        stmt = (
            select(Coach.id)
            .join(TeamMember, (TeamMember.user_id == Coach.user_id) & (TeamMember.role_in_team == "coach"))
            .where(TeamMember.team_id.in_(target_team_ids), TeamMember.is_active == True)
        )
        result = await self.session.execute(stmt)
        coach_ids = [r[0] for r in result.all()]
        if not coach_ids:
            return []

        stmt = (
            select(PlayerEvaluation)
            .where(PlayerEvaluation.coach_id.in_(coach_ids))
        )
        if player_id:
            stmt = stmt.where(PlayerEvaluation.player_id == player_id)
        stmt = stmt.order_by(PlayerEvaluation.created_at.desc()).limit(200)

        result = await self.session.execute(stmt)
        return result.scalars().all()

    # --- Report Requests ---
    async def create_request(self, admin_id: int, **kwargs):
        return await self.requests.create(admin_id=admin_id, **kwargs)

    async def get_requests_for_admin(self, admin_id: int):
        return await self.requests.get_by_admin(admin_id)

    async def get_pending_requests_for_coach(self, coach_id: int, user_id: int):
        return await self.requests.get_pending_for_coach(coach_id, user_id)

    async def cancel_request(self, admin_id: int, request_id: int):
        req = await self.requests.get_by_id(request_id)
        if not req or req.admin_id != admin_id:
            return False
        return await self.requests.delete(request_id)

    async def _check_request_completion(self, request_id: int):
        """Mark request as completed if all players in team have been evaluated."""
        req = await self.requests.get_by_id(request_id)
        if not req or req.status != "pending":
            return
        # Simple heuristic: mark completed after first evaluation linked
        # A more rigorous check could count players vs evaluations
        evals = await self.evaluations.get_by_request(request_id)
        if evals:
            await self.requests.update(request_id, status="completed")

    async def _notify_parent_progress(self, coach_id: int, player_id: int | None):
        """Auto-send progress_update message to parent(s)."""
        if not player_id:
            return
        try:
            from src.services.messaging_service import MessagingService
            from src.repositories.coach_repository import CoachRepository
            from src.models.team_member import TeamMember
            from sqlalchemy import select

            stmt = select(TeamMember).where(
                TeamMember.player_id == player_id,
                TeamMember.role_in_team == "parent",
                TeamMember.is_active == True,
            )
            result = await self.session.execute(stmt)
            parent_members = result.scalars().all()
            if not parent_members:
                return

            coach = await CoachRepository(self.session).get_by_id(coach_id)
            sender_user_id = getattr(coach, "user_id", None) if coach else None
            if not sender_user_id:
                return

            player = await self.players.get_by_id(player_id)
            player_name = player.name if player else "your child"

            msg_service = MessagingService(self.session)
            for pm in parent_members:
                if pm.user_id:
                    await msg_service.send_message(
                        sender_id=sender_user_id,
                        sender_role="coach",
                        subject=f"\u05e2\u05d3\u05db\u05d5\u05df \u05d4\u05ea\u05e7\u05d3\u05de\u05d5\u05ea: {player_name}",
                        body=f"\u05d4\u05e2\u05e8\u05db\u05d4 \u05d7\u05d3\u05e9\u05d4 \u05e0\u05db\u05ea\u05d1\u05d4 \u05e2\u05d1\u05d5\u05e8 {player_name}.\n\n\u05dc\u05e6\u05e4\u05d9\u05d9\u05d4 \u05d1\u05d3\u05d5\u05d7 \u05d4\u05de\u05dc\u05d0 \u2014 \u05d4\u05d9\u05db\u05e0\u05e1\u05d5 \u05dc\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4.",
                        message_type="progress_update",
                        target_type="individual",
                        target_user_id=pm.user_id,
                    )
        except Exception:
            pass  # Don't fail evaluation creation if messaging fails
