import sqlite3
from uuid import uuid4
import importlib.util
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine

from test_alembic_migrations import run_alembic


def test_upgrade_preserves_legacy_mm_uuid_fk_and_repeat_downgrade(tmp_path):
    path = tmp_path / "assignment_upgrade.db"
    assert run_alembic(path, "upgrade", "261012_0021").returncode == 0
    with sqlite3.connect(path) as conn:
        person = str(uuid4())
        conn.execute("INSERT INTO personnel(id,name,personnel_type,employment_status,is_active,created_at,updated_at) VALUES (?,'migration-person','pmo','active',1,'2026-10-13 00:00:00','2026-10-13 00:00:00')", (person,))
        assignment_id = str(uuid4())
        conn.execute("INSERT INTO project_assignments (id,personnel_id,assignment_type,assignment_status,is_primary,mm,current_mm,total_mm,created_at,updated_at) VALUES (?,?,'delivery','assigned',0,5,3.5,5.5,'2026-10-13 00:00:00','2026-10-13 00:00:00')", (assignment_id, person))
        columns = [r[1] for r in conn.execute("PRAGMA table_info(project_assignments)")]
        original = conn.execute("SELECT * FROM project_assignments").fetchall()
    assert run_alembic(path,"upgrade","head").returncode == 0
    module_path=Path(__file__).resolve().parents[1] / "alembic/versions/261013_0022_assignment_monthly_base.py"
    spec=importlib.util.spec_from_file_location("assignment_migration",module_path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    engine=create_engine(f"sqlite:///{path.as_posix()}")
    with engine.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            module.upgrade()
    engine.dispose()
    with sqlite3.connect(path) as conn:
        assert conn.execute(f"SELECT {','.join(columns)} FROM project_assignments").fetchall()==original
        assert conn.execute("SELECT monthly_base_mm FROM project_assignments").fetchone()==(None,)
        assert conn.execute("PRAGMA foreign_key_check").fetchall()==[]
        conn.execute("UPDATE project_assignments SET monthly_base_mm=1.25, assignment_status='cancelled' WHERE id=?",(assignment_id,))
    failed=run_alembic(path,"downgrade","261012_0021")
    assert failed.returncode != 0 and "RuntimeError" in failed.stderr
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT monthly_base_mm,assignment_status FROM project_assignments").fetchone()==(1.25,"cancelled")
        assert conn.execute("SELECT version_num FROM alembic_version").fetchone()==("261013_0022",)
        conn.execute("UPDATE project_assignments SET monthly_base_mm=NULL,assignment_status='assigned'")
    assert run_alembic(path,"downgrade","261012_0021").returncode==0
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT * FROM project_assignments").fetchall()==original
        assert conn.execute("PRAGMA foreign_key_check").fetchall()==[]
