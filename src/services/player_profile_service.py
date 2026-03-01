"""HOOPS AI - Player Profile Service (aggregates data for profile card)"""
import asyncio
from datetime import date
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.drill_assignment import DrillAssignment
from src.models.drill import Drill
from src.repositories.attendance_repository import AttendanceRepository
from src.repositories.player_report_repository import PlayerReportRepository
from src.repositories.game_report_repository import GameReportRepository
from src.repositories.player_repository import PlayerRepository
from src.repositories.player_evaluation_repository import PlayerEvaluationRepository


class PlayerProfileService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_profile(self, player_id: int, coach_id: int) -> dict:
        """Build comprehensive player profile data from 5 sources."""
        player_repo = PlayerRepository(self.session)
        player = await player_repo.get_by_id(player_id)
        if not player or player.coach_id != coach_id:
            return None

        # Parallel fetch all data sources
        att_repo = AttendanceRepository(self.session)
        report_repo = PlayerReportRepository(self.session)
        game_repo = GameReportRepository(self.session)
        eval_repo = PlayerEvaluationRepository(self.session)

        all_stats, reports, games, drill_assignments, evaluations = await asyncio.gather(
            att_repo.get_player_stats(coach_id),
            report_repo.get_by_player(coach_id, player_id),
            game_repo.get_by_coach(coach_id),
            self._get_drill_assignments(player_id),
            eval_repo.get_by_player(coach_id, player_id),
        )

        # Extract this player's attendance
        player_att = next((s for s in all_stats if s["player_id"] == player_id), None)
        raw_att = player_att or {"total": 0, "attended": 0, "percentage": 0}
        attendance = {
            "total_events": raw_att.get("total", 0),
            "attended": raw_att.get("attended", 0),
            "percentage": raw_att.get("percentage", 0),
        }

        # Reports as list (with strengths/weaknesses)
        reports_list = []
        for r in reports[:5]:
            reports_list.append({
                "id": r.id, "period": r.period,
                "strengths": r.strengths if isinstance(r.strengths, list) else [],
                "weaknesses": r.weaknesses if isinstance(r.weaknesses, list) else [],
                "focus_areas": r.focus_areas if isinstance(r.focus_areas, list) else [],
                "is_ai_generated": r.is_ai_generated,
                "created_at": str(r.created_at),
            })

        # Evaluations as list (most recent first)
        evaluations_list = []
        for ev in evaluations[:3]:
            evaluations_list.append({
                "id": ev.id,
                "period_label": ev.period_label,
                "period_type": ev.period_type,
                "offensive_rating": ev.offensive_rating,
                "defensive_rating": ev.defensive_rating,
                "iq_rating": ev.iq_rating,
                "social_rating": ev.social_rating,
                "leadership_rating": ev.leadership_rating,
                "work_ethic_rating": ev.work_ethic_rating,
                "fitness_rating": ev.fitness_rating,
                "improvement_rating": ev.improvement_rating,
                "leaving_risk": ev.leaving_risk,
                "created_at": str(ev.created_at),
            })

        # Game highlights (name-based matching)
        highlights = []
        for g in games:
            standouts = g.standout_players if isinstance(g.standout_players, list) else []
            if player.name in standouts:
                highlights.append({
                    "date": str(g.date), "opponent": g.opponent,
                    "result": g.result, "score_us": g.score_us, "score_them": g.score_them,
                })
        highlights = highlights[:10]

        # Compute age
        age = None
        if player.birth_date:
            today = date.today()
            age = today.year - player.birth_date.year
            if (today.month, today.day) < (player.birth_date.month, player.birth_date.day):
                age -= 1

        # Also keep team name if available
        from src.models.team_member import TeamMember
        from src.models.team import Team
        team_stmt = (
            select(Team.name)
            .join(TeamMember, TeamMember.team_id == Team.id)
            .where(TeamMember.player_id == player_id, TeamMember.is_active == True)
            .limit(1)
        )
        team_result = await self.session.execute(team_stmt)
        team_row = team_result.first()
        team_name = team_row[0] if team_row else None

        return {
            "player": {
                "id": player.id, "name": player.name,
                "jersey_number": player.jersey_number, "position": player.position,
                "birth_date": str(player.birth_date) if player.birth_date else None,
                "age": age,
                "height": player.height, "weight": player.weight, "gender": player.gender,
                "phone": player.phone, "email": player.email,
                "parent_phone": player.parent_phone, "parent_email": player.parent_email,
                "notes": player.notes,
                "team_name": team_name,
                "created_at": str(player.created_at),
            },
            "attendance": attendance,
            "drill_assignments": drill_assignments,
            "reports": reports_list,
            "evaluations": evaluations_list,
            "game_highlights": highlights,
            # Keep legacy fields for other callers
            "drills": {"assigned": len(drill_assignments), "completed": sum(1 for d in drill_assignments if d["status"] == "approved")},
            "latest_report": reports_list[0] if reports_list else None,
        }

    async def _get_drill_assignments(self, player_id: int) -> list:
        """Return list of drill assignments with drill name and status."""
        stmt = (
            select(DrillAssignment, Drill.title)
            .join(Drill, DrillAssignment.drill_id == Drill.id)
            .where(DrillAssignment.player_id == player_id)
            .order_by(DrillAssignment.created_at.desc())
            .limit(20)
        )
        result = await self.session.execute(stmt)
        rows = result.all()
        return [
            {
                "id": da.id,
                "drill_name": title,
                "status": da.status or ("approved" if da.is_completed else "pending"),
                "video_url": da.video_url,
                "coach_feedback": da.coach_feedback,
                "assigned_at": str(da.created_at),
            }
            for da, title in rows
        ]
