"""add delivery pm name to projects

Revision ID: 260512_0003
Revises: 260511_0002
Create Date: 2026-05-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "260512_0003"
down_revision: str | None = "260511_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("delivery_pm_name", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "delivery_pm_name")

