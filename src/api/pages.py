"""HOOPS AI - Page Routes (HTML template rendering)"""
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from config import BASE_DIR

router = APIRouter(tags=["pages"])
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


# ── Coach Portal ─────────────────────────────────────────────────────────
@router.get("/")
async def index():
    return RedirectResponse(url="/chat")


@router.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("auth/login.html", {"request": request})


@router.get("/register")
async def register_page(request: Request):
    return templates.TemplateResponse("auth/register.html", {"request": request})


@router.get("/chat")
async def chat_page(request: Request):
    return templates.TemplateResponse("pages/chat.html", {"request": request})


@router.get("/drills")
async def drills_page(request: Request):
    return templates.TemplateResponse("pages/drills.html", {"request": request})


@router.get("/practice")
async def practice_page(request: Request):
    return templates.TemplateResponse("pages/practice.html", {"request": request})


@router.get("/practice/{session_id}")
async def practice_detail_page(session_id: int, request: Request):
    return templates.TemplateResponse("pages/practice_detail.html", {"request": request, "session_id": session_id})


@router.get("/plays")
async def plays_page(request: Request):
    return templates.TemplateResponse("pages/plays.html", {"request": request})


@router.get("/schedule")
async def schedule_page(request: Request):
    return templates.TemplateResponse("pages/schedule.html", {"request": request})


@router.get("/logistics")
async def logistics_page(request: Request):
    return templates.TemplateResponse("pages/logistics.html", {"request": request})


@router.get("/team")
async def team_redirect():
    return RedirectResponse(url="/logistics", status_code=301)


@router.get("/players")
async def players_redirect():
    return RedirectResponse(url="/logistics", status_code=301)


@router.get("/reports")
async def reports_page(request: Request):
    return templates.TemplateResponse("pages/reports.html", {"request": request})


@router.get("/analytics")
async def analytics_page(request: Request):
    return templates.TemplateResponse("pages/analytics.html", {"request": request})


@router.get("/messages")
async def messages_page(request: Request):
    return templates.TemplateResponse("pages/messages.html", {"request": request})


@router.get("/settings")
async def settings_page(request: Request):
    return templates.TemplateResponse("pages/settings.html", {"request": request})


@router.get("/knowledge")
async def knowledge_page(request: Request):
    return templates.TemplateResponse("pages/coach_knowledge.html", {"request": request})


@router.get("/scouting")
async def scouting_page(request: Request):
    return templates.TemplateResponse("pages/scouting.html", {"request": request})


# ── Player Portal ────────────────────────────────────────────────────────
@router.get("/player")
async def player_chat_page(request: Request):
    return templates.TemplateResponse("pages/player_chat.html", {"request": request})


@router.get("/player/dashboard")
async def player_dashboard(request: Request):
    return templates.TemplateResponse("pages/player_dashboard.html", {"request": request})


@router.get("/player/schedule")
async def player_schedule_page(request: Request):
    return templates.TemplateResponse("pages/player_schedule.html", {"request": request})


@router.get("/player/drills")
async def player_drills_page(request: Request):
    return templates.TemplateResponse("pages/player_drills.html", {"request": request})


@router.get("/player/plays")
async def player_plays_page(request: Request):
    return templates.TemplateResponse("pages/player_plays.html", {"request": request})


@router.get("/player/scouting")
async def player_scouting_page(request: Request):
    return templates.TemplateResponse("pages/player_scouting.html", {"request": request})


@router.get("/player/reports")
async def player_reports_page(request: Request):
    return templates.TemplateResponse("pages/player_reports.html", {"request": request})


@router.get("/player/team")
async def player_team_page(request: Request):
    return templates.TemplateResponse("pages/player_team.html", {"request": request})


@router.get("/player/leaderboard")
async def player_leaderboard_page(request: Request):
    return templates.TemplateResponse("pages/player_leaderboard.html", {"request": request})


@router.get("/player/messages")
async def player_messages_page(request: Request):
    return templates.TemplateResponse("pages/player_messages.html", {"request": request})


@router.get("/player/login")
async def player_login_page(request: Request):
    return templates.TemplateResponse("auth/player_login.html", {"request": request})


@router.get("/player/register")
async def player_register_page(request: Request):
    return templates.TemplateResponse("auth/player_register.html", {"request": request})


# ── Join Links (Coach / Player) ──────────────────────────────────────────
@router.get("/join/coach/{invite_token}")
async def join_coach_link(request: Request, invite_token: str):
    """Coach registers and joins team via link from admin."""
    return templates.TemplateResponse("auth/coach_invite_register.html", {"request": request, "invite_token": invite_token})


@router.get("/join/coach/{invite_token}/login")
async def join_coach_login_link(request: Request, invite_token: str):
    """Existing coach logs in and joins team via link."""
    return templates.TemplateResponse("auth/login.html", {"request": request, "coach_invite_token": invite_token})


@router.get("/join/player/{invite_token}")
async def join_player_link(request: Request, invite_token: str):
    """Player joins team via link from coach."""
    return templates.TemplateResponse("auth/player_register.html", {"request": request, "invite_token": invite_token})


# ── Parent Portal ────────────────────────────────────────────────────────
@router.get("/parent")
async def parent_page(request: Request):
    return templates.TemplateResponse("pages/parent_dashboard.html", {"request": request})


@router.get("/parent/messages")
async def parent_messages_page(request: Request):
    return templates.TemplateResponse("pages/parent_messages.html", {"request": request})


@router.get("/parent/schedule")
async def parent_schedule_page(request: Request):
    return templates.TemplateResponse("pages/parent_schedule.html", {"request": request})


@router.get("/parent/payments")
async def parent_payments_page(request: Request):
    return templates.TemplateResponse("pages/parent_payments.html", {"request": request})


@router.get("/parent/progress")
async def parent_progress_page(request: Request):
    return templates.TemplateResponse("pages/parent_progress.html", {"request": request})


@router.get("/parent/scouting")
async def parent_scouting_page(request: Request):
    return templates.TemplateResponse("pages/parent_scouting.html", {"request": request})


@router.get("/parent/receipt/{receipt_type}/{item_id}")
async def parent_receipt_page(request: Request, receipt_type: str, item_id: int):
    return templates.TemplateResponse("pages/parent_receipt.html", {"request": request, "receipt_type": receipt_type, "item_id": item_id})


@router.get("/parent/carpool")
async def parent_carpool_page(request: Request):
    return templates.TemplateResponse("pages/parent_carpool.html", {"request": request})


@router.get("/parent/login")
async def parent_login_page(request: Request):
    return templates.TemplateResponse("auth/parent_login.html", {"request": request})


@router.get("/parent/register")
async def parent_register_page(request: Request):
    return templates.TemplateResponse("auth/parent_register.html", {"request": request})


@router.get("/join/parent/{invite_token}")
async def join_parent_link(request: Request, invite_token: str):
    """Parent joins team via link."""
    return templates.TemplateResponse("auth/parent_register.html", {"request": request, "invite_token": invite_token})


# ── Admin Portal ─────────────────────────────────────────────────────────
@router.get("/admin")
async def admin_page(request: Request):
    return templates.TemplateResponse("pages/admin_dashboard.html", {"request": request})


@router.get("/admin/schedule")
async def admin_schedule_page(request: Request):
    return templates.TemplateResponse("pages/admin_schedule.html", {"request": request})


@router.get("/admin/teams")
async def admin_teams_page(request: Request):
    return templates.TemplateResponse("pages/admin_teams.html", {"request": request})


@router.get("/admin/roles")
async def admin_roles_page(request: Request):
    return templates.TemplateResponse("pages/admin_roles.html", {"request": request})


@router.get("/admin/contacts")
async def admin_contacts_page(request: Request):
    return templates.TemplateResponse("pages/admin_contacts.html", {"request": request})


@router.get("/admin/facilities")
async def admin_facilities_page(request: Request):
    return templates.TemplateResponse("pages/admin_facilities.html", {"request": request})


@router.get("/admin/scouting")
async def admin_scouting_page(request: Request):
    return templates.TemplateResponse("pages/admin_scouting.html", {"request": request})


@router.get("/admin/billing")
async def admin_billing_page(request: Request):
    return templates.TemplateResponse("pages/admin_billing.html", {"request": request})


@router.get("/admin/messages")
async def admin_messages_page(request: Request):
    return templates.TemplateResponse("pages/admin_messages.html", {"request": request})


@router.get("/admin/insights")
async def admin_insights_page(request: Request):
    return templates.TemplateResponse("pages/admin_insights.html", {"request": request})


@router.get("/admin/knowledge")
async def admin_knowledge_page(request: Request):
    return templates.TemplateResponse("pages/admin_knowledge.html", {"request": request})


@router.get("/admin/player-development")
async def admin_player_development_page(request: Request):
    return templates.TemplateResponse("pages/admin_player_development.html", {"request": request})


@router.get("/admin/transport")
async def admin_transport_page(request: Request):
    return templates.TemplateResponse("pages/admin_transport.html", {"request": request})


@router.get("/admin/transport/{event_id}")
async def admin_transport_detail_page(request: Request, event_id: int):
    return templates.TemplateResponse("pages/admin_transport_detail.html", {"request": request, "event_id": event_id})


@router.get("/admin/coaches")
async def admin_coaches_page(request: Request):
    return templates.TemplateResponse("pages/admin_coaches.html", {"request": request})


@router.get("/admin/practice-plans")
async def admin_practice_plans_page(request: Request):
    return templates.TemplateResponse("pages/admin_practice_plans.html", {"request": request})


@router.get("/admin/player/{player_id}")
async def admin_player_profile_page(request: Request, player_id: int):
    return templates.TemplateResponse("pages/admin_player_profile.html", {"request": request, "player_id": player_id})


@router.get("/players/{player_id}")
async def coach_player_profile_page(request: Request, player_id: int):
    return templates.TemplateResponse("pages/player_profile_page.html", {"request": request, "player_id": player_id})


@router.get("/admin/coach/{coach_id}")
async def admin_coach_profile_page(request: Request, coach_id: int):
    return templates.TemplateResponse("pages/admin_coach_profile.html", {"request": request, "coach_id": coach_id})


@router.get("/admin/support")
async def admin_support_page(request: Request):
    return templates.TemplateResponse("pages/admin_support.html", {"request": request})


@router.get("/admin/login")
async def admin_login_page(request: Request):
    return templates.TemplateResponse("auth/admin_login.html", {"request": request})


@router.get("/admin/register")
async def admin_register_page(request: Request):
    return templates.TemplateResponse("auth/admin_register.html", {"request": request})


# ── Super Admin Portal ───────────────────────────────────────────────────
@router.get("/super-admin/login")
async def super_admin_login_page(request: Request):
    return templates.TemplateResponse("auth/super_admin_login.html", {"request": request})


@router.get("/super-admin")
async def super_admin_dashboard_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/dashboard.html", {"request": request})


@router.get("/super-admin/clubs")
async def super_admin_clubs_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/clubs.html", {"request": request})


@router.get("/super-admin/clubs/new")
async def super_admin_club_create_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/club_create.html", {"request": request})


@router.get("/super-admin/clubs/{club_id}")
async def super_admin_club_detail_page(request: Request, club_id: int):
    return templates.TemplateResponse("pages/super_admin/club_detail.html", {"request": request})


@router.get("/super-admin/billing")
async def super_admin_billing_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/billing.html", {"request": request})


@router.get("/super-admin/billing/{invoice_id}")
async def super_admin_invoice_detail_page(request: Request, invoice_id: int):
    return templates.TemplateResponse("pages/super_admin/invoice_detail.html", {"request": request})


@router.get("/super-admin/tickets")
async def super_admin_tickets_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/tickets.html", {"request": request})


@router.get("/super-admin/tickets/{ticket_id}")
async def super_admin_ticket_detail_page(request: Request, ticket_id: int):
    return templates.TemplateResponse("pages/super_admin/ticket_detail.html", {"request": request})


@router.get("/super-admin/analytics")
async def super_admin_analytics_page(request: Request):
    return templates.TemplateResponse("pages/super_admin/analytics.html", {"request": request})


# ── Club Registration ────────────────────────────────────────────────────
@router.get("/join/club/{token}")
async def join_club_link(request: Request, token: str):
    """Club admin registers via registration link from super admin."""
    return templates.TemplateResponse("auth/club_register.html", {"request": request})
