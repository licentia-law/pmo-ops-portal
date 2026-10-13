from collections.abc import Generator
from datetime import date, timedelta
import json
from pathlib import Path

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes import p1_screens
from app.core.database import Base, get_session
from app.domain.kpi import pmo_monthly_kpi_values
from app.enums import AssignmentType, EmploymentStatus, PersonnelType, ProjectType, ProjectStatus
from app.main import app
from app.models.core import (
    CurrentAssignmentSnapshot, JobLock, MonthlyAssignmentMM, MonthlyEmploymentMM,
    MonthlyKpiSummary, Personnel, Project, ProjectAssignment, Role, WeeklyLoadSnapshot, User,
)
from app.services import data_backup as backup
from app.tools.seed_bundle import SEED_SPECS, import_seed_bundle


@pytest.fixture()
def db_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Generator:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def enable_fk(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    factory = sessionmaker(engine, autoflush=False)
    with factory() as session:
        session.add(User(id="test-developer", email="developer@test.local", name="테스트개발자", permission="admin", data_scope="all", organization_role="other", is_developer=True))
        session.commit()

    def override_session():
        with factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    monkeypatch.setattr(backup, "DATA_RUNTIME_DIR", tmp_path)
    monkeypatch.setattr(backup, "BACKUP_DIR", tmp_path / "backups")
    monkeypatch.setattr(backup, "MANIFEST_PATH", tmp_path / "manifest.json")
    try:
        with TestClient(app) as client:
            yield client, factory
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def create_person(client, kind, **overrides):
    payload = {"name": kind, "personnel_type": kind, "group_name": "임의 조직", "position_name": "책임"}
    if kind == "pmo":
        payload.update(employee_no="PMO-TEST", email="pmo@test.local", team_name="테스트팀", mm_start_date="2026-01-01")
    payload.update(overrides)
    response = client.post("/api/personnel", json=payload)
    assert response.status_code == 201, response.text
    return response.json()["data"]


def test_api_types_legacy_create_patch_and_null(db_client):
    client, factory = db_client
    pm = create_person(client, "pmo", group_name="다른 이름의 PMO 조직")
    technical = create_person(client, "technical")
    external = create_person(client, "external")
    role = client.post("/api/roles", json={"code": "SALES_OWNER", "name": "변경된 영업 역할명"}).json()["data"]
    sales = create_person(client, "sales", role_id=role["id"])
    assert sales["team_name"] is None
    assert sales["mm_start_date"] is None
    assert client.get("/api/personnel", params={"scope": "pmo"}).json()["data"][0]["id"] == pm["id"]
    assert client.get("/api/personnel/sales-owner-candidates").json()["data"][0]["id"] == sales["id"]
    old_pmo = client.post("/api/personnel", json={"name": "구형PMO", "group_name": "PMO본부"})
    assert old_pmo.status_code == 201
    assert old_pmo.json()["data"]["personnel_type"] == "pmo"
    old_sales = client.post("/api/personnel", json={"name": "구형영업", "group_name": "영업조직", "position_name": "책임", "role_id": role["id"]})
    assert old_sales.status_code == 201
    assert old_sales.json()["data"]["personnel_type"] == "sales"
    for group, kind in [("기술본부", "technical"), ("외부", "external")]:
        response = client.post("/api/personnel", json={"name": group, "group_name": group, "position_name": "책임"})
        assert response.status_code == 201
        assert response.json()["data"]["personnel_type"] == kind
    assert client.post("/api/personnel", json={"name": "불명", "group_name": "미확인조직", "position_name": "책임"}).status_code == 400
    assert client.post("/api/personnel", json={"name": "null", "group_name": "PMO본부", "personnel_type": None}).status_code == 400
    assert client.post("/api/personnel", json={"name": "invalid", "group_name": "PMO본부", "personnel_type": "unknown"}).status_code == 422
    assert client.post("/api/personnel", json={"name": "영업역할누락", "group_name": "영업조직", "position_name": "책임", "personnel_type": "sales"}).status_code == 400
    patched = client.patch(f"/api/personnel/{technical['id']}", json={"group_name": "PMO본부", "note": "유형 유지"})
    assert patched.status_code == 200
    assert patched.json()["data"]["personnel_type"] == "technical"
    assert client.patch(f"/api/personnel/{technical['id']}", json={"personnel_type": None}).status_code == 400
    changed = client.patch(f"/api/personnel/{external['id']}", json={"personnel_type": "technical"})
    assert changed.status_code == 200
    assert changed.json()["data"]["personnel_type"] == "technical"
    with factory() as session:
        # Even when a legacy inconsistent role exists, sales candidates require sales type.
        session.add(Personnel(name="PMO역할불일치", personnel_type="pmo", group_name="PMO본부", role_id=role["id"], employment_status="active"))
        session.get(Personnel, sales["id"]).employment_status = EmploymentStatus.RETIRED
        session.commit()
    candidates = client.get("/api/personnel/sales-owner-candidates").json()["data"]
    assert {row["name"] for row in candidates} == {"sales", "구형영업"}
    with factory() as session:
        session.get(Role, role["id"]).is_active = False
        session.commit()
    assert client.get("/api/personnel/sales-owner-candidates").json()["data"] == []


def populate_assignments(session):
    today = date.today()
    start = today.replace(day=1)
    end = (start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)) - timedelta(days=1)
    project = Project(code="P2026001", name="모든 유형 참여", project_type=ProjectType.MAIN, status=ProjectStatus.RUNNING)
    session.add(project)
    session.flush()
    people = []
    for kind in PersonnelType:
        person = Personnel(name=kind.value, personnel_type=kind, group_name="PMO본부", team_name="공통팀", position_name="책임", employment_status=EmploymentStatus.ACTIVE, mm_start_date=start, mm_end_date=end)
        session.add(person)
        session.flush()
        session.add(ProjectAssignment(project_id=project.id, personnel_id=person.id, assignment_type=AssignmentType.DELIVERY, assignment_status="assigned", start_date=start, end_date=end, current_mm=0.5, is_primary=True))
        people.append(person)
    session.flush()
    return project, people


def test_generation_pmo_only_and_project_participants_preserved(db_client):
    client, factory = db_client
    with factory() as session:
        project, people = populate_assignments(session)
        backup._generate_derived_rows(session)
        session.commit()
        pmo_id = people[0].id
        for model in (MonthlyEmploymentMM, MonthlyAssignmentMM, CurrentAssignmentSnapshot, WeeklyLoadSnapshot):
            rows = session.scalars(select(model)).all()
            assert rows
            assert {row.personnel_id for row in rows} == {pmo_id}
        kpi = session.scalar(select(MonthlyKpiSummary))
        assert float(kpi.avg_headcount_mm) == 1
        assert float(kpi.running_mm) == 0.5
        assert float(kpi.utilization_rate) == 50
        assert float(kpi.contract_rate) == 50
        assignments = session.scalars(select(ProjectAssignment)).all()
        assert len(assignments) == 4
        participants = p1_screens._project_participant_rows(session, project, assignments, date.today())
        assert len(participants) == 4
        assert {person["name"].split()[0] for person in participants} == {kind.value for kind in PersonnelType}
        assert p1_screens._project_kpi(project, participants)["headcountTotal"] == "4명"


def test_historical_mm_snapshots_kpi_filtered_without_rewrite(db_client):
    client, factory = db_client
    today = date.today()
    with factory() as session:
        project, people = populate_assignments(session)
        stale_id = None
        for person in people:
            mm = MonthlyEmploymentMM(personnel_id=person.id, year=today.year, month=today.month, employment_mm=1)
            session.add(mm)
            session.add(MonthlyAssignmentMM(personnel_id=person.id, project_id=project.id, year=today.year, month=today.month, assignment_mm=0.25, weighted_mm=0.25, assignment_type="delivery"))
            session.add(CurrentAssignmentSnapshot(personnel_id=person.id, as_of_date=today, representative_status="running"))
            session.add(WeeklyLoadSnapshot(personnel_id=person.id, as_of_date=today, week_offset=0, week_label="이번주", representative_status="running"))
            session.flush()
            if person.personnel_type == PersonnelType.TECHNICAL:
                stale_id = mm.id
        stored = MonthlyKpiSummary(year=today.year, month=today.month, organization_name="PMO본부", avg_headcount_mm=4, running_mm=1, utilization_rate=99, contract_rate=99)
        session.add(stored)
        session.commit()
        stored_id = stored.id
        assert pmo_monthly_kpi_values(session, today.year, today.month)["running_mm"] == 0.25
        assert sum(p1_screens._snapshot_counts(session, today).values()) == 1
        assert p1_screens._team_headcount(session, today)[0]["total"] == 1
        assert float(p1_screens._latest_kpi(session).avg_headcount_mm) == 1
        assert p1_screens._kpi_trend(session)["utilization"] == [25]
    response = client.get("/api/monthly-employment-mm", params={"year": today.year, "month": today.month})
    assert response.status_code == 200
    assert response.json()["meta"]["total"] == 1
    assert client.patch(f"/api/monthly-employment-mm/{stale_id}", json={"employment_mm": 9}).status_code == 404
    home = client.get("/api/p1-screens/home")
    assert home.status_code == 200
    with factory() as session:
        assert len(session.scalars(select(CurrentAssignmentSnapshot)).all()) == 4
        assert len(session.scalars(select(WeeklyLoadSnapshot)).all()) == 4
        assert len(session.scalars(select(MonthlyEmploymentMM)).all()) == 4
        assert float(session.get(MonthlyKpiSummary, stored_id).avg_headcount_mm) == 4
        assert float(session.get(MonthlyKpiSummary, stored_id).utilization_rate) == 99
        assert float(session.get(MonthlyEmploymentMM, stale_id).employment_mm) == 1


def test_backup_roundtrip_legacy_types_and_failed_restore_rollback(db_client):
    _, factory = db_client
    with factory() as session:
        project, people = populate_assignments(session)
        backup._generate_derived_rows(session)
        session.commit()
        original_ids = {p.id for p in people}
        record = backup.create_backup(session, actor_name="검증", kind="manual_backup")
        path = backup.BACKUP_DIR / f"{record['backup_id']}.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        assert {row["personnel_type"] for row in payload["tables"]["personnel"]} == {kind.value for kind in PersonnelType}
        backup.restore_backup(session, backup_id=record["backup_id"], memo=None, user=session.get(User, "test-developer"))
        assert {p.id for p in session.scalars(select(Personnel)).all()} == original_ids
        assert len(session.scalars(select(ProjectAssignment)).all()) == 4
        for table_name, model in backup.TABLE_MODELS.items():
            actual = backup._serialize_table_rows(session, model)
            assert sorted(actual, key=lambda row: row["id"]) == sorted(payload["tables"][table_name], key=lambda row: row["id"])
        # Old backup missing type retains existing UUID's SSOT even with misleading organization.
        for row in payload["tables"]["personnel"]:
            row.pop("personnel_type")
        path.write_text(json.dumps(payload), encoding="utf-8")
        backup.restore_backup(session, backup_id=record["backup_id"], memo=None, user=session.get(User, "test-developer"))
        assert {p.personnel_type for p in session.scalars(select(Personnel)).all()} == set(PersonnelType)
        # Force failure after dataset deletion: FK violation must restore the previous transaction.
        payload["tables"]["project_assignments"][0]["personnel_id"] = "missing-person"
        path.write_text(json.dumps(payload), encoding="utf-8")
        with pytest.raises(Exception, match="FOREIGN KEY"):
            backup.restore_backup(session, backup_id=record["backup_id"], memo=None, user=session.get(User, "test-developer"))
        assert {p.id for p in session.scalars(select(Personnel)).all()} == original_ids
        assert len(session.scalars(select(ProjectAssignment)).all()) == 4
        assert session.scalar(select(JobLock)) is None
        assert json.loads(backup.MANIFEST_PATH.read_text(encoding="utf-8"))[0]["kind"] == "restore_failed"


def test_legacy_backup_into_empty_database_and_unknown_preflight(db_client):
    _, factory = db_client
    with factory() as session:
        role = Role(code="SALES_OWNER", name="영업대표")
        session.add(role)
        session.commit()
        record = backup.create_backup(session, actor_name="검증", kind="manual_backup")
        path = backup.BACKUP_DIR / f"{record['backup_id']}.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        for index, (group, kind) in enumerate([("PMO본부", "pmo"), ("영업조직", "sales"), ("기술본부", "technical"), ("외부", "external")]):
            payload["tables"]["personnel"].append({"id": str(index), "name": kind, "group_name": group, "role_id": role.id if kind == "sales" else None, "employment_status": "active", "position_name": "책임"})
        path.write_text(json.dumps(payload), encoding="utf-8")
        backup.restore_backup(session, backup_id=record["backup_id"], memo=None, user=session.get(User, "test-developer"))
        assert {p.personnel_type for p in session.scalars(select(Personnel)).all()} == set(PersonnelType)
        payload["tables"]["personnel"].append({"id": "unresolved", "name": "불명", "group_name": "미확인", "employment_status": "active"})
        path.write_text(json.dumps(payload), encoding="utf-8")
        with pytest.raises(HTTPException) as error:
            backup.restore_backup(session, backup_id=record["backup_id"], memo=None, user=session.get(User, "test-developer"))
        assert error.value.status_code == 409
        assert len(session.scalars(select(Personnel)).all()) == 4


def test_seed_legacy_and_explicit_types(db_client, tmp_path):
    _, factory = db_client
    for filename, _ in SEED_SPECS:
        (tmp_path / filename).write_text("id\n", encoding="utf-8")
    path = tmp_path / "personnel_seed.csv"
    path.write_text("id,name,group_name,employment_status\nlegacy,legacy,기술본부,active\n", encoding="utf-8")
    with factory() as session:
        import_seed_bundle(session, tmp_path)
        assert session.get(Personnel, "legacy").personnel_type == PersonnelType.TECHNICAL
        path.write_text("id,name,group_name,employment_status,personnel_type\nexplicit,explicit,임의조직,active,external\n", encoding="utf-8")
        import_seed_bundle(session, tmp_path)
        assert session.get(Personnel, "explicit").personnel_type == PersonnelType.EXTERNAL


def test_monthly_numerator_scope_and_existing_formulas(db_client):
    _, factory = db_client
    today = date.today()
    with factory() as session:
        _, people = populate_assignments(session)
        for person in people:
            session.add(MonthlyEmploymentMM(personnel_id=person.id, year=today.year, month=today.month, employment_mm=1))
            for kind, value in [("delivery", 0.2), ("proposal", 0.1), ("support", 0.1)]:
                session.add(MonthlyAssignmentMM(personnel_id=person.id, year=today.year, month=today.month, assignment_type=kind, assignment_mm=value, weighted_mm=value))
        session.flush()
        result = pmo_monthly_kpi_values(session, today.year, today.month)
        assert result == {"avg_headcount_mm": 1, "running_mm": 0.2, "proposing_mm": 0.1, "support_mm": 0.1, "idle_mm": 0.6, "utilization_rate": 20, "contract_rate": 40}
        assert pmo_monthly_kpi_values(session, 2000, 1)["utilization_rate"] == 0


@pytest.mark.parametrize("invalid_type", [None, "unknown"])
def test_invalid_backup_type_rejected_before_replacement(db_client, invalid_type):
    _, factory = db_client
    with factory() as session:
        _, people = populate_assignments(session)
        session.commit()
        original_ids = {person.id for person in people}
        record = backup.create_backup(session, actor_name="검증", kind="manual_backup")
        path = backup.BACKUP_DIR / f"{record['backup_id']}.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        payload["tables"]["personnel"][0]["personnel_type"] = invalid_type
        path.write_text(json.dumps(payload), encoding="utf-8")
        with pytest.raises(HTTPException) as error:
            backup.restore_backup(session, backup_id=record["backup_id"], memo=None, user=session.get(User, "test-developer"))
        assert error.value.status_code == 409
        assert {p.id for p in session.scalars(select(Personnel)).all()} == original_ids
        assert len(session.scalars(select(ProjectAssignment)).all()) == 4


def test_latest_snapshot_ignores_nonpmo_only_dates(db_client):
    _, factory = db_client
    today = date.today()
    with factory() as session:
        _, people = populate_assignments(session)
        session.add(CurrentAssignmentSnapshot(personnel_id=people[0].id, as_of_date=today, representative_status="running"))
        session.add(CurrentAssignmentSnapshot(personnel_id=people[1].id, as_of_date=today + timedelta(days=1), representative_status="running"))
        session.flush()
        assert p1_screens._latest_snapshot_date(session) == today
