"""
HOOPS AI - Database Setup
"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event as sa_event
from config import get_settings

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG, future=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


# SQLite production optimizations: WAL mode + busy timeout
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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight migrations for existing tables
        from sqlalchemy import text
        for stmt in [
            "ALTER TABLE events ADD COLUMN recurrence_group VARCHAR(36)",
            "ALTER TABLE coaches ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE players ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE users ADD COLUMN admin_role_id INTEGER REFERENCES admin_roles(id)",
            "ALTER TABLE teams ADD COLUMN parent_invite_code VARCHAR(10)",
            "ALTER TABLE teams ADD COLUMN parent_invite_token VARCHAR(36)",
            "ALTER TABLE conversations ADD COLUMN user_id INTEGER REFERENCES users(id)",
            "ALTER TABLE users ADD COLUMN phone VARCHAR(20)",
            "ALTER TABLE users ADD COLUMN date_of_birth DATE",
            "ALTER TABLE drills ADD COLUMN video_url VARCHAR(500)",
            "ALTER TABLE game_reports ADD COLUMN team_event_id INTEGER REFERENCES team_events(id)",
            "ALTER TABLE team_events ADD COLUMN is_away BOOLEAN DEFAULT 0",
            "ALTER TABLE team_events ADD COLUMN departure_time VARCHAR(5)",
            "ALTER TABLE team_events ADD COLUMN venue_address VARCHAR(500)",
            "ALTER TABLE plays ADD COLUMN shared_with_team BOOLEAN DEFAULT 0",
            "ALTER TABLE plays ADD COLUMN team_id INTEGER REFERENCES teams(id)",
            # Gamification: Attendance Streak
            "ALTER TABLE players ADD COLUMN current_attendance_streak INTEGER DEFAULT 0 NOT NULL",
            "ALTER TABLE players ADD COLUMN highest_attendance_streak INTEGER DEFAULT 0 NOT NULL",
            # Gamification: Drill Video Proof
            "ALTER TABLE drill_assignments ADD COLUMN status VARCHAR(20) DEFAULT 'pending' NOT NULL",
            "ALTER TABLE drill_assignments ADD COLUMN video_url VARCHAR(500)",
            "ALTER TABLE drill_assignments ADD COLUMN coach_feedback TEXT",
            # Scouting: Parent sharing
            "ALTER TABLE scouting_videos ADD COLUMN shared_with_parents BOOLEAN DEFAULT 0",
        ]:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass  # Column already exists

        # Backfill drill_assignment status from is_completed
        try:
            await conn.execute(text(
                "UPDATE drill_assignments SET status = 'approved' WHERE is_completed = 1 AND status = 'pending'"
            ))
        except Exception:
            pass

        # Seed default admin roles
        for role_name in ["\u05de\u05e0\u05db\u05f4\u05dc", "\u05d9\u05d5\u05f4\u05e8", "\u05d2\u05d6\u05d1\u05e8", "\u05de\u05e0\u05d4\u05dc \u05de\u05e7\u05e6\u05d5\u05e2\u05d9", "\u05de\u05e0\u05d4\u05dc \u05ea\u05e4\u05e2\u05d5\u05dc"]:
            try:
                await conn.execute(text(
                    "INSERT INTO admin_roles (name, is_default, is_active, created_at, updated_at) "
                    "VALUES (:name, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                ), {"name": role_name})
            except Exception:
                pass  # Already seeded

        # Migrate conversations table: make coach_id nullable + add user_id
        # SQLite doesn't support ALTER COLUMN, so we recreate the table
        try:
            # Check if coach_id is still NOT NULL (needs migration)
            result = await conn.execute(text("PRAGMA table_info(conversations)"))
            cols = {row[1]: row for row in result.fetchall()}
            needs_migration = "coach_id" in cols and cols["coach_id"][3] == 1  # notnull=1
            if needs_migration:
                await conn.execute(text("""
                    CREATE TABLE conversations_tmp (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        coach_id INTEGER REFERENCES coaches(id),
                        user_id INTEGER REFERENCES users(id),
                        title VARCHAR(255),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                await conn.execute(text("""
                    INSERT INTO conversations_tmp (id, coach_id, title, created_at, updated_at)
                    SELECT id, coach_id, title, created_at, updated_at FROM conversations
                """))
                await conn.execute(text("DROP TABLE conversations"))
                await conn.execute(text("ALTER TABLE conversations_tmp RENAME TO conversations"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_coach_id ON conversations(coach_id)"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations(user_id)"))
        except Exception:
            pass

        # Backfill parent invite codes for existing teams
        import random, string as string_mod, uuid as uuid_mod
        try:
            result = await conn.execute(text("SELECT id FROM teams WHERE parent_invite_code IS NULL"))
            for row in result.fetchall():
                code = ''.join(random.choices(string_mod.ascii_uppercase + string_mod.digits, k=6))
                token = str(uuid_mod.uuid4())
                await conn.execute(text(
                    "UPDATE teams SET parent_invite_code = :code, parent_invite_token = :token WHERE id = :id"
                ), {"code": code, "token": token, "id": row[0]})
        except Exception:
            pass


async def close_db():
    await engine.dispose()
