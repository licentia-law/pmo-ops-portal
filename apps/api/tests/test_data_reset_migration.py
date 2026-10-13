import sqlite3

from test_alembic_migrations import run_alembic


def test_reset_audit_migration_preserves_business_data_and_safe_downgrade(tmp_path):
    path=tmp_path/"reset_upgrade.db"
    assert run_alembic(path,"upgrade","261013_0022").returncode==0
    with sqlite3.connect(path) as conn:
        conn.execute("INSERT INTO personnel(id,name,personnel_type,employment_status,is_active,created_at,updated_at) VALUES ('legacy','legacy','technical','active',1,'2026-10-13 00:00:00','2026-10-13 00:00:00')")
        original=conn.execute("SELECT * FROM personnel").fetchall()
    assert run_alembic(path,"upgrade","head").returncode==0
    assert run_alembic(path,"upgrade","head").returncode==0
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT * FROM personnel").fetchall()==original
        assert conn.execute("SELECT count(*) FROM data_reset_audits").fetchone()==(0,)
        assert conn.execute("PRAGMA foreign_key_check").fetchall()==[]
    assert run_alembic(path,"downgrade","261013_0022").returncode==0
    assert run_alembic(path,"upgrade","head").returncode==0
    with sqlite3.connect(path) as conn:
        conn.execute("INSERT INTO data_reset_audits(id,validation_id,status,actor_user_id,actor_name,actor_email,before_counts,message,created_at,updated_at) VALUES ('audit','token','success','actor','actor','actor@test.local','{}','preserve','2026-10-13 00:00:00','2026-10-13 00:00:00')")
    failed=run_alembic(path,"downgrade","261013_0022")
    assert failed.returncode!=0 and "RuntimeError" in failed.stderr
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT count(*) FROM data_reset_audits").fetchone()==(1,)
        assert conn.execute("SELECT * FROM personnel").fetchall()==original
