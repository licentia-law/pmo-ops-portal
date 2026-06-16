from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.common import ListParams, apply_text_search, envelope, paginate, parse_sort
from app.api.deps import CurrentUser, DbSession
from app.domain.people import ensure_unique_role_code, normalize_payload, require_nonblank, require_role_mutation
from app.models.core import Role
from app.schemas.people import RoleCreate, RoleRead, RoleUpdate

router = APIRouter()


def serialize_role(role: Role) -> dict[str, object]:
    return RoleRead.model_validate(role).model_dump(mode="json")


@router.get("")
def list_roles(
    session: DbSession,
    params: ListParams = Depends(),
    is_active: bool | None = None,
    job_group: str | None = None,
) -> dict[str, object]:
    statement = select(Role)
    statement = apply_text_search(statement, params.q, [Role.code, Role.name, Role.job_group])
    if is_active is not None:
        statement = statement.where(Role.is_active == is_active)
    if job_group:
        statement = statement.where(Role.job_group == job_group)
    statement = statement.order_by(
        parse_sort(
            params.sort,
            {
                "code": Role.code,
                "name": Role.name,
                "job_group": Role.job_group,
                "sort_order": Role.sort_order,
                "updated_at": Role.updated_at,
            },
            default="sort_order",
        )
    )
    rows, total = paginate(session, statement, params.page, params.page_size)
    return envelope(
        [serialize_role(row) for row in rows],
        {"page": params.page, "page_size": params.page_size, "total": total},
    )


@router.post("", status_code=201)
def create_role(payload: RoleCreate, session: DbSession, user: CurrentUser) -> dict[str, object]:
    require_role_mutation(user, "역할/직무 기준값 등록 권한이 없습니다.")
    values = normalize_payload(payload.model_dump())
    values["code"] = require_nonblank(values.get("code"), "역할 코드")
    values["name"] = require_nonblank(values.get("name"), "역할명")
    ensure_unique_role_code(session, str(values["code"]))
    role = Role(**values)
    session.add(role)
    session.commit()
    session.refresh(role)
    return envelope(serialize_role(role))


@router.patch("/{role_id}")
def update_role(
    role_id: str,
    payload: RoleUpdate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    require_role_mutation(user, "역할/직무 기준값 수정 권한이 없습니다.")
    role = session.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="역할/직무 기준값을 찾을 수 없습니다.")
    updates = normalize_payload(payload.model_dump(exclude_unset=True))
    if "code" in updates:
        code = updates.get("code")
        updates["code"] = require_nonblank(code, "역할 코드")
        ensure_unique_role_code(session, str(updates["code"]), role_id)
    if "name" in updates:
        updates["name"] = require_nonblank(updates["name"], "역할명")
    for field, value in updates.items():
        setattr(role, field, value)
    session.commit()
    session.refresh(role)
    return envelope(serialize_role(role))
