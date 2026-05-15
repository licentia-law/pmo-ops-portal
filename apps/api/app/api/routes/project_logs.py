from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.common import ListParams, apply_text_search, envelope, paginate, parse_sort
from app.api.deps import CurrentUser, DbSession
from app.domain.projects import can_mutate_project
from app.enums import ProjectLogStatus
from app.models.core import Project, ProjectLog
from app.schemas.projects import ProjectLogCreate, ProjectLogRead, ProjectLogUpdate

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
    log_status: str | None = None,
) -> dict[str, object]:
    statement = select(ProjectLog).join(Project, isouter=True)
    statement = apply_text_search(
        statement,
        params.q,
        [ProjectLog.content, ProjectLog.author_name, Project.name, Project.code],
    )
    if log_status:
        try:
            statement = statement.where(ProjectLog.log_status == ProjectLogStatus(log_status))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="지원하지 않는 log_status 필터입니다.") from exc
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
    if payload.log_status == "done":
        raise HTTPException(status_code=400, detail="등록 시 완료(done) 상태는 선택할 수 없습니다.")

    log = ProjectLog(
        project_id=payload.project_id,
        log_status=payload.log_status,
        logged_at=datetime.utcnow(),
        author_name=user.name,
        updated_by_name=user.name,
        content=payload.content,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return envelope(serialize_log(log))


@router.patch("/{log_id}")
def update_project_log(
    log_id: str,
    payload: ProjectLogUpdate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    log = session.get(ProjectLog, log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="진행이력을 찾을 수 없습니다.")
    if log.project is None or not can_mutate_project(user, log.project):
        raise HTTPException(status_code=403, detail="진행이력 수정 권한이 없습니다.")

    updates = payload.model_dump(exclude_unset=True)
    next_log_status = updates.get("log_status")
    if log.log_status == "done":
        # TODO(policy): 완료 이력의 내용 수정 허용 여부는 운영 정책 확정 후 조정.
        raise HTTPException(status_code=400, detail="완료(done) 상태 이력은 수정할 수 없습니다.")
    if next_log_status == "in_progress" and log.log_status == "memo":
        raise HTTPException(status_code=400, detail="메모(memo)에서 진행(in_progress)으로의 전환은 허용되지 않습니다.")
    if next_log_status == "memo" and log.log_status == "in_progress":
        raise HTTPException(status_code=400, detail="진행(in_progress)에서 메모(memo)로의 전환은 허용되지 않습니다.")
    if next_log_status == "done" and log.log_status != "in_progress":
        raise HTTPException(status_code=400, detail="완료(done)는 진행(in_progress)에서만 전환할 수 있습니다.")

    if "content" in updates and updates["content"] is not None:
        log.content = updates["content"]
    if next_log_status is not None:
        log.log_status = next_log_status
    log.logged_at = datetime.utcnow()
    log.updated_by_name = user.name
    session.commit()
    session.refresh(log)
    return envelope(serialize_log(log))


@router.get("/{log_id}")
def get_project_log(log_id: str, session: DbSession) -> dict[str, object]:
    log = session.get(ProjectLog, log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="진행이력을 찾을 수 없습니다.")
    return envelope(serialize_log(log))
