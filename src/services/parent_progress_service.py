"""HOOPS AI - Parent Progress Service (child progress data + AI report generation)"""
import asyncio
import json
from datetime import date, datetime, timedelta
from sqlalchemy import select, func, case, Integer, extract
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.player import Player
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.coach import Coach
from src.models.attendance import Attendance
from src.models.event import Event
from src.models.drill_assignment import DrillAssignment
from src.models.drill import Drill
from src.models.game_report import GameReport
from src.models.player_evaluation import PlayerEvaluation
from src.models.player_report import PlayerReport
from src.models.parent_progress_report import ParentProgressReport
from src.utils.openai_client import chat_completion
from src.utils.exceptions import NotFoundError, ValidationError


class ParentProgressService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ── Main aggregation ─────────────────────────────────────

    async def get_progress_data(self, player_id: int, team_ids: list[int]) -> dict:
        """Aggregate all progress data for the parent view."""
        (
            player_info,
            attendance,
            drills,
            proud_moments,
            monthly_attendance,
            monthly_drills,
            evaluation,
        ) = await asyncio.gather(
            self._get_player_info(player_id),
            self._get_attendance_overview(player_id),
            self._get_drill_assignments(player_id),
            self._get_proud_moments(player_id, team_ids),
            self._get_monthly_attendance(player_id),
            self._get_monthly_drills(player_id),
            self._get_latest_evaluation(player_id),
        )
        return {
            "player": player_info,
            "attendance": attendance,
            "drills": drills,
            "proud_moments": proud_moments,
            "charts": {
                "monthly_attendance": monthly_attendance,
                "monthly_drills": monthly_drills,
            },
            "latest_evaluation": evaluation,
        }

    # ── Player info ──────────────────────────────────────────

    async def _get_player_info(self, player_id: int) -> dict | None:
        player = await self.session.get(Player, player_id)
        if not player:
            return None
        stmt = (
            select(Team.name)
            .join(TeamMember, TeamMember.team_id == Team.id)
            .where(TeamMember.player_id == player_id, TeamMember.is_active == True)
            .limit(1)
        )
        result = await self.session.execute(stmt)
        team_row = result.first()
        return {
            "name": player.name,
            "jersey_number": player.jersey_number,
            "position": player.position,
            "team_name": team_row[0] if team_row else None,
            "current_streak": player.current_attendance_streak,
            "highest_streak": player.highest_attendance_streak,
        }

    # ── Attendance overview ──────────────────────────────────

    async def _get_attendance_overview(self, player_id: int) -> dict:
        stmt = select(
            func.count(Attendance.id).label("total"),
            func.sum(func.cast(Attendance.present, Integer)).label("attended"),
        ).where(Attendance.player_id == player_id)
        result = await self.session.execute(stmt)
        row = result.first()
        total = row.total or 0
        attended = int(row.attended or 0)
        return {
            "total_events": total,
            "attended": attended,
            "percentage": round(attended / total * 100) if total > 0 else 0,
        }

    # ── Drill assignments ────────────────────────────────────

    async def _get_drill_assignments(self, player_id: int) -> dict:
        stmt = (
            select(DrillAssignment, Drill.title, Drill.category)
            .join(Drill, DrillAssignment.drill_id == Drill.id)
            .where(DrillAssignment.player_id == player_id)
            .order_by(DrillAssignment.created_at.desc())
            .limit(20)
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        assignments = []
        for da, title, category in rows:
            assignments.append({
                "id": da.id,
                "drill_name": title,
                "category": category,
                "status": da.status or ("approved" if da.is_completed else "pending"),
                "coach_feedback": da.coach_feedback,
                "assigned_at": str(da.created_at),
            })

        total = len(assignments)
        completed = sum(1 for a in assignments if a["status"] == "approved")
        in_progress = sum(1 for a in assignments if a["status"] in ("pending", "video_uploaded"))

        return {
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "completion_rate": round(completed / total * 100) if total > 0 else 0,
            "list": assignments[:15],
        }

    # ── Proud moments (game standout mentions) ───────────────

    async def _get_proud_moments(self, player_id: int, team_ids: list[int]) -> list[dict]:
        player = await self.session.get(Player, player_id)
        if not player or not team_ids:
            return []

        coach_ids = await self._get_coach_ids_for_teams(team_ids)
        if not coach_ids:
            return []

        stmt = (
            select(GameReport)
            .where(GameReport.coach_id.in_(coach_ids))
            .order_by(GameReport.date.desc())
            .limit(50)
        )
        result = await self.session.execute(stmt)
        reports = result.scalars().all()

        moments = []
        for g in reports:
            standouts = g.standout_players if isinstance(g.standout_players, list) else []
            if player.name in standouts:
                moments.append({
                    "date": str(g.date),
                    "opponent": g.opponent,
                    "result": g.result,
                    "score": f"{g.score_us}-{g.score_them}" if g.score_us is not None else None,
                })
        return moments[:10]

    async def _get_coach_ids_for_teams(self, team_ids: list[int]) -> list[int]:
        """Get Coach.id values for coaches on the given teams."""
        stmt = select(TeamMember.user_id).where(
            TeamMember.team_id.in_(team_ids),
            TeamMember.role_in_team == "coach",
            TeamMember.is_active == True,
        )
        result = await self.session.execute(stmt)
        coach_user_ids = [row[0] for row in result.all()]
        if not coach_user_ids:
            return []

        stmt2 = select(Coach.id).where(Coach.user_id.in_(coach_user_ids))
        result2 = await self.session.execute(stmt2)
        return [row[0] for row in result2.all()]

    # ── Monthly attendance (for charts) ──────────────────────

    async def _get_monthly_attendance(self, player_id: int) -> list[dict]:
        yr = extract("year", Event.date).label("year")
        mo = extract("month", Event.date).label("month")
        stmt = (
            select(
                yr,
                mo,
                func.count(Attendance.id).label("total"),
                func.sum(func.cast(Attendance.present, Integer)).label("attended"),
            )
            .join(Event, Attendance.event_id == Event.id)
            .where(Attendance.player_id == player_id)
            .group_by(yr, mo)
            .order_by(yr, mo)
        )
        result = await self.session.execute(stmt)
        return [
            {
                "year": int(r.year),
                "month": int(r.month),
                "total": r.total,
                "attended": int(r.attended or 0),
            }
            for r in result.all()
        ]

    # ── Monthly drills (for charts) ──────────────────────────

    async def _get_monthly_drills(self, player_id: int) -> list[dict]:
        yr = extract("year", DrillAssignment.created_at).label("year")
        mo = extract("month", DrillAssignment.created_at).label("month")
        stmt = (
            select(
                yr,
                mo,
                func.count(DrillAssignment.id).label("total"),
                func.sum(
                    case((DrillAssignment.status == "approved", 1), else_=0)
                ).label("completed"),
            )
            .where(DrillAssignment.player_id == player_id)
            .group_by(yr, mo)
            .order_by(yr, mo)
        )
        result = await self.session.execute(stmt)
        return [
            {
                "year": int(r.year),
                "month": int(r.month),
                "total": r.total,
                "completed": int(r.completed or 0),
            }
            for r in result.all()
        ]

    # ── Latest evaluation ────────────────────────────────────

    async def _get_latest_evaluation(self, player_id: int) -> dict | None:
        stmt = (
            select(PlayerEvaluation)
            .where(PlayerEvaluation.player_id == player_id)
            .order_by(PlayerEvaluation.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        ev = result.scalar_one_or_none()
        if not ev:
            return None
        return {
            "period_label": ev.period_label,
            "offensive": ev.offensive_rating,
            "defensive": ev.defensive_rating,
            "iq": ev.iq_rating,
            "fitness": ev.fitness_rating,
            "work_ethic": ev.work_ethic_rating,
            "leadership": ev.leadership_rating,
            "improvement": ev.improvement_rating,
            "created_at": str(ev.created_at),
        }

    # ── Player reports (for AI prompt) ───────────────────────

    async def _get_player_reports(self, player_id: int) -> list[dict]:
        stmt = (
            select(PlayerReport)
            .where(PlayerReport.player_id == player_id)
            .order_by(PlayerReport.created_at.desc())
            .limit(5)
        )
        result = await self.session.execute(stmt)
        reports = result.scalars().all()
        return [
            {
                "period": r.period,
                "strengths": r.strengths if isinstance(r.strengths, list) else [],
                "weaknesses": r.weaknesses if isinstance(r.weaknesses, list) else [],
                "progress_notes": r.progress_notes,
            }
            for r in reports
        ]

    # ── AI Reports ───────────────────────────────────────────

    async def get_ai_reports(self, player_id: int) -> list[dict]:
        """Return stored AI progress reports for the child."""
        stmt = (
            select(ParentProgressReport)
            .where(ParentProgressReport.player_id == player_id)
            .order_by(ParentProgressReport.created_at.desc())
        )
        result = await self.session.execute(stmt)
        reports = result.scalars().all()
        return [
            {
                "id": r.id,
                "season": r.season,
                "content": r.content,
                "created_at": str(r.created_at),
            }
            for r in reports
        ]

    async def get_report_limits(self, player_id: int, parent_user_id: int) -> dict:
        """Check remaining AI reports + cooldown status."""
        season = self._get_current_season()
        two_months_ago = datetime.utcnow() - timedelta(days=60)

        # Recent count (last 2 months)
        stmt1 = select(func.count(ParentProgressReport.id)).where(
            ParentProgressReport.player_id == player_id,
            ParentProgressReport.parent_user_id == parent_user_id,
            ParentProgressReport.created_at >= two_months_ago,
        )
        recent = (await self.session.execute(stmt1)).scalar() or 0

        # Season count
        stmt2 = select(func.count(ParentProgressReport.id)).where(
            ParentProgressReport.player_id == player_id,
            ParentProgressReport.parent_user_id == parent_user_id,
            ParentProgressReport.season == season,
        )
        season_count = (await self.session.execute(stmt2)).scalar() or 0

        # Last generated date
        stmt3 = (
            select(ParentProgressReport.created_at)
            .where(
                ParentProgressReport.player_id == player_id,
                ParentProgressReport.parent_user_id == parent_user_id,
            )
            .order_by(ParentProgressReport.created_at.desc())
            .limit(1)
        )
        last = (await self.session.execute(stmt3)).scalar_one_or_none()

        can_generate = recent < 1 and season_count < 5

        # Calculate next available date
        next_available = None
        if not can_generate and last and recent >= 1:
            next_available = str(last + timedelta(days=60))

        return {
            "can_generate": can_generate,
            "season_remaining": max(0, 5 - season_count),
            "season_used": season_count,
            "last_generated": str(last) if last else None,
            "next_available": next_available,
        }

    async def generate_ai_report(
        self, player_id: int, parent_user_id: int, team_ids: list[int]
    ) -> dict:
        """Generate AI progress report (rate-limited: 1/2mo, 5/season)."""
        season = self._get_current_season()
        two_months_ago = datetime.utcnow() - timedelta(days=60)

        # Check: max 1 per 2 months
        stmt = select(func.count(ParentProgressReport.id)).where(
            ParentProgressReport.player_id == player_id,
            ParentProgressReport.parent_user_id == parent_user_id,
            ParentProgressReport.created_at >= two_months_ago,
        )
        recent_count = (await self.session.execute(stmt)).scalar() or 0
        if recent_count >= 1:
            raise ValidationError("ניתן ליצור דוח התקדמות אחד כל חודשיים")

        # Check: max 5 per season
        stmt2 = select(func.count(ParentProgressReport.id)).where(
            ParentProgressReport.player_id == player_id,
            ParentProgressReport.parent_user_id == parent_user_id,
            ParentProgressReport.season == season,
        )
        season_count = (await self.session.execute(stmt2)).scalar() or 0
        if season_count >= 5:
            raise ValidationError("הגעת למגבלת 5 דוחות לעונה")

        # Gather data for AI prompt
        progress_data = await self.get_progress_data(player_id, team_ids)
        player_info = progress_data["player"]
        if not player_info:
            raise NotFoundError("Player")

        att = progress_data["attendance"]
        drills = progress_data["drills"]
        moments = progress_data["proud_moments"]
        eval_data = progress_data["latest_evaluation"]
        reports = await self._get_player_reports(player_id)

        # Build prompt
        moments_text = "\n".join(
            f"- נגד {m['opponent']} ({m['date']}) — {m['result']} {m.get('score', '')}"
            for m in moments[:5]
        ) if moments else "אין עדיין"

        eval_text = (
            f"התקפה: {eval_data['offensive']}/10, הגנה: {eval_data['defensive']}/10, "
            f"IQ: {eval_data['iq']}/10, כושר: {eval_data['fitness']}/10, "
            f"מנהיגות: {eval_data['leadership']}/10"
            if eval_data else "אין הערכה עדיין"
        )

        reports_text = "\n".join(
            f"- תקופה {r['period']}: חוזקות: {', '.join(r.get('strengths', []))}"
            for r in reports[:3]
        ) if reports else "אין דוחות עדיין"

        prompt = f"""אתה מנתח ספורט מקצועי. כתוב דוח התקדמות להורה על הילד שלו בכדורסל.

כללים קריטיים:
1. הטון חייב להיות חיובי, חם ומעודד בכל עת.
2. הצג הכל בצורה בונה — גם תחומים לשיפור צריכים להיות "אתגרים מרגשים" או "הצעד הבא".
3. לעולם אל תשתמש בשפה שלילית כמו "חלש", "גרוע", "נכשל".
4. שמור על קיצור — 3-4 פסקאות קצרות מקסימום.
5. פנה להורה בחום (למשל "הילד שלכם...", "{player_info['name']} מראה...")
6. אל תציג מספרים גולמיים — ההורה רואה אותם בנפרד בעמוד.
7. התמקד בנרטיב ובהערכה איכותית.
8. סיים באמירה מעודדת שמביטה לעתיד.
9. אל תמציא נתונים. התבסס רק על המידע שניתן.

=== פרטי השחקן ===
שם: {player_info['name']}
מספר: {player_info.get('jersey_number') or '-'}
עמדה: {player_info.get('position') or '-'}
קבוצה: {player_info.get('team_name') or '-'}

=== נוכחות ===
אירועים: {att['attended']}/{att['total_events']} ({att['percentage']}%)
רצף נוכחי: {player_info.get('current_streak', 0)} אימונים
רצף שיא: {player_info.get('highest_streak', 0)} אימונים

=== תרגילים ===
סה"כ: {drills['total']} | הושלמו: {drills['completed']} | בתהליך: {drills['in_progress']}
אחוז השלמה: {drills['completion_rate']}%

=== רגעי גאווה (הופעות בולטות במשחקים) ===
{moments_text}

=== הערכת מאמן אחרונה ===
{eval_text}

=== דוחות מאמן ===
{reports_text}

כתוב דוח של 200-350 מילים בעברית."""

        content = await chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.7,
        )

        # Save to DB
        report = ParentProgressReport(
            player_id=player_id,
            parent_user_id=parent_user_id,
            season=season,
            content=content,
        )
        self.session.add(report)
        await self.session.flush()
        await self.session.refresh(report)

        return {
            "id": report.id,
            "season": report.season,
            "content": report.content,
            "created_at": str(report.created_at),
        }

    # ── Helpers ──────────────────────────────────────────────

    @staticmethod
    def _get_current_season() -> str:
        today = date.today()
        start_year = today.year if today.month >= 9 else today.year - 1
        return f"{start_year}-{start_year + 1}"
