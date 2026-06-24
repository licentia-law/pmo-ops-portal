"""repair personnel MM schema

Revision ID: 260617_0013
Revises: 260617_0012
Create Date: 2026-06-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "260617_0013"
down_revision: str | None = "260617_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _personnel_columns() -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {column["name"] for column in inspector.get_columns("personnel")}


def _add_column_if_missing(column: sa.Column) -> None:
    columns = _personnel_columns()
    if column.name in columns:
        return
    with op.batch_alter_table("personnel") as batch_op:
        batch_op.add_column(column)


def _drop_column_if_exists(column_name: str) -> None:
    columns = _personnel_columns()
    if column_name not in columns:
        return
    with op.batch_alter_table("personnel") as batch_op:
        batch_op.drop_column(column_name)


def _backfill_personnel_date(target_column: str, source_columns: list[str]) -> None:
    columns = _personnel_columns()
    existing_sources = [column for column in source_columns if column in columns]
    if target_column not in columns or not existing_sources:
        return
    source_expression = ", ".join(existing_sources)
    source_checks = " OR ".join(f"{column} IS NOT NULL" for column in existing_sources)
    op.execute(
        f"UPDATE personnel "
        f"SET {target_column} = COALESCE({target_column}, {source_expression}) "
        f"WHERE {target_column} IS NULL AND ({source_checks})"
    )


def upgrade() -> None:
    _add_column_if_missing(sa.Column("mm_start_date", sa.Date(), nullable=True))
    _add_column_if_missing(sa.Column("mm_end_date", sa.Date(), nullable=True))
    _add_column_if_missing(sa.Column("yearly_mm", sa.Numeric(8, 2), nullable=True))

    _backfill_personnel_date("mm_start_date", ["contract_start_date", "employment_start_date"])
    _backfill_personnel_date("mm_end_date", ["contract_end_date", "employment_end_date"])
    columns = _personnel_columns()
    if "yearly_mm" in columns and "total_mm" in columns:
        op.execute(
            "UPDATE personnel "
            "SET yearly_mm = COALESCE(yearly_mm, total_mm) "
            "WHERE yearly_mm IS NULL AND total_mm IS NOT NULL"
        )

    # Drop legacy scaffolding columns that are no longer part of the SSOT.
    for column_name in [
        "department_name",
        "grade_name",
        "joined_on",
        "unit_price",
        "base_mm",
        "monthly_mm",
        "total_mm",
        "employment_start_date",
        "employment_end_date",
        "contract_start_date",
        "contract_end_date",
    ]:
        _drop_column_if_exists(column_name)

    _add_column_if_missing(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    with op.batch_alter_table("personnel") as batch_op:
        batch_op.alter_column("is_active", server_default=None)


def downgrade() -> None:
    # This repair migration is intentionally one-way; old scaffolding columns are not restored.
    return
