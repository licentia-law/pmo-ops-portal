"""drop redundant project_codes fields

Revision ID: 260519_0009
Revises: 260519_0008
Create Date: 2026-05-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "260519_0009"
down_revision: str | None = "260519_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("project_codes") as batch_op:
        batch_op.drop_column("sales_department")
        batch_op.drop_column("sales_owner")
        batch_op.drop_column("start_date")
        batch_op.drop_column("end_date")


def downgrade() -> None:
    with op.batch_alter_table("project_codes") as batch_op:
        batch_op.add_column(sa.Column("end_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("start_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("sales_owner", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("sales_department", sa.String(length=100), nullable=True))

