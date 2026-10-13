import json

from sqlalchemy import select, text

from app.main import app
from app.models.core import Personnel, ProjectAssignment, ProjectLog, User
from app.services import data_backup as backup
from test_capabilities import capability_db as capability_db, headers
from test_project_excel import seed, dataset


def test_removed_integrated_routes_cannot_replace_data(capability_db):
    client, factory = capability_db
    seed(factory, 1)
    before = dataset(factory)
    for actor in (None, "developer", "admin", "member"):
        for route in ("/validate", "/apply", "/validate/", "/apply/"):
            response = client.post("/api/data-backup" + route, headers=headers(actor) if actor else {}, json={"validation_id": "legacy-token", "memo": "must not mutate"})
            assert response.status_code == 404, response.text
    assert dataset(factory) == before
    paths = app.openapi()["paths"]
    assert "/api/data-backup/validate" not in paths and "/api/data-backup/apply" not in paths
    for prefix in ("project-excel", "personnel-excel", "assignment-import"):
        assert f"/api/{prefix}/validate" in paths and f"/api/{prefix}/apply" in paths
    assert not hasattr(backup, "validate_upload") and not hasattr(backup, "apply_validated_upload")


def test_json_backup_restore_and_legacy_audit_remain(capability_db):
    client, factory = capability_db
    project_id = seed(factory, 1)[0]
    before = dataset(factory)
    backup._append_manifest({"id": "legacy-complete", "kind": "upload_complete", "status": "success", "created_at": "2026-01-01T00:00:00", "source_file_name": "legacy.xlsx", "backup_id": None})
    response = client.post("/api/data-backup/backups", headers=headers(), json={"memo": "JSON regression"})
    assert response.status_code == 200, response.text
    backup_id = response.json()["data"]["backup_id"]
    payload = json.loads((backup.BACKUP_DIR / f"{backup_id}.json").read_text(encoding="utf-8"))
    assert set(payload["tables"]) == set(backup.TABLE_MODELS)
    assert payload["tables"]["personnel"][0]["personnel_type"] == "technical"
    detail = client.get(f"/api/data-backup/backups/{backup_id}", headers=headers())
    assert detail.status_code == 200 and detail.json()["data"]["file_hash"]
    with factory() as session:
        session.get(Personnel, "technical").name = "temporarily changed"
        session.get(ProjectAssignment, "assignment").note = "temporary assignment edit"
        session.add(ProjectLog(project_id=project_id, log_status="memo", logged_at=backup._now(), author_name="test", content="temporary log"))
        session.commit()
    restored = client.post("/api/data-backup/restore", headers=headers(), json={"backup_id": backup_id, "memo": "recover"})
    assert restored.status_code == 200, restored.text
    assert dataset(factory) == before
    overview = client.get("/api/data-backup/overview", headers=headers()).json()["data"]
    assert overview["upload_history"][0]["id"] == "legacy-complete"
    assert overview["restore_history"][0]["kind"] == "restore_complete"
    with factory() as session:
        assert len(session.scalars(select(User)).all()) == 4
        assert session.execute(text("PRAGMA foreign_key_check")).all() == []


def test_new_excel_endpoints_use_retained_parsers_and_backup(capability_db, monkeypatch):
    client, factory = capability_db
    seed(factory, 1)
    with factory() as session:
        session.get(Personnel, "technical").group_name = "기술본부"
        session.commit()
    before = dataset(factory)
    for prefix in ("project-excel", "personnel-excel"):
        raw = client.post(f"/api/{prefix}/export", headers=headers(), json={}).content
        preview = client.post(f"/api/{prefix}/validate", headers=headers(), content=raw)
        assert preview.status_code == 200, preview.text
        data = preview.json()["data"]
        assert data["summary"]["error"] == 0, (prefix, data["issues"])
        response = client.post(f"/api/{prefix}/apply", headers=headers(), json={"validation_id": data["validation_id"], "file_sha256": data["file_sha256"], "missing_actions": {}})
        assert response.status_code == 200, response.text
        assert response.json()["data"]["counts"]["unchanged"] == 1
        assert response.json()["data"]["pre_backup_id"]
    assert dataset(factory) == before
    from app.core.config import settings
    monkeypatch.setattr(settings, "assignment_import_enabled", True)
    assert client.get("/api/assignment-import/template", headers=headers()).status_code == 200
