"""baseline - current schema snapshot

Revision ID: 0001
Revises: None
Create Date: 2026-03-01
"""
from typing import Sequence, Union

from alembic import op
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

# revision identifiers
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # For fresh DBs: create all tables from current model metadata.
    # For existing DBs: this migration is stamped (never executed).
    from src.utils.database import Base
    import src.models  # noqa: F401 — ensure all models are registered

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    # Dropping all tables is not supported for baseline
    pass
