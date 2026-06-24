"""add canonical sales owner role

Revision ID: 260624_0018
Revises: 260624_0017
"""

from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision = "260624_0018"
down_revision = "260624_0017"
branch_labels = None
depends_on = None

SYSTEM_ROLES = (
    ("PM", "PM", "PMO", 10),
    ("PL", "PL", "PMO", 20),
    ("SALES_OWNER", "영업대표", "영업", 30),
)

def upgrade() -> None:
    bind = op.get_bind()
    now = datetime.utcnow()
    for code, name, job_group, sort_order in SYSTEM_ROLES:
        row = bind.execute(sa.text("SELECT id FROM roles WHERE code = :code"), {"code": code}).first()
        if row is None:
            row = bind.execute(sa.text("SELECT id FROM roles WHERE name = :name"), {"name": name}).first()
            if row is not None:
                bind.execute(sa.text("UPDATE roles SET code=:code, job_group=:job_group, sort_order=:sort_order, is_active=1, updated_at=:now WHERE id=:id"), {"code": code, "job_group": job_group, "sort_order": sort_order, "now": now, "id": row.id})
                continue
            bind.execute(sa.text("INSERT INTO roles (id, code, name, job_group, description, is_active, sort_order, created_at, updated_at) VALUES (:id, :code, :name, :job_group, NULL, 1, :sort_order, :now, :now)"), {"id": str(uuid4()), "code": code, "name": name, "job_group": job_group, "sort_order": sort_order, "now": now})
        else:
            bind.execute(sa.text("UPDATE roles SET name=:name, job_group=:job_group, sort_order=:sort_order, is_active=1, updated_at=:now WHERE id=:id"), {"name": name, "job_group": job_group, "sort_order": sort_order, "now": now, "id": row.id})

def downgrade() -> None:
    pass
