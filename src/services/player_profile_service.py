"""HOOPS AI - Player Profile Service (aggregates data for profile card)"""
import asyncio
from datetime import date
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.drill_assignment import DrillAssignment
from src.repositories.attendance_repository import AttendanceRepository
from src.repositories.player_report_repository import PlayerReportRepository
from src.repositories.game_report_repository import GameReportRepository
from src.repositories.player_repository import PlayerRepository


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

        all_stats, reports, games, drill_stats = await asyncio.gather(
            att_repo.get_player_stats(coach_id),
            report_repo.get_by_player(coach_id, player_id),
            game_repo.get_by_coach(coach_id),
            self._get_drill_stats(player_id),
        )

        # Extract this player's attendance
        player_att = next((s for s in all_stats if s["player_id"] == player_id), None)
        attendance = player_att or {"total": 0, "attended": 0, "percentage": 0}

        # Latest report
        latest_report = None
        if reports:
            r = reports[0]
            latest_report = {
                "id": r.id, "period": r.period,
                "strengths": r.strengths if isinstance(r.strengths, list) else [],
                "weaknesses": r.weaknesses if isinstance(r.weaknesses, list) else [],
                "focus_areas": r.focus_areas if isinstance(r.focus_areas, list) else [],
                "progress_notes": r.progress_notes,
                "recommendations": r.recommendations,
                "is_ai_generated": r.is_ai_generated,
                "created_at": str(r.created_at),
            }

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
                "created_at": str(player.created_at),
            },
            "attendance": attendance,
            "drills": drill_stats,
            "latest_report": latest_report,
            "game_highlights": highlights,
        }

    async def _get_drill_stats(self, player_id: int) -> dict:
        stmt = select(
            func.count(DrillAssignment.id).label("total"),
            func.sum(case((DrillAssignment.is_completed == True, 1), else_=0)).label("completed"),
            func.max(DrillAssignment.completed_at).label("last_completed"),
        ).where(DrillAssignment.player_id == player_id)
        result = await self.session.execute(stmt)
        row = result.one()
        total = row.total or 0
        completed = int(row.completed or 0)
        return {
            "assigned": total, "completed": completed,
            "percentage": round(completed / total * 100) if total > 0 else 0,
            "last_completed": str(row.last_completed) if row.last_completed else None,
        }
