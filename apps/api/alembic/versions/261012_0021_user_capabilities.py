"""Add per-user capabilities; existing admins receive no automatic grants."""
from alembic import op
import sqlalchemy as sa

revision = "261012_0021"
down_revision = "261012_0020"
branch_labels = None
depends_on = None

CAPABILITIES = (
    "project_excel_manage", "personnel_excel_manage", "assignment_manage",
    "backup_restore", "data_reset", "permissions_manage",
)


def upgrade() -> None:
    bind = op.get_bind()
    if "is_developer" not in {c["name"] for c in sa.inspect(bind).get_columns("users")}:
        op.add_column("users", sa.Column("is_developer", sa.Boolean(), nullable=False, server_default=sa.false()))
    if "user_capabilities" not in sa.inspect(bind).get_table_names():
        op.create_table(
            "user_capabilities",
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("capability", sa.String(22), primary_key=True),
            sa.Column("granted_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.CheckConstraint("capability IN (" + ", ".join(repr(code) for code in CAPABILITIES) + ")", name="capability"),
        )


def downgrade() -> None:
    op.drop_table("user_capabilities")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("is_developer")
