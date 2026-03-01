"""HOOPS AI - Coach Engagement Scoring Service"""
import math
from datetime import datetime, timedelta
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.coach import Coach
from src.models.player_report import PlayerReport
from src.models.player_evaluation import PlayerEvaluation
from src.models.game_report import GameReport
from src.models.attendance import Attendance
from src.models.club_message import ClubMessage
from src.models.drill import Drill
from src.models.drill_assignment import DrillAssignment
from src.models.play import Play
from src.models.practice_session import PracticeSession
from src.models.conversation import Conversation
from src.models.event import Event
from src.models.team_event import TeamEvent
from src.models.player import Player


class EngagementService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_engagement_for_admin(self, admin_id: int, team_id: int | None = None) -> list[dict]:
        """Calculate engagement scores for all coaches in admin's teams."""
        # Get admin's teams
        stmt = select(Team.id, Team.name).where(Team.created_by_admin_id == admin_id)
        result = await self.session.execute(stmt)
        admin_teams = {r[0]: r[1] for r in result.all()}
        if not admin_teams:
            return []

        target_team_ids = [team_id] if (team_id and team_id in admin_teams) else list(admin_teams.keys())

        # Get coaches in those teams
        stmt = (
            select(
                Coach.id, Coach.name, Coach.user_id,
                TeamMember.team_id,
            )
            .join(TeamMember, (TeamMember.user_id == Coach.user_id) & (TeamMember.role_in_team == "coach"))
            .where(TeamMember.team_id.in_(target_team_ids), TeamMember.is_active == True, Coach.user_id.isnot(None))
        )
        result = await self.session.execute(stmt)
        coach_rows = result.all()
        if not coach_rows:
            return []

        # Build coach info
        coaches_info = {}
        for coach_id, name, user_id, t_id in coach_rows:
            if coach_id not in coaches_info:
                coaches_info[coach_id] = {
                    "coach_id": coach_id,
                    "coach_name": name,
                    "user_id": user_id,
                    "team_id": t_id,
                    "team_name": admin_teams.get(t_id, ""),
                }
            # If multi-team, keep first

        now = datetime.now()
        cutoff_90 = now - timedelta(days=90)
        cutoff_30 = now - timedelta(days=30)
        cutoff_7 = now - timedelta(days=7)

        results = []
        for coach_id, info in coaches_info.items():
            user_id = info["user_id"]

            # Count queries with date filters
            counts = await self._get_counts(coach_id, user_id, cutoff_90, cutoff_30, cutoff_7, info["team_id"])
            scores = self._calculate_scores(counts)

            results.append({
                **info,
                **scores,
                **counts,
            })

        results.sort(key=lambda x: x["overall_score"], reverse=True)
        return results

    async def _get_counts(self, coach_id: int, user_id: int, cutoff_90, cutoff_30, cutoff_7, team_id: int) -> dict:
        """Get activity counts for a coach across all relevant tables."""

        async def count_model(model, field, cutoff):
            stmt = select(func.count()).where(field == coach_id, model.created_at >= cutoff)
            result = await self.session.execute(stmt)
            return result.scalar() or 0

        async def count_recent(model, field, cutoff_7, cutoff_30, cutoff_90):
            """Count with 3 tiers for recency weighting."""
            counts = {}
            for label, cutoff in [("7d", cutoff_7), ("30d", cutoff_30), ("90d", cutoff_90)]:
                stmt = select(func.count()).where(field == coach_id, model.created_at >= cutoff)
                result = await self.session.execute(stmt)
                counts[label] = result.scalar() or 0
            return counts

        # Messages sent (uses user_id, not coach_id)
        msg_stmt = select(func.count()).where(ClubMessage.sender_id == user_id, ClubMessage.created_at >= cutoff_90)
        msg_result = await self.session.execute(msg_stmt)
        messages_sent = msg_result.scalar() or 0

        # Last activity: max created_at across key tables
        last_activity = None
        for model, field in [
            (PlayerReport, PlayerReport.coach_id),
            (PlayerEvaluation, PlayerEvaluation.coach_id),
            (GameReport, GameReport.coach_id),
            (Drill, Drill.coach_id),
            (Play, Play.coach_id),
            (PracticeSession, PracticeSession.coach_id),
        ]:
            stmt = select(func.max(model.created_at)).where(field == coach_id)
            result = await self.session.execute(stmt)
            val = result.scalar()
            if val and (last_activity is None or val > last_activity):
                last_activity = val

        # Also check messages
        msg_last_stmt = select(func.max(ClubMessage.created_at)).where(ClubMessage.sender_id == user_id)
        msg_last_result = await self.session.execute(msg_last_stmt)
        msg_last = msg_last_result.scalar()
        if msg_last and (last_activity is None or msg_last > last_activity):
            last_activity = msg_last

        # Individual counts (90-day window)
        evaluations = await count_model(PlayerEvaluation, PlayerEvaluation.coach_id, cutoff_90)
        player_reports = await count_model(PlayerReport, PlayerReport.coach_id, cutoff_90)
        game_reports = await count_model(GameReport, GameReport.coach_id, cutoff_90)
        drills_created = await count_model(Drill, Drill.coach_id, cutoff_90)
        plays_created = await count_model(Play, Play.coach_id, cutoff_90)
        practice_sessions = await count_model(PracticeSession, PracticeSession.coach_id, cutoff_90)
        conversations = await count_model(Conversation, Conversation.coach_id, cutoff_90)

        # Drill assignments
        assign_stmt = select(func.count()).where(DrillAssignment.coach_id == coach_id, DrillAssignment.created_at >= cutoff_90)
        assign_result = await self.session.execute(assign_stmt)
        drill_assignments = assign_result.scalar() or 0

        # Attendance events recorded
        att_stmt = select(func.count(func.distinct(Attendance.event_id))).where(
            Attendance.coach_id == coach_id, Attendance.created_at >= cutoff_90
        )
        att_result = await self.session.execute(att_stmt)
        attendance_events = att_result.scalar() or 0

        # Total team events in period (for attendance ratio)
        team_events_stmt = select(func.count()).where(
            TeamEvent.team_id == team_id, TeamEvent.date >= cutoff_90.date(), TeamEvent.is_active == True
        )
        team_events_result = await self.session.execute(team_events_stmt)
        total_team_events = team_events_result.scalar() or 0

        # Player report coverage: % of coach's players with ≥1 report in last 90 days
        covered_stmt = (
            select(func.count(distinct(PlayerReport.player_id)))
            .where(PlayerReport.coach_id == coach_id, PlayerReport.created_at >= cutoff_90)
        )
        covered_result = await self.session.execute(covered_stmt)
        players_with_reports = covered_result.scalar() or 0

        total_players_stmt = select(func.count(Player.id)).where(Player.coach_id == coach_id)
        total_players_result = await self.session.execute(total_players_stmt)
        total_players = total_players_result.scalar() or 0

        player_report_coverage_pct = int(players_with_reports / total_players * 100) if total_players > 0 else 0

        # Practice summary completion: % of sessions in last 90 days that have a summary
        summarized_stmt = (
            select(func.count(PracticeSession.id))
            .where(
                PracticeSession.coach_id == coach_id,
                PracticeSession.created_at >= cutoff_90,
                PracticeSession.goal_achieved.isnot(None),
            )
        )
        summarized_result = await self.session.execute(summarized_stmt)
        sessions_with_summary = summarized_result.scalar() or 0
        practice_summary_pct = int(sessions_with_summary / max(practice_sessions, 1) * 100)

        return {
            "evaluations": evaluations,
            "player_reports": player_reports,
            "game_reports": game_reports,
            "messages_sent": messages_sent,
            "drill_assignments": drill_assignments,
            "drills_created": drills_created,
            "plays_created": plays_created,
            "practice_sessions": practice_sessions,
            "conversations": conversations,
            "attendance_events": attendance_events,
            "total_team_events": total_team_events,
            "player_report_coverage_pct": player_report_coverage_pct,
            "players_with_reports": players_with_reports,
            "total_players": total_players,
            "practice_summary_pct": practice_summary_pct,
            "sessions_with_summary": sessions_with_summary,
            "last_activity": str(last_activity) if last_activity else None,
        }

    def _calculate_scores(self, counts: dict) -> dict:
        """
        Scoring: 5 categories × 0-10 each. Overall = sum × 2 (0-100).
        Uses pow(0.7) curve — generous but realistic differentiation.
        Example: 25% effort → 33%, 50% → 62%, 75% → 82%, 100% → 100%.
        """

        def curve(raw: float) -> float:
            """pow(0.7) curve: rewards effort without over-inflating."""
            return min(raw, 1.0) ** 0.7

        # Reports (0-10): evaluations + game/player reports + player coverage (45% weight)
        reports_raw = (
            min(counts["evaluations"] / 4, 1) * 0.20 +
            min(counts["game_reports"] / 6, 1) * 0.20 +
            min(counts["player_reports"] / 4, 1) * 0.15 +
            min(counts.get("player_report_coverage_pct", 0) / 80, 1) * 0.45
        )
        reports_score = min(round(curve(reports_raw) * 10), 10)

        # Communication (0-10): messages (target 15), assignments (target 8), conversations (target 8)
        comm_raw = (
            min(counts["messages_sent"] / 15, 1) * 0.40 +
            min(counts["drill_assignments"] / 8, 1) * 0.30 +
            min(counts["conversations"] / 8, 1) * 0.30
        )
        communication_score = min(round(curve(comm_raw) * 10), 10)

        # Training (0-10): drills + plays + practices + summary completion (30% weight)
        train_raw = (
            min(counts["drills_created"] / 8, 1) * 0.25 +
            min(counts["plays_created"] / 5, 1) * 0.20 +
            min(counts["practice_sessions"] / 6, 1) * 0.25 +
            min(counts.get("practice_summary_pct", 0) / 70, 1) * 0.30
        )
        training_score = min(round(curve(train_raw) * 10), 10)

        # Attendance (0-10): ratio of events with attendance recorded
        total_events = counts["total_team_events"]
        if total_events > 0:
            att_raw = counts["attendance_events"] / total_events
            attendance_score = min(round(curve(att_raw) * 10), 10)
        else:
            attendance_score = 5  # neutral if no events

        # AI Usage (0-10): conversations (target 8), AI-generated content (target 8)
        ai_content = counts["drills_created"] + counts["plays_created"] + counts["practice_sessions"]
        ai_raw = (
            min(counts["conversations"] / 8, 1) * 0.50 +
            min(ai_content / 8, 1) * 0.50
        )
        ai_usage_score = min(round(curve(ai_raw) * 10), 10)

        overall_score = min((reports_score + communication_score + training_score + attendance_score + ai_usage_score) * 2, 100)

        return {
            "overall_score": overall_score,
            "reports_score": reports_score,
            "communication_score": communication_score,
            "training_score": training_score,
            "attendance_score": attendance_score,
            "ai_usage_score": ai_usage_score,
        }

    async def get_coach_activity(self, admin_id: int, coach_id: int) -> dict | None:
        """Get recent activity timeline for a specific coach."""
        # Verify coach is in admin's teams
        stmt = (
            select(Coach.id, Coach.name, Coach.user_id)
            .join(TeamMember, (TeamMember.user_id == Coach.user_id) & (TeamMember.role_in_team == "coach"))
            .join(Team, TeamMember.team_id == Team.id)
            .where(Team.created_by_admin_id == admin_id, Coach.id == coach_id)
        )
        result = await self.session.execute(stmt)
        row = result.first()
        if not row:
            return None

        cid, name, user_id = row
        cutoff = datetime.now() - timedelta(days=90)
        timeline = []

        # Player evaluations
        stmt = select(PlayerEvaluation).where(PlayerEvaluation.coach_id == cid, PlayerEvaluation.created_at >= cutoff).order_by(PlayerEvaluation.created_at.desc()).limit(10)
        result = await self.session.execute(stmt)
        for ev in result.scalars().all():
            from src.models.player import Player
            player = await self.session.get(Player, ev.player_id)
            pname = player.name if player else f"#{ev.player_id}"
            timeline.append({"type": "evaluation", "id": ev.id, "player_id": ev.player_id, "date": str(ev.created_at), "detail": f"הערכת שחקן: {pname} ({ev.period_label})"})

        # Player reports
        stmt = select(PlayerReport).where(PlayerReport.coach_id == cid, PlayerReport.created_at >= cutoff).order_by(PlayerReport.created_at.desc()).limit(10)
        result = await self.session.execute(stmt)
        for r in result.scalars().all():
            from src.models.player import Player
            player = await self.session.get(Player, r.player_id)
            pname = player.name if player else f"#{r.player_id}"
            timeline.append({"type": "player_report", "id": r.id, "player_id": r.player_id, "date": str(r.created_at), "detail": f"דוח שחקן תקופתי: {pname} ({r.period})"})

        # Game reports
        stmt = select(GameReport).where(GameReport.coach_id == cid, GameReport.created_at >= cutoff).order_by(GameReport.created_at.desc()).limit(10)
        result = await self.session.execute(stmt)
        for g in result.scalars().all():
            result_label = "נ" if g.result == "win" else "ה" if g.result == "loss" else "ת"
            if g.score_us is not None and g.score_them is not None:
                score_part = f"{result_label} {g.score_us}-{g.score_them}"
            else:
                score_part = "טרם הוזנה תוצאה"
            timeline.append({"type": "game_report", "id": g.id, "date": str(g.created_at), "detail": f"דוח משחק: מול {g.opponent} ({score_part})"})

        # Drills created
        stmt = select(Drill).where(Drill.coach_id == cid, Drill.created_at >= cutoff).order_by(Drill.created_at.desc()).limit(5)
        result = await self.session.execute(stmt)
        for d in result.scalars().all():
            timeline.append({"type": "drill", "id": d.id, "date": str(d.created_at), "detail": f"תרגיל חדש: {d.title}"})

        # Messages sent
        stmt = select(ClubMessage).where(ClubMessage.sender_id == user_id, ClubMessage.created_at >= cutoff).order_by(ClubMessage.created_at.desc()).limit(5)
        result = await self.session.execute(stmt)
        for m in result.scalars().all():
            subj = m.subject if (m.subject and m.subject != 'None') else 'ללא נושא'
            timeline.append({"type": "message", "id": m.id, "date": str(m.created_at), "detail": f"הודעה נשלחה: {subj}"})

        # Sort by date desc
        timeline.sort(key=lambda x: x["date"], reverse=True)

        # Get engagement scores for this coach
        # Need the team_id — use first team found
        team_stmt = (
            select(TeamMember.team_id)
            .join(Team, TeamMember.team_id == Team.id)
            .where(
                TeamMember.user_id == user_id,
                TeamMember.role_in_team == "coach",
                Team.created_by_admin_id == admin_id,
            )
            .limit(1)
        )
        team_result = await self.session.execute(team_stmt)
        team_row = team_result.first()
        team_id = team_row[0] if team_row else 0

        counts = await self._get_counts(cid, user_id, cutoff, datetime.now() - timedelta(days=30), datetime.now() - timedelta(days=7), team_id)
        scores = self._calculate_scores(counts)

        return {
            "coach_id": cid,
            "coach_name": name,
            "overall_score": scores["overall_score"],
            "scores": {
                "reports": scores["reports_score"],
                "communication": scores["communication_score"],
                "training": scores["training_score"],
                "attendance": scores["attendance_score"],
                "ai_usage": scores["ai_usage_score"],
            },
            "timeline": timeline[:30],
        }
