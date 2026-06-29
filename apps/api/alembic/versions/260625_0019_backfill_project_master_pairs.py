"""backfill project master one-to-one pairs

Revision ID: 260625_0019
Revises: 260624_0018
Create Date: 2026-06-25 12:00:00
"""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision = "260625_0019"
down_revision = "260624_0018"
branch_labels = None
depends_on = None


def _dt(value: object) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


project_codes = sa.table(
    "project_codes",
    sa.column("id", sa.String()),
    sa.column("code", sa.String()),
    sa.column("name", sa.String()),
    sa.column("project_type", sa.String()),
    sa.column("status", sa.String()),
    sa.column("certainty", sa.String()),
    sa.column("is_active", sa.Boolean()),
    sa.column("source_sheet", sa.String()),
    sa.column("created_at", sa.DateTime()),
    sa.column("updated_at", sa.DateTime()),
)

projects = sa.table(
    "projects",
    sa.column("id", sa.String()),
    sa.column("project_code_id", sa.String()),
    sa.column("code", sa.String()),
    sa.column("name", sa.String()),
    sa.column("client_name", sa.String()),
    sa.column("sales_department", sa.String()),
    sa.column("sales_owner", sa.String()),
    sa.column("project_type", sa.String()),
    sa.column("status", sa.String()),
    sa.column("certainty", sa.String()),
    sa.column("proposal_pm_name", sa.String()),
    sa.column("presentation_pm_name", sa.String()),
    sa.column("delivery_pm_name", sa.String()),
    sa.column("amount_text", sa.String()),
    sa.column("total_amount", sa.Numeric()),
    sa.column("company_amount", sa.Numeric()),
    sa.column("start_date", sa.Date()),
    sa.column("end_date", sa.Date()),
    sa.column("bid_notice_no", sa.String()),
    sa.column("bid_notice_date", sa.Date()),
    sa.column("submission_at", sa.DateTime()),
    sa.column("submission_format", sa.String()),
    sa.column("submission_note", sa.Text()),
    sa.column("presentation_at", sa.DateTime()),
    sa.column("presentation_format", sa.String()),
    sa.column("presentation_note", sa.Text()),
    sa.column("recent_activity_at", sa.DateTime()),
    sa.column("memo", sa.Text()),
    sa.column("created_at", sa.DateTime()),
    sa.column("updated_at", sa.DateTime()),
)


def upgrade() -> None:
    bind = op.get_bind()

    missing_projects = bind.execute(
        sa.text(
            """
            SELECT pc.id, pc.code, pc.name, pc.project_type, pc.status, pc.certainty, pc.created_at, pc.updated_at
            FROM project_codes pc
            LEFT JOIN projects p ON p.project_code_id = pc.id
            WHERE p.id IS NULL
            ORDER BY pc.code
            """
        )
    ).mappings()

    for row in missing_projects:
        bind.execute(
            projects.insert().values(
                id=str(uuid4()),
                project_code_id=row["id"],
                code=row["code"],
                name=row["name"],
                client_name=None,
                sales_department=None,
                sales_owner=None,
                project_type=row["project_type"],
                status=row["status"],
                certainty=row["certainty"],
                proposal_pm_name=None,
                presentation_pm_name=None,
                delivery_pm_name=None,
                amount_text=None,
                total_amount=None,
                company_amount=None,
                start_date=None,
                end_date=None,
                bid_notice_no=None,
                bid_notice_date=None,
                submission_at=None,
                submission_format=None,
                submission_note=None,
                presentation_at=None,
                presentation_format=None,
                presentation_note=None,
                recent_activity_at=None,
                memo="1:1 정합성 보정을 위해 자동 생성된 프로젝트",
                created_at=_dt(row["created_at"]),
                updated_at=_dt(row["updated_at"]),
            )
        )

    missing_codes = bind.execute(
        sa.text(
            """
            SELECT p.id, p.code, p.name, p.project_type, p.status, p.certainty, p.created_at, p.updated_at
            FROM projects p
            LEFT JOIN project_codes pc ON pc.id = p.project_code_id
            WHERE p.project_code_id IS NULL OR pc.id IS NULL
            ORDER BY p.code
            """
        )
    ).mappings()

    for row in missing_codes:
        project_code_id = str(uuid4())
        bind.execute(
            project_codes.insert().values(
                id=project_code_id,
                code=row["code"],
                name=row["name"],
                project_type=row["project_type"],
                status=row["status"],
                certainty=row["certainty"],
                is_active=True,
                source_sheet=None,
                created_at=_dt(row["created_at"]),
                updated_at=_dt(row["updated_at"]),
            )
        )
        bind.execute(
            projects.update()
            .where(projects.c.id == row["id"])
            .values(project_code_id=project_code_id)
        )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            DELETE FROM projects
            WHERE memo = '1:1 정합성 보정을 위해 자동 생성된 프로젝트'
            """
        )
    )
