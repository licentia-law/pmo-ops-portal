"""holiday admin fields

Revision ID: 260617_0003
Revises: 260617_0013
Create Date: 2026-06-17 16:35:00
"""

from alembic import op
import sqlalchemy as sa


revision = "260617_0003"
down_revision = "260617_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("holidays") as batch_op:
        batch_op.add_column(sa.Column("repeats_annually", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.add_column(sa.Column("note", sa.Text(), nullable=True))
    with op.batch_alter_table("holidays") as batch_op:
        batch_op.alter_column("repeats_annually", server_default=None)
        batch_op.alter_column("is_active", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("holidays") as batch_op:
        batch_op.drop_column("note")
        batch_op.drop_column("is_active")
        batch_op.drop_column("repeats_annually")
