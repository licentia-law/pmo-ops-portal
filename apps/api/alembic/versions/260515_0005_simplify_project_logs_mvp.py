"""simplify project_logs mvp columns

Revision ID: 260515_0005
Revises: 260513_0004
Create Date: 2026-05-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "260515_0005"
down_revision: str | None = "260513_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


project_log_status = sa.Enum("memo", "in_progress", "done", name="projectlogstatus")
project_status = sa.Enum("proposing", "presented", "win", "loss", "drop", "running", "support", "done", name="projectstatus")


def upgrade() -> None:
    bind = op.get_bind()
    project_log_status.create(bind, checkfirst=True)

    with op.batch_alter_table("project_logs") as batch_op:
        batch_op.add_column(sa.Column("log_status", project_log_status, nullable=True))
        batch_op.add_column(sa.Column("updated_by_name", sa.String(length=100), nullable=True))

    op.execute("UPDATE project_logs SET log_status = 'done' WHERE status = 'done'")
    op.execute("UPDATE project_logs SET log_status = 'in_progress' WHERE status IN ('running', 'support', 'proposing', 'presented', 'win')")
    op.execute("UPDATE project_logs SET log_status = 'memo' WHERE log_status IS NULL")
    op.execute("UPDATE project_logs SET updated_by_name = author_name WHERE updated_by_name IS NULL")

    with op.batch_alter_table("project_logs") as batch_op:
        batch_op.alter_column("author_name", existing_type=sa.String(length=100), nullable=False)
        batch_op.alter_column("log_status", existing_type=project_log_status, nullable=False)
        batch_op.drop_column("status")
        batch_op.drop_column("category")
        batch_op.drop_column("author_team")
        batch_op.drop_column("summary")
        batch_op.drop_column("detail")
        batch_op.drop_column("related_schedule_label")
        batch_op.drop_column("related_schedule_at")
        batch_op.drop_column("source_sheet")


def downgrade() -> None:
    with op.batch_alter_table("project_logs") as batch_op:
        batch_op.add_column(sa.Column("source_sheet", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("related_schedule_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("related_schedule_label", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("detail", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("summary", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("author_team", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("category", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("status", project_status, nullable=True))

    op.execute("UPDATE project_logs SET status = 'done' WHERE log_status = 'done'")
    op.execute("UPDATE project_logs SET status = 'running' WHERE log_status = 'in_progress'")
    op.execute("UPDATE project_logs SET status = 'proposing' WHERE log_status = 'memo'")

    with op.batch_alter_table("project_logs") as batch_op:
        batch_op.alter_column("status", existing_type=project_status, nullable=False)
        batch_op.alter_column("author_name", existing_type=sa.String(length=100), nullable=True)
        batch_op.drop_column("updated_by_name")
        batch_op.drop_column("log_status")

    project_log_status.drop(op.get_bind(), checkfirst=True)
