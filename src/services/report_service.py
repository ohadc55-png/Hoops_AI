"""HOOPS AI - Report Service"""
import json
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.attendance_repository import AttendanceRepository
from src.repositories.game_report_repository import GameReportRepository
from src.repositories.player_report_repository import PlayerReportRepository
from src.repositories.player_repository import PlayerRepository
from src.utils.openai_client import chat_completion_json


class ReportService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.attendance = AttendanceRepository(session)
        self.game_reports = GameReportRepository(session)
        self.player_reports = PlayerReportRepository(session)
        self.players = PlayerRepository(session)

    # --- Attendance ---
    async def get_attendance_for_event(self, coach_id: int, event_id: int):
        return await self.attendance.get_by_event(coach_id, event_id)

    async def save_attendance(self, coach_id: int, event_id: int, records: list[dict]):
        await self.attendance.upsert_batch(coach_id, event_id, records)

        # Recalculate attendance streaks for affected players
        player_ids = [r["player_id"] for r in records]
        streaks = await self.attendance.recalculate_streaks(player_ids)
        for pid, (current, highest) in streaks.items():
            player = await self.players.get_by_id(pid)
            if player:
                player.current_attendance_streak = current
                player.highest_attendance_streak = highest
        await self.session.flush()

    async def get_attendance_stats(self, coach_id: int):
        return await self.attendance.get_player_stats(coach_id)

    # --- Game Reports ---
    async def get_game_reports(self, coach_id: int):
        return await self.game_reports.get_by_coach(coach_id)

    async def get_pending_game_events(self, coach_id: int) -> list[dict]:
        """Return past game/tournament TeamEvents without a filed game report."""
        from src.models.team_member import TeamMember
        from src.models.team_event import TeamEvent
        from src.repositories.coach_repository import CoachRepository
        from sqlalchemy import select
        from datetime import date as dt_date, datetime

        coach = await CoachRepository(self.session).get_by_id(coach_id)
        if not coach or not coach.user_id:
            return []

        # Get team IDs for this coach
        stmt = select(TeamMember.team_id).where(
            TeamMember.user_id == coach.user_id,
            TeamMember.role_in_team == "coach",
            TeamMember.is_active == True,
        )
        result = await self.session.execute(stmt)
        team_ids = [row[0] for row in result.fetchall()]
        if not team_ids:
            return []

        # Get past game/tournament events
        today = dt_date.today()
        stmt = (
            select(TeamEvent)
            .where(
                TeamEvent.team_id.in_(team_ids),
                TeamEvent.event_type.in_(["game", "tournament"]),
                TeamEvent.date <= today,
                TeamEvent.is_active == True,
            )
            .order_by(TeamEvent.date.desc())
            .limit(50)
        )
        result = await self.session.execute(stmt)
        events = result.scalars().all()

        # Filter: only events whose date+time has fully passed
        now = datetime.now()
        past_events = []
        for e in events:
            if e.date < today:
                past_events.append(e)
            elif e.date == today and e.time_end:
                try:
                    h, m = map(int, e.time_end.split(":"))
                    if now.hour > h or (now.hour == h and now.minute >= m):
                        past_events.append(e)
                except ValueError:
                    pass

        # Exclude events that already have reports
        reported_ids = await self.game_reports.get_reported_team_event_ids(coach_id)

        pending = []
        for e in past_events:
            if e.id not in reported_ids:
                pending.append({
                    "id": e.id,
                    "team_id": e.team_id,
                    "title": e.title,
                    "event_type": e.event_type,
                    "date": str(e.date),
                    "time_start": e.time_start,
                    "time_end": e.time_end,
                    "location": e.location,
                    "opponent": e.opponent,
                })
        return pending

    async def create_game_report(self, coach_id: int, **kwargs):
        # Serialize list fields
        for key in ("standout_players", "areas_to_improve"):
            if key in kwargs and isinstance(kwargs[key], list):
                kwargs[key] = json.dumps(kwargs[key])
        return await self.game_reports.create(coach_id=coach_id, **kwargs)

    async def update_game_report(self, report_id: int, **kwargs):
        for key in ("standout_players", "areas_to_improve"):
            if key in kwargs and isinstance(kwargs[key], list):
                kwargs[key] = json.dumps(kwargs[key])
        return await self.game_reports.update(report_id, **kwargs)

    async def delete_game_report(self, report_id: int):
        return await self.game_reports.delete(report_id)

    # --- Player Reports ---
    async def get_player_reports(self, coach_id: int, player_id: int | None = None):
        if player_id:
            return await self.player_reports.get_by_player(coach_id, player_id)
        return await self.player_reports.get_by_coach_id(coach_id)

    async def create_player_report(self, coach_id: int, **kwargs):
        for key in ("strengths", "weaknesses", "focus_areas"):
            if key in kwargs and isinstance(kwargs[key], list):
                kwargs[key] = json.dumps(kwargs[key])
        report = await self.player_reports.create(coach_id=coach_id, **kwargs)
        await self._notify_parent_progress(coach_id, kwargs.get("player_id"))
        return report

    async def delete_player_report(self, report_id: int):
        return await self.player_reports.delete(report_id)

    async def ai_generate_player_report(self, coach_id: int, player_id: int, period: str):
        """Generate a player report using AI based on attendance and game data."""
        player = await self.players.get_by_id(player_id)
        if not player:
            raise ValueError("Player not found")

        # Gather attendance stats
        stats = await self.attendance.get_player_stats(coach_id)
        player_stat = next((s for s in stats if s["player_id"] == player_id), None)
        att_info = f"Attendance: {player_stat['attended']}/{player_stat['total']} ({player_stat['percentage']}%)" if player_stat else "No attendance data"

        # Gather game reports mentioning this player (support both ID and name matching)
        games = await self.game_reports.get_by_coach(coach_id)
        mentions = []
        for g in games:
            standouts = g.standout_players if isinstance(g.standout_players, list) else []
            is_standout = (player_id in standouts) or (player.name in standouts)
            if is_standout:
                mentions.append(f"Standout in {g.opponent} game ({g.date}, {g.result} {g.score_us}-{g.score_them})")

        prompt = f"""Generate a semi-annual basketball player assessment report as JSON:
{{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "focus_areas": ["focus 1", "focus 2", "focus 3"],
  "progress_notes": "paragraph about the player's progress",
  "recommendations": "paragraph with specific recommendations"
}}

Player: {player.name} (#{player.jersey_number or 'N/A'}, {player.position or 'N/A'})
Period: {period}
{att_info}
Game mentions: {'; '.join(mentions) if mentions else 'None'}
Coach notes: {player.notes or 'None'}

Write a professional, constructive assessment for a youth basketball player. Be specific and encouraging."""

        response = await chat_completion_json([{"role": "user", "content": prompt}])
        text = response.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines).strip()
        data = json.loads(text)

        # Serialize lists
        for key in ("strengths", "weaknesses", "focus_areas"):
            if key in data and isinstance(data[key], list):
                data[key] = json.dumps(data[key])

        report = await self.player_reports.create(
            coach_id=coach_id,
            player_id=player_id,
            period=period,
            strengths=data.get("strengths"),
            weaknesses=data.get("weaknesses"),
            focus_areas=data.get("focus_areas"),
            progress_notes=data.get("progress_notes", ""),
            recommendations=data.get("recommendations", ""),
            is_ai_generated=True,
        )
        await self._notify_parent_progress(coach_id, player_id)
        return report

    async def _notify_parent_progress(self, coach_id: int, player_id: int | None):
        """Auto-send progress_update message to parent(s) linked to this player."""
        if not player_id:
            return
        try:
            from src.services.messaging_service import MessagingService
            from src.repositories.coach_repository import CoachRepository
            from src.models.team_member import TeamMember
            from sqlalchemy import select

            # Find parent(s) linked to this player
            stmt = select(TeamMember).where(
                TeamMember.player_id == player_id,
                TeamMember.role_in_team == "parent",
                TeamMember.is_active == True,
            )
            result = await self.session.execute(stmt)
            parent_members = result.scalars().all()
            if not parent_members:
                return

            # Find coach's user_id
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
                        body=f"\u05d3\u05d5\u05d7 \u05d7\u05d3\u05e9 \u05e0\u05db\u05ea\u05d1 \u05e2\u05d1\u05d5\u05e8 {player_name}.\n\n\u05dc\u05e6\u05e4\u05d9\u05d9\u05d4 \u05d1\u05d3\u05d5\u05d7 \u05d4\u05de\u05dc\u05d0 \u2014 \u05d4\u05d9\u05db\u05e0\u05e1\u05d5 \u05dc\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4.",
                        message_type="progress_update",
                        target_type="individual",
                        target_user_id=pm.user_id,
                    )
        except Exception:
            pass  # Don't fail report creation if messaging fails
