"""Add explicit personnel type without changing identifiers or historical rows.

Revision ID: 261012_0020
Revises: 260625_0019
"""
from collections import Counter

from alembic import op
import sqlalchemy as sa

from app.domain.personnel_types import classify_legacy_personnel

revision = "261012_0020"
down_revision = "260625_0019"
branch_labels = None
depends_on = None

VALID_TYPES = {"pmo", "sales", "technical", "external"}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    has_column = "personnel_type" in {c["name"] for c in inspector.get_columns("personnel")}
    type_column = "p.personnel_type" if has_column else "NULL AS personnel_type"
    rows = bind.execute(sa.text(
        f"SELECT p.id, p.group_name, p.role_name, r.code AS role_code, {type_column} "
        "FROM personnel p LEFT JOIN roles r ON p.role_id = r.id"
    )).mappings().all()
    conversions = []
    unresolved = Counter()
    for row in rows:
        existing = row["personnel_type"]
        if existing in VALID_TYPES:
            continue
        if existing:
            unresolved[f"invalid type: {existing}"] += 1
            continue
        try:
            value = classify_legacy_personnel(row["group_name"], row["role_code"], row["role_name"])
        except ValueError:
            unresolved[row["group_name"] or "(소속 없음)"] += 1
        else:
            conversions.append({"id": row["id"], "personnel_type": value.value})
    # Preflight before any DDL, including on SQLite with nontransactional DDL.
    if unresolved:
        raise RuntimeError(f"인력 유형 확인 필요 {sum(unresolved.values())}건: {dict(unresolved)}")
    if not has_column:
        op.add_column("personnel", sa.Column("personnel_type", sa.String(9), nullable=True))
    if conversions:
        bind.execute(sa.text(
            "UPDATE personnel SET personnel_type = :personnel_type "
            "WHERE id = :id AND (personnel_type IS NULL OR personnel_type = '')"
        ), conversions)
    constraints = {c["name"] for c in sa.inspect(bind).get_check_constraints("personnel")}
    nullable = next(c["nullable"] for c in sa.inspect(bind).get_columns("personnel") if c["name"] == "personnel_type")
    if nullable or "ck_personnel_personnel_type" not in constraints:
        with op.batch_alter_table("personnel") as batch:
            if nullable:
                batch.alter_column("personnel_type", existing_type=sa.String(9), nullable=False)
            if "ck_personnel_personnel_type" not in constraints:
                batch.create_check_constraint(
                    "personnel_type", "personnel_type IN ('pmo', 'sales', 'technical', 'external')",
                )
    if "ix_personnel_personnel_type" not in {i["name"] for i in sa.inspect(bind).get_indexes("personnel")}:
        op.create_index("ix_personnel_personnel_type", "personnel", ["personnel_type"])


def downgrade() -> None:
    op.drop_index("ix_personnel_personnel_type", table_name="personnel")
    with op.batch_alter_table("personnel") as batch:
        batch.drop_constraint(op.f("ck_personnel_personnel_type"), type_="check")
        batch.drop_column("personnel_type")
