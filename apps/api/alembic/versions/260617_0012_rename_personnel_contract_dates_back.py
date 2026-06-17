"""rename personnel contract dates back to mm dates

Revision ID: 260617_0012
Revises: 260617_0011
Create Date: 2026-06-17
"""

from collections.abc import Sequence

revision: str = "260617_0012"
down_revision: str | None = "260617_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Legacy placeholder kept for revision continuity only.
    return


def downgrade() -> None:
    return
