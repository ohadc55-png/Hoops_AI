"""HOOPS AI - Player Context Service: Enriches AI chat with player-specific data."""
import asyncio
from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.team_member import TeamMember
from src.models.coach import Coach
from src.models.player import Player
from src.models.player_report import PlayerReport
from src.models.attendance import Attendance
from src.models.drill import Drill
from src.models.team_event import TeamEvent
from src.models.event import Event

# Keywords that trigger loading specific data domains for players
PLAYER_DATA_KEYWORDS = {
    "reports": [
        "report", "assessment", "strengths", "weaknesses", "improve", "progress",
        "evaluation", "feedback", "grade",
        "הערכה", "חוזקות", "חולשות", "שיפור", "דוח", "משוב",
    ],
    "attendance": [
        "attendance", "missed", "present", "absent", "show up", "skip",
        "נוכחות", "נוכח", "חיסור", "נעדר",
    ],
    "drills": [
        "drill", "exercise", "practice drill", "workout drill",
        "תרגיל", "תרגילים", "אימון",
    ],
    "schedule": [
        "schedule", "game", "next", "when", "upcoming", "practice", "event",
        "tomorrow", "today", "this week",
        "לוח", "משחק", "אימון", "מתי", "מחר", "היום", "השבוע",
    ],
}

# Which data domains each player agent can access
PLAYER_AGENT_DATA_DOMAINS = {
    "shooting_coach": ["reports", "drills", "schedule"],
    "dribbling_coach": ["reports", "drills", "schedule"],
    "passing_coach": ["reports", "drills", "schedule"],
    "fitness_coach": ["reports", "attendance", "drills", "schedule"],
    "nutritionist": ["schedule"],
}

MAX_DATA_CHARS = 4000


class PlayerContextService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def build_context(self, user_id: int, agent_key: str, message: str) -> dict:
        """Build enriched context dict with player_summary, data_context, and rag_context."""
        rel = await self._resolve_player_relations(user_id)
        if not rel:
            return {"player_summary": "=== PLAYER DATA ===\nNo team data available yet."}

        domains = self._detect_domains(agent_key, message)

        summary_task = self._build_player_summary(rel)
        data_task = self._build_data_context(rel, domains) if domains else _empty_coro()
        rag_task = self._build_rag_context(agent_key, message)

        summary, data, rag = await asyncio.gather(summary_task, data_task, rag_task)
        result = {"player_summary": summary}
        if data:
            result["data_context"] = data
        if rag:
            result["rag_context"] = rag
        return result

    async def _build_rag_context(self, agent_key: str, message: str) -> str | None:
        """Retrieve relevant knowledge base content for this player agent."""
        from src.constants.rag_categories import PLAYER_AGENT_RAG_CATEGORIES
        categories = PLAYER_AGENT_RAG_CATEGORIES.get(agent_key)
        if not categories:
            return None
        try:
            from src.services.rag.rag_service import RAGService
            rag_svc = RAGService()
            return await rag_svc.get_context_for_agent(
                message=message,
                agent_categories=categories,
                n_results=3,
            )
        except Exception:
            return None

    async def _resolve_player_relations(self, user_id: int) -> dict | None:
        """Get team_ids, coach_ids, player_ids, and player profile for a user."""
        stmt = select(TeamMember).where(
            TeamMember.user_id == user_id, TeamMember.is_active == True
        )
        result = await self.session.execute(stmt)
        memberships = result.scalars().all()
        if not memberships:
            return None

        team_ids = [m.team_id for m in memberships]
        player_ids = [m.player_id for m in memberships if m.player_id]

        # Resolve coach IDs (coaches in the same teams)
        coach_ids = []
        if team_ids:
            stmt = select(TeamMember.user_id).where(
                TeamMember.team_id.in_(team_ids),
                TeamMember.role_in_team == "coach",
                TeamMember.is_active == True,
            )
            result = await self.session.execute(stmt)
            coach_user_ids = [row[0] for row in result.all()]
            if coach_user_ids:
                stmt = select(Coach.id).where(Coach.user_id.in_(coach_user_ids))
                result = await self.session.execute(stmt)
                coach_ids = [row[0] for row in result.all()]

        # Get player profile
        player_profile = None
        if player_ids:
            player_profile = await self.session.get(Player, player_ids[0])

        return {
            "user_id": user_id,
            "team_ids": team_ids,
            "coach_ids": coach_ids,
            "player_ids": player_ids,
            "player_profile": player_profile,
        }

    def _detect_domains(self, agent_key: str, message: str) -> set[str]:
        """Detect which data domains to load based on agent type and message keywords."""
        allowed = set(PLAYER_AGENT_DATA_DOMAINS.get(agent_key, []))
        if not allowed:
            return set()
        msg_lower = message.lower()
        matched = set()
        for domain, keywords in PLAYER_DATA_KEYWORDS.items():
            if domain in allowed and any(kw in msg_lower for kw in keywords):
                matched.add(domain)
        return matched

    async def _build_player_summary(self, rel: dict) -> str:
        """Compact player summary — always injected into every message."""
        lines = ["=== YOUR PLAYER DATA ==="]
        profile = rel["player_profile"]
        if profile:
            lines.append(f"Position: {profile.position or 'Not set'}")
            lines.append(f"Jersey: #{profile.jersey_number or '?'}")

        # Upcoming events count
        if rel["team_ids"]:
            stmt = select(func.count(TeamEvent.id)).where(
                TeamEvent.team_id.in_(rel["team_ids"]),
                TeamEvent.date >= date.today(),
                TeamEvent.date <= date.today() + timedelta(days=14),
            )
            result = await self.session.execute(stmt)
            event_count = result.scalar() or 0
            lines.append(f"Upcoming events (next 2 weeks): {event_count}")

        # Attendance rate
        if rel["player_ids"]:
            total_stmt = select(func.count(Attendance.id)).where(
                Attendance.player_id.in_(rel["player_ids"])
            )
            attended_stmt = select(func.count(Attendance.id)).where(
                Attendance.player_id.in_(rel["player_ids"]),
                Attendance.present == True,
            )
            total_res, attended_res = await asyncio.gather(
                self.session.execute(total_stmt),
                self.session.execute(attended_stmt),
            )
            total = total_res.scalar() or 0
            attended = attended_res.scalar() or 0
            if total > 0:
                pct = round(attended / total * 100)
                lines.append(f"Attendance: {attended}/{total} ({pct}%)")

        return "\n".join(lines)

    async def _build_data_context(self, rel: dict, domains: set[str]) -> str | None:
        """Load and format on-demand data for matched domains."""
        formatters = {
            "reports": self._fmt_reports,
            "attendance": self._fmt_attendance,
            "drills": self._fmt_drills,
            "schedule": self._fmt_schedule,
        }
        tasks = []
        domain_keys = []
        for d in domains:
            if d in formatters:
                tasks.append(formatters[d](rel))
                domain_keys.append(d)

        if not tasks:
            return None

        results = await asyncio.gather(*tasks)
        sections = []
        total_chars = 0
        for section in results:
            if section and total_chars + len(section) <= MAX_DATA_CHARS:
                sections.append(section)
                total_chars += len(section)
        return "\n\n".join(sections) if sections else None

    # === DATA FORMATTERS ===

    async def _fmt_reports(self, rel: dict) -> str:
        """Format player's own reports."""
        if not rel["player_ids"]:
            return ""
        stmt = (
            select(PlayerReport)
            .where(PlayerReport.player_id.in_(rel["player_ids"]))
            .order_by(PlayerReport.created_at.desc())
            .limit(3)
        )
        result = await self.session.execute(stmt)
        reports = result.scalars().all()
        if not reports:
            return ""
        lines = ["=== YOUR REPORTS ==="]
        for r in reports:
            lines.append(f"Period: {r.period}")
            if isinstance(r.strengths, list) and r.strengths:
                lines.append(f"  Strengths: {', '.join(r.strengths)}")
            if isinstance(r.weaknesses, list) and r.weaknesses:
                lines.append(f"  Areas to improve: {', '.join(r.weaknesses)}")
            if isinstance(r.focus_areas, list) and r.focus_areas:
                lines.append(f"  Focus areas: {', '.join(r.focus_areas)}")
            if r.recommendations:
                lines.append(f"  Coach recommends: {r.recommendations}")
        return "\n".join(lines)

    async def _fmt_attendance(self, rel: dict) -> str:
        """Format recent attendance records."""
        if not rel["player_ids"]:
            return ""
        stmt = (
            select(Attendance)
            .where(Attendance.player_id.in_(rel["player_ids"]))
            .order_by(Attendance.created_at.desc())
            .limit(20)
        )
        result = await self.session.execute(stmt)
        records = result.scalars().all()
        if not records:
            return ""
        total = len(records)
        attended = sum(1 for r in records if r.present)
        lines = [f"=== RECENT ATTENDANCE (last {total} events) ==="]
        lines.append(f"Present: {attended}/{total} ({round(attended / total * 100)}%)")
        missed = total - attended
        if missed:
            lines.append(f"Missed {missed} recent events")
        return "\n".join(lines)

    async def _fmt_drills(self, rel: dict) -> str:
        """Format team drills available to the player."""
        if not rel["coach_ids"]:
            return ""
        stmt = (
            select(Drill)
            .where(Drill.coach_id.in_(rel["coach_ids"]))
            .order_by(Drill.created_at.desc())
            .limit(10)
        )
        result = await self.session.execute(stmt)
        drills = result.scalars().all()
        if not drills:
            return ""
        lines = ["=== TEAM DRILLS ==="]
        for d in drills:
            entry = f"- {d.title} [{d.category}, {d.difficulty}]"
            if d.duration_minutes:
                entry += f" ({d.duration_minutes} min)"
            lines.append(entry)
        return "\n".join(lines)

    async def _fmt_schedule(self, rel: dict) -> str:
        """Format upcoming schedule events."""
        events = []

        # Admin team events
        if rel["team_ids"]:
            stmt = (
                select(TeamEvent)
                .where(
                    TeamEvent.team_id.in_(rel["team_ids"]),
                    TeamEvent.date >= date.today(),
                )
                .order_by(TeamEvent.date.asc())
                .limit(10)
            )
            result = await self.session.execute(stmt)
            for e in result.scalars().all():
                label = f"- {e.date} {e.time_start or ''}: {e.event_type.upper()} — {e.title}"
                if e.opponent:
                    label += f" vs {e.opponent}"
                if e.location:
                    label += f" @ {e.location}"
                events.append(label.strip())

        # Coach events
        if rel["coach_ids"]:
            stmt = (
                select(Event)
                .where(
                    Event.coach_id.in_(rel["coach_ids"]),
                    Event.date >= date.today().isoformat(),
                )
                .order_by(Event.date.asc())
                .limit(10)
            )
            result = await self.session.execute(stmt)
            for e in result.scalars().all():
                label = f"- {e.date} {e.time or ''}: {e.event_type.upper()} — {e.title}"
                if e.opponent:
                    label += f" vs {e.opponent}"
                events.append(label.strip())

        if not events:
            return ""
        lines = ["=== UPCOMING SCHEDULE ==="] + events[:15]
        return "\n".join(lines)




async def _empty_coro():
    """Helper coroutine that returns None."""
    return None
