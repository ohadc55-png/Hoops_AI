"""
HOOPS AI - Application Entry Point
Basketball Coaching Assistant
"""
import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from config import get_settings, BASE_DIR, DATA_DIR

# Import models to register with Base
import src.models  # noqa: F401
from src.utils.database import init_db, close_db, AsyncSessionLocal

# Import API routers
from src.api.auth import router as auth_router
from src.api.chat import router as chat_router
from src.api.drills import router as drills_router
from src.api.practice import router as practice_router
from src.api.plays import router as plays_router
from src.api.logistics import router as logistics_router
from src.api.files import router as files_router
from src.api.reports import router as reports_router
from src.api.player_auth import router as player_auth_router
from src.api.teams import router as teams_router
from src.api.player_dashboard import router as player_dashboard_router
from src.api.admin_auth import router as admin_auth_router
from src.api.admin_dashboard import router as admin_dashboard_router
from src.api.admin_roles import router as admin_roles_router
from src.api.schedule import router as schedule_router
from src.api.parent_auth import router as parent_auth_router
from src.api.parent_dashboard import router as parent_dashboard_router
from src.api.schedule_requests import router as schedule_requests_router
from src.api.admin_contacts import router as admin_contacts_router
from src.api.player_chat import router as player_chat_router
from src.api.messaging import router as messaging_router
from src.api.billing import router as billing_router
from src.api.carpool import router as carpool_router
from src.api.admin_players import router as admin_players_router
from src.api.admin_facilities import router as admin_facilities_router
from src.api.insights import router as insights_router
from src.api.knowledge import router as knowledge_router
from src.api.transport import router as transport_router
from src.api.evaluations import router as evaluations_router
from src.api.admin_evaluations import router as admin_evaluations_router
from src.api.admin_engagement import router as admin_engagement_router
from src.api.scouting import router as scouting_router
from src.api.coach_dashboard import router as coach_dashboard_router
# Super Admin Platform
from src.api.super_admin_auth import router as super_admin_auth_router
from src.api.super_admin_dashboard import router as super_admin_dashboard_router
from src.api.super_admin_clubs import router as super_admin_clubs_router
from src.api.super_admin_features import router as super_admin_features_router
from src.api.super_admin_analytics import router as super_admin_analytics_router
from src.api.club_registration import router as club_registration_router
from src.api.features import router as features_router
from src.api.super_admin_billing import router as super_admin_billing_router
from src.api.super_admin_tickets import router as super_admin_tickets_router
from src.api.support import router as support_router
from src.api.super_admin_notifications import router as super_admin_notifications_router

settings = get_settings()


async def _process_scheduled_messages():
    """Background task: send scheduled messages whose time has passed."""
    while True:
        try:
            async with AsyncSessionLocal() as session:
                from src.services.messaging_service import MessagingService
                service = MessagingService(session)
                await service.process_scheduled_messages()
                await session.commit()
        except Exception as e:
            print(f"Scheduled message processor error: {e}")
        await asyncio.sleep(60)


async def _billing_background():
    """Background task: mark pending installments/charges past due_date as overdue."""
    while True:
        try:
            async with AsyncSessionLocal() as session:
                from src.services.billing_service import BillingService
                service = BillingService(session)
                await service.check_overdue()
        except Exception as e:
            print(f"Billing background error: {e}")
        await asyncio.sleep(3600)


async def _insights_background():
    """Background task: weekly AI reports + daily payment reminders."""
    from datetime import datetime
    while True:
        try:
            now = datetime.now()
            async with AsyncSessionLocal() as session:
                from src.models.user import User
                from sqlalchemy import select
                stmt = select(User).where(User.role == "admin", User.is_active == True)
                result = await session.execute(stmt)
                admins = result.scalars().all()

                for admin in admins:
                    # Daily at 9:00 — send payment reminders
                    if now.hour == 9:
                        from src.services.financial_agent import FinancialAgent
                        fin_agent = FinancialAgent(session)
                        await fin_agent.send_payment_reminders(admin.id)

                    # Weekly: Sunday at 8:00 — generate reports
                    if now.weekday() == 6 and now.hour == 8:
                        from src.services.financial_agent import FinancialAgent
                        from src.services.professional_agent import ProfessionalAgent
                        from src.models.insight_report import InsightReport

                        fin = FinancialAgent(session)
                        report = await fin.generate_weekly_report(admin.id)
                        session.add(InsightReport(
                            admin_id=admin.id, agent_type="financial",
                            report_type="weekly_auto", content=report,
                        ))

                        pro = ProfessionalAgent(session)
                        report = await pro.generate_weekly_report(admin.id)
                        session.add(InsightReport(
                            admin_id=admin.id, agent_type="professional",
                            report_type="weekly_auto", content=report,
                        ))

                        # Send notification
                        from src.services.messaging_service import MessagingService
                        msg = MessagingService(session)
                        await msg.send_message(
                            sender_id=admin.id, sender_role="admin",
                            subject="דוחות AI שבועיים מוכנים",
                            body="הדוח הכלכלי השבועי והדוח המקצועי מוכנים לצפייה בעמוד AI Insights.",
                            message_type="update",
                            target_type="individual", target_user_id=admin.id,
                        )

                        # Professional attendance alerts
                        pro2 = ProfessionalAgent(session)
                        await pro2.send_attendance_alerts(admin.id)

                await session.commit()
        except Exception as e:
            print(f"Insights background error: {e}")
        await asyncio.sleep(3600)


async def _game_report_reminders():
    """Background task: every 6 hours, remind coaches about pending game reports."""
    await asyncio.sleep(300)  # Initial delay: 5 min after startup
    while True:
        try:
            async with AsyncSessionLocal() as session:
                from src.services.report_service import ReportService
                from src.services.messaging_service import MessagingService
                from src.models.coach import Coach
                from src.models.team_member import TeamMember
                from src.models.team import Team
                from src.models.club_message import ClubMessage
                from sqlalchemy import select
                from datetime import datetime, timedelta

                # Find all coaches with user_id (in teams)
                stmt = select(Coach).where(Coach.user_id.isnot(None))
                result = await session.execute(stmt)
                coaches = result.scalars().all()

                msg_service = MessagingService(session)

                for coach in coaches:
                    try:
                        svc = ReportService(session)
                        pending = await svc.get_pending_game_events(coach.id)
                        if not pending:
                            continue

                        # Check if reminder already sent in last 5 hours (avoid duplicates)
                        cutoff = datetime.now(datetime.timezone.utc).replace(tzinfo=None) - timedelta(hours=5)
                        existing = await session.execute(
                            select(ClubMessage).where(
                                ClubMessage.message_type == "game_report_reminder",
                                ClubMessage.created_at > cutoff,
                            ).limit(1)
                        )
                        if existing.scalar_one_or_none():
                            continue

                        # Find team admin to send from
                        tm_stmt = select(TeamMember.team_id).where(
                            TeamMember.user_id == coach.user_id,
                            TeamMember.role_in_team == "coach",
                            TeamMember.is_active == True,
                        ).limit(1)
                        tm_result = await session.execute(tm_stmt)
                        tm_row = tm_result.first()
                        if not tm_row:
                            continue
                        team = await session.get(Team, tm_row[0])
                        if not team:
                            continue

                        events_text = "\n".join(
                            f"- {e['date']} vs {e['opponent'] or 'Unknown'} ({e['title']})"
                            for e in pending[:5]
                        )
                        count_word = "משחק" if len(pending) == 1 else "משחקים"
                        body = (
                            f"\u05d9\u05e9 \u05dc\u05da {len(pending)} {count_word} \u05dc\u05dc\u05d0 \u05d3\u05d5\u05d7:\n\n"
                            f"{events_text}\n\n"
                            "\u05d4\u05d9\u05db\u05e0\u05e1 \u05dc\u05e2\u05de\u05d5\u05d3 Reports \u05db\u05d3\u05d9 \u05dc\u05de\u05dc\u05d0 \u05d0\u05ea \u05d4\u05d3\u05d5\u05d7\u05d5\u05ea."
                        )

                        await msg_service.send_message(
                            sender_id=team.created_by_admin_id,
                            sender_role="admin",
                            subject="\u05ea\u05d6\u05db\u05d5\u05e8\u05ea: \u05d3\u05d5\u05d7\u05d5\u05ea \u05de\u05e9\u05d7\u05e7 \u05d7\u05e1\u05e8\u05d9\u05dd",
                            body=body,
                            message_type="game_report_reminder",
                            target_type="individual",
                            target_user_id=coach.user_id,
                        )
                    except Exception as e:
                        print(f"Game report reminder error for coach {coach.id}: {e}")

                await session.commit()
        except Exception as e:
            print(f"Game report reminder background error: {e}")
        await asyncio.sleep(21600)  # 6 hours


async def _scouting_video_cleanup():
    """Background task: delete expired scouting videos from Cloudinary + DB."""
    await asyncio.sleep(600)  # Initial delay: 10 min after startup
    while True:
        try:
            async with AsyncSessionLocal() as session:
                from src.services.scouting_service import ScoutingService
                svc = ScoutingService(session)
                deleted = await svc.cleanup_expired_videos()
                if deleted:
                    print(f"[scouting] Cleaned up {deleted} expired videos")
                await session.commit()
        except Exception as e:
            print(f"Scouting video cleanup error: {e}")
        await asyncio.sleep(21600)  # Every 6 hours


async def _scouting_expiry_notifications():
    """Background task: send 48h and 6h expiry warnings to coaches."""
    await asyncio.sleep(900)  # Initial delay: 15 min after startup
    while True:
        try:
            async with AsyncSessionLocal() as session:
                from src.services.scouting_service import ScoutingService
                svc = ScoutingService(session)
                sent = await svc.send_expiry_notifications()
                if sent:
                    print(f"[scouting] Sent {sent} expiry notifications")
                await session.commit()
        except Exception as e:
            print(f"Scouting expiry notification error: {e}")
        await asyncio.sleep(7200)  # Every 2 hours


async def _platform_billing_cycle():
    """Background task: daily at 00:05, create invoices for clubs whose billing date is today."""
    await asyncio.sleep(600)  # Initial delay: 10 min after startup
    _last_billing_date = None
    while True:
        try:
            from datetime import datetime as _dt
            now = _dt.now()
            if now.hour == 0 and (_last_billing_date is None or _last_billing_date != now.date()):
                async with AsyncSessionLocal() as session:
                    from src.services.platform_invoice_service import PlatformInvoiceService
                    svc = PlatformInvoiceService(session)
                    created = await svc.run_billing_cycle()
                    overdue = await svc.mark_overdue_invoices()
                    await session.commit()
                    if created or overdue:
                        print(f"[platform-billing] Created {created} invoices, marked {overdue} overdue")
                _last_billing_date = now.date()
        except Exception as e:
            print(f"Platform billing cycle error: {e}")
        await asyncio.sleep(3600)  # Check every hour


async def _registration_link_cleanup():
    """Background task: daily at 02:00, deactivate expired club registration links."""
    await asyncio.sleep(600)  # Initial delay: 10 min after startup
    while True:
        try:
            async with AsyncSessionLocal() as session:
                from src.services.club_registration_service import ClubRegistrationService
                svc = ClubRegistrationService(session)
                count = await svc.cleanup_expired_links()
                if count:
                    print(f"[registration] Deactivated {count} expired links")
        except Exception as e:
            print(f"Registration link cleanup error: {e}")
        await asyncio.sleep(86400)  # Every 24 hours


async def _storage_threshold_check():
    """Background task: every 6h, check clubs approaching storage limits."""
    await asyncio.sleep(1800)  # Initial delay: 30 min after startup
    while True:
        try:
            async with AsyncSessionLocal() as session:
                from src.services.storage_tracking_service import StorageTrackingService
                svc = StorageTrackingService(session)
                count = await svc.check_storage_thresholds()
                if count:
                    print(f"[storage] Created {count} storage threshold notifications")
                await session.commit()
        except Exception as e:
            print(f"Storage threshold check error: {e}")
        await asyncio.sleep(21600)  # Every 6 hours


async def _tier_threshold_check():
    """Background task: every 6h, check clubs approaching player tier limits."""
    await asyncio.sleep(2400)  # Initial delay: 40 min after startup
    while True:
        try:
            async with AsyncSessionLocal() as session:
                from src.services.storage_tracking_service import StorageTrackingService
                svc = StorageTrackingService(session)
                count = await svc.check_tier_thresholds()
                if count:
                    print(f"[tier] Created {count} tier threshold notifications")
                await session.commit()
        except Exception as e:
            print(f"Tier threshold check error: {e}")
        await asyncio.sleep(21600)  # Every 6 hours


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(DATA_DIR / "database", exist_ok=True)
    os.makedirs(DATA_DIR / "database" / "chroma", exist_ok=True)
    os.makedirs(DATA_DIR / "uploads", exist_ok=True)
    os.makedirs(DATA_DIR / "uploads" / "knowledge", exist_ok=True)
    os.makedirs(DATA_DIR / "uploads" / "videos", exist_ok=True)
    await init_db()
    # Recalculate attendance streaks for existing data
    try:
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select as _sel, distinct as _dist
            from src.models.attendance import Attendance as _Att
            from src.models.player import Player as _Pl
            from src.repositories.attendance_repository import AttendanceRepository as _AR
            stmt = _sel(_dist(_Att.player_id))
            result = await session.execute(stmt)
            pids = [row[0] for row in result.all()]
            if pids:
                repo = _AR(session)
                streaks = await repo.recalculate_streaks(pids)
                for pid, (cur, hi) in streaks.items():
                    pl = await session.get(_Pl, pid)
                    if pl:
                        pl.current_attendance_streak = cur
                        pl.highest_attendance_streak = hi
                await session.commit()
                print(f"[startup] Recalculated streaks for {len(streaks)} players")
    except Exception as e:
        print(f"[startup] Streak recalc error: {e}")
    scheduled_task = asyncio.create_task(_process_scheduled_messages())
    billing_task = asyncio.create_task(_billing_background())
    insights_task = asyncio.create_task(_insights_background())
    game_reminder_task = asyncio.create_task(_game_report_reminders())
    scouting_cleanup_task = asyncio.create_task(_scouting_video_cleanup())
    scouting_notify_task = asyncio.create_task(_scouting_expiry_notifications())
    reg_link_cleanup_task = asyncio.create_task(_registration_link_cleanup())
    platform_billing_task = asyncio.create_task(_platform_billing_cycle())
    storage_threshold_task = asyncio.create_task(_storage_threshold_check())
    tier_threshold_task = asyncio.create_task(_tier_threshold_check())
    yield
    # Shutdown — cancel all background tasks and await their completion
    all_tasks = [
        scheduled_task, billing_task, insights_task, game_reminder_task,
        scouting_cleanup_task, scouting_notify_task, reg_link_cleanup_task,
        platform_billing_task, storage_threshold_task, tier_threshold_task,
    ]
    for task in all_tasks:
        task.cancel()
    await asyncio.gather(*all_tasks, return_exceptions=True)
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Static files & templates
_videos_dir = DATA_DIR / "uploads" / "videos"
os.makedirs(_videos_dir, exist_ok=True)
app.mount("/uploads/videos", StaticFiles(directory=str(_videos_dir)), name="uploaded-videos")
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Register API routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(drills_router)
app.include_router(practice_router)
app.include_router(plays_router)
app.include_router(logistics_router)
app.include_router(files_router)
app.include_router(reports_router)
app.include_router(player_auth_router)
app.include_router(teams_router)
app.include_router(player_dashboard_router)
app.include_router(admin_auth_router)
app.include_router(admin_dashboard_router)
app.include_router(admin_roles_router)
app.include_router(schedule_router)
app.include_router(parent_auth_router)
app.include_router(parent_dashboard_router)
app.include_router(schedule_requests_router)
app.include_router(admin_contacts_router)
app.include_router(player_chat_router)
app.include_router(messaging_router)
app.include_router(billing_router)
app.include_router(carpool_router)
app.include_router(admin_players_router)
app.include_router(admin_facilities_router)
app.include_router(insights_router)
app.include_router(knowledge_router)
app.include_router(transport_router)
app.include_router(evaluations_router)
app.include_router(admin_evaluations_router)
app.include_router(admin_engagement_router)
app.include_router(scouting_router)
app.include_router(coach_dashboard_router)
# Super Admin Platform
app.include_router(super_admin_auth_router)
app.include_router(super_admin_dashboard_router)
app.include_router(super_admin_clubs_router)
app.include_router(super_admin_features_router)
app.include_router(super_admin_analytics_router)
app.include_router(club_registration_router)
app.include_router(features_router)
app.include_router(super_admin_billing_router)
app.include_router(super_admin_tickets_router)
app.include_router(support_router)
app.include_router(super_admin_notifications_router)


# --- Page Routes ---
@app.get("/")
async def index():
    from starlette.responses import RedirectResponse
    return RedirectResponse(url="/admin/login")


@app.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("auth/login.html", {"request": request})


@app.get("/register")
async def register_page(request: Request):
    return templates.TemplateResponse("auth/register.html", {"request": request})


@app.get("/drills")
async def drills_page(request: Request):
    return templates.TemplateResponse("pages/drills.html", {"request": request})


@app.get("/practice")
async def practice_page(request: Request):
    return templates.TemplateResponse("pages/practice.html", {"request": request})


@app.get("/plays")
async def plays_page(request: Request):
    return templates.TemplateResponse("pages/plays.html", {"request": request})


@app.get("/schedule")
async def schedule_page(request: Request):
    return templates.TemplateResponse("pages/schedule.html", {"request": request})


@app.get("/logistics")
async def logistics_page(request: Request):
    return templates.TemplateResponse("pages/logistics.html", {"request": request})


@app.get("/reports")
async def reports_page(request: Request):
    return templates.TemplateResponse("pages/reports.html", {"request": request})


@app.get("/analytics")
async def analytics_page(request: Request):
    return templates.TemplateResponse("pages/analytics.html", {"request": request})


@app.get("/messages")
async def messages_page(request: Request):
    return templates.TemplateResponse("pages/messages.html", {"request": request})


@app.get("/settings")
async def settings_page(request: Request):
    return templates.TemplateResponse("pages/settings.html", {"request": request})


@app.get("/knowledge")
async def knowledge_page(request: Request):
    return templates.TemplateResponse("pages/coach_knowledge.html", {"request": request})


@app.get("/scouting")
async def scouting_page(request: Request):
    return templates.TemplateResponse("pages/scouting.html", {"request": request})


# --- Player Page Routes ---
@app.get("/player")
async def player_chat_page(request: Request):
    return templates.TemplateResponse("pages/player_chat.html", {"request": request})


@app.get("/player/dashboard")
async def player_dashboard(request: Request):
    return templates.TemplateResponse("pages/player_dashboard.html", {"request": request})


@app.get("/player/schedule")
async def player_schedule_page(request: Request):
    return templates.TemplateResponse("pages/player_schedule.html", {"request": request})


@app.get("/player/drills")
async def player_drills_page(request: Request):
    return templates.TemplateResponse("pages/player_drills.html", {"request": request})


@app.get("/player/plays")
async def player_plays_page(request: Request):
    return templates.TemplateResponse("pages/player_plays.html", {"request": request})


@app.get("/player/scouting")
async def player_scouting_page(request: Request):
    return templates.TemplateResponse("pages/player_scouting.html", {"request": request})


@app.get("/player/reports")
async def player_reports_page(request: Request):
    return templates.TemplateResponse("pages/player_reports.html", {"request": request})


@app.get("/player/team")
async def player_team_page(request: Request):
    return templates.TemplateResponse("pages/player_team.html", {"request": request})


@app.get("/player/leaderboard")
async def player_leaderboard_page(request: Request):
    return templates.TemplateResponse("pages/player_leaderboard.html", {"request": request})


@app.get("/player/messages")
async def player_messages_page(request: Request):
    return templates.TemplateResponse("pages/player_messages.html", {"request": request})


@app.get("/player/login")
async def player_login_page(request: Request):
    return templates.TemplateResponse("auth/player_login.html", {"request": request})


@app.get("/player/register")
async def player_register_page(request: Request):
    return templates.TemplateResponse("auth/player_register.html", {"request": request})


@app.get("/join/coach/{invite_token}")
async def join_coach_link(request: Request, invite_token: str):
    """Coach registers and joins team via link from admin."""
    return templates.TemplateResponse("auth/coach_invite_register.html", {"request": request, "invite_token": invite_token})


@app.get("/join/coach/{invite_token}/login")
async def join_coach_login_link(request: Request, invite_token: str):
    """Existing coach logs in and joins team via link."""
    return templates.TemplateResponse("auth/login.html", {"request": request, "coach_invite_token": invite_token})


@app.get("/join/player/{invite_token}")
async def join_player_link(request: Request, invite_token: str):
    """Player joins team via link from coach."""
    return templates.TemplateResponse("auth/player_register.html", {"request": request, "invite_token": invite_token})


# --- Parent Page Routes ---
@app.get("/parent")
async def parent_page(request: Request):
    return templates.TemplateResponse("pages/parent_dashboard.html", {"request": request})


@app.get("/parent/messages")
async def parent_messages_page(request: Request):
    return templates.TemplateResponse("pages/parent_messages.html", {"request": request})


@app.get("/parent/schedule")
async def parent_schedule_page(request: Request):
    return templates.TemplateResponse("pages/parent_schedule.html", {"request": request})


@app.get("/parent/payments")
async def parent_payments_page(request: Request):
    return templates.TemplateResponse("pages/parent_payments.html", {"request": request})


@app.get("/parent/scouting")
async def parent_scouting_page(request: Request):
    return templates.TemplateResponse("pages/parent_scouting.html", {"request": request})


@app.get("/parent/carpool")
async def parent_carpool_page(request: Request):
    return templates.TemplateResponse("pages/parent_carpool.html", {"request": request})


@app.get("/parent/login")
async def parent_login_page(request: Request):
    return templates.TemplateResponse("auth/parent_login.html", {"request": request})


@app.get("/parent/register")
async def parent_register_page(request: Request):
    return templates.TemplateResponse("auth/parent_register.html", {"request": request})


@app.get("/join/parent/{invite_token}")
async def join_parent_link(request: Request, invite_token: str):
    """Parent joins team via link."""
    return templates.TemplateResponse("auth/parent_register.html", {"request": request, "invite_token": invite_token})


# --- Admin Page Routes ---
@app.get("/admin")
async def admin_page(request: Request):
    return templates.TemplateResponse("pages/admin_dashboard.html", {"request": request})


@app.get("/admin/schedule")
async def admin_schedule_page(request: Request):
    return templates.TemplateResponse("pages/admin_schedule.html", {"request": request})


@app.get("/admin/teams")
async def admin_teams_page(request: Request):
    return templates.TemplateResponse("pages/admin_teams.html", {"request": request})


@app.get("/admin/roles")
async def admin_roles_page(request: Request):
    return templates.TemplateResponse("pages/admin_roles.html", {"request": request})


@app.get("/admin/contacts")
async def admin_contacts_page(request: Request):
    return templates.TemplateResponse("pages/admin_contacts.html", {"request": request})


@app.get("/admin/facilities")
async def admin_facilities_page(request: Request):
    return templates.TemplateResponse("pages/admin_facilities.html", {"request": request})


@app.get("/admin/scouting")
async def admin_scouting_page(request: Request):
    return templates.TemplateResponse("pages/admin_scouting.html", {"request": request})


@app.get("/admin/billing")
async def admin_billing_page(request: Request):
    return templates.TemplateResponse("pages/admin_billing.html", {"request": request})


@app.get("/admin/messages")
async def admin_messages_page(request: Request):
    return templates.TemplateResponse("pages/admin_messages.html", {"request": request})


@app.get("/admin/insights")
async def admin_insights_page(request: Request):
    return templates.TemplateResponse("pages/admin_insights.html", {"request": request})


@app.get("/admin/knowledge")
async def admin_knowledge_page(request: Request):
    return templates.TemplateResponse("pages/admin_knowledge.html", {"request": request})


@app.get("/admin/player-development")
async def admin_player_development_page(request: Request):
    return templates.TemplateResponse("pages/admin_player_development.html", {"request": request})


@app.get("/admin/transport")
async def admin_transport_page(request: Request):
    return templates.TemplateResponse("pages/admin_transport.html", {"request": request})


@app.get("/admin/transport/{event_id}")
async def admin_transport_detail_page(request: Request, event_id: int):
    return templates.TemplateResponse("pages/admin_transport_detail.html", {"request": request, "event_id": event_id})


@app.get("/admin/coaches")
async def admin_coaches_page(request: Request):
    return templates.TemplateResponse("pages/admin_coaches.html", {"request": request})


@app.get("/admin/support")
async def admin_support_page(request: Request):
    return templates.TemplateResponse("pages/admin_support.html", {"request": request})


@app.get("/admin/login")
async def admin_login_page(request: Request):
    return templates.TemplateResponse("auth/admin_login.html", {"request": request})


@app.get("/admin/register")
async def admin_register_page(request: Request):
    return templates.TemplateResponse("auth/admin_register.html", {"request": request})


# ═══════════════════════════════════════════════════
# Super Admin Portal — Page Routes
# ═══════════════════════════════════════════════════
@app.get("/super-admin/login")
async def super_admin_login_page(request: Request):
    return templates.TemplateResponse("auth/super_admin_login.html", {"request": request})


@app.get("/super-admin")
async def super_admin_dashboard_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/dashboard.html", {"request": request})


@app.get("/super-admin/clubs")
async def super_admin_clubs_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/clubs.html", {"request": request})


@app.get("/super-admin/clubs/new")
async def super_admin_club_create_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/club_create.html", {"request": request})


@app.get("/super-admin/clubs/{club_id}")
async def super_admin_club_detail_page(request: Request, club_id: int):
    return templates.TemplateResponse("pages/super_admin/club_detail.html", {"request": request})


@app.get("/super-admin/billing")
async def super_admin_billing_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/billing.html", {"request": request})


@app.get("/super-admin/billing/{invoice_id}")
async def super_admin_invoice_detail_page(request: Request, invoice_id: int):
    return templates.TemplateResponse("pages/super_admin/invoice_detail.html", {"request": request})


@app.get("/super-admin/tickets")
async def super_admin_tickets_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/tickets.html", {"request": request})


@app.get("/super-admin/tickets/{ticket_id}")
async def super_admin_ticket_detail_page(request: Request, ticket_id: int):
    return templates.TemplateResponse("pages/super_admin/ticket_detail.html", {"request": request})


@app.get("/super-admin/analytics")
async def super_admin_analytics_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/analytics.html", {"request": request})


@app.get("/join/club/{token}")
async def join_club_link(request: Request, token: str):
    """Club admin registers via registration link from super admin."""
    return templates.TemplateResponse("auth/club_register.html", {"request": request})


@app.get("/health")
async def health():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/admin-setup-once")
async def admin_setup_once():
    """One-time admin setup — transfer ownership to ohadc55@gmail.com then remove this endpoint."""
    from bcrypt import hashpw, gensalt
    from sqlalchemy import text
    async with AsyncSessionLocal() as db:
        h = hashpw(b"6279986", gensalt()).decode()
        await db.execute(text("UPDATE users SET email=:e, password_hash=:h, name=:n WHERE id=1"),
                         {"e": "ohadc55@gmail.com", "h": h, "n": "Ohad"})
        await db.execute(text("DELETE FROM users WHERE id=242"))
        await db.commit()
    return {"success": True, "message": "Admin#1 updated to ohadc55@gmail.com, admin#242 deleted"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    reload = settings.ENVIRONMENT == "development"
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
        workers=1,
        log_level="debug" if settings.DEBUG else "info",
    )
