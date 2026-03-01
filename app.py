"""
HOOPS AI - Application Entry Point
Basketball Coaching Assistant
"""
import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from src.utils.exceptions import AppError
from config import get_settings, BASE_DIR, DATA_DIR

# Import models to register with Base
import src.models  # noqa: F401
from src.utils.database import init_db, close_db
from src.tasks.background import create_all_tasks, recalculate_attendance_streaks

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
from src.api.parent_progress import router as parent_progress_router
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
from src.api.admin_practice import router as admin_practice_router
from src.api.pages import router as pages_router

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(DATA_DIR / "database", exist_ok=True)
    os.makedirs(DATA_DIR / "database" / "chroma", exist_ok=True)
    os.makedirs(DATA_DIR / "uploads", exist_ok=True)
    os.makedirs(DATA_DIR / "uploads" / "knowledge", exist_ok=True)
    os.makedirs(DATA_DIR / "uploads" / "videos", exist_ok=True)
    await init_db()
    await recalculate_attendance_streaks()
    all_tasks = create_all_tasks()
    yield
    # Shutdown — cancel all background tasks and await their completion
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

# Global exception handler — catches AppError from services
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


# Static files & templates
_videos_dir = DATA_DIR / "uploads" / "videos"
os.makedirs(_videos_dir, exist_ok=True)
app.mount("/uploads/videos", StaticFiles(directory=str(_videos_dir)), name="uploaded-videos")
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

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
app.include_router(parent_progress_router)
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
app.include_router(admin_practice_router)
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
# Page routes (HTML template rendering)
app.include_router(pages_router)


# --- Utility Endpoints ---
@app.get("/health")
async def health():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/run-seed-once")
async def run_seed_once():
    """One-time seed endpoint — remove after use."""
    import subprocess
    result = subprocess.run(["python", "seed_data.py"], capture_output=True, text=True, timeout=120)
    return {"stdout": result.stdout[-1000:], "stderr": result.stderr[-500:], "code": result.returncode}


@app.get("/debug-admins")
async def debug_admins():
    """Temp: show admin users in DB — remove after use."""
    from sqlalchemy import select
    from src.utils.database import AsyncSessionLocal
    from src.models.user import User
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(User).where(User.role == "admin"))
        admins = [{"id": u.id, "email": u.email, "name": u.name} for u in r.scalars().all()]
    return {"admins": admins, "count": len(admins)}


@app.get("/run-platform-seed")
async def run_platform_seed():
    """One-time platform seed endpoint — remove after use."""
    import subprocess
    result = subprocess.run(["python", "seed_platform.py"], capture_output=True, text=True, timeout=120)
    return {"stdout": result.stdout[-2000:], "stderr": result.stderr[-500:], "code": result.returncode}


@app.post("/api/test-volume")
async def test_volume_write():
    """Write a dummy doc to ChromaDB to test volume persistence — remove after use."""
    import chromadb
    client = chromadb.PersistentClient(path=settings.CHROMA_DIR)
    collection = client.get_or_create_collection("volume_test")
    collection.upsert(
        ids=["test_doc_1"],
        documents=["This is a persistence test document for Railway volume."],
        metadatas=[{"source": "test", "created": "2026-03-01"}],
    )
    count = collection.count()
    return {
        "status": "written",
        "collection": "volume_test",
        "doc_count": count,
        "chroma_dir": settings.CHROMA_DIR,
    }


@app.get("/api/test-volume")
async def test_volume_read():
    """Read the dummy doc from ChromaDB to verify persistence — remove after use."""
    import chromadb
    client = chromadb.PersistentClient(path=settings.CHROMA_DIR)
    try:
        collection = client.get_collection("volume_test")
    except Exception:
        return {"status": "not_found", "message": "Collection 'volume_test' does not exist. POST first."}
    result = collection.get(ids=["test_doc_1"])
    count = collection.count()
    return {
        "status": "found",
        "doc_count": count,
        "documents": result["documents"],
        "metadatas": result["metadatas"],
        "chroma_dir": settings.CHROMA_DIR,
    }


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
