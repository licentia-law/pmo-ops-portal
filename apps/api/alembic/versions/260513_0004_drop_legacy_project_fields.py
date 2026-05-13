"""drop legacy project fields

Revision ID: 260513_0004
Revises: 260512_0003
Create Date: 2026-05-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "260513_0004"
down_revision: str | None = "260512_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("project_codes") as batch_op:
        batch_op.drop_column("support_lead")

    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_column("pm_name")
        batch_op.drop_column("support_lead")
        batch_op.drop_column("proposal_team_text")
        batch_op.drop_column("currency")


def downgrade() -> None:
    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(sa.Column("currency", sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column("proposal_team_text", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("support_lead", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("pm_name", sa.String(length=100), nullable=True))

    with op.batch_alter_table("project_codes") as batch_op:
        batch_op.add_column(sa.Column("support_lead", sa.String(length=100), nullable=True))
