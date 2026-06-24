"""add roles and personnel role fk

Revision ID: 260616_0010
Revises: 260519_0009
Create Date: 2026-06-16
"""

from collections.abc import Sequence
from datetime import datetime
import re
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "260616_0010"
down_revision: str | None = "260519_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def make_role_code(name: str, index: int, used_codes: set[str]) -> str:
    raw_code = re.sub(r"[^A-Za-z0-9_]+", "_", name).strip("_").upper() or f"ROLE_{index:03d}"
    base_code = raw_code[:50] or f"ROLE_{index:03d}"
    code = base_code
    counter = 2
    while code in used_codes:
        suffix = f"_{counter}"
        code = f"{base_code[: 50 - len(suffix)]}{suffix}"
        counter += 1
    used_codes.add(code)
    return code


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("job_group", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_roles_code", "roles", ["code"])
    with op.batch_alter_table("personnel") as batch_op:
        batch_op.add_column(sa.Column("role_id", sa.String(length=36), nullable=True))
        batch_op.create_foreign_key("fk_personnel_role_id_roles", "roles", ["role_id"], ["id"])

    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            "SELECT DISTINCT role_name FROM personnel "
            "WHERE role_name IS NOT NULL AND TRIM(role_name) != '' ORDER BY role_name"
        )
    ).fetchall()
    now = datetime.utcnow()
    role_records: list[dict[str, object]] = []
    used_codes: set[str] = set()
    role_ids_by_name: dict[str, str] = {}
    for index, row in enumerate(rows, start=1):
        name = str(row[0]).strip()
        code = make_role_code(name, index, used_codes)
        role_id = str(uuid4())
        role_ids_by_name[name] = role_id
        role_records.append(
            {
                "id": role_id,
                "code": code,
                "name": name,
                "job_group": None,
                "description": None,
                "is_active": True,
                "sort_order": index,
                "created_at": now,
                "updated_at": now,
            }
        )
    if role_records:
        roles_table = sa.table(
            "roles",
            sa.column("id", sa.String),
            sa.column("code", sa.String),
            sa.column("name", sa.String),
            sa.column("job_group", sa.String),
            sa.column("description", sa.Text),
            sa.column("is_active", sa.Boolean),
            sa.column("sort_order", sa.Integer),
            sa.column("created_at", sa.DateTime),
            sa.column("updated_at", sa.DateTime),
        )
        op.bulk_insert(roles_table, role_records)
        for name, role_id in role_ids_by_name.items():
            bind.execute(
                sa.text("UPDATE personnel SET role_id = :role_id WHERE TRIM(role_name) = :name"),
                {"role_id": role_id, "name": name},
            )


def downgrade() -> None:
    with op.batch_alter_table("personnel") as batch_op:
        batch_op.drop_constraint("fk_personnel_role_id_roles", type_="foreignkey")
        batch_op.drop_column("role_id")
    op.drop_index("ix_roles_code", table_name="roles")
    op.drop_table("roles")
