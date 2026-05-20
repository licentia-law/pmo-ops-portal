"""drop redundant project/project_code columns

Revision ID: 260519_0008
Revises: 260519_0007
Create Date: 2026-05-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "260519_0008"
down_revision: str | None = "260519_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_column("owner_department")
        batch_op.drop_column("lead_department")
        batch_op.drop_column("source_sheet")
        batch_op.drop_column("raw_payload")

    with op.batch_alter_table("project_codes") as batch_op:
        batch_op.drop_column("note")


def downgrade() -> None:
    with op.batch_alter_table("project_codes") as batch_op:
        batch_op.add_column(sa.Column("note", sa.Text(), nullable=True))

    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(sa.Column("raw_payload", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("source_sheet", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("lead_department", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("owner_department", sa.String(length=100), nullable=True))

