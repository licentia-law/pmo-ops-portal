from __future__ import annotations

import argparse
import os
from collections.abc import Generator
from tempfile import mkstemp

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base, get_session
from app.main import app
from app.tools.seed_bundle import import_seed_bundle


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify core P1 APIs against seed CSV data.")
    parser.add_argument(
        "--seed-dir",
        default="../../docs/schema/chatGPT",
        help="Seed CSV directory path.",
    )
    args = parser.parse_args()

    fd, temp_path = mkstemp(prefix="pmo_api_verify_", suffix=".db")
    os.close(fd)
    if os.path.exists(temp_path):
        os.remove(temp_path)

    engine = create_engine(f"sqlite+pysqlite:///{temp_path}", connect_args={"check_same_thread": False})
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    try:
        with session_factory() as seed_session:
            import_seed_bundle(seed_session, seed_dir=args.seed_dir, truncate=False)

        def override_session() -> Generator[Session, None, None]:
            with session_factory() as session:
                yield session

        app.dependency_overrides[get_session] = override_session
        with TestClient(app) as client:
            _check_endpoints(client)
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
        if os.path.exists(temp_path):
            os.remove(temp_path)


def _check_endpoints(client: TestClient) -> None:
    checks: list[tuple[str, str, dict[str, str]]] = [
        ("GET", "/api/health", {}),
        ("GET", "/api/projects", {}),
        ("GET", "/api/project-codes", {}),
        ("GET", "/api/project-logs", {}),
        ("GET", "/api/p1-screens/home", {}),
        ("GET", "/api/p1-screens/execution", {}),
        ("GET", "/api/p1-screens/code", {}),
        ("GET", "/api/p1-screens/project-detail", {}),
        ("GET", "/api/p1-screens/history", {}),
    ]

    for method, path, params in checks:
        response = client.request(method, path, params=params)
        if response.status_code != 200:
            raise RuntimeError(f"{path} failed with status {response.status_code}: {response.text}")

    projects = client.get("/api/projects", params={"page": 1, "page_size": 20}).json()
    project_codes = client.get("/api/project-codes", params={"page": 1, "page_size": 20}).json()
    project_logs = client.get("/api/project-logs", params={"page": 1, "page_size": 20}).json()

    _assert_envelope(projects, "projects")
    _assert_envelope(project_codes, "project_codes")
    _assert_envelope(project_logs, "project_logs")

    print("API_VERIFY_OK")
    print(f"projects.total={projects['meta']['total']} page_size={projects['meta']['page_size']}")
    print(f"project_codes.total={project_codes['meta']['total']} page_size={project_codes['meta']['page_size']}")
    print(f"project_logs.total={project_logs['meta']['total']} page_size={project_logs['meta']['page_size']}")

    sample = client.get("/api/projects", params={"q": "P2026001"}).json()
    _assert_envelope(sample, "projects.search")
    print(f"projects.search.total={sample['meta']['total']}")

    status_filtered = client.get("/api/projects", params={"status": "running"}).json()
    _assert_envelope(status_filtered, "projects.status")
    print(f"projects.running.total={status_filtered['meta']['total']}")

    code_filtered = client.get("/api/project-codes", params={"status": "proposing"}).json()
    _assert_envelope(code_filtered, "project_codes.status")
    print(f"project_codes.proposing.total={code_filtered['meta']['total']}")
    print("p1_screens.ok=5")


def _assert_envelope(payload: dict, label: str) -> None:
    if "data" not in payload or "meta" not in payload or "error" not in payload:
        raise RuntimeError(f"{label}: invalid envelope keys")
    if payload["error"] is not None:
        raise RuntimeError(f"{label}: unexpected error {payload['error']}")
    required_meta = {"total", "page", "page_size"}
    if not required_meta.issubset(set(payload["meta"].keys())):
        raise RuntimeError(f"{label}: missing meta keys in {payload['meta']}")


if __name__ == "__main__":
    main()
