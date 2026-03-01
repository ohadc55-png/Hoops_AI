"""HOOPS AI - Test Configuration & Fixtures"""
import asyncio
import pytest
import pytest_asyncio
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import event as sa_event

# Import Base + all models (registers them with Base.metadata)
from src.utils.database import Base, get_db
import src.models  # noqa: F401 — ensures all models are registered

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


# ── Event Loop ────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    """Single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Database Engine & Session ─────────────────────────────────────────────

@pytest_asyncio.fixture
async def db_engine():
    """Create a fresh in-memory SQLite engine with all tables."""
    engine = create_async_engine(TEST_DB_URL, echo=False)

    @sa_event.listens_for(engine.sync_engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db(db_engine):
    """Transactional database session — rolls back after each test."""
    factory = async_sessionmaker(
        bind=db_engine, class_=AsyncSession, expire_on_commit=False,
    )
    async with factory() as session:
        yield session
        await session.rollback()


# ── HTTP Test Client ──────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(db_engine):
    """HTTP test client with dependency overrides (no lifespan / background tasks)."""
    from httpx import AsyncClient, ASGITransport
    import app as app_module

    factory = async_sessionmaker(
        bind=db_engine, class_=AsyncSession, expire_on_commit=False,
    )

    async def _test_get_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    # Replace lifespan to skip init_db + background tasks
    @asynccontextmanager
    async def _test_lifespan(_app):
        yield

    original_lifespan = app_module.app.router.lifespan_context
    app_module.app.router.lifespan_context = _test_lifespan
    app_module.app.dependency_overrides[get_db] = _test_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app_module.app),
        base_url="http://test",
    ) as ac:
        yield ac

    app_module.app.dependency_overrides.clear()
    app_module.app.router.lifespan_context = original_lifespan


# ── Auth Helpers ──────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def admin_token(client):
    """Register + login an admin, return the JWT token."""
    res = await client.post("/api/admin-auth/register", json={
        "name": "Test Admin",
        "email": "testadmin@test.com",
        "password": "test123456",
    })
    assert res.status_code == 200, f"Admin register failed: {res.text}"
    return res.json()["data"]["token"]


@pytest_asyncio.fixture
async def coach_token(client):
    """Register + login a coach, return the JWT token."""
    res = await client.post("/api/auth/register", json={
        "name": "Test Coach",
        "email": "testcoach@test.com",
        "password": "test123456",
    })
    assert res.status_code == 200, f"Coach register failed: {res.text}"
    return res.json()["data"]["token"]


def auth_headers(token: str) -> dict:
    """Build Authorization header dict from a JWT token."""
    return {"Authorization": f"Bearer {token}"}
