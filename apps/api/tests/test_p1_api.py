from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_session
from app.main import app
from app.models.core import Holiday, MonthlyEmploymentMM, Personnel


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    def override_session() -> Generator[Session, None, None]:
        with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def client_and_session() -> Generator[tuple[TestClient, sessionmaker[Session]], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    def override_session() -> Generator[Session, None, None]:
        with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client, TestingSessionLocal
    app.dependency_overrides.clear()


def create_project_payload(project_code_id: str, **overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "차세대 PMO 구축",
        "client_name": "내부",
        "project_type": "main",
        "status": "proposing",
        "certainty": "우세",
        "total_amount": 10,
        "company_amount": 5,
        "sales_owner": "영업대표",
        "sales_department": "공공영업팀",
        "proposal_pm_name": "관리자",
        "presentation_pm_name": "관리자",
        "delivery_pm_name": "관리자",
        "start_date": "2026-01-01",
        "end_date": "2026-03-31",
        "submission_at": "2026-01-10T09:00:00",
        "submission_format": "온라인",
        "project_code_id": project_code_id,
    }
    payload.update(overrides)
    return payload


def test_project_lifecycle_and_invalid_transition(client: TestClient) -> None:
    created_code = client.post(
        "/api/project-codes",
        json={"name": "차세대 PMO 구축", "project_type": "main", "status": "proposing", "certainty": "우세"},
    )
    assert created_code.status_code == 201
    project_code = created_code.json()["data"]
    assert project_code["code"] == "P2026001"

    created = client.post(
        "/api/projects",
        json=create_project_payload(project_code["id"]),
    )
    assert created.status_code == 201
    project = created.json()["data"]
    assert project["code"] == "P2026001"

    invalid = client.patch(f"/api/projects/{project['id']}", json={"status": "running"})
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "HTTP_400"

    presented = client.patch(f"/api/projects/{project['id']}", json={"status": "presented"})
    assert presented.status_code == 200
    assert presented.json()["data"]["status"] == "presented"

    logs = client.get("/api/project-logs", params={"project_id": project["id"]})
    assert logs.status_code == 200
    assert logs.json()["meta"]["total"] == 2


def test_read_only_user_cannot_mutate(client: TestClient) -> None:
    response = client.post(
        "/api/project-codes",
        headers={"x-user-permission": "read_only"},
        json={"name": "권한 검증 프로젝트", "project_type": "main", "status": "proposing"},
    )
    assert response.status_code == 403


def test_project_editor_can_update_own_presented_project_only(client: TestClient) -> None:
    created_code = client.post(
        "/api/project-codes",
        json={"name": "담당자 검증", "project_type": "main", "status": "presented", "certainty": "우세"},
    )
    assert created_code.status_code == 201
    project_code = created_code.json()["data"]

    created = client.post(
        "/api/projects",
        json=create_project_payload(
            project_code["id"],
            name="담당자 검증",
            status="presented",
            proposal_pm_name="pm1",
            presentation_pm_name="pm1",
            delivery_pm_name="pm1",
        ),
    )
    assert created.status_code == 201
    project = created.json()["data"]

    denied = client.patch(
        f"/api/projects/{project['id']}",
        headers={"x-user-permission": "project_editor", "x-user-name": "pm2"},
        json={"name": "수정 실패"},
    )
    assert denied.status_code == 403

    allowed = client.patch(
        f"/api/projects/{project['id']}",
        headers={"x-user-permission": "project_editor", "x-user-name": "pm1"},
        json={"name": "수정 성공"},
    )
    assert allowed.status_code == 200
    assert allowed.json()["data"]["name"] == "수정 성공"


def test_people_reference_apis_validate_roles_and_permissions(client: TestClient) -> None:
    denied_role = client.post(
        "/api/roles",
        headers={"x-user-permission": "general_editor"},
        json={"code": "DEV", "name": "개발", "job_group": "개발"},
    )
    assert denied_role.status_code == 403

    created_role = client.post(
        "/api/roles",
        json={"code": "DEV", "name": "개발", "job_group": "개발", "sort_order": 10},
    )
    assert created_role.status_code == 201
    role = created_role.json()["data"]

    duplicate_role = client.post(
        "/api/roles",
        json={"code": "DEV", "name": "개발2", "job_group": "개발"},
    )
    assert duplicate_role.status_code == 409

    denied_person = client.post(
        "/api/personnel",
        headers={"x-user-permission": "general_editor"},
        json={
            "name": "홍길동",
            "group_name": "PMO본부",
            "employment_status": "active",
            "role_id": role["id"],
        },
    )
    assert denied_person.status_code == 403

    denied_head_create = client.post(
        "/api/personnel",
        headers={"x-user-permission": "read_only", "x-user-organization-role": "head"},
        json={
            "employee_no": "E001",
            "name": "홍길동",
            "email": "hong@example.local",
            "group_name": "PMO본부",
            "team_name": "PMO1팀",
            "position_name": "책임",
            "employment_status": "active",
            "role_id": role["id"],
        },
    )
    assert denied_head_create.status_code == 403

    created_person = client.post(
        "/api/personnel",
        json={
            "employee_no": "E001",
            "name": "홍길동",
            "email": "hong@example.local",
            "group_name": "PMO본부",
            "team_name": "PMO1팀",
            "position_name": "책임",
            "employment_status": "active",
            "role_id": role["id"],
        },
    )
    assert created_person.status_code == 201
    person = created_person.json()["data"]
    assert person["id"]
    assert person["role_id"] == role["id"]
    assert person["role_name"] == "개발"
    assert person["is_active"] is True

    listed = client.get(
        "/api/personnel",
        params={"group_name": "PMO본부", "employment_status": "active", "role_id": role["id"], "q": "홍길동"},
    )
    assert listed.status_code == 200
    assert listed.json()["meta"]["total"] == 1
    assert listed.json()["data"][0]["id"] == person["id"]

    listed_by_role = client.get("/api/personnel", params={"q": "개발"})
    assert listed_by_role.status_code == 200
    assert listed_by_role.json()["meta"]["total"] == 1
    assert listed_by_role.json()["data"][0]["id"] == person["id"]

    denied_head_master_update = client.patch(
        f"/api/personnel/{person['id']}",
        headers={"x-user-permission": "read_only", "x-user-organization-role": "head"},
        json={"name": "권한초과"},
    )
    assert denied_head_master_update.status_code == 403

    patched = client.patch(
        f"/api/personnel/{person['id']}",
        headers={"x-user-permission": "read_only", "x-user-organization-role": "head"},
        json={"employment_status": "leave"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["employment_status"] == "leave"

    denied_head_use_status = client.patch(
        f"/api/personnel/{person['id']}",
        headers={"x-user-permission": "read_only", "x-user-organization-role": "head"},
        json={"is_active": False},
    )
    assert denied_head_use_status.status_code == 403

    deactivated = client.patch(
        f"/api/personnel/{person['id']}",
        json={"is_active": False},
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["data"]["is_active"] is False

    inactive_listed = client.get("/api/personnel", params={"is_active": False})
    assert inactive_listed.status_code == 200
    assert inactive_listed.json()["meta"]["total"] == 1
    assert inactive_listed.json()["data"][0]["id"] == person["id"]

    inactive_role = client.post("/api/roles", json={"code": "OLD", "name": "구역할", "is_active": False})
    assert inactive_role.status_code == 201
    rejected = client.patch(
        f"/api/personnel/{person['id']}",
        json={"role_id": inactive_role.json()["data"]["id"]},
    )
    assert rejected.status_code == 400


def test_monthly_employment_mm_list_and_patch(client_and_session: tuple[TestClient, sessionmaker[Session]]) -> None:
    client, SessionLocal = client_and_session
    with SessionLocal() as session:
        person = Personnel(
            name="김월별",
            group_name="PMO본부",
            team_name="PMO2팀",
            employment_status="active",
            is_active=True,
        )
        session.add(person)
        session.flush()
        monthly = MonthlyEmploymentMM(
            personnel_id=person.id,
            year=2026,
            month=6,
            workdays=20,
            employed_workdays=10,
            employment_mm=0.5,
        )
        session.add(monthly)
        inactive_person = Personnel(
            name="김미사용",
            group_name="PMO본부",
            team_name="PMO2팀",
            employment_status="active",
            is_active=False,
        )
        session.add(inactive_person)
        session.flush()
        inactive_monthly = MonthlyEmploymentMM(
            personnel_id=inactive_person.id,
            year=2026,
            month=6,
            workdays=20,
            employed_workdays=20,
            employment_mm=1.0,
        )
        session.add(inactive_monthly)
        session.commit()
        monthly_id = monthly.id

    listed = client.get("/api/monthly-employment-mm", params={"year": 2026, "group_name": "PMO본부"})
    assert listed.status_code == 200
    assert listed.json()["meta"]["total"] == 1
    assert listed.json()["data"][0]["personnel_name"] == "김월별"

    listed_inactive = client.get("/api/monthly-employment-mm", params={"year": 2026, "group_name": "PMO본부", "is_active": False})
    assert listed_inactive.status_code == 200
    assert listed_inactive.json()["meta"]["total"] == 1
    assert listed_inactive.json()["data"][0]["personnel_name"] == "김미사용"

    invalid = client.patch(
        f"/api/monthly-employment-mm/{monthly_id}",
        json={"workdays": 10, "employed_workdays": 11},
    )
    assert invalid.status_code == 400

    denied_head_patch = client.patch(
        f"/api/monthly-employment-mm/{monthly_id}",
        headers={"x-user-permission": "read_only", "x-user-organization-role": "head"},
        json={"employed_workdays": 20, "employment_mm": 1.0, "note": "보정"},
    )
    assert denied_head_patch.status_code == 403

    patched = client.patch(
        f"/api/monthly-employment-mm/{monthly_id}",
        json={"employed_workdays": 20, "employment_mm": 1.0, "note": "보정"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["employment_mm"] == 1.0
    assert patched.json()["data"]["note"] == "보정"


def test_holidays_crud_projection_and_workday_summary(
    client_and_session: tuple[TestClient, sessionmaker[Session]],
) -> None:
    client, SessionLocal = client_and_session

    denied_create = client.post(
        "/api/holidays",
        headers={"x-user-permission": "general_editor"},
        json={
            "holiday_date": "2026-01-01",
            "name": "신정",
            "holiday_type": "public",
            "repeats_annually": True,
            "is_active": True,
        },
    )
    assert denied_create.status_code == 403

    created_public = client.post(
        "/api/holidays",
        json={
            "holiday_date": "2026-01-01",
            "name": "신정",
            "holiday_type": "public",
            "repeats_annually": True,
            "is_active": True,
            "note": "연간 반복",
        },
    )
    assert created_public.status_code == 201
    public_holiday = created_public.json()["data"]
    assert public_holiday["repeats_annually"] is True
    assert public_holiday["is_counted_as_workday"] is False

    created_alternative = client.post(
        "/api/holidays",
        json={
            "holiday_date": "2026-05-06",
            "name": "어린이날 대체휴일",
            "holiday_type": "alternative",
            "repeats_annually": False,
            "is_active": True,
        },
    )
    assert created_alternative.status_code == 201

    rejected_repeat_alternative = client.post(
        "/api/holidays",
        json={
            "holiday_date": "2026-05-07",
            "name": "잘못된 대체휴일",
            "holiday_type": "alternative",
            "repeats_annually": True,
            "is_active": True,
        },
    )
    assert rejected_repeat_alternative.status_code == 400

    created_company = client.post(
        "/api/holidays",
        json={
            "holiday_date": "2026-12-31",
            "name": "종무일",
            "holiday_type": "company",
            "repeats_annually": False,
            "is_active": False,
            "note": "사용 제외",
        },
    )
    assert created_company.status_code == 201
    company_holiday = created_company.json()["data"]
    assert company_holiday["is_active"] is False
    assert company_holiday["is_counted_as_workday"] is True

    duplicate_month_day = client.post(
        "/api/holidays",
        json={
            "holiday_date": "2027-01-01",
            "name": "중복 신정",
            "holiday_type": "public",
            "repeats_annually": True,
            "is_active": True,
        },
    )
    assert duplicate_month_day.status_code == 409

    projected = client.get("/api/holidays", params={"year": 2027, "page_size": 20})
    assert projected.status_code == 200
    projected_payload = projected.json()
    projected_rows = projected_payload["data"]
    assert projected_payload["meta"]["summary"]["total_count"] == 1
    assert projected_rows[0]["holiday_date"] == "2027-01-01"
    assert projected_rows[0]["is_projected"] is True

    listed_2026 = client.get("/api/holidays", params={"year": 2026, "month": 5, "page_size": 20})
    assert listed_2026.status_code == 200
    listed_2026_payload = listed_2026.json()
    assert listed_2026_payload["meta"]["summary"]["alternative_count"] == 1
    assert listed_2026_payload["meta"]["summary"]["active_count"] == 1
    assert listed_2026_payload["meta"]["workday_summary"]["month"] == 5
    assert listed_2026_payload["meta"]["workday_summary"]["workdays"] >= 20

    patched = client.patch(
        f"/api/holidays/{company_holiday['id']}",
        json={"is_active": True, "note": "사용 전환"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["is_counted_as_workday"] is False
    assert patched.json()["data"]["note"] == "사용 전환"

    workdays = client.get(
        "/api/holidays/workdays",
        params={"start_date": "2026-05-01", "end_date": "2026-05-31"},
    )
    assert workdays.status_code == 200
    assert workdays.json()["data"]["workdays"] == 20

    denied_delete = client.delete(
        f"/api/holidays/{public_holiday['id']}",
        headers={"x-user-permission": "project_editor"},
    )
    assert denied_delete.status_code == 403

    deleted = client.delete(f"/api/holidays/{public_holiday['id']}")
    assert deleted.status_code == 200

    with SessionLocal() as session:
        deleted_row = session.get(Holiday, public_holiday["id"])
        assert deleted_row is None
