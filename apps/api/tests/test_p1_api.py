from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_session
from app.main import app


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


def test_project_lifecycle_and_invalid_transition(client: TestClient) -> None:
    created = client.post(
        "/api/projects",
        json={
            "name": "차세대 PMO 구축",
            "client_name": "내부",
            "project_type": "main",
            "status": "proposing",
            "proposal_pm_name": "관리자",
        },
    )
    assert created.status_code == 201
    project = created.json()["data"]
    assert project["code"] == "PMO-0001"

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
    created = client.post(
        "/api/projects",
        json={"name": "담당자 검증", "project_type": "main", "status": "presented", "proposal_pm_name": "pm1"},
    )
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
