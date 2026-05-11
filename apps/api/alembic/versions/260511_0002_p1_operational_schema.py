"""p1 operational schema

Revision ID: 260511_0002
Revises: 260508_0001
Create Date: 2026-05-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "260511_0002"
down_revision: str | None = "260508_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

project_status = sa.Enum(
    "proposing", "presented", "win", "loss", "drop", "running", "support", "done",
    name="projectstatus",
)
assignment_type = sa.Enum("delivery", "proposal", "support", "unassigned", name="assignmenttype")


def upgrade() -> None:
    op.add_column("personnel", sa.Column("employee_no", sa.String(length=50), nullable=True))
    op.add_column("personnel", sa.Column("group_name", sa.String(length=100), nullable=True))
    op.add_column("personnel", sa.Column("department_name", sa.String(length=100), nullable=True))
    op.add_column("personnel", sa.Column("position_name", sa.String(length=100), nullable=True))
    op.add_column("personnel", sa.Column("grade_name", sa.String(length=50), nullable=True))
    op.add_column("personnel", sa.Column("joined_on", sa.Date(), nullable=True))
    op.add_column("personnel", sa.Column("employment_start_date", sa.Date(), nullable=True))
    op.add_column("personnel", sa.Column("employment_end_date", sa.Date(), nullable=True))
    op.add_column("personnel", sa.Column("unit_price", sa.Numeric(14, 2), nullable=True))
    op.add_column("personnel", sa.Column("base_mm", sa.Numeric(6, 2), nullable=True))
    op.add_column("personnel", sa.Column("monthly_mm", sa.JSON(), nullable=True))
    op.add_column("personnel", sa.Column("total_mm", sa.Numeric(8, 2), nullable=True))
    op.add_column("personnel", sa.Column("note", sa.Text(), nullable=True))
    op.create_index("ix_personnel_employee_no_unique", "personnel", ["employee_no"], unique=True)

    op.add_column("project_codes", sa.Column("certainty", sa.String(length=50), nullable=True))
    op.add_column("project_codes", sa.Column("sales_department", sa.String(length=100), nullable=True))
    op.add_column("project_codes", sa.Column("sales_owner", sa.String(length=100), nullable=True))
    op.add_column("project_codes", sa.Column("support_lead", sa.String(length=100), nullable=True))
    op.add_column("project_codes", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("project_codes", sa.Column("end_date", sa.Date(), nullable=True))
    op.add_column("project_codes", sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column("project_codes", sa.Column("source_sheet", sa.String(length=100), nullable=True))
    op.add_column("project_codes", sa.Column("note", sa.Text(), nullable=True))

    op.add_column("projects", sa.Column("owner_department", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("lead_department", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("sales_department", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("sales_owner", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("certainty", sa.String(length=50), nullable=True))
    op.add_column("projects", sa.Column("proposal_pm_name", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("presentation_pm_name", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("support_lead", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("proposal_team_text", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("amount_text", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("total_amount", sa.Numeric(16, 2), nullable=True))
    op.add_column("projects", sa.Column("company_amount", sa.Numeric(16, 2), nullable=True))
    op.add_column("projects", sa.Column("currency", sa.String(length=10), nullable=True))
    op.add_column("projects", sa.Column("bid_notice_no", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("bid_notice_date", sa.Date(), nullable=True))
    op.add_column("projects", sa.Column("pre_notice_no", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("pre_notice_date", sa.Date(), nullable=True))
    op.add_column("projects", sa.Column("submission_at", sa.DateTime(), nullable=True))
    op.add_column("projects", sa.Column("submission_format", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("submission_note", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("presentation_at", sa.DateTime(), nullable=True))
    op.add_column("projects", sa.Column("presentation_format", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("presentation_note", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("recent_activity_at", sa.DateTime(), nullable=True))
    op.add_column("projects", sa.Column("memo", sa.Text(), nullable=True))
    op.add_column("projects", sa.Column("source_sheet", sa.String(length=100), nullable=True))
    op.add_column("projects", sa.Column("raw_payload", sa.JSON(), nullable=True))

    op.add_column("project_assignments", sa.Column("assignment_role", sa.String(length=100), nullable=True))
    op.add_column("project_assignments", sa.Column("assignment_status", sa.String(length=50), nullable=True))
    op.add_column("project_assignments", sa.Column("win_loss", sa.String(length=50), nullable=True))
    op.add_column("project_assignments", sa.Column("onsite_type", sa.String(length=50), nullable=True))
    op.add_column(
        "project_assignments",
        sa.Column("is_primary", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column("project_assignments", sa.Column("sequence_no", sa.Integer(), nullable=True))
    op.add_column("project_assignments", sa.Column("monthly_mm", sa.JSON(), nullable=True))
    op.add_column("project_assignments", sa.Column("total_mm", sa.Numeric(8, 2), nullable=True))
    op.add_column("project_assignments", sa.Column("current_mm", sa.Numeric(8, 2), nullable=True))
    op.add_column("project_assignments", sa.Column("certainty_rate", sa.Numeric(5, 2), nullable=True))
    op.add_column("project_assignments", sa.Column("unit_price", sa.Numeric(14, 2), nullable=True))
    op.add_column("project_assignments", sa.Column("note", sa.Text(), nullable=True))
    op.add_column("project_assignments", sa.Column("source_sheet", sa.String(length=100), nullable=True))

    op.add_column("project_logs", sa.Column("previous_status", project_status, nullable=True))
    op.add_column("project_logs", sa.Column("next_status", project_status, nullable=True))
    op.add_column("project_logs", sa.Column("category", sa.String(length=100), nullable=True))
    op.add_column("project_logs", sa.Column("author_team", sa.String(length=100), nullable=True))
    op.add_column("project_logs", sa.Column("summary", sa.String(length=500), nullable=True))
    op.add_column("project_logs", sa.Column("detail", sa.JSON(), nullable=True))
    op.add_column("project_logs", sa.Column("related_schedule_label", sa.String(length=100), nullable=True))
    op.add_column("project_logs", sa.Column("related_schedule_at", sa.DateTime(), nullable=True))
    op.add_column("project_logs", sa.Column("source_sheet", sa.String(length=100), nullable=True))

    op.create_table(
        "monthly_employment_mm",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("personnel_id", sa.String(length=36), nullable=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("workdays", sa.Integer(), nullable=True),
        sa.Column("employed_workdays", sa.Integer(), nullable=True),
        sa.Column("employment_mm", sa.Numeric(8, 4), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["personnel_id"], ["personnel.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_monthly_employment_mm_person_month",
        "monthly_employment_mm",
        ["personnel_id", "year", "month"],
    )

    op.create_table(
        "monthly_assignment_mm",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("assignment_id", sa.String(length=36), nullable=True),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("personnel_id", sa.String(length=36), nullable=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("assignment_mm", sa.Numeric(8, 4), nullable=False),
        sa.Column("certainty_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("weighted_mm", sa.Numeric(8, 4), nullable=True),
        sa.Column("assignment_type", assignment_type, nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["project_assignments.id"]),
        sa.ForeignKeyConstraint(["personnel_id"], ["personnel.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_monthly_assignment_mm_project_person_month",
        "monthly_assignment_mm",
        ["project_id", "personnel_id", "year", "month"],
    )

    op.create_table(
        "current_assignment_snapshots",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("as_of_date", sa.Date(), nullable=False),
        sa.Column("personnel_id", sa.String(length=36), nullable=True),
        sa.Column("representative_status", sa.String(length=50), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("project_name", sa.String(length=255), nullable=True),
        sa.Column("project_code", sa.String(length=50), nullable=True),
        sa.Column("assignment_id", sa.String(length=36), nullable=True),
        sa.Column("current_start_date", sa.Date(), nullable=True),
        sa.Column("current_end_date", sa.Date(), nullable=True),
        sa.Column("next_project_id", sa.String(length=36), nullable=True),
        sa.Column("next_project_name", sa.String(length=255), nullable=True),
        sa.Column("weekly_note", sa.Text(), nullable=True),
        sa.Column("monthly_mm", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["project_assignments.id"]),
        sa.ForeignKeyConstraint(["next_project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["personnel_id"], ["personnel.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_current_assignment_snapshots_as_of_date",
        "current_assignment_snapshots",
        ["as_of_date"],
    )

    op.create_table(
        "weekly_load_snapshots",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("as_of_date", sa.Date(), nullable=False),
        sa.Column("personnel_id", sa.String(length=36), nullable=True),
        sa.Column("week_offset", sa.Integer(), nullable=False),
        sa.Column("week_label", sa.String(length=20), nullable=False),
        sa.Column("representative_status", sa.String(length=50), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("project_name", sa.String(length=255), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["personnel_id"], ["personnel.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_weekly_load_snapshots_as_of_date", "weekly_load_snapshots", ["as_of_date"])

    op.create_table(
        "monthly_kpi_summaries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("organization_name", sa.String(length=100), nullable=False),
        sa.Column("avg_headcount_mm", sa.Numeric(10, 4), nullable=True),
        sa.Column("running_mm", sa.Numeric(10, 4), nullable=True),
        sa.Column("proposing_mm", sa.Numeric(10, 4), nullable=True),
        sa.Column("support_mm", sa.Numeric(10, 4), nullable=True),
        sa.Column("idle_mm", sa.Numeric(10, 4), nullable=True),
        sa.Column("utilization_rate", sa.Numeric(6, 2), nullable=True),
        sa.Column("contract_rate", sa.Numeric(6, 2), nullable=True),
        sa.Column("source_snapshot_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_monthly_kpi_summaries_org_month",
        "monthly_kpi_summaries",
        ["organization_name", "year", "month"],
    )


def downgrade() -> None:
    op.drop_index("ix_monthly_kpi_summaries_org_month", table_name="monthly_kpi_summaries")
    op.drop_table("monthly_kpi_summaries")
    op.drop_index("ix_weekly_load_snapshots_as_of_date", table_name="weekly_load_snapshots")
    op.drop_table("weekly_load_snapshots")
    op.drop_index("ix_current_assignment_snapshots_as_of_date", table_name="current_assignment_snapshots")
    op.drop_table("current_assignment_snapshots")
    op.drop_index(
        "ix_monthly_assignment_mm_project_person_month",
        table_name="monthly_assignment_mm",
    )
    op.drop_table("monthly_assignment_mm")
    op.drop_index("ix_monthly_employment_mm_person_month", table_name="monthly_employment_mm")
    op.drop_table("monthly_employment_mm")

    for column in [
        "source_sheet", "related_schedule_at", "related_schedule_label", "detail", "summary",
        "author_team", "category", "next_status", "previous_status",
    ]:
        op.drop_column("project_logs", column)

    for column in [
        "source_sheet", "note", "unit_price", "certainty_rate", "current_mm", "total_mm",
        "monthly_mm", "sequence_no", "is_primary", "onsite_type", "win_loss",
        "assignment_status", "assignment_role",
    ]:
        op.drop_column("project_assignments", column)

    for column in [
        "raw_payload", "source_sheet", "memo", "recent_activity_at", "presentation_note",
        "presentation_format", "presentation_at", "submission_note", "submission_format",
        "submission_at", "pre_notice_date", "pre_notice_no", "bid_notice_date",
        "bid_notice_no", "currency", "company_amount", "total_amount", "amount_text",
        "proposal_team_text", "support_lead", "presentation_pm_name", "proposal_pm_name",
        "certainty", "sales_owner", "sales_department", "lead_department", "owner_department",
    ]:
        op.drop_column("projects", column)

    for column in [
        "note", "source_sheet", "is_active", "end_date", "start_date", "support_lead",
        "sales_owner", "sales_department", "certainty",
    ]:
        op.drop_column("project_codes", column)

    op.drop_index("ix_personnel_employee_no_unique", table_name="personnel")
    for column in [
        "note", "total_mm", "monthly_mm", "base_mm", "unit_price", "employment_end_date",
        "employment_start_date", "joined_on", "grade_name", "position_name",
        "department_name", "group_name", "employee_no",
    ]:
        op.drop_column("personnel", column)
