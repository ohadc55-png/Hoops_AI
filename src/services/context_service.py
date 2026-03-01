"""HOOPS AI - Context Service: Enriches AI chat with coach-specific data."""
import asyncio
from collections import Counter
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.player_repository import PlayerRepository
from src.repositories.event_repository import EventRepository
from src.repositories.facility_repository import FacilityRepository
from src.repositories.drill_repository import DrillRepository
from src.repositories.play_repository import PlayRepository
from src.repositories.practice_repository import PracticeRepository
from src.repositories.attendance_repository import AttendanceRepository
from src.repositories.game_report_repository import GameReportRepository
from src.repositories.player_report_repository import PlayerReportRepository
from src.repositories.team_event_repository import TeamEventRepository
from src.repositories.billing_repository import PaymentPlanRepository, OneTimeChargeRepository

# Keywords that trigger loading specific data domains
DATA_KEYWORDS = {
    "players":        ["player", "roster", "lineup", "who", "שחקן", "הרכב", "שחקנים"],
    "events":         ["schedule", "game", "event", "practice", "calendar", "next", "upcoming",
                       "when", "this week", "tournament",
                       "לוח", "משחק", "משחקים", "אימון", "אימונים", "מתי", "לו\"ז", "לוז",
                       "קרוב", "הבא", "השבוע", "טורניר"],
    "facilities":     ["facility", "gym", "court", "where", "venue", "אולם", "מגרש", "איפה"],
    "drills":         ["drill", "exercise", "my drills", "תרגיל", "תרגילים"],
    "plays":          ["play", "formation", "my plays", "משחקון"],
    "practices":      ["practice plan", "session", "practice session", "תוכנית אימון"],
    "game_reports":   ["game report", "result", "score", "win", "loss", "record", "season record",
                       "report",
                       "תוצאה", "תוצאות", "ניצחון", "הפסד", "דוח משחק", "דוח", "דוחות"],
    "attendance":     ["attendance", "absent", "present", "showing up", "נוכחות"],
    "player_reports": ["assessment", "evaluation", "progress", "strengths", "weaknesses",
                       "הערכה", "חוזקות", "חולשות"],
    "billing":        ["payment", "billing", "charge", "paid", "unpaid", "overdue", "debt", "fee", "invoice",
                       "money", "cost", "owe", "collection",
                       "תשלום", "חיוב", "שילם", "שילמו", "לא שילם", "חוב", "חובות", "כסף", "עלות", "גבייה",
                       "הורים ששילמו", "הורים שלא", "תשלומים"],
}

# Which data domains each agent can access (limits unnecessary fetches)
AGENT_DATA_DOMAINS = {
    "assistant_coach": ["players", "practices", "events", "game_reports"],
    "team_manager":    ["players", "events", "facilities", "attendance", "game_reports", "practices", "drills", "player_reports", "billing"],
    "tactician":       ["plays", "game_reports", "players"],
    "skills_coach":    ["drills", "players", "player_reports"],
    "nutritionist":    [],
    "strength_coach":  [],
    "analyst":         ["game_reports", "attendance", "player_reports", "players", "events", "billing"],
    "youth_coach":     ["players", "drills"],
}

MAX_DATA_CHARS = 6000  # ~1500 tokens budget for on-demand data


class ContextService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.players_repo = PlayerRepository(session)
        self.events_repo = EventRepository(session)
        self.facilities_repo = FacilityRepository(session)
        self.drills_repo = DrillRepository(session)
        self.plays_repo = PlayRepository(session)
        self.practices_repo = PracticeRepository(session)
        self.attendance_repo = AttendanceRepository(session)
        self.game_reports_repo = GameReportRepository(session)
        self.player_reports_repo = PlayerReportRepository(session)
        self.team_events_repo = TeamEventRepository(session)
        self.plan_repo = PaymentPlanRepository(session)
        self.charge_repo = OneTimeChargeRepository(session)

    async def _get_admin_facilities(self, coach_id: int):
        """Resolve facilities through coach → team → admin."""
        from src.models.coach import Coach
        from src.models.team_member import TeamMember
        from src.models.team import Team
        from sqlalchemy import select
        coach = await self.session.get(Coach, coach_id)
        if not coach or not coach.user_id:
            return []
        stmt = select(Team.created_by_admin_id).join(
            TeamMember, TeamMember.team_id == Team.id
        ).where(
            TeamMember.user_id == coach.user_id,
            TeamMember.is_active == True
        ).distinct()
        result = await self.session.execute(stmt)
        admin_ids = [row[0] for row in result.all()]
        if not admin_ids:
            return []
        all_facilities = []
        seen = set()
        for aid in admin_ids:
            facs = await self.facilities_repo.get_by_admin_id(aid)
            for f in facs:
                if f.id not in seen:
                    seen.add(f.id)
                    all_facilities.append(f)
        return all_facilities

    async def build_context(self, coach_id: int, agent_key: str, message: str) -> dict:
        """Build enriched context dict with team_summary, data_context, and rag_context."""
        domains = self._detect_domains(agent_key, message)

        # Run all three context tiers in parallel
        summary_coro = self._build_team_summary(coach_id)
        data_coro = self._build_data_context(coach_id, domains) if domains else _empty()
        rag_coro = self._build_rag_context(agent_key, message)

        summary, data, rag = await asyncio.gather(summary_coro, data_coro, rag_coro)
        result = {"team_summary": summary}
        if data:
            result["data_context"] = data
        if rag:
            result["rag_context"] = rag
        return result

    async def _build_rag_context(self, agent_key: str, message: str) -> str | None:
        """Retrieve relevant knowledge base content for this agent and message."""
        from src.constants.rag_categories import AGENT_RAG_CATEGORIES
        categories = AGENT_RAG_CATEGORIES.get(agent_key)
        if not categories:
            return None
        try:
            from src.services.rag.rag_service import RAGService
            rag_svc = RAGService()
            return await rag_svc.get_context_for_agent(
                message=message,
                agent_categories=categories,
                n_results=4,
            )
        except Exception:
            return None  # RAG failure should never break chat

    def _detect_domains(self, agent_key: str, message: str) -> set[str]:
        """Detect which data domains are relevant based on agent + message keywords."""
        allowed = set(AGENT_DATA_DOMAINS.get(agent_key, []))
        if not allowed:
            return set()

        msg_lower = message.lower()
        matched = set()
        for domain, keywords in DATA_KEYWORDS.items():
            if domain in allowed and any(kw in msg_lower for kw in keywords):
                matched.add(domain)
        return matched

    # ===== TEAM SUMMARY (always present) =====

    async def _build_team_summary(self, coach_id: int) -> str:
        """Compact team snapshot — always injected into system prompt."""
        teams = await self._get_coach_teams(coach_id)
        team_ids = [tid for tid, _ in teams]

        players, events, team_events, games, facilities, drills, plays = await asyncio.gather(
            self.players_repo.get_by_coach_id(coach_id, limit=50),
            self.events_repo.get_by_date_range(coach_id, date.today(), date.today() + timedelta(days=14)),
            self.team_events_repo.get_upcoming_by_teams(team_ids, limit=20) if team_ids else _empty_list(),
            self.game_reports_repo.get_by_coach(coach_id),
            self._get_admin_facilities(coach_id),
            self.drills_repo.filter_drills(coach_id),
            self.plays_repo.get_by_coach_id(coach_id),
        )

        lines = ["=== YOUR TEAM DATA ==="]

        # Roster summary
        if players:
            pos_counts = Counter(p.position or "?" for p in players)
            pos_str = ", ".join(f"{c} {p}" for p, c in pos_counts.most_common())
            lines.append(f"Roster: {len(players)} players ({pos_str})")
        else:
            lines.append("Roster: empty")

        # Recent record
        if games:
            recent = games[:10]
            wins = sum(1 for g in recent if g.result == "win")
            losses = sum(1 for g in recent if g.result == "loss")
            draws = sum(1 for g in recent if g.result == "draw")
            lines.append(f"Recent record: {wins}W-{losses}L" + (f"-{draws}D" if draws else "") + f" (last {len(recent)} games)")

        # Upcoming events — merge legacy events + team events
        all_upcoming = []
        for e in events[:5]:
            label = f"{e.date} {e.time or ''}: {e.event_type.title()} — {e.title}"
            if e.opponent:
                label += f" vs {e.opponent}"
            all_upcoming.append((str(e.date), label.strip()))
        for te in team_events[:10]:
            label = f"{te.date} {te.time_start or ''}: {te.event_type.title()} — {te.title}"
            if te.opponent:
                label += f" vs {te.opponent}"
            if te.location:
                label += f" @ {te.location}"
            all_upcoming.append((str(te.date), label.strip()))
        all_upcoming.sort(key=lambda x: x[0])
        if all_upcoming:
            lines.append("Upcoming:\n  " + "\n  ".join(lbl for _, lbl in all_upcoming[:8]))

        # Facilities
        if facilities:
            lines.append("Facilities: " + ", ".join(f.name for f in facilities))

        # Library counts
        lib_parts = []
        if drills:
            lib_parts.append(f"{len(drills)} drills")
        if plays:
            lib_parts.append(f"{len(plays)} plays")
        if lib_parts:
            lines.append("Library: " + ", ".join(lib_parts))

        return "\n".join(lines)

    # ===== ON-DEMAND DATA CONTEXT =====

    async def _build_data_context(self, coach_id: int, domains: set[str]) -> str | None:
        """Load and format detailed data for requested domains."""
        formatters = {
            "players": self._fmt_players,
            "events": self._fmt_events,
            "facilities": self._fmt_facilities,
            "drills": self._fmt_drills,
            "plays": self._fmt_plays,
            "practices": self._fmt_practices,
            "game_reports": self._fmt_game_reports,
            "attendance": self._fmt_attendance,
            "player_reports": self._fmt_player_reports,
            "billing": self._fmt_billing,
        }

        tasks = {d: formatters[d](coach_id) for d in domains if d in formatters}
        if not tasks:
            return None

        results = await asyncio.gather(*tasks.values())
        sections = []
        total_chars = 0
        for section in results:
            if section and total_chars + len(section) <= MAX_DATA_CHARS:
                sections.append(section)
                total_chars += len(section)

        return "\n\n".join(sections) if sections else None

    async def _get_coach_teams(self, coach_id: int) -> list[tuple[int, str]]:
        """Get (team_id, team_name) pairs for coach's teams."""
        from src.models.coach import Coach
        from src.models.team_member import TeamMember
        from src.models.team import Team
        from sqlalchemy import select
        coach = await self.session.get(Coach, coach_id)
        if not coach or not coach.user_id:
            return []
        stmt = select(Team.id, Team.name).join(
            TeamMember, TeamMember.team_id == Team.id
        ).where(
            TeamMember.user_id == coach.user_id,
            TeamMember.is_active == True
        )
        result = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    # ===== FORMATTERS =====

    async def _fmt_players(self, coach_id: int) -> str:
        players = await self.players_repo.get_by_coach_id(coach_id, limit=25)
        if not players:
            return ""
        lines = ["=== ROSTER ==="]
        for p in players:
            lines.append(f"- {p.name} #{p.jersey_number or '?'} ({p.position or 'N/A'})"
                         + (f" — {p.notes}" if p.notes else ""))
        if len(players) == 25:
            lines.append("... (showing first 25)")
        return "\n".join(lines)

    async def _fmt_events(self, coach_id: int) -> str:
        teams = await self._get_coach_teams(coach_id)
        team_ids = [tid for tid, _ in teams]

        events, team_events = await asyncio.gather(
            self.events_repo.get_by_date_range(coach_id, date.today(), date.today() + timedelta(days=30)),
            self.team_events_repo.get_upcoming_by_teams(team_ids, limit=30) if team_ids else _empty_list(),
        )

        all_events = []
        for e in events[:20]:
            label = f"- {e.date} {e.time or ''}: {e.event_type.upper()} — {e.title}"
            if e.opponent:
                label += f" vs {e.opponent}"
            all_events.append((str(e.date), label.strip()))
        for te in team_events[:20]:
            label = f"- {te.date} {te.time_start or ''}: {te.event_type.upper()} — {te.title}"
            if te.opponent:
                label += f" vs {te.opponent}"
            if te.location:
                label += f" @ {te.location}"
            all_events.append((str(te.date), label.strip()))

        if not all_events:
            return ""

        all_events.sort(key=lambda x: x[0])
        lines = ["=== UPCOMING EVENTS (next 30 days) ==="]
        lines.extend(lbl for _, lbl in all_events[:25])
        return "\n".join(lines)

    async def _fmt_facilities(self, coach_id: int) -> str:
        facilities = await self._get_admin_facilities(coach_id)
        if not facilities:
            return ""
        lines = ["=== FACILITIES ==="]
        for f in facilities:
            parts = [f"- {f.name} ({f.facility_type})"]
            if f.address:
                parts.append(f.address)
            if f.capacity:
                parts.append(f"capacity {f.capacity}")
            lines.append(", ".join(parts))
        return "\n".join(lines)

    async def _fmt_drills(self, coach_id: int) -> str:
        drills = await self.drills_repo.filter_drills(coach_id)
        if not drills:
            return ""
        lines = ["=== DRILL LIBRARY ==="]
        for d in drills[:15]:
            lines.append(f"- {d.title} [{d.category}, {d.difficulty}, {d.duration_minutes}min]")
        if len(drills) > 15:
            lines.append(f"... and {len(drills) - 15} more drills")
        return "\n".join(lines)

    async def _fmt_plays(self, coach_id: int) -> str:
        plays = await self.plays_repo.get_by_coach_id(coach_id, limit=10)
        if not plays:
            return ""
        lines = ["=== SAVED PLAYS ==="]
        for p in plays:
            desc = f"- {p.name}"
            if p.offense_template:
                desc += f" (offense: {p.offense_template})"
            if p.defense_template:
                desc += f" (defense: {p.defense_template})"
            lines.append(desc)
        return "\n".join(lines)

    async def _fmt_practices(self, coach_id: int) -> str:
        sessions = await self.practices_repo.get_all_with_segments(coach_id)
        if not sessions:
            return ""
        lines = ["=== PRACTICE SESSIONS ==="]
        for s in sessions[:5]:
            seg_count = len(s.segments) if s.segments else 0
            lines.append(f"- {s.date}: {s.title} (focus: {s.focus or 'general'}, {s.total_duration}min, {seg_count} segments)")
        if len(sessions) > 5:
            lines.append(f"... and {len(sessions) - 5} more sessions")
        return "\n".join(lines)

    async def _fmt_game_reports(self, coach_id: int) -> str:
        games = await self.game_reports_repo.get_by_coach(coach_id)
        if not games:
            return ""
        lines = ["=== GAME REPORTS ==="]
        for g in games[:5]:
            score = f"{g.score_us}-{g.score_them}" if g.score_us is not None else "N/A"
            standouts = ", ".join(g.standout_players) if isinstance(g.standout_players, list) and g.standout_players else ""
            line = f"- {g.date} vs {g.opponent}: {g.result.upper()} {score}"
            if standouts:
                line += f" (standouts: {standouts})"
            lines.append(line)
        if len(games) > 5:
            lines.append(f"... and {len(games) - 5} more game reports")
        return "\n".join(lines)

    async def _fmt_attendance(self, coach_id: int) -> str:
        stats = await self.attendance_repo.get_player_stats(coach_id)
        if not stats:
            return ""
        # Enrich with player names
        players = await self.players_repo.get_by_coach_id(coach_id, limit=50)
        name_map = {p.id: p.name for p in players}
        lines = ["=== ATTENDANCE STATS ==="]
        for s in sorted(stats, key=lambda x: x["percentage"]):
            name = name_map.get(s["player_id"], f"Player #{s['player_id']}")
            lines.append(f"- {name}: {s['attended']}/{s['total']} ({s['percentage']}%)")
        return "\n".join(lines)

    async def _fmt_player_reports(self, coach_id: int) -> str:
        # Get latest period's reports
        now = date.today()
        period = f"{now.year}-H{'1' if now.month <= 6 else '2'}"
        reports = await self.player_reports_repo.get_by_period(coach_id, period)
        if not reports:
            return ""
        players = await self.players_repo.get_by_coach_id(coach_id, limit=50)
        name_map = {p.id: p.name for p in players}
        lines = [f"=== PLAYER REPORTS ({period}) ==="]
        for r in reports:
            name = name_map.get(r.player_id, f"Player #{r.player_id}")
            strengths = ", ".join(r.strengths[:3]) if isinstance(r.strengths, list) else ""
            weaknesses = ", ".join(r.weaknesses[:2]) if isinstance(r.weaknesses, list) else ""
            line = f"- {name}:"
            if strengths:
                line += f" Strengths: {strengths}."
            if weaknesses:
                line += f" Weaknesses: {weaknesses}."
            lines.append(line)
        return "\n".join(lines)


    async def _fmt_billing(self, coach_id: int) -> str:
        """Format billing data: per-player installment plan + one-time charges summary."""
        teams = await self._get_coach_teams(coach_id)
        if not teams:
            return ""

        team_ids = [tid for tid, _ in teams]
        team_names = {tid: name for tid, name in teams}

        all_plans = []
        all_charges = []
        for tid in team_ids:
            plans = await self.plan_repo.get_by_team(tid)
            charges = await self.charge_repo.get_by_team(tid)
            all_plans.extend(plans)
            all_charges.extend(charges)

        if not all_plans and not all_charges:
            return ""

        lines = ["=== BILLING & PAYMENTS ==="]

        # Summary from plans
        total_expected = sum(float(p.total_amount) for p in all_plans)
        total_paid = sum(float(i.amount) for p in all_plans for i in p.installments if i.status == "paid")
        total_overdue = sum(float(i.amount) for p in all_plans for i in p.installments if i.status == "overdue")
        lines.append(f"Annual fees: {total_expected:,.0f} ILS expected | {total_paid:,.0f} paid | {total_overdue:,.0f} overdue")

        multi_team = len(teams) > 1
        fully_paid = []
        has_unpaid = []

        for plan in sorted(all_plans, key=lambda p: (p.player.name if p.player else "")):
            insts = plan.installments
            paid_count = sum(1 for i in insts if i.status == "paid")
            total_count = len(insts)
            paid_amt = sum(float(i.amount) for i in insts if i.status == "paid")
            balance = float(plan.total_amount) - paid_amt
            label = plan.player.name if plan.player else f"Player #{plan.player_id}"
            if multi_team:
                label += f" [{team_names.get(plan.team_id, '')}]"

            if paid_count == total_count:
                fully_paid.append(f"  - {label}: {paid_count}/{total_count} paid ✓")
            else:
                overdue = sum(1 for i in insts if i.status == "overdue")
                ov_str = f" [{overdue} overdue]" if overdue else ""
                has_unpaid.append(f"  - {label}: {paid_count}/{total_count} paid, balance {balance:,.0f} ILS{ov_str}")

        lines.append(f"\nFully paid ({len(fully_paid)} players):")
        lines.extend(fully_paid[:20] if fully_paid else ["  (none)"])
        lines.append(f"\nUnpaid ({len(has_unpaid)} players):")
        lines.extend(has_unpaid[:20] if has_unpaid else ["  (none)"])

        return "\n".join(lines)



async def _empty():
    """No-op coroutine for when no data context is needed."""
    return None


async def _empty_list():
    """No-op coroutine returning empty list."""
    return []
