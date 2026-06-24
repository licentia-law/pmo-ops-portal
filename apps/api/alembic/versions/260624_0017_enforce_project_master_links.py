"""enforce project master one-to-one links

Revision ID: 260624_0017
Revises: 260622_0016
Create Date: 2026-06-24 18:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "260624_0017"
down_revision = "260622_0016"
branch_labels = None
depends_on = None


def _duplicate_values(bind: sa.Connection, column_name: str) -> list[str]:
    rows = bind.execute(
        sa.text(
            f"SELECT {column_name} FROM projects "
            f"WHERE {column_name} IS NOT NULL "
            f"GROUP BY {column_name} HAVING COUNT(*) > 1"
        )
    ).scalars()
    return [str(value) for value in rows]


def upgrade() -> None:
    bind = op.get_bind()
    duplicate_links = _duplicate_values(bind, "project_code_id")
    duplicate_codes = _duplicate_values(bind, "code")
    if duplicate_links or duplicate_codes:
        details: list[str] = []
        if duplicate_links:
            details.append(f"project_code_id={', '.join(duplicate_links)}")
        if duplicate_codes:
            details.append(f"code={', '.join(duplicate_codes)}")
        raise RuntimeError("프로젝트 마스터 중복 데이터를 정리한 후 마이그레이션을 다시 실행하세요: " + "; ".join(details))

    with op.batch_alter_table("projects") as batch_op:
        batch_op.create_unique_constraint("uq_projects_project_code_id", ["project_code_id"])
        batch_op.create_unique_constraint("uq_projects_code", ["code"])


def downgrade() -> None:
    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_constraint("uq_projects_code", type_="unique")
        batch_op.drop_constraint("uq_projects_project_code_id", type_="unique")
