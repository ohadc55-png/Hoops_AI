"""HOOPS AI - Insight Data Collector
Gathers data from all modules and prepares structured context for AI insight agents."""
import asyncio
from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.coach import Coach
from src.models.player import Player
from src.models.player_report import PlayerReport
from src.models.game_report import GameReport
from src.models.attendance import Attendance
from src.models.event import Event
from src.models.team_event import TeamEvent
from src.models.player_evaluation import PlayerEvaluation
from src.repositories.billing_repository import PaymentPlanRepository, InstallmentRepository, OneTimeChargeRepository
from src.services.billing_service import BillingService


class InsightDataCollector:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ========== HELPERS ==========

    async def _get_admin_teams(self, admin_id: int) -> list[Team]:
        stmt = select(Team).where(
            Team.created_by_admin_id == admin_id,
            Team.is_active == True,
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _get_coach_ids_for_admin(self, admin_id: int) -> list[int]:
        """Get all coach IDs across admin's teams."""
        stmt = (
            select(Coach.id)
            .join(TeamMember, TeamMember.user_id == Coach.user_id)
            .join(Team, Team.id == TeamMember.team_id)
            .where(
                Team.created_by_admin_id == admin_id,
                Team.is_active == True,
                TeamMember.role_in_team == "coach",
                TeamMember.is_active == True,
            )
        )
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]

    async def _get_players_for_admin(self, admin_id: int) -> list:
        """Get all roster players across admin's teams' coaches."""
        coach_ids = await self._get_coach_ids_for_admin(admin_id)
        if not coach_ids:
            return []
        stmt = select(Player).where(Player.coach_id.in_(coach_ids))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ========== FINANCIAL DATA ==========

    async def get_financial_snapshot(self, admin_id: int) -> dict:
        """Current financial state for AI context."""
        billing = BillingService(self.session)
        plan_repo = PaymentPlanRepository(self.session)
        teams = await self._get_admin_teams(admin_id)

        # Per-team breakdown using new payment plan model
        team_data = []
        for t in teams:
            plans = await plan_repo.get_by_team(t.id)
            total = sum(float(p.total_amount) for p in plans)
            paid = sum(float(i.amount) for p in plans for i in p.installments if i.status == "paid")
            overdue = sum(float(i.amount) for p in plans for i in p.installments if i.status == "overdue")
            pending = total - paid - overdue
            team_data.append({
                "team_name": t.name,
                "team_id": t.id,
                "total_charged": total,
                "total_paid": paid,
                "total_pending": max(0, pending),
                "total_overdue": overdue,
                "player_count": len(plans),
            })

        overview = await billing.get_overview(admin_id)
        overdue_details = await self.get_payment_reminders_needed(admin_id)
        return {
            "summary": overview,
            "teams": team_data,
            "overdue_details": overdue_details,
        }

    async def get_payment_reminders_needed(self, admin_id: int) -> list[dict]:
        """Players with overdue installments who need reminders, enriched with parent info."""
        from src.models.installment import Installment
        from src.models.payment_plan import PaymentPlan
        from src.models.user import User
        teams = await self._get_admin_teams(admin_id)
        today = date.today()

        reminders = []
        player_ids = set()
        for t in teams:
            stmt = (
                select(Installment, Player.name, PaymentPlan.description)
                .join(Player, Installment.player_id == Player.id)
                .join(PaymentPlan, Installment.plan_id == PaymentPlan.id)
                .where(
                    Installment.team_id == t.id,
                    Installment.status == "overdue",
                )
            )
            result = await self.session.execute(stmt)
            for inst, player_name, plan_desc in result.all():
                days = (today - inst.due_date).days if inst.due_date else 0
                player_ids.add(inst.player_id)
                reminders.append({
                    "player_id": inst.player_id,
                    "player_name": player_name,
                    "team": t.name,
                    "installment_id": inst.id,
                    "amount": float(inst.amount),
                    "due_date": str(inst.due_date) if inst.due_date else None,
                    "days_overdue": days,
                    "status": inst.status,
                    "title": plan_desc or f"תשלום {inst.installment_number}",
                })

        # Find parents linked to these players via TeamMember
        if player_ids:
            stmt = (
                select(TeamMember.player_id, User.id, User.name)
                .join(User, TeamMember.user_id == User.id)
                .where(
                    TeamMember.player_id.in_(player_ids),
                    TeamMember.role_in_team == "parent",
                    TeamMember.is_active == True,
                )
            )
            result = await self.session.execute(stmt)
            parent_map: dict[int, list[dict]] = {}
            for pid, uid, uname in result.all():
                parent_map.setdefault(pid, []).append({"user_id": uid, "name": uname})

            # Expand reminders: one entry per parent (some players have 2 parents)
            enriched = []
            for r in reminders:
                parents = parent_map.get(r["player_id"], [])
                if parents:
                    for p in parents:
                        enriched.append({**r, "parent_user_id": p["user_id"], "parent_name": p["name"]})
                else:
                    enriched.append({**r, "parent_user_id": None, "parent_name": r.get("player_name")})
            reminders = enriched

        return reminders

    # ========== PROFESSIONAL DATA ==========

    async def get_professional_snapshot(self, admin_id: int) -> dict:
        """Professional/athletic data for AI context."""
        teams = await self._get_admin_teams(admin_id)
        coach_ids = await self._get_coach_ids_for_admin(admin_id)

        team_reports = []
        for t in teams:
            # Get coaches for this team
            stmt = (
                select(Coach.id)
                .join(TeamMember, TeamMember.user_id == Coach.user_id)
                .where(
                    TeamMember.team_id == t.id,
                    TeamMember.role_in_team == "coach",
                    TeamMember.is_active == True,
                )
            )
            result = await self.session.execute(stmt)
            team_coach_ids = [row[0] for row in result.all()]

            # Player count
            player_count = 0
            if team_coach_ids:
                stmt = select(func.count(Player.id)).where(Player.coach_id.in_(team_coach_ids))
                result = await self.session.execute(stmt)
                player_count = result.scalar() or 0

            # Attendance rate for team's coaches
            attendance_rate = 0
            if team_coach_ids:
                stmt = select(
                    func.count(Attendance.id).label("total"),
                    func.sum(func.cast(Attendance.present, Attendance.id.type)).label("attended"),
                ).where(Attendance.coach_id.in_(team_coach_ids))
                result = await self.session.execute(stmt)
                row = result.one()
                total = row.total or 0
                attended = int(row.attended or 0)
                attendance_rate = round(attended / total * 100) if total > 0 else 0

            # Player report count
            report_count = 0
            if team_coach_ids:
                stmt = select(func.count(PlayerReport.id)).where(
                    PlayerReport.coach_id.in_(team_coach_ids)
                )
                result = await self.session.execute(stmt)
                report_count = result.scalar() or 0

            # Game record
            wins = losses = draws = 0
            if team_coach_ids:
                stmt = select(GameReport.result).where(
                    GameReport.coach_id.in_(team_coach_ids)
                )
                result = await self.session.execute(stmt)
                for row in result.all():
                    if row[0] == "win":
                        wins += 1
                    elif row[0] == "loss":
                        losses += 1
                    elif row[0] == "draw":
                        draws += 1

            team_reports.append({
                "team_name": t.name,
                "team_id": t.id,
                "age_group": t.age_group,
                "player_count": player_count,
                "attendance_rate": attendance_rate,
                "report_count": report_count,
                "game_record": {"wins": wins, "losses": losses, "draws": draws},
            })

        return {
            "teams": team_reports,
            "total_teams": len(teams),
        }

    async def get_player_card_data(self, player_id: int) -> dict:
        """All data about a specific player for AI analysis."""
        # Player info
        stmt = select(Player).where(Player.id == player_id)
        result = await self.session.execute(stmt)
        player = result.scalar_one_or_none()
        if not player:
            return {"player": {}, "reports": [], "attendance": {}, "game_reports": []}

        player_info = {
            "name": player.name,
            "jersey_number": player.jersey_number,
            "position": player.position,
            "birth_date": str(player.birth_date) if player.birth_date else None,
            "height": player.height,
            "weight": player.weight,
            "notes": player.notes,
        }

        # Player reports
        stmt = (
            select(PlayerReport)
            .where(PlayerReport.player_id == player_id)
            .order_by(PlayerReport.created_at.desc())
            .limit(10)
        )
        result = await self.session.execute(stmt)
        reports = result.scalars().all()
        reports_data = [
            {
                "period": r.period,
                "strengths": r.strengths if isinstance(r.strengths, list) else [],
                "weaknesses": r.weaknesses if isinstance(r.weaknesses, list) else [],
                "focus_areas": r.focus_areas if isinstance(r.focus_areas, list) else [],
                "progress_notes": r.progress_notes,
                "recommendations": r.recommendations,
                "is_ai_generated": r.is_ai_generated,
                "created_at": str(r.created_at),
            }
            for r in reports
        ]

        # Attendance stats
        stmt = select(
            func.count(Attendance.id).label("total"),
            func.sum(func.cast(Attendance.present, Attendance.id.type)).label("attended"),
        ).where(Attendance.player_id == player_id)
        result = await self.session.execute(stmt)
        row = result.one()
        total = row.total or 0
        attended = int(row.attended or 0)
        attendance_data = {
            "total_events": total,
            "attended": attended,
            "percentage": round(attended / total * 100) if total > 0 else 0,
        }

        # Game reports mentioning this player (in standout_players)
        if player.coach_id:
            stmt = (
                select(GameReport)
                .where(GameReport.coach_id == player.coach_id)
                .order_by(GameReport.date.desc())
                .limit(20)
            )
            result = await self.session.execute(stmt)
            all_games = result.scalars().all()
            mentioned_games = []
            for g in all_games:
                standouts = g.standout_players if isinstance(g.standout_players, list) else []
                if player.name and any(player.name.lower() in s.lower() for s in standouts):
                    mentioned_games.append({
                        "date": str(g.date),
                        "opponent": g.opponent,
                        "result": g.result,
                        "score": f"{g.score_us}-{g.score_them}" if g.score_us is not None else None,
                    })
        else:
            mentioned_games = []

        return {
            "player": player_info,
            "reports": reports_data,
            "attendance": attendance_data,
            "game_reports": mentioned_games,
        }

    async def get_attendance_alerts(self, admin_id: int) -> list[dict]:
        """Players with concerning attendance patterns."""
        coach_ids = await self._get_coach_ids_for_admin(admin_id)
        if not coach_ids:
            return []

        # Get all players and their attendance stats
        stmt = select(Player).where(Player.coach_id.in_(coach_ids))
        result = await self.session.execute(stmt)
        players = result.scalars().all()

        alerts = []
        for p in players:
            stmt = select(
                func.count(Attendance.id).label("total"),
                func.sum(func.cast(Attendance.present, Attendance.id.type)).label("attended"),
            ).where(Attendance.player_id == p.id)
            result = await self.session.execute(stmt)
            row = result.one()
            total = row.total or 0
            attended = int(row.attended or 0)

            if total < 3:
                continue

            percentage = round(attended / total * 100) if total > 0 else 0
            if percentage < 70:
                alerts.append({
                    "player_name": p.name,
                    "player_id": p.id,
                    "position": p.position,
                    "total_events": total,
                    "attended": attended,
                    "percentage": percentage,
                    "severity": "critical" if percentage < 50 else "warning",
                })

        # Sort by severity (worst first)
        alerts.sort(key=lambda x: x["percentage"])
        return alerts

    async def get_admin_players_list(self, admin_id: int) -> list[dict]:
        """Player list with team_name + birth_date for filtering.
        Goes through coach_id path (the primary player→team linkage)."""
        # Build coach_id → team_name mapping
        stmt = (
            select(Coach.id, Team.name)
            .join(TeamMember, TeamMember.user_id == Coach.user_id)
            .join(Team, Team.id == TeamMember.team_id)
            .where(
                Team.created_by_admin_id == admin_id,
                Team.is_active == True,
                TeamMember.role_in_team == "coach",
                TeamMember.is_active == True,
            )
        )
        result = await self.session.execute(stmt)
        coach_team_map = {coach_id: team_name for coach_id, team_name in result.all()}

        if not coach_team_map:
            return []

        stmt = (
            select(Player)
            .where(Player.coach_id.in_(coach_team_map.keys()))
            .order_by(Player.name)
        )
        result = await self.session.execute(stmt)
        players = result.scalars().all()

        return [
            {
                "id": p.id,
                "name": p.name,
                "position": p.position,
                "jersey_number": p.jersey_number,
                "birth_date": str(p.birth_date) if p.birth_date else None,
                "team_name": coach_team_map.get(p.coach_id, ""),
            }
            for p in players
        ]

    async def get_rich_professional_context(self, admin_id: int) -> dict:
        """Full professional context for chat: all players, evaluations, game results, reports.
        Capped at reasonable size for AI context window."""
        # 1. All players with team names
        players_list = await self.get_admin_players_list(admin_id)

        # 2. Recent game reports (all coaches, last 30)
        coach_ids = await self._get_coach_ids_for_admin(admin_id)
        game_reports = []
        if coach_ids:
            stmt = (
                select(GameReport)
                .where(GameReport.coach_id.in_(coach_ids))
                .order_by(GameReport.date.desc())
                .limit(30)
            )
            result = await self.session.execute(stmt)
            for g in result.scalars().all():
                game_reports.append({
                    "date": str(g.date),
                    "opponent": g.opponent,
                    "result": g.result,
                    "score": f"{g.score_us}-{g.score_them}" if g.score_us is not None else None,
                    "standout_players": g.standout_players if isinstance(g.standout_players, list) else [],
                    "areas_to_improve": g.areas_to_improve if isinstance(g.areas_to_improve, list) else [],
                })

        # 3. Latest player evaluations (per player, last 1)
        player_ids = [p["id"] for p in players_list[:50]]  # cap at 50 players
        evaluations = {}
        if player_ids:
            stmt = (
                select(PlayerEvaluation)
                .where(PlayerEvaluation.player_id.in_(player_ids))
                .order_by(PlayerEvaluation.created_at.desc())
            )
            result = await self.session.execute(stmt)
            for ev in result.scalars().all():
                if ev.player_id not in evaluations:
                    evaluations[ev.player_id] = {
                        "offensive": ev.offensive_rating,
                        "defensive": ev.defensive_rating,
                        "basketball_iq": ev.iq_rating,
                        "social": ev.social_rating,
                        "leadership": ev.leadership_rating,
                        "work_ethic": ev.work_ethic_rating,
                        "fitness": ev.fitness_rating,
                        "improvement": ev.improvement_rating,
                        "leaving_risk": ev.leaving_risk,
                    }

        # 4. Latest player reports (per player, last 1)
        player_reports = {}
        if player_ids:
            stmt = (
                select(PlayerReport)
                .where(PlayerReport.player_id.in_(player_ids))
                .order_by(PlayerReport.created_at.desc())
            )
            result = await self.session.execute(stmt)
            for r in result.scalars().all():
                if r.player_id not in player_reports:
                    player_reports[r.player_id] = {
                        "period": r.period,
                        "strengths": r.strengths if isinstance(r.strengths, list) else [],
                        "weaknesses": r.weaknesses if isinstance(r.weaknesses, list) else [],
                    }

        # 5. Attendance alerts
        alerts = await self.get_attendance_alerts(admin_id)

        # 6. Assemble enriched player list
        enriched_players = []
        for p in players_list[:50]:
            ep = dict(p)
            ev = evaluations.get(p["id"])
            if ev:
                ep["evaluation"] = ev
            rep = player_reports.get(p["id"])
            if rep:
                ep["latest_report"] = rep
            enriched_players.append(ep)

        # High-level snapshot too
        snapshot = await self.get_professional_snapshot(admin_id)

        return {
            "teams_overview": snapshot["teams"],
            "total_teams": snapshot["total_teams"],
            "players": enriched_players,
            "recent_games": game_reports[:20],
            "attendance_alerts": alerts[:20],
        }

    async def get_rich_financial_context(self, admin_id: int) -> dict:
        """Full financial context: per-player billing status, overdue details."""
        snapshot = await self.get_financial_snapshot(admin_id)
        # Add per-player billing details
        plan_repo = PaymentPlanRepository(self.session)
        charge_repo = OneTimeChargeRepository(self.session)
        teams = await self._get_admin_teams(admin_id)

        player_billing = []
        for t in teams:
            plans = await plan_repo.get_by_team(t.id)
            for p in plans:
                player_obj = await self.session.get(Player, p.player_id)
                player_name = player_obj.name if player_obj else f"Player {p.player_id}"
                paid = sum(float(i.amount) for i in p.installments if i.status == "paid")
                overdue = sum(float(i.amount) for i in p.installments if i.status == "overdue")
                pending = sum(float(i.amount) for i in p.installments if i.status == "pending")
                player_billing.append({
                    "player_name": player_name,
                    "team": t.name,
                    "season": p.season,
                    "total": float(p.total_amount),
                    "paid": paid,
                    "pending": pending,
                    "overdue": overdue,
                    "status": "overdue" if overdue > 0 else ("pending" if pending > 0 else "paid"),
                })

        return {
            "summary": snapshot["summary"],
            "teams": snapshot["teams"],
            "overdue_details": snapshot["overdue_details"][:30],
            "player_billing": player_billing[:60],
        }
