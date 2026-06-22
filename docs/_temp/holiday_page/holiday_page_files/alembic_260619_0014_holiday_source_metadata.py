"""holiday source metadata

Revision ID: 260619_0014
Revises: 260617_0003
Create Date: 2026-06-19 11:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "260619_0014"
down_revision = "260617_0003"
branch_labels = None
depends_on = None

holiday_source_kind = sa.Enum("manual", "seed", "external_api", name="holidaysourcekind")


def upgrade() -> None:
    bind = op.get_bind()
    holiday_source_kind.create(bind, checkfirst=True)
    with op.batch_alter_table("holidays") as batch_op:
        batch_op.add_column(
            sa.Column(
                "source_kind",
                holiday_source_kind,
                nullable=False,
                server_default="manual",
            )
        )
        batch_op.add_column(sa.Column("source_provider", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("source_external_id", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("source_year", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("last_synced_at", sa.DateTime(), nullable=True))
    op.execute("UPDATE holidays SET source_kind = 'seed'")
    op.execute("UPDATE holidays SET source_year = CAST(strftime('%Y', holiday_date) AS INTEGER)")
    with op.batch_alter_table("holidays") as batch_op:
        batch_op.alter_column("source_kind", server_default=None)
    op.create_index(
        "ix_holidays_source_provider_external_id",
        "holidays",
        ["source_provider", "source_external_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_holidays_source_provider_external_id", table_name="holidays")
    with op.batch_alter_table("holidays") as batch_op:
        batch_op.drop_column("last_synced_at")
        batch_op.drop_column("source_year")
        batch_op.drop_column("source_external_id")
        batch_op.drop_column("source_provider")
        batch_op.drop_column("source_kind")
    holiday_source_kind.drop(op.get_bind(), checkfirst=True)
