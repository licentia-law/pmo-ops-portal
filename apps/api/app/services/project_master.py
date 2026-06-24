from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.personnel import user_display_name
from app.domain.project_code_policy import generate_project_code
from app.domain.projects import get_missing_project_fields, is_valid_status_transition
from app.enums import ProjectLogStatus
from app.models.core import Project, ProjectCode, ProjectLog, User
from app.schemas.projects import ProjectMasterCreate, ProjectMasterUpdate

PROJECT_MASTER_SYNC_FIELDS = ("code", "name", "project_type", "status", "certainty")


class ProjectMasterValidationError(ValueError):
    pass


class ProjectMasterConflictError(ValueError):
    pass


def _is_missing(value: object) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _missing_project_code_fields(values: Mapping[str, object]) -> list[str]:
    checks = (("코드명", values.get("name")), ("사업유형", values.get("project_type")), ("상태", values.get("status")), ("확도", values.get("certainty")))
    return [label for label, value in checks if _is_missing(value)]


def _validate_project_values(values: Mapping[str, object]) -> None:
    missing_fields = get_missing_project_fields(values)
    if missing_fields:
        raise ProjectMasterValidationError(f"필수 항목 누락: {', '.join(missing_fields)}")


def _validate_project_code_values(values: Mapping[str, object]) -> None:
    missing_fields = _missing_project_code_fields(values)
    if missing_fields:
        raise ProjectMasterValidationError(f"필수 항목 누락: {', '.join(missing_fields)}")


def _ensure_code_available(session: Session, code: str, project_code_id: str | None = None, project_id: str | None = None) -> None:
    existing_code = session.scalar(select(ProjectCode).where(ProjectCode.code == code, ProjectCode.id != project_code_id))
    existing_project = session.scalar(select(Project).where(Project.code == code, Project.id != project_id))
    if existing_code or existing_project:
        raise ProjectMasterConflictError("이미 사용 중인 프로젝트 코드입니다.")


def _add_create_log(session: Session, project: Project, user: User) -> None:
    actor_name = user_display_name(session, user)
    session.add(
        ProjectLog(
            project_id=project.id,
            log_status=ProjectLogStatus.MEMO,
            logged_at=project.created_at,
            author_name=actor_name,
            updated_by_name=actor_name,
            content="프로젝트 등록",
        )
    )


def create_project_master(session: Session, user: User, payload: ProjectMasterCreate) -> tuple[ProjectCode, Project]:
    code_values = payload.project_code.model_dump()
    project_values = payload.project.model_dump()
    explicit_project_code = project_values.get("code")
    explicit_code = code_values.get("code") or explicit_project_code
    if code_values.get("code") and explicit_project_code and code_values["code"] != explicit_project_code:
        raise ProjectMasterValidationError("프로젝트코드와 프로젝트의 코드가 일치하지 않습니다.")
    code = str(explicit_code or generate_project_code(session)).strip()
    code_values["code"] = code
    project_values["code"] = code
    project_values["project_code_id"] = "pending"
    _validate_project_code_values(code_values)
    _validate_project_values(project_values)
    _ensure_code_available(session, code)

    project_code = ProjectCode(**{key: value for key, value in code_values.items() if key != "code"}, code=code)
    session.add(project_code)
    session.flush()
    project_values["project_code_id"] = project_code.id
    project = Project(
        **{key: value for key, value in project_values.items() if key not in {"code", "project_code_id"}},
        code=code,
        project_code_id=project_code.id,
    )
    session.add(project)
    session.flush()
    _add_create_log(session, project, user)
    return project_code, project


def update_project_master(session: Session, user: User, project: Project, payload: ProjectMasterUpdate) -> ProjectCode:
    if project.project_code_id is None:
        raise ProjectMasterConflictError("연결된 프로젝트코드가 없어 통합 수정할 수 없습니다.")
    project_code = session.get(ProjectCode, project.project_code_id)
    if project_code is None:
        raise ProjectMasterConflictError("연결된 프로젝트코드를 찾을 수 없습니다.")

    code_updates = payload.project_code.model_dump(exclude_unset=True)
    project_updates = payload.project.model_dump(exclude_unset=True)
    requested_link = project_updates.pop("project_code_id", project.project_code_id)
    if requested_link != project.project_code_id:
        raise ProjectMasterValidationError("프로젝트코드 연결은 통합 수정에서 변경할 수 없습니다.")

    effective_code_values = {field: getattr(project_code, field) for field in ProjectCode.__table__.columns.keys()}
    effective_code_values.update(code_updates)
    _validate_project_code_values(effective_code_values)
    _ensure_code_available(session, str(effective_code_values["code"]).strip(), project_code.id, project.id)

    previous_status = project.status
    next_status = effective_code_values["status"]
    if not is_valid_status_transition(previous_status, next_status):
        raise ProjectMasterValidationError("허용되지 않는 상태 전환입니다.")

    for field, value in code_updates.items():
        setattr(project_code, field, value)
    for field, value in project_updates.items():
        if field not in PROJECT_MASTER_SYNC_FIELDS:
            setattr(project, field, value)
    for field in PROJECT_MASTER_SYNC_FIELDS:
        setattr(project, field, getattr(project_code, field))
    _validate_project_values(project)

    if next_status != previous_status:
        actor_name = user_display_name(session, user)
        session.add(
            ProjectLog(
                project_id=project.id,
                log_status=ProjectLogStatus.DONE if next_status.value == "done" else ProjectLogStatus.IN_PROGRESS,
                previous_status=previous_status,
                next_status=next_status,
                logged_at=datetime.utcnow(),
                author_name=actor_name,
                updated_by_name=actor_name,
                content=f"상태 변경: {previous_status.value} -> {next_status.value}",
            )
        )
    return project_code
