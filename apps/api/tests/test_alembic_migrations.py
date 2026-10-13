from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
import importlib.util
import hashlib
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine


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
            "personnel_type",
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

        cur.execute("PRAGMA table_info(holidays)")
        holiday_columns = {row[1] for row in cur.fetchall()}
        assert {
            "source_kind",
            "source_provider",
            "source_external_id",
            "source_year",
            "last_synced_at",
        }.issubset(holiday_columns)
        assert {"repeats_annually", "note"}.isdisjoint(holiday_columns)

        cur.execute("PRAGMA table_info(job_locks)")
        job_lock_columns = {row[1] for row in cur.fetchall()}
        assert {"job_name", "locked_at", "locked_by", "expires_at"}.issubset(job_lock_columns)

        cur.execute("SELECT version_num FROM alembic_version")
        assert cur.fetchone() == ("261013_0023",)
        assert "monthly_base_mm" in {r[1] for r in conn.execute("PRAGMA table_info(project_assignments)")}
    finally:
        conn.close()


def run_alembic(db_path: Path, *args: str) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args], cwd=Path(__file__).resolve().parents[1],
        env=env, capture_output=True, text=True, timeout=60,
    )


def add_legacy_person(conn, group, role_code=None):
    person_id = str(uuid4())
    role = conn.execute("SELECT id FROM roles WHERE code=?", (role_code,)).fetchone() if role_code else None
    conn.execute(
        "INSERT INTO personnel (id,name,group_name,role_id,employment_status,is_active,created_at,updated_at) "
        "VALUES (?,?,?,?, 'active',1,'2026-10-12 00:00:00','2026-10-12 00:00:00')",
        (person_id, group, group, role[0] if role else None),
    )
    return person_id


def test_legacy_upgrade_types_constraints_repeated_backfill_downgrade(tmp_path):
    path = tmp_path / "legacy.db"
    result = run_alembic(path, "upgrade", "260625_0019")
    assert result.returncode == 0, result.stderr
    with sqlite3.connect(path) as conn:
        ids = [add_legacy_person(conn, "PMO본부", "PM"), add_legacy_person(conn, "PMO본부", "SALES_OWNER"), add_legacy_person(conn, "기술본부"), add_legacy_person(conn, "외부")]
        conn.execute(
            "INSERT INTO project_assignments (id,personnel_id,assignment_type,is_primary,created_at,updated_at) "
            "VALUES (?,?,'delivery',0,'2026-10-12 00:00:00','2026-10-12 00:00:00')", (str(uuid4()), ids[2]),
        )
        before_people = conn.execute("SELECT * FROM personnel ORDER BY id").fetchall()
        before_assignments = conn.execute("SELECT * FROM project_assignments").fetchall()
        assignment_columns = [r[1] for r in conn.execute("PRAGMA table_info(project_assignments)")]
    result = run_alembic(path, "upgrade", "head")
    assert result.returncode == 0, result.stderr
    with sqlite3.connect(path) as conn:
        types = dict(conn.execute("SELECT id,personnel_type FROM personnel"))
        assert [types[key] for key in ids] == ["pmo", "sales", "technical", "external"]
        assert conn.execute(f"SELECT {','.join(assignment_columns)} FROM project_assignments").fetchall() == before_assignments
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
        for value in (None, "wrong"):
            with pytest.raises(sqlite3.IntegrityError):
                conn.execute("UPDATE personnel SET personnel_type=? WHERE id=?", (value, ids[0]))
        # Correctly assigned explicit types must survive a repeated data migration.
        conn.execute("UPDATE personnel SET personnel_type='external' WHERE id=?", (ids[0],))
    module_path = Path(__file__).resolve().parents[1] / "alembic/versions/261012_0020_add_personnel_type.py"
    spec = importlib.util.spec_from_file_location("personnel_type_migration", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    engine = create_engine(f"sqlite:///{path.as_posix()}")
    with engine.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            module.upgrade()
    engine.dispose()
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT personnel_type FROM personnel WHERE id=?", (ids[0],)).fetchone() == ("external",)
        assert conn.execute("SELECT COUNT(*) FROM personnel").fetchone() == (4,)
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
    result = run_alembic(path, "downgrade", "260625_0019")
    assert result.returncode == 0, result.stderr
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT * FROM personnel ORDER BY id").fetchall() == before_people
        assert conn.execute("SELECT * FROM project_assignments").fetchall() == before_assignments
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []


def test_unknown_legacy_type_fails_before_ddl_and_can_retry(tmp_path):
    path = tmp_path / "unresolved.db"
    assert run_alembic(path, "upgrade", "260625_0019").returncode == 0
    with sqlite3.connect(path) as conn:
        person_id = add_legacy_person(conn, "판단이 필요한 조직")
        before = conn.execute("SELECT * FROM personnel").fetchall()
    failed = run_alembic(path, "upgrade", "head")
    assert failed.returncode != 0
    assert "RuntimeError" in failed.stderr
    with sqlite3.connect(path) as conn:
        assert "personnel_type" not in {r[1] for r in conn.execute("PRAGMA table_info(personnel)")}
        assert conn.execute("SELECT * FROM personnel").fetchall() == before
        assert conn.execute("SELECT version_num FROM alembic_version").fetchone() == ("260625_0019",)
        conn.execute("UPDATE personnel SET group_name='기술본부' WHERE id=?", (person_id,))
    assert run_alembic(path, "upgrade", "head").returncode == 0


def test_readonly_development_copy_upgrade_preserves_history(tmp_path):
    source = Path(__file__).resolve().parents[1] / "pmo_ops_p1_schema.db"
    if not source.exists():
        pytest.skip("development DB not present; synthetic legacy upgrade covers CI")
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    copy = tmp_path / "development_copy.db"
    with sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True) as origin:
        with sqlite3.connect(copy) as target:
            origin.backup(target)
    preserved_tables = ["personnel", "roles", "project_assignments", "project_logs", "monthly_employment_mm", "monthly_assignment_mm", "current_assignment_snapshots", "weekly_load_snapshots", "monthly_kpi_summaries"]
    with sqlite3.connect(copy) as conn:
        if conn.execute("SELECT version_num FROM alembic_version").fetchone() != ("260625_0019",):
            pytest.skip("development DB revision changed; synthetic migration covers upgrades")
        columns = {table: [r[1] for r in conn.execute(f"PRAGMA table_info({table})")] for table in preserved_tables}
        original = {table: conn.execute(f"SELECT {','.join(columns[table])} FROM {table} ORDER BY id").fetchall() for table in preserved_tables}
    result = run_alembic(copy, "upgrade", "head")
    assert result.returncode == 0, result.stderr
    assert run_alembic(copy, "upgrade", "head").returncode == 0
    with sqlite3.connect(copy) as conn:
        for table in preserved_tables:
            assert conn.execute(f"SELECT {','.join(columns[table])} FROM {table} ORDER BY id").fetchall() == original[table]
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
        counts = dict(conn.execute("SELECT personnel_type,COUNT(*) FROM personnel GROUP BY 1"))
        print(f"COPY_TYPE_COUNTS={counts}")
    assert hashlib.sha256(source.read_bytes()).hexdigest() == digest


def test_capability_migration_preserves_users_no_automatic_grants_and_downgrade(tmp_path):
    path = tmp_path / "capabilities_upgrade.db"
    assert run_alembic(path, "upgrade", "261012_0020").returncode == 0
    with sqlite3.connect(path) as conn:
        for index, permission in [(1, "admin"), (2, "admin"), (3, "read_only")]:
            conn.execute(
                "INSERT INTO users(id,email,name,permission,data_scope,organization_role,created_at,updated_at) "
                "VALUES (?,?,?,?,'all','other','2026-10-12 00:00:00','2026-10-12 00:00:00')",
                (str(index), f"user{index}@test.local", f"user{index}", permission),
            )
        original = conn.execute("SELECT * FROM users ORDER BY id").fetchall()
        columns = [row[1] for row in conn.execute("PRAGMA table_info(users)")]
    result = run_alembic(path, "upgrade", "head")
    assert result.returncode == 0, result.stderr
    with sqlite3.connect(path) as conn:
        conn.execute("PRAGMA foreign_keys=ON")
        assert conn.execute(f"SELECT {','.join(columns)} FROM users ORDER BY id").fetchall() == original
        assert conn.execute("SELECT is_developer FROM users").fetchall() == [(0,), (0,), (0,)]
        assert conn.execute("SELECT COUNT(*) FROM user_capabilities").fetchone() == (0,)
        sql = "INSERT INTO user_capabilities(user_id,capability,granted_by_user_id,created_at,updated_at) VALUES (?,?,'1','2026-10-12 00:00:00','2026-10-12 00:00:00')"
        conn.execute(sql, ("3", "backup_restore"))
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(sql, ("3", "backup_restore"))
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(sql, ("3", "invalid"))
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(sql, ("missing", "backup_restore"))
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
    assert run_alembic(path, "upgrade", "head").returncode == 0
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT COUNT(*) FROM user_capabilities").fetchone() == (1,)
    result = run_alembic(path, "downgrade", "261012_0020")
    assert result.returncode == 0, result.stderr
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT * FROM users ORDER BY id").fetchall() == original
        assert "user_capabilities" not in {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
