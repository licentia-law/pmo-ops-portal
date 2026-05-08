"""initial core tables

Revision ID: 260508_0001
Revises:
Create Date: 2026-05-08
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "260508_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

project_status = sa.Enum("proposing", "presented", "win", "loss", "drop", "running", "support", "done", name="projectstatus")
project_type = sa.Enum("main", "sub", "subcontract", "partner", name="projecttype")
assignment_type = sa.Enum("delivery", "proposal", "support", "unassigned", name="assignmenttype")
employment_status = sa.Enum("active", "leave", "transferred", "retired", "waiting", name="employmentstatus")
user_permission = sa.Enum("read_only", "general_editor", "project_editor", "admin", name="userpermission")
organization_role = sa.Enum("head", "team_lead", "member", "pm", "pl", "other", name="organizationrole")
data_scope = sa.Enum("all", "headquarters", "team", "own_projects", name="datascope")
holiday_type = sa.Enum("public", "company", name="holidaytype")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("permission", user_permission, nullable=False),
        sa.Column("data_scope", data_scope, nullable=False),
        sa.Column("organization_role", organization_role, nullable=False),
        sa.Column("team_name", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "personnel",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("team_name", sa.String(length=100), nullable=True),
        sa.Column("role_name", sa.String(length=100), nullable=True),
        sa.Column("employment_status", employment_status, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "project_codes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("project_type", project_type, nullable=False),
        sa.Column("status", project_status, nullable=False),
        sa.Column("owner_name", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_project_codes_code", "project_codes", ["code"])

    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_code_id", sa.String(length=36), nullable=True),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("client_name", sa.String(length=255), nullable=True),
        sa.Column("project_type", project_type, nullable=False),
        sa.Column("status", project_status, nullable=False),
        sa.Column("pm_name", sa.String(length=100), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_code_id"], ["project_codes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_code", "projects", ["code"])

    op.create_table(
        "project_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("personnel_id", sa.String(length=36), nullable=True),
        sa.Column("assignment_type", assignment_type, nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("mm", sa.Numeric(6, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["personnel_id"], ["personnel.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "project_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=True),
        sa.Column("status", project_status, nullable=False),
        sa.Column("logged_at", sa.DateTime(), nullable=False),
        sa.Column("author_name", sa.String(length=100), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "holidays",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("holiday_date", sa.Date(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("holiday_type", holiday_type, nullable=False),
        sa.Column("is_counted_as_workday", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("holiday_date"),
    )


def downgrade() -> None:
    op.drop_table("holidays")
    op.drop_table("project_logs")
    op.drop_table("project_assignments")
    op.drop_index("ix_projects_code", table_name="projects")
    op.drop_table("projects")
    op.drop_index("ix_project_codes_code", table_name="project_codes")
    op.drop_table("project_codes")
    op.drop_table("personnel")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    holiday_type.drop(op.get_bind(), checkfirst=True)
    data_scope.drop(op.get_bind(), checkfirst=True)
    organization_role.drop(op.get_bind(), checkfirst=True)
    user_permission.drop(op.get_bind(), checkfirst=True)
    employment_status.drop(op.get_bind(), checkfirst=True)
    assignment_type.drop(op.get_bind(), checkfirst=True)
    project_type.drop(op.get_bind(), checkfirst=True)
    project_status.drop(op.get_bind(), checkfirst=True)
