from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.common import ListParams, apply_text_search, envelope, paginate, parse_sort
from app.api.deps import CurrentUser, DbSession
from app.domain.projects import can_mutate_project
from app.enums import ProjectStatus
from app.models.core import Project, ProjectLog
from app.schemas.projects import ProjectLogCreate, ProjectLogRead

router = APIRouter()


def serialize_log(log: ProjectLog) -> dict[str, object]:
    payload = ProjectLogRead.model_validate(log).model_dump(mode="json")
    payload["project_name"] = log.project.name if log.project else None
    payload["project_code"] = log.project.code if log.project else None
    return payload


@router.get("")
def list_project_logs(
    session: DbSession,
    params: ListParams = Depends(),
    project_id: str | None = None,
) -> dict[str, object]:
    statement = select(ProjectLog).join(Project, isouter=True)
    statement = apply_text_search(
        statement,
        params.q,
        [ProjectLog.content, ProjectLog.author_name, Project.name, Project.code],
    )
    if params.status:
        statement = statement.where(ProjectLog.status == ProjectStatus(params.status))
    if project_id:
        statement = statement.where(ProjectLog.project_id == project_id)
    statement = statement.order_by(
        parse_sort(
            params.sort,
            {
                "logged_at": ProjectLog.logged_at,
                "updated_at": ProjectLog.updated_at,
                "author_name": ProjectLog.author_name,
            },
            default="-logged_at",
        )
    )
    rows, total = paginate(session, statement, params.page, params.page_size)
    return envelope(
        [serialize_log(row) for row in rows],
        {"page": params.page, "page_size": params.page_size, "total": total},
    )


@router.post("", status_code=201)
def create_project_log(
    payload: ProjectLogCreate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    project = session.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
    if not can_mutate_project(user, project):
        raise HTTPException(status_code=403, detail="진행이력 등록 권한이 없습니다.")
    log = ProjectLog(
        project_id=payload.project_id,
        status=payload.status,
        logged_at=payload.logged_at or datetime.utcnow(),
        author_name=payload.author_name or user.name,
        content=payload.content,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return envelope(serialize_log(log))


@router.get("/{log_id}")
def get_project_log(log_id: str, session: DbSession) -> dict[str, object]:
    log = session.get(ProjectLog, log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="진행이력을 찾을 수 없습니다.")
    return envelope(serialize_log(log))
