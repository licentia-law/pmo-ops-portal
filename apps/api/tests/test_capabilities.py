from collections.abc import Generator
from pathlib import Path

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, event, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_session
from app.domain.capabilities import effective_capabilities, require_capabilities
from app.enums import Capability
from app.main import app
from app.models.core import User, UserCapability
from app.services import data_backup as backup
from app.tools.bootstrap_developer import bootstrap_developer
from app.tools.seed_bundle import SEED_SPECS, import_seed_bundle


@pytest.fixture()
def capability_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator:
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def enable_fk(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, autoflush=False)
    with factory() as session:
        for user_id, permission, developer in [("developer", "admin", True), ("admin", "admin", False), ("manager", "admin", False), ("member", "read_only", False)]:
            session.add(User(id=user_id, name=user_id, email=f"{user_id}@test.local", permission=permission, data_scope="all", organization_role="other", is_developer=developer))
        session.commit()

    def override_session():
        with factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    monkeypatch.setattr(settings, "app_environment", "test")
    monkeypatch.setattr(backup, "DATA_RUNTIME_DIR", tmp_path)
    monkeypatch.setattr(backup, "BACKUP_DIR", tmp_path / "backups")
    monkeypatch.setattr(backup, "MANIFEST_PATH", tmp_path / "manifest.json")
    try:
        with TestClient(app) as client:
            yield client, factory
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def headers(user="developer", **extra):
    return {"x-user-email": f"{user}@test.local", **extra}


def grant(client, target, capabilities, actor="developer"):
    return client.patch(f"/api/users/{target}/capabilities", headers=headers(actor), json={"capabilities": capabilities})


def test_persisted_identity_no_admin_or_header_capability_bypass(capability_db):
    client, factory = capability_db
    assert client.get("/api/users/me/capabilities").status_code == 401
    assert client.get("/api/users/me/capabilities", headers={"x-user-email":"unknown@test.local", "x-user-permission":"admin"}).status_code == 401
    response = client.get("/api/users/me/capabilities", headers=headers("admin", **{"x-user-permission":"admin", "x-user-capabilities":"backup_restore", "x-user-is-developer":"true"}))
    assert response.status_code == 200
    assert response.json()["data"]["capabilities"] == []
    assert response.json()["data"]["is_developer"] is False
    assert "password_hash" not in response.text
    developer = client.get("/api/users/me/capabilities", headers=headers(**{"x-user-permission":"read_only"}))
    assert set(developer.json()["data"]["capabilities"]) == {cap.value for cap in Capability}
    assert client.get("/api/users/member/capabilities", headers=headers("admin")).status_code == 403
    with factory() as session:
        forged = User(id="admin", is_developer=True)
        assert effective_capabilities(session, forged) == set()
        with pytest.raises(HTTPException) as error:
            require_capabilities(session, forged, Capability.BACKUP_RESTORE)
        assert error.value.status_code == 403


def test_grant_revoke_idempotence_and_appointed_manager(capability_db):
    client, factory = capability_db
    assert grant(client, "member", ["backup_restore"], actor="manager").status_code == 403
    appointed = client.post("/api/users/manager/appoint-admin", headers=headers())
    assert appointed.status_code == 200
    assert appointed.json()["data"]["capabilities"] == ["permissions_manage"]
    assert grant(client, "member", ["backup_restore", "assignment_manage"], actor="manager").status_code == 200
    with factory() as session:
        original = [(row.capability, row.created_at, row.updated_at, row.granted_by_user_id) for row in session.scalars(select(UserCapability).where(UserCapability.user_id=="member").order_by(UserCapability.capability)).all()]
    assert grant(client, "member", ["assignment_manage", "backup_restore", "backup_restore"], actor="manager").status_code == 200
    with factory() as session:
        actual = [(row.capability, row.created_at, row.updated_at, row.granted_by_user_id) for row in session.scalars(select(UserCapability).where(UserCapability.user_id=="member").order_by(UserCapability.capability)).all()]
        assert actual == original
    assert client.get("/api/data-backup/overview", headers=headers("member")).status_code == 200
    assert grant(client, "member", [], actor="manager").status_code == 200
    assert client.get("/api/data-backup/overview", headers=headers("member")).status_code == 403
    assert client.post("/api/users/member/appoint-admin", headers=headers("manager")).status_code == 403
    assert grant(client, "manager", ["permissions_manage", "data_reset", "backup_restore"], actor="manager").status_code == 403
    assert grant(client, "developer", []).status_code == 409
    assert grant(client, "member", ["permissions_manage"]).status_code == 400
    assert grant(client, "admin", ["data_reset"]).status_code == 400
    assert grant(client, "admin", ["data_reset", "backup_restore"]).status_code == 200


def test_unknown_codes_extra_fields_and_unknown_targets(capability_db):
    client, _ = capability_db
    assert grant(client, "member", ["unknown"]).status_code == 422
    assert client.patch("/api/users/member/capabilities", headers=headers(), json={"capabilities":[], "is_developer":True}).status_code == 422
    assert grant(client, "missing", []).status_code == 404
    assert client.get("/api/users/missing/capabilities", headers=headers()).status_code == 404


def test_backup_all_routes_authorize_before_side_effects(capability_db, monkeypatch):
    client, _ = capability_db
    calls=[]
    monkeypatch.setattr(backup, "_ensure_runtime_dirs", lambda: calls.append("runtime"))
    requests = [
        ("GET", "/api/data-backup/overview", None),
        ("GET", "/api/data-backup/backups/missing", None),
        ("POST", "/api/data-backup/backups", {}),
        ("DELETE", "/api/data-backup/backups/missing", None),
        ("POST", "/api/data-backup/restore", {"backup_id":"missing"}),
    ]
    for method, route, payload in requests:
        response=client.request(method, route, headers=headers("admin", **{"x-user-permission":"admin"}), json=payload)
        assert response.status_code == 403, (route,response.text)
    assert calls == []


def test_backup_capability_is_independent_of_excel_capabilities(capability_db):
    client, _ = capability_db
    assert grant(client,"member",["backup_restore"]).status_code==200
    assert client.get("/api/data-backup/overview", headers=headers("member")).status_code==200
    assert client.post("/api/data-backup/backups", headers=headers("member"), json={}).status_code==200
    assert client.get("/api/project-excel/template", headers=headers("member")).status_code==403
    assert client.get("/api/personnel-excel/template", headers=headers("member")).status_code==403


def test_production_rejects_development_identity_adapter(capability_db, monkeypatch):
    client, _ = capability_db
    monkeypatch.setattr(settings,"app_environment","production")
    assert client.get("/api/users/me/capabilities",headers=headers()).status_code==403
    assert client.get("/api/data-backup/overview",headers=headers()).status_code==403


def test_bootstrap_preserves_uuid_and_is_repeatable(capability_db):
    _, factory = capability_db
    with factory() as session:
        session.get(User,"developer").is_developer=False
        session.commit()
        target=bootstrap_developer(session,user_id="admin",email="Law@cmtinfo.co.kr",name="admin")
        session.commit()
        assert target.id=="admin" and target.email=="law@cmtinfo.co.kr"
        updated=target.updated_at
        bootstrap_developer(session,user_id="admin",email="law@cmtinfo.co.kr",name="admin")
        session.commit()
        assert target.updated_at==updated
        assert effective_capabilities(session,target)==set(Capability)
        with pytest.raises(HTTPException):
            bootstrap_developer(session,user_id="member",email="member@test.local",name="member")
        session.rollback()
        assert session.get(User,"member").is_developer is False


def test_constraints_and_service_level_bypass_blocked(capability_db):
    _, factory = capability_db
    with factory() as session:
        admin=session.get(User,"admin")
        with pytest.raises(HTTPException) as error:
            backup.restore_backup(session,backup_id="missing",memo=None,user=admin)
        assert error.value.status_code==403
        session.add(UserCapability(user_id="admin",capability="backup_restore",granted_by_user_id="developer"))
        session.commit()
        session.add(UserCapability(user_id="admin",capability="backup_restore"))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
        session.add(UserCapability(user_id="missing",capability="backup_restore"))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
        assert "users" not in backup.TABLE_MODELS and "user_capabilities" not in backup.TABLE_MODELS


def test_data_reset_requires_both_grants_and_system_admin(capability_db):
    _, factory = capability_db
    with factory() as session:
        session.add(UserCapability(user_id="admin",capability="data_reset"))
        session.commit()
        with pytest.raises(HTTPException) as error:
            require_capabilities(session,session.get(User,"admin"),Capability.DATA_RESET)
        assert error.value.status_code==403
        session.add(UserCapability(user_id="admin",capability="backup_restore"))
        session.commit()
        require_capabilities(session,session.get(User,"admin"),Capability.DATA_RESET)
        for capability in (Capability.DATA_RESET,Capability.BACKUP_RESTORE):
            session.add(UserCapability(user_id="member",capability=capability))
        session.commit()
        with pytest.raises(HTTPException):
            require_capabilities(session,session.get(User,"member"),Capability.DATA_RESET)


def test_dataset_restore_does_not_restore_users_or_capability_grants(capability_db):
    client, _ = capability_db
    assert grant(client,"member",["backup_restore"]).status_code==200
    record=client.post("/api/data-backup/backups",headers=headers(),json={}).json()["data"]
    assert grant(client,"member",["assignment_manage"]).status_code==200
    restored=client.post("/api/data-backup/restore",headers=headers(),json={"backup_id":record["backup_id"]})
    assert restored.status_code==200
    member=client.get("/api/users/member/capabilities",headers=headers()).json()["data"]
    assert member["capabilities"]==["assignment_manage"]
    assert client.get("/api/users/me/capabilities",headers=headers()).json()["data"]["is_developer"] is True


def test_seed_user_reset_does_not_resurrect_capabilities(capability_db,tmp_path):
    client, factory = capability_db
    assert grant(client,"member",["backup_restore"]).status_code==200
    for filename,_ in SEED_SPECS:
        (tmp_path/filename).write_text("id\n",encoding="utf-8")
    (tmp_path/"users_seed.csv").write_text("id,email,name,permission,data_scope,organization_role\nmember,member@test.local,member,read_only,all,other\n",encoding="utf-8")
    with factory() as session:
        import_seed_bundle(session,tmp_path,truncate=True)
        assert session.scalar(select(UserCapability)) is None
        assert effective_capabilities(session,session.get(User,"member"))==set()
        assert session.get(User,"member").is_developer is False
