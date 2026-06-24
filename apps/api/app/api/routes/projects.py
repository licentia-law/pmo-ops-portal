from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.common import ListParams, apply_text_search, envelope, paginate, parse_sort
from app.api.deps import CurrentUser, DbSession
from app.domain.project_code_policy import generate_project_code
from app.domain.projects import (
    allowed_next_statuses,
    can_mutate_project,
    get_missing_project_fields,
    is_valid_status_transition,
)
from app.domain.personnel import person_name_with_title, user_display_name
from app.enums import ProjectLogStatus, ProjectStatus, ProjectType
from app.models.core import Project, ProjectCode, ProjectLog
from app.schemas.projects import ProjectCreate, ProjectMasterCreate, ProjectMasterUpdate, ProjectRead, ProjectUpdate
from app.services.project_master import (
    PROJECT_MASTER_SYNC_FIELDS,
    ProjectMasterConflictError,
    ProjectMasterValidationError,
    create_project_master,
    update_project_master,
)

router = APIRouter()


def serialize_project(session: DbSession, project: Project) -> dict[str, object]:
    payload = ProjectRead.model_validate(project).model_dump(mode="json")
    payload["proposal_pm_name"] = person_name_with_title(session, payload.get("proposal_pm_name"))
    payload["presentation_pm_name"] = person_name_with_title(session, payload.get("presentation_pm_name"))
    payload["delivery_pm_name"] = person_name_with_title(session, payload.get("delivery_pm_name"))
    payload["sales_owner"] = person_name_with_title(session, payload.get("sales_owner"))
    payload["allowed_next_statuses"] = [status.value for status in allowed_next_statuses(project.status)]
    return payload


@router.get("")
def list_projects(session: DbSession, params: ListParams = Depends()) -> dict[str, object]:
    statement = select(Project)
    statement = apply_text_search(
        statement,
        params.q,
        [Project.code, Project.name, Project.proposal_pm_name, Project.presentation_pm_name, Project.delivery_pm_name, Project.client_name, Project.sales_owner],
    )
    if params.status:
        statement = statement.where(Project.status == ProjectStatus(params.status))
    if params.project_type:
        statement = statement.where(Project.project_type == ProjectType(params.project_type))
    statement = statement.order_by(
        parse_sort(
            params.sort,
            {
                "code": Project.code,
                "name": Project.name,
                "status": Project.status,
                "start_date": Project.start_date,
                "updated_at": Project.updated_at,
            },
        )
    )
    rows, total = paginate(session, statement, params.page, params.page_size)
    return envelope(
        [serialize_project(session, row) for row in rows],
        {"page": params.page, "page_size": params.page_size, "total": total},
    )


@router.post("", status_code=201)
def create_project(payload: ProjectCreate, session: DbSession, user: CurrentUser) -> dict[str, object]:
    if not can_mutate_project(user):
        raise HTTPException(status_code=403, detail="프로젝트 등록 권한이 없습니다.")
    missing_required = get_missing_project_fields(payload)
    if missing_required:
        raise HTTPException(status_code=400, detail=f"필수 항목 누락: {', '.join(missing_required)}")
    project_code = session.get(ProjectCode, payload.project_code_id) if payload.project_code_id else None
    if payload.project_code_id and project_code is None:
        raise HTTPException(status_code=404, detail="프로젝트코드를 찾을 수 없습니다.")
    if payload.code:
        code = payload.code
    elif project_code:
        code = project_code.code
    else:
        code = generate_project_code(session)
    if project_code and any(getattr(payload, field) != getattr(project_code, field) for field in ("name", "project_type", "status", "certainty")):
        raise HTTPException(status_code=409, detail="연결된 프로젝트코드의 공통 항목은 통합 마스터 API로 수정해야 합니다.")
    if session.scalar(select(Project).where(Project.code == code)):
        raise HTTPException(status_code=409, detail="이미 사용 중인 프로젝트 코드입니다.")

    project = Project(**payload.model_dump(exclude={"code"}), code=code)
    session.add(project)
    session.flush()
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
    session.commit()
    session.refresh(project)
    return envelope(serialize_project(session, project))


@router.post("/master", status_code=201)
def create_project_master_route(
    payload: ProjectMasterCreate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    if not can_mutate_project(user):
        raise HTTPException(status_code=403, detail="프로젝트 등록 권한이 없습니다.")
    try:
        project_code, project = create_project_master(session, user, payload)
        session.commit()
    except ProjectMasterValidationError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ProjectMasterConflictError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="프로젝트코드 또는 연결값이 이미 사용 중입니다.") from exc
    session.refresh(project_code)
    session.refresh(project)
    return envelope({"project_code": project_code.id, "project": serialize_project(session, project)})


@router.get("/{project_id}")
def get_project(project_id: str, session: DbSession) -> dict[str, object]:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    return envelope(serialize_project(session, project))


@router.patch("/{project_id}")
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    if not can_mutate_project(user, project):
        raise HTTPException(status_code=403, detail="프로젝트 수정 권한이 없습니다.")

    updates = payload.model_dump(exclude_unset=True)
    if project.project_code_id and set(updates).intersection(PROJECT_MASTER_SYNC_FIELDS):
        raise HTTPException(status_code=409, detail="연결된 프로젝트의 공통 항목은 통합 마스터 API로 수정해야 합니다.")
    next_status = updates.get("status")
    if next_status is not None and not is_valid_status_transition(project.status, next_status):
        raise HTTPException(status_code=400, detail="허용되지 않는 상태 전환입니다.")

    if "project_code_id" in updates and updates["project_code_id"] != project.project_code_id:
        next_project_code_id = updates["project_code_id"]
        if next_project_code_id and session.get(ProjectCode, next_project_code_id) is None:
            raise HTTPException(status_code=404, detail="프로젝트코드를 찾을 수 없습니다.")
        if next_project_code_id and session.scalar(
            select(Project).where(Project.project_code_id == next_project_code_id, Project.id != project.id)
        ):
            raise HTTPException(status_code=409, detail="이미 다른 프로젝트에 연결된 프로젝트코드입니다.")
    candidate_values = {column.name: getattr(project, column.name) for column in Project.__table__.columns}
    candidate_values.update(updates)
    missing_required = get_missing_project_fields(candidate_values)
    if missing_required:
        raise HTTPException(status_code=400, detail=f"필수 항목 누락: {', '.join(missing_required)}")
    previous_status = project.status
    for field, value in updates.items():
        setattr(project, field, value)
    if next_status is not None and next_status != previous_status:
        actor_name = user_display_name(session, user)
        session.add(
            ProjectLog(
                project_id=project.id,
                log_status=ProjectLogStatus.DONE if project.status == ProjectStatus.DONE else ProjectLogStatus.IN_PROGRESS,
                previous_status=previous_status,
                next_status=project.status,
                logged_at=datetime.utcnow(),
                author_name=actor_name,
                updated_by_name=actor_name,
                content=f"상태 변경: {previous_status.value} -> {project.status.value}",
            )
        )
    session.commit()
    session.refresh(project)
    return envelope(serialize_project(session, project))


@router.patch("/{project_id}/master")
def update_project_master_route(
    project_id: str,
    payload: ProjectMasterUpdate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    if not can_mutate_project(user, project):
        raise HTTPException(status_code=403, detail="프로젝트 수정 권한이 없습니다.")
    try:
        project_code = update_project_master(session, user, project, payload)
        session.commit()
    except ProjectMasterValidationError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ProjectMasterConflictError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="프로젝트코드 또는 연결값이 이미 사용 중입니다.") from exc
    session.refresh(project_code)
    session.refresh(project)
    return envelope({"project_code": project_code.id, "project": serialize_project(session, project)})
