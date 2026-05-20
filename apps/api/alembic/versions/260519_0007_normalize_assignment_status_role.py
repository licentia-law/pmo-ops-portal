"""normalize project_assignments status/role

Revision ID: 260519_0007
Revises: 260519_0006
Create Date: 2026-05-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "260519_0007"
down_revision: str | None = "260519_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


assignment_status = sa.Enum("planned", "assigned", "ended", name="assignmentstatus")
assignment_role = sa.Enum(
    "proposal_pm",
    "presentation_pm",
    "delivery_pm",
    "proposal_team",
    "delivery_team",
    "support_team",
    name="projectassignmentrole",
)


def upgrade() -> None:
    bind = op.get_bind()
    assignment_status.create(bind, checkfirst=True)
    assignment_role.create(bind, checkfirst=True)

    # status normalization
    op.execute("UPDATE project_assignments SET assignment_status = LOWER(TRIM(COALESCE(assignment_status, '')))")
    op.execute("UPDATE project_assignments SET assignment_status = 'assigned' WHERE assignment_status IN ('assigned', '투입')")
    op.execute("UPDATE project_assignments SET assignment_status = 'planned' WHERE assignment_status IN ('planned', '대기', '미투입', '')")
    op.execute("UPDATE project_assignments SET assignment_status = 'ended' WHERE assignment_status IN ('ended', 'completed', '종료')")

    # role normalization to project-level role
    op.execute("UPDATE project_assignments SET assignment_role = LOWER(TRIM(COALESCE(assignment_role, '')))")
    op.execute("UPDATE project_assignments SET assignment_role = 'proposal_pm' WHERE assignment_role IN ('proposal_pm', 'proposalpm', '제안pm')")
    op.execute("UPDATE project_assignments SET assignment_role = 'presentation_pm' WHERE assignment_role IN ('presentation_pm', 'present_pm', '발표pm')")
    op.execute("UPDATE project_assignments SET assignment_role = 'delivery_pm' WHERE assignment_role IN ('delivery_pm', '수행pm')")
    op.execute("UPDATE project_assignments SET assignment_role = 'proposal_team' WHERE assignment_role IN ('proposal_team', 'sub-pm', 'architect', 'ta', 'pl', 'proposal')")
    op.execute("UPDATE project_assignments SET assignment_role = 'delivery_team' WHERE assignment_role IN ('delivery_team', 'pm', 'delivery', 'support')")
    op.execute("UPDATE project_assignments SET assignment_role = 'support_team' WHERE assignment_type = 'support' AND (assignment_role IS NULL OR assignment_role = '')")
    op.execute("UPDATE project_assignments SET assignment_role = 'proposal_team' WHERE assignment_type = 'proposal' AND (assignment_role IS NULL OR assignment_role = '')")
    op.execute("UPDATE project_assignments SET assignment_role = 'delivery_team' WHERE assignment_type = 'delivery' AND (assignment_role IS NULL OR assignment_role = '')")
    op.execute("UPDATE project_assignments SET assignment_role = 'support_team' WHERE assignment_role NOT IN ('proposal_pm','presentation_pm','delivery_pm','proposal_team','delivery_team','support_team')")
    op.execute("UPDATE project_assignments SET assignment_status = 'planned' WHERE assignment_status NOT IN ('planned','assigned','ended')")

    with op.batch_alter_table("project_assignments") as batch_op:
        batch_op.alter_column("assignment_status", existing_type=sa.String(length=50), type_=assignment_status, nullable=True)
        batch_op.alter_column("assignment_role", existing_type=sa.String(length=100), type_=assignment_role, nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("project_assignments") as batch_op:
        batch_op.alter_column("assignment_role", existing_type=assignment_role, type_=sa.String(length=100), nullable=True)
        batch_op.alter_column("assignment_status", existing_type=assignment_status, type_=sa.String(length=50), nullable=True)

    assignment_role.drop(op.get_bind(), checkfirst=True)
    assignment_status.drop(op.get_bind(), checkfirst=True)

