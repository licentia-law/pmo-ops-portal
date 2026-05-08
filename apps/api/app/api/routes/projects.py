from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from app.api.common import ListParams, apply_text_search, envelope, paginate, parse_sort
from app.api.deps import CurrentUser, DbSession
from app.domain.projects import allowed_next_statuses, can_mutate_project, is_valid_status_transition
from app.enums import ProjectStatus, ProjectType
from app.models.core import Project, ProjectCode, ProjectLog
from app.schemas.projects import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter()


def next_project_code(session: DbSession) -> str:
    count = session.scalar(select(func.count()).select_from(Project).where(Project.code.like("PMO-%"))) or 0
    return f"PMO-{count + 1:04d}"


def serialize_project(project: Project) -> dict[str, object]:
    payload = ProjectRead.model_validate(project).model_dump(mode="json")
    payload["allowed_next_statuses"] = [status.value for status in allowed_next_statuses(project.status)]
    return payload


@router.get("")
def list_projects(session: DbSession, params: ListParams = Depends()) -> dict[str, object]:
    statement = select(Project)
    statement = apply_text_search(statement, params.q, [Project.code, Project.name, Project.pm_name, Project.client_name])
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
        [serialize_project(row) for row in rows],
        {"page": params.page, "page_size": params.page_size, "total": total},
    )


@router.post("", status_code=201)
def create_project(payload: ProjectCreate, session: DbSession, user: CurrentUser) -> dict[str, object]:
    if not can_mutate_project(user):
        raise HTTPException(status_code=403, detail="프로젝트 등록 권한이 없습니다.")
    code = payload.code or next_project_code(session)
    if session.scalar(select(Project).where(Project.code == code)):
        raise HTTPException(status_code=409, detail="이미 사용 중인 프로젝트 코드입니다.")

    project = Project(**payload.model_dump(exclude={"code"}), code=code)
    session.add(project)
    if payload.project_code_id:
        project_code = session.get(ProjectCode, payload.project_code_id)
        if project_code:
            project_code.status = project.status
    session.flush()
    session.add(
        ProjectLog(
            project_id=project.id,
            status=project.status,
            logged_at=project.created_at,
            author_name=user.name,
            content="프로젝트 등록",
        )
    )
    session.commit()
    session.refresh(project)
    return envelope(serialize_project(project))


@router.get("/{project_id}")
def get_project(project_id: str, session: DbSession) -> dict[str, object]:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    return envelope(serialize_project(project))


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
    next_status = updates.get("status")
    if next_status is not None and not is_valid_status_transition(project.status, next_status):
        raise HTTPException(status_code=400, detail="허용되지 않는 상태 전환입니다.")

    previous_status = project.status
    for field, value in updates.items():
        setattr(project, field, value)
    if project.project_code_id:
        project_code = session.get(ProjectCode, project.project_code_id)
        if project_code:
            project_code.name = project.name
            project_code.project_type = project.project_type
            project_code.status = project.status
            project_code.owner_name = project.pm_name
    if next_status is not None and next_status != previous_status:
        session.add(
            ProjectLog(
                project_id=project.id,
                status=project.status,
                logged_at=datetime.utcnow(),
                author_name=user.name,
                content=f"상태 변경: {previous_status.value} -> {project.status.value}",
            )
        )
    session.commit()
    session.refresh(project)
    return envelope(serialize_project(project))
