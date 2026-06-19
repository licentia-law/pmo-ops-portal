"""job locks

Revision ID: 260619_0015
Revises: 260619_0014
Create Date: 2026-06-19 15:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "260619_0015"
down_revision = "260619_0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_locks",
        sa.Column("job_name", sa.String(length=100), nullable=False),
        sa.Column("locked_at", sa.DateTime(), nullable=False),
        sa.Column("locked_by", sa.String(length=100), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("job_name"),
    )


def downgrade() -> None:
    op.drop_table("job_locks")
