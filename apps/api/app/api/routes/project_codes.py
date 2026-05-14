from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from app.api.common import ListParams, apply_text_search, envelope, paginate, parse_sort
from app.api.deps import CurrentUser, DbSession
from app.domain.projects import can_mutate_master
from app.enums import ProjectStatus, ProjectType
from app.models.core import ProjectCode
from app.schemas.projects import ProjectCodeCreate, ProjectCodeRead, ProjectCodeUpdate

router = APIRouter()


def next_code(session: DbSession) -> str:
    total = session.scalar(select(func.count()).select_from(ProjectCode).where(ProjectCode.code.like("PC-%"))) or 0
    return f"PC-{total + 1:04d}"


@router.get("")
def list_project_codes(session: DbSession, params: ListParams = Depends()) -> dict[str, object]:
    statement = select(ProjectCode)
    statement = apply_text_search(
        statement,
        params.q,
        [ProjectCode.code, ProjectCode.name, ProjectCode.owner_name, ProjectCode.sales_owner],
    )
    if params.status:
        statement = statement.where(ProjectCode.status == ProjectStatus(params.status))
    if params.project_type:
        statement = statement.where(ProjectCode.project_type == ProjectType(params.project_type))
    statement = statement.order_by(
        parse_sort(
            params.sort,
            {
                "code": ProjectCode.code,
                "name": ProjectCode.name,
                "status": ProjectCode.status,
                "updated_at": ProjectCode.updated_at,
            },
        )
    )
    rows, total = paginate(session, statement, params.page, params.page_size)
    return envelope(
        [ProjectCodeRead.model_validate(row).model_dump(mode="json") for row in rows],
        {"page": params.page, "page_size": params.page_size, "total": total},
    )


@router.post("", status_code=201)
def create_project_code(
    payload: ProjectCodeCreate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    if not can_mutate_master(user):
        raise HTTPException(status_code=403, detail="프로젝트코드 등록 권한이 없습니다.")
    required_checks: list[tuple[str, object]] = [
        ("코드명", payload.name),
        ("사업유형", payload.project_type),
        ("상태", payload.status),
        ("확도", payload.certainty),
        ("영업부서", payload.sales_department),
        ("영업대표", payload.sales_owner),
        ("시작일", payload.start_date),
        ("종료일", payload.end_date),
    ]
    missing_required = [label for label, value in required_checks if value is None or (isinstance(value, str) and not value.strip())]
    if missing_required:
        raise HTTPException(status_code=400, detail=f"필수 항목 누락: {', '.join(missing_required)}")
    code = payload.code or next_code(session)
    if session.scalar(select(ProjectCode).where(ProjectCode.code == code)):
        raise HTTPException(status_code=409, detail="이미 사용 중인 프로젝트 코드입니다.")
    project_code = ProjectCode(**payload.model_dump(exclude={"code"}), code=code)
    session.add(project_code)
    session.commit()
    session.refresh(project_code)
    return envelope(ProjectCodeRead.model_validate(project_code).model_dump(mode="json"))


@router.patch("/{project_code_id}")
def update_project_code(
    project_code_id: str,
    payload: ProjectCodeUpdate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    if not can_mutate_master(user):
        raise HTTPException(status_code=403, detail="프로젝트코드 수정 권한이 없습니다.")
    project_code = session.get(ProjectCode, project_code_id)
    if project_code is None:
        raise HTTPException(status_code=404, detail="프로젝트코드를 찾을 수 없습니다.")
    updates = payload.model_dump(exclude_unset=True)
    code = updates.get("code")
    if code and session.scalar(select(ProjectCode).where(ProjectCode.code == code, ProjectCode.id != project_code_id)):
        raise HTTPException(status_code=409, detail="이미 사용 중인 프로젝트 코드입니다.")
    for field, value in updates.items():
        setattr(project_code, field, value)
    session.commit()
    session.refresh(project_code)
    return envelope(ProjectCodeRead.model_validate(project_code).model_dump(mode="json"))
