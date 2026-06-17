from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from pathlib import Path


def test_alembic_upgrade_head_reaches_current_personnel_schema(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    db_path = tmp_path / "alembic_smoke.db"
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(
            "alembic upgrade head failed\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}"
        )

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(personnel)")
        columns = {row[1] for row in cur.fetchall()}
        expected_columns = {
            "id",
            "employee_no",
            "name",
            "email",
            "group_name",
            "team_name",
            "position_name",
            "role_id",
            "role_name",
            "employment_status",
            "mm_start_date",
            "mm_end_date",
            "yearly_mm",
            "is_active",
            "note",
            "created_at",
            "updated_at",
        }
        assert expected_columns.issubset(columns)

        legacy_columns = {
            "employment_start_date",
            "employment_end_date",
            "contract_start_date",
            "contract_end_date",
            "department_name",
            "grade_name",
            "joined_on",
            "unit_price",
            "base_mm",
            "monthly_mm",
            "total_mm",
        }
        assert legacy_columns.isdisjoint(columns)

        cur.execute("SELECT version_num FROM alembic_version")
        assert cur.fetchone() == ("260617_0003",)
    finally:
        conn.close()
