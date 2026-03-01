"""consolidate legacy column additions

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-01

Replaces the ~40 ALTER TABLE statements from init_db() with a proper migration.
Uses try/except because fresh DBs already have these columns from 0001 baseline.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _safe_add_column(table: str, column: sa.Column):
    """Add a column, silently skip if it already exists (SQLite compat)."""
    try:
        op.add_column(table, column)
    except Exception:
        pass


def upgrade() -> None:
    # Events
    _safe_add_column("events", sa.Column("recurrence_group", sa.String(36)))
    _safe_add_column("events", sa.Column("end_time", sa.String(10)))
    _safe_add_column("events", sa.Column("location", sa.String(200)))

    # Coaches
    _safe_add_column("coaches", sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id")))

    # Players
    _safe_add_column("players", sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id")))
    _safe_add_column("players", sa.Column("current_attendance_streak", sa.Integer, server_default="0", nullable=False))
    _safe_add_column("players", sa.Column("highest_attendance_streak", sa.Integer, server_default="0", nullable=False))

    # Users
    _safe_add_column("users", sa.Column("admin_role_id", sa.Integer, sa.ForeignKey("admin_roles.id")))
    _safe_add_column("users", sa.Column("phone", sa.String(20)))
    _safe_add_column("users", sa.Column("date_of_birth", sa.Date))

    # Teams
    _safe_add_column("teams", sa.Column("parent_invite_code", sa.String(10)))
    _safe_add_column("teams", sa.Column("parent_invite_token", sa.String(36)))

    # Conversations
    _safe_add_column("conversations", sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id")))

    # Drills
    _safe_add_column("drills", sa.Column("video_url", sa.String(500)))

    # Game Reports
    _safe_add_column("game_reports", sa.Column("team_event_id", sa.Integer, sa.ForeignKey("team_events.id")))

    # Team Events (away game support)
    _safe_add_column("team_events", sa.Column("is_away", sa.Boolean, server_default="0"))
    _safe_add_column("team_events", sa.Column("departure_time", sa.String(5)))
    _safe_add_column("team_events", sa.Column("venue_address", sa.String(500)))

    # Plays (sharing)
    _safe_add_column("plays", sa.Column("shared_with_team", sa.Boolean, server_default="0"))
    _safe_add_column("plays", sa.Column("team_id", sa.Integer, sa.ForeignKey("teams.id")))

    # Drill Assignments (video proof)
    _safe_add_column("drill_assignments", sa.Column("status", sa.String(20), server_default="pending", nullable=False))
    _safe_add_column("drill_assignments", sa.Column("video_url", sa.String(500)))
    _safe_add_column("drill_assignments", sa.Column("coach_feedback", sa.Text))

    # Scouting (parent sharing)
    _safe_add_column("scouting_videos", sa.Column("shared_with_parents", sa.Boolean, server_default="0"))

    # Admin Roles (permissions)
    _safe_add_column("admin_roles", sa.Column("permissions", sa.Text))

    # Player Evaluations (progress tracking)
    _safe_add_column("player_evaluations", sa.Column("personal_improvement_rating", sa.Integer))
    _safe_add_column("player_evaluations", sa.Column("personal_improvement_notes", sa.Text))
    _safe_add_column("player_evaluations", sa.Column("team_contribution_rating", sa.Integer))
    _safe_add_column("player_evaluations", sa.Column("team_contribution_notes", sa.Text))

    # Player Reports (progress tracking)
    _safe_add_column("player_reports", sa.Column("overall_rating", sa.Integer))
    _safe_add_column("player_reports", sa.Column("personal_improvement_rating", sa.Integer))
    _safe_add_column("player_reports", sa.Column("personal_improvement_notes", sa.Text))
    _safe_add_column("player_reports", sa.Column("team_contribution_rating", sa.Integer))
    _safe_add_column("player_reports", sa.Column("team_contribution_notes", sa.Text))

    # Practice Sessions (summaries)
    _safe_add_column("practice_sessions", sa.Column("goal_achieved", sa.String(20)))
    _safe_add_column("practice_sessions", sa.Column("what_worked", sa.Text))
    _safe_add_column("practice_sessions", sa.Column("what_didnt_work", sa.Text))
    _safe_add_column("practice_sessions", sa.Column("standout_players", sa.Text))
    _safe_add_column("practice_sessions", sa.Column("attention_players", sa.Text))

    # Facilities (manager info)
    _safe_add_column("facilities", sa.Column("manager_name", sa.String(100)))
    _safe_add_column("facilities", sa.Column("manager_phone", sa.String(30)))

    # Installments / Charges (admin acknowledgement)
    _safe_add_column("installments", sa.Column("admin_acknowledged", sa.Boolean, server_default="1", nullable=False))
    _safe_add_column("one_time_charges", sa.Column("admin_acknowledged", sa.Boolean, server_default="1", nullable=False))

    # PlatformClub billing details
    _safe_add_column("platform_clubs", sa.Column("billing_tax_id", sa.String(50)))
    _safe_add_column("platform_clubs", sa.Column("billing_address", sa.Text))
    _safe_add_column("platform_clubs", sa.Column("billing_phone", sa.String(30)))
    _safe_add_column("platform_clubs", sa.Column("notes", sa.Text))

    # --- Data backfills ---

    # Backfill drill_assignment status from is_completed
    bind = op.get_bind()
    try:
        bind.execute(sa.text(
            "UPDATE drill_assignments SET status = 'approved' WHERE is_completed = 1 AND status = 'pending'"
        ))
    except Exception:
        pass

    # Backfill parent invite codes for teams missing them
    try:
        import random
        import string as string_mod
        import uuid as uuid_mod
        result = bind.execute(sa.text("SELECT id FROM teams WHERE parent_invite_code IS NULL"))
        for row in result.fetchall():
            code = "".join(random.choices(string_mod.ascii_uppercase + string_mod.digits, k=6))
            token = str(uuid_mod.uuid4())
            bind.execute(sa.text(
                "UPDATE teams SET parent_invite_code = :code, parent_invite_token = :token WHERE id = :id"
            ), {"code": code, "token": token, "id": row[0]})
    except Exception:
        pass


def downgrade() -> None:
    # Dropping columns in SQLite requires batch mode (table recreation).
    # Not implementing downgrade for legacy consolidation.
    pass
