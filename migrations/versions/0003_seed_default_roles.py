"""seed default admin roles

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-01

Moves default role seeding from init_db() into a proper migration.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import json

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_DEFAULT_ROLES = [
    ('מנכ"ל', None),
    ('יו"ר', None),
    ("גזבר", json.dumps({"allowed_pages": ["dashboard", "billing", "contacts", "messages", "insights"]})),
    ("מנהל מקצועי", json.dumps({"allowed_pages": ["dashboard", "schedule", "teams", "contacts", "scouting", "knowledge", "coaches", "player_development", "messages"]})),
    ("מנהל תפעול", json.dumps({"allowed_pages": ["dashboard", "schedule", "teams", "contacts", "facilities", "transport", "messages", "scouting"]})),
]


def upgrade() -> None:
    bind = op.get_bind()
    for role_name, role_perms in _DEFAULT_ROLES:
        # Insert if not exists
        try:
            bind.execute(sa.text(
                "INSERT INTO admin_roles (name, is_default, is_active, permissions, created_at, updated_at) "
                "VALUES (:name, 1, 1, :permissions, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
            ), {"name": role_name, "permissions": role_perms})
        except Exception:
            pass  # Already exists

    # Backfill permissions for existing roles that have NULL permissions
    _backfill = [
        ("גזבר", json.dumps({"allowed_pages": ["dashboard", "billing", "contacts", "messages", "insights"]})),
        ("מנהל מקצועי", json.dumps({"allowed_pages": ["dashboard", "schedule", "teams", "contacts", "scouting", "knowledge", "coaches", "player_development", "messages"]})),
        ("מנהל תפעול", json.dumps({"allowed_pages": ["dashboard", "schedule", "teams", "contacts", "facilities", "transport", "messages", "scouting"]})),
    ]
    for role_name, role_perms in _backfill:
        try:
            bind.execute(sa.text(
                "UPDATE admin_roles SET permissions = :permissions WHERE name = :name AND permissions IS NULL"
            ), {"name": role_name, "permissions": role_perms})
        except Exception:
            pass


def downgrade() -> None:
    pass
