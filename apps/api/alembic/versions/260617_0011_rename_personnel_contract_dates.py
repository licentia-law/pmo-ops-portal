"""rename personnel mm date columns to contract dates

Revision ID: 260617_0011
Revises: 260616_0010
Create Date: 2026-06-17
"""

from collections.abc import Sequence

revision: str = "260617_0011"
down_revision: str | None = "260616_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Legacy placeholder: personnel dates were already normalized in the live DB
    # and the final repair migration now owns the schema convergence.
    return


def downgrade() -> None:
    return
