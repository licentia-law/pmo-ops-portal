"""drop unused project owner/pre_notice columns

Revision ID: 260519_0006
Revises: 260515_0005
Create Date: 2026-05-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "260519_0006"
down_revision: str | None = "260515_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_column("pre_notice_no")
        batch_op.drop_column("pre_notice_date")

    with op.batch_alter_table("project_codes") as batch_op:
        batch_op.drop_column("owner_name")


def downgrade() -> None:
    with op.batch_alter_table("project_codes") as batch_op:
        batch_op.add_column(sa.Column("owner_name", sa.String(length=100), nullable=True))

    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(sa.Column("pre_notice_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("pre_notice_no", sa.String(length=100), nullable=True))

