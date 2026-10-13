from datetime import timedelta
import json

import pytest
from sqlalchemy import delete, select, text

from app.core.config import settings
from app.models.core import DataResetAudit, Holiday, JobLock, Personnel, Role, User, UserCapability
from app.services import data_backup as backup, data_reset as reset
from test_capabilities import capability_db as capability_db, headers, grant
from test_project_excel import seed, dataset


@pytest.fixture
def reset_db(capability_db, monkeypatch):
    client, factory = capability_db
    seed(factory, 1)
    monkeypatch.setattr(settings, "data_reset_enabled", True)
    monkeypatch.setattr(reset, "VALIDATIONS", {})
    with factory() as session:
        session.add(Role(code="ROLE", name="보존 역할"))
        session.add(Holiday(name="보존 휴일", holiday_date=backup._now().date(), holiday_type="public", source_kind="seed"))
        session.add(JobLock(job_name="unrelated_job", locked_by="other", locked_at=backup._now(), expires_at=backup._now()+timedelta(days=1)))
        session.commit()
    return client, factory


def preview(client, actor="developer"):
    response=client.get("/api/data-backup/reset/preview",headers=headers(actor))
    assert response.status_code==200,response.text
    return response.json()["data"]


def apply(client, result, actor="developer", **changes):
    return client.post("/api/data-backup/reset",headers=headers(actor),json={"validation_id":result["validation_id"],"confirmation":reset.CONFIRMATION,"memo":"reset test",**changes})


def protected(factory):
    with factory() as session:
        return {model.__tablename__: sorted(backup._serialize_table_rows(session,model),key=lambda row: json.dumps(row,sort_keys=True))
                for model in (User,UserCapability,Role,Holiday)}


def test_disabled_and_missing_schema_do_not_write(reset_db,monkeypatch):
    client,factory=reset_db
    before=dataset(factory)
    monkeypatch.setattr(settings,"data_reset_enabled",False)
    value=preview(client)
    assert not value["enabled"] and value["validation_id"] is None and value["total"]>0
    assert apply(client,{"validation_id":"fake"}).status_code==403
    monkeypatch.setattr(settings,"data_reset_enabled",True)
    with factory() as session:
        session.execute(text("DROP TABLE data_reset_audits"))
        session.commit()
    value=preview(client)
    assert not value["schema_ready"] and not value["enabled"]
    assert apply(client,{"validation_id":"fake"}).status_code==409
    assert dataset(factory)==before
    assert not backup.MANIFEST_PATH.exists()


def test_capabilities_role_and_production_adapter(reset_db,monkeypatch):
    client,factory=reset_db
    before=dataset(factory)
    for actor in ("admin","member","manager"):
        assert client.get("/api/data-backup/reset/preview",headers=headers(actor,**{"x-user-permission":"admin","x-user-is-developer":"true"})).status_code==403
        assert apply(client,{"validation_id":"fake"},actor=actor).status_code==403
    grant(client,"admin",["backup_restore"])
    assert client.get("/api/data-backup/reset/preview",headers=headers("admin")).status_code==403
    grant(client,"admin",["backup_restore","data_reset"])
    assert preview(client,"admin")["enabled"]
    with factory() as session:
        for capability in ("backup_restore","data_reset"):
            session.add(UserCapability(user_id="member",capability=capability,granted_by_user_id="developer"))
        session.commit()
    assert client.get("/api/data-backup/reset/preview",headers=headers("member")).status_code==403
    monkeypatch.setattr(settings,"app_environment","production")
    assert client.get("/api/data-backup/reset/preview",headers=headers()).status_code==403
    assert dataset(factory)==before


def test_confirmation_token_expiry_owner_and_revalidation(reset_db):
    client,factory=reset_db
    before=dataset(factory)
    value=preview(client)
    for phrase in ("",reset.CONFIRMATION+" ","전체 초기화"):
        assert apply(client,value,confirmation=phrase).status_code==400
    grant(client,"admin",["backup_restore","data_reset"])
    assert apply(client,value,actor="admin").status_code==403
    reset.VALIDATIONS[value["validation_id"]]["created_at"]-=timedelta(hours=1)
    assert apply(client,value).status_code==409
    value=preview(client)
    with factory() as session:
        session.get(Personnel,"technical").note="changed after preview"
        session.commit()
    changed=dataset(factory)
    response=apply(client,value)
    assert response.status_code==409 and "변경" in response.text
    assert dataset(factory)==changed and changed!=before
    assert not list(backup.BACKUP_DIR.glob("*.json"))


def test_reset_atomic_audit_and_roundtrip_preserve_excluded_data(reset_db):
    client,factory=reset_db
    before=dataset(factory)
    reference=protected(factory)
    value=preview(client)
    assert set(value["counts"])==set(backup.TABLE_MODELS)
    assert dataset(factory)==before
    response=apply(client,value)
    assert response.status_code==200,response.text
    result=response.json()["data"]
    assert result["deleted_counts"]==value["counts"] and not any(result["remaining_counts"].values())
    assert all(not rows for rows in dataset(factory).values()) and protected(factory)==reference
    with factory() as session:
        logs=session.scalars(select(DataResetAudit)).all()
        assert len(logs)==1 and logs[0].status=="success" and logs[0].pre_backup_id==result["pre_backup_id"]
        assert session.get(JobLock,backup.DATA_BACKUP_JOB_NAME) is None and session.get(JobLock,"unrelated_job")
        assert session.execute(text("PRAGMA foreign_key_check")).all()==[]
    assert apply(client,value).status_code==409
    assert preview(client)["validation_id"] is None
    restored=client.post("/api/data-backup/restore",headers=headers(),json={"backup_id":result["pre_backup_id"]})
    assert restored.status_code==200,restored.text
    assert dataset(factory)==before and protected(factory)==reference
    assert preview(client)["history"][0]["pre_backup_id"]==result["pre_backup_id"]
    assert apply(client,value).status_code==409  # Old confirmation cannot reset restored data again.
    raw=json.loads((backup.BACKUP_DIR/f"{result['pre_backup_id']}.json").read_text(encoding="utf-8"))
    assert "data_reset_audits" not in raw["tables"]


@pytest.mark.parametrize("failure",["backup","corrupt_backup","delete","success_audit"])
def test_failure_rolls_back_entire_data_and_retains_failure_audit(reset_db,monkeypatch,failure):
    client,factory=reset_db
    before=dataset(factory)
    references=protected(factory)
    value=preview(client)
    if failure=="backup":
        def fail(*args,**kwargs): raise OSError("backup disk failure")
        monkeypatch.setattr(backup,"create_backup",fail)
    elif failure=="corrupt_backup":
        original=backup.create_backup
        def corrupt(*args,**kwargs):
            record=original(*args,**kwargs)
            (backup.BACKUP_DIR/f"{record['backup_id']}.json").write_text("{}",encoding="utf-8")
            return record
        monkeypatch.setattr(backup,"create_backup",corrupt)
    elif failure=="delete":
        def fail(session):
            session.execute(delete(backup.DELETE_ORDER[0]))
            raise RuntimeError("delete failed after first table")
        monkeypatch.setattr(backup,"_delete_dataset",fail)
    else:
        from sqlalchemy import event
        def fail(_mapper,_connection,target):
            if target.status=="success":
                raise RuntimeError("success audit cannot be saved")
        event.listen(DataResetAudit,"before_insert",fail)
    try:
        if failure=="corrupt_backup":
            assert apply(client,value).status_code==409
        else:
            with pytest.raises((OSError,RuntimeError)):
                apply(client,value)
    finally:
        if failure=="success_audit":
            event.remove(DataResetAudit,"before_insert",fail)
    assert dataset(factory)==before and protected(factory)==references
    with factory() as session:
        logs=session.scalars(select(DataResetAudit)).all()
        assert len(logs)==1 and logs[0].status=="failed"
        assert session.get(JobLock,backup.DATA_BACKUP_JOB_NAME) is None


def test_job_lock_and_capability_revocation_before_execution(reset_db,monkeypatch):
    client,factory=reset_db
    grant(client,"admin",["backup_restore","data_reset"])
    value=preview(client,"admin")
    before=dataset(factory)
    with factory() as session:
        backup._acquire_lock(session,locked_by="other")
    assert apply(client,value,actor="admin").status_code==409
    with factory() as session:
        backup._release_lock(session)
    original=reset._lock_dataset
    def revoke(session):
        original(session)
        session.execute(delete(UserCapability).where(UserCapability.user_id=="admin",UserCapability.capability=="data_reset"))
    monkeypatch.setattr(reset,"_lock_dataset",revoke)
    assert apply(client,value,actor="admin").status_code==403
    assert dataset(factory)==before


def test_manifest_failure_after_commit_does_not_lose_db_audit(reset_db,monkeypatch):
    client,factory=reset_db
    value=preview(client)
    original=backup._append_manifest
    def fail_complete(record):
        if record.get("kind")=="reset_complete":
            raise OSError("manifest disk failure")
        original(record)
    monkeypatch.setattr(backup,"_append_manifest",fail_complete)
    response=apply(client,value)
    assert response.status_code==200 and "DB 감사" in response.json()["data"]["message"]
    assert all(not rows for rows in dataset(factory).values())
    assert preview(client)["history"][0]["status"]=="success"


def test_preview_detects_concurrent_change(reset_db,monkeypatch):
    client,_=reset_db
    original=reset._state
    calls=[]
    def changed(session):
        calls.append(1)
        return original(session) if len(calls)==1 else "changed"
    monkeypatch.setattr(reset,"_state",changed)
    assert client.get("/api/data-backup/reset/preview",headers=headers()).status_code==409
    assert not reset.VALIDATIONS


def test_commit_failure_rolls_back_deletion_and_success_audit(reset_db):
    from sqlalchemy import event
    client,factory=reset_db
    before=dataset(factory)
    value=preview(client)
    def fail_commit(session):
        if session.scalar(select(DataResetAudit.id).where(DataResetAudit.status=="success")):
            raise RuntimeError("commit failed")
    event.listen(factory.class_,"before_commit",fail_commit)
    try:
        with pytest.raises(RuntimeError,match="commit failed"):
            apply(client,value)
    finally:
        event.remove(factory.class_,"before_commit",fail_commit)
    assert dataset(factory)==before
    assert [row["status"] for row in preview(client)["history"]]==["failed"]
    assert preview(client)["history"][0]["pre_backup_id"]


def test_lock_release_failure_after_commit_reports_success_with_warning(reset_db,monkeypatch):
    client,factory=reset_db
    value=preview(client)
    def fail_release(_session):
        raise RuntimeError("lock release failure")
    monkeypatch.setattr(backup,"_release_lock",fail_release)
    response=apply(client,value)
    assert response.status_code==200 and "잠금 해제에 실패" in response.json()["data"]["message"]
    assert all(not rows for rows in dataset(factory).values())
    assert preview(client)["history"][0]["status"]=="success"
    with factory() as session:
        assert session.get(JobLock,backup.DATA_BACKUP_JOB_NAME) is not None


def test_broken_audit_write_retains_data_and_file_failure_record(reset_db):
    from sqlalchemy import event
    client,factory=reset_db
    before=dataset(factory)
    value=preview(client)
    def fail_audit(_mapper,_connection,_target):
        raise RuntimeError("audit store unavailable")
    event.listen(DataResetAudit,"before_insert",fail_audit)
    try:
        with pytest.raises(RuntimeError,match="audit store unavailable"):
            apply(client,value)
    finally:
        event.remove(DataResetAudit,"before_insert",fail_audit)
    assert dataset(factory)==before and not preview(client)["history"]
    records=json.loads(backup.MANIFEST_PATH.read_text(encoding="utf-8"))
    assert any(row["kind"]=="reset_failed" for row in records)


def test_token_expiring_while_waiting_for_db_lock_is_rejected(reset_db,monkeypatch):
    client,factory=reset_db
    before=dataset(factory)
    value=preview(client)
    original=reset._lock_dataset
    def expire(session):
        original(session)
        reset.VALIDATIONS[value["validation_id"]]["created_at"]-=timedelta(minutes=11)
    monkeypatch.setattr(reset,"_lock_dataset",expire)
    response=apply(client,value)
    assert response.status_code==409 and "만료" in response.text
    assert dataset(factory)==before
    assert not any(backup.BACKUP_DIR.glob('*.json'))


def test_manual_backup_and_file_deletion_cannot_race_with_reset(reset_db,monkeypatch):
    client,_=reset_db
    value=preview(client)
    original=backup._delete_dataset
    checked=[]
    def attempt_file_writes(session):
        records=json.loads(backup.MANIFEST_PATH.read_text(encoding="utf-8"))
        record=next(row for row in records if row['kind']=='reset_before_backup')
        identifier=record['backup_id']
        path=backup.BACKUP_DIR/f'{identifier}.json'
        contents=path.read_bytes()
        assert client.post('/api/data-backup/backups',headers=headers(),json={}).status_code==409
        assert client.delete(f'/api/data-backup/backups/{identifier}',headers=headers()).status_code==409
        assert path.read_bytes()==contents
        checked.append(identifier)
        original(session)
    monkeypatch.setattr(backup,'_delete_dataset',attempt_file_writes)
    response=apply(client,value)
    assert response.status_code==200,response.text
    assert checked==[response.json()['data']['pre_backup_id']]
