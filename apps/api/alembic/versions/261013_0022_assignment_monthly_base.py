"""Explicit monthly assignment input; preserve legacy MM without guessing."""
from alembic import op
import sqlalchemy as sa

revision = "261013_0022"
down_revision = "261012_0021"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE assignmentstatus ADD VALUE IF NOT EXISTS 'cancelled'")
    if "monthly_base_mm" not in {c["name"] for c in sa.inspect(bind).get_columns("project_assignments")}:
        op.add_column("project_assignments", sa.Column("monthly_base_mm", sa.Numeric(6, 2), nullable=True))
    # No backfill: the existing mm/current_mm/total_mm values have different
    # meanings in imported rows. Only explicitly edited/new inputs use this field.


def downgrade():
    bind = op.get_bind()
    if bind.scalar(sa.text("SELECT count(*) FROM project_assignments WHERE monthly_base_mm IS NOT NULL")):
        raise RuntimeError("신규 월 기준 MM이 저장되어 downgrade할 수 없습니다. 먼저 백업/복구 계획을 확인해 주세요.")
    op.drop_column("project_assignments", "monthly_base_mm")
    # PostgreSQL enum label remains: removing it would require rewriting a
    # populated enum and would threaten preserved cancellation history.
