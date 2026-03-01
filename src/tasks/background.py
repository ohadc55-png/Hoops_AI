"""HOOPS AI - Background Tasks"""
import asyncio
import logging
from src.utils.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


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
            logger.error(f"Scheduled message processor error: {e}")
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
            logger.error(f"Billing background error: {e}")
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
            logger.error(f"Insights background error: {e}")
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
                        logger.error(f"Game report reminder error for coach {coach.id}: {e}")

                await session.commit()
        except Exception as e:
            logger.error(f"Game report reminder background error: {e}")
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
                    logger.info(f"Cleaned up {deleted} expired videos")
                await session.commit()
        except Exception as e:
            logger.error(f"Scouting video cleanup error: {e}")
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
                    logger.info(f"Sent {sent} expiry notifications")
                await session.commit()
        except Exception as e:
            logger.error(f"Scouting expiry notification error: {e}")
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
                        logger.info(f"Created {created} invoices, marked {overdue} overdue")
                _last_billing_date = now.date()
        except Exception as e:
            logger.error(f"Platform billing cycle error: {e}")
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
                    logger.info(f"Deactivated {count} expired registration links")
        except Exception as e:
            logger.error(f"Registration link cleanup error: {e}")
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
                    logger.info(f"Created {count} storage threshold notifications")
                await session.commit()
        except Exception as e:
            logger.error(f"Storage threshold check error: {e}")
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
                    logger.info(f"Created {count} tier threshold notifications")
                await session.commit()
        except Exception as e:
            logger.error(f"Tier threshold check error: {e}")
        await asyncio.sleep(21600)  # Every 6 hours


async def recalculate_attendance_streaks():
    """Recalculate attendance streaks for existing data (runs at startup)."""
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
                logger.info(f"Recalculated streaks for {len(streaks)} players")
    except Exception as e:
        logger.error(f"Streak recalc error: {e}")


def create_all_tasks():
    """Create and return all background task asyncio tasks."""
    return [
        asyncio.create_task(_process_scheduled_messages()),
        asyncio.create_task(_billing_background()),
        asyncio.create_task(_insights_background()),
        asyncio.create_task(_game_report_reminders()),
        asyncio.create_task(_scouting_video_cleanup()),
        asyncio.create_task(_scouting_expiry_notifications()),
        asyncio.create_task(_platform_billing_cycle()),
        asyncio.create_task(_registration_link_cleanup()),
        asyncio.create_task(_storage_threshold_check()),
        asyncio.create_task(_tier_threshold_check()),
    ]
