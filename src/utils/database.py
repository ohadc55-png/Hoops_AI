"""
HOOPS AI - Database Setup
"""
import asyncio
import logging

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

logger = logging.getLogger(__name__)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event as sa_event, inspect as sa_inspect
from config import get_settings

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG, future=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


# SQLite production optimizations: WAL mode + busy timeout (skip for PostgreSQL)
if "sqlite" in settings.DATABASE_URL:
    @sa_event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database via Alembic migrations.

    All schema changes and data seeds are handled by migration files in migrations/versions/.
    """
    from alembic.config import Config as AlembicConfig
    from alembic import command as alembic_command

    alembic_cfg = AlembicConfig("alembic.ini")
    loop = asyncio.get_event_loop()

    # Detect: existing DB without alembic_version table?
    async with engine.connect() as conn:
        has_alembic = await conn.run_sync(
            lambda c: "alembic_version" in sa_inspect(c).get_table_names()
        )
        has_tables = await conn.run_sync(
            lambda c: len(sa_inspect(c).get_table_names()) > 0
        )

    if has_tables and not has_alembic:
        # Existing DB with data → stamp head (all migrations already reflected)
        await loop.run_in_executor(
            None, lambda: alembic_command.stamp(alembic_cfg, "head")
        )
        logger.info("Stamped existing DB at head revision")

    # Run any pending migrations (for fresh DB: creates all tables + seeds)
    await loop.run_in_executor(
        None, lambda: alembic_command.upgrade(alembic_cfg, "head")
    )
    logger.info("Alembic migrations applied (head)")


async def close_db():
    await engine.dispose()
