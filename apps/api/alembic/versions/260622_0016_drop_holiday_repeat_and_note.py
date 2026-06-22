"""drop holiday repeat and note

Revision ID: 260622_0016
Revises: 260619_0015
Create Date: 2026-06-22 18:20:00
"""

from alembic import op
import sqlalchemy as sa


revision = "260622_0016"
down_revision = "260619_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("holidays") as batch_op:
        batch_op.drop_column("note")
        batch_op.drop_column("repeats_annually")


def downgrade() -> None:
    with op.batch_alter_table("holidays") as batch_op:
        batch_op.add_column(sa.Column("repeats_annually", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("note", sa.Text(), nullable=True))
    with op.batch_alter_table("holidays") as batch_op:
        batch_op.alter_column("repeats_annually", server_default=None)
