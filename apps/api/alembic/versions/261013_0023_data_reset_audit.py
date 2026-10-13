"""Transactional reset audit history outside the business data set."""
from alembic import op
import sqlalchemy as sa

revision = "261013_0023"
down_revision = "261013_0022"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if sa.inspect(bind).has_table("data_reset_audits"):
        return
    op.create_table(
        "data_reset_audits",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("validation_id", sa.String(36), nullable=False),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("actor_user_id", sa.String(36), nullable=False),
        sa.Column("actor_name", sa.String(100), nullable=False),
        sa.Column("actor_email", sa.String(255), nullable=False),
        sa.Column("pre_backup_id", sa.String(100), nullable=True),
        sa.Column("before_counts", sa.JSON(), nullable=False),
        sa.Column("memo", sa.Text(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("status IN ('success', 'failed')", name="ck_data_reset_audit_status"),
    )
    op.create_index("ix_data_reset_audits_validation_id", "data_reset_audits", ["validation_id"])


def downgrade():
    bind = op.get_bind()
    if bind.scalar(sa.text("SELECT count(*) FROM data_reset_audits")):
        raise RuntimeError("초기화 감사 이력이 있어 downgrade할 수 없습니다. DB 사본과 복구 계획을 먼저 보존해 주세요.")
    op.drop_index("ix_data_reset_audits_validation_id", table_name="data_reset_audits")
    op.drop_table("data_reset_audits")
