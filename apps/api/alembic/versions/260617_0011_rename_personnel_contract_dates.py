"""rename personnel mm date columns to contract dates

Revision ID: 260617_0011
Revises: 260616_0010
Create Date: 2026-06-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "260617_0011"
down_revision: str | None = "260616_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("personnel") as batch_op:
        batch_op.alter_column("mm_start_date", new_column_name="contract_start_date", existing_type=sa.Date())
        batch_op.alter_column("mm_end_date", new_column_name="contract_end_date", existing_type=sa.Date())


def downgrade() -> None:
    with op.batch_alter_table("personnel") as batch_op:
        batch_op.alter_column("contract_start_date", new_column_name="mm_start_date", existing_type=sa.Date())
        batch_op.alter_column("contract_end_date", new_column_name="mm_end_date", existing_type=sa.Date())
