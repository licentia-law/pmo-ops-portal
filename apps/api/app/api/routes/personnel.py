from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.common import ListParams, apply_text_search, envelope, paginate, parse_sort
from app.api.deps import CurrentUser, DbSession
from app.domain.people import (
    apply_personnel_scope,
    ensure_unique_personnel_fields,
    normalize_sales_owner_personnel,
    normalize_payload,
    require_nonblank,
    require_active_role,
    require_personnel_create,
    require_personnel_update,
)
from app.enums import EmploymentStatus
from app.models.core import Personnel, Role
from app.schemas.people import PersonnelCreate, PersonnelRead, PersonnelUpdate

router = APIRouter()
def serialize_personnel(person: Personnel) -> dict[str, object]:
    payload = PersonnelRead.model_validate(person).model_dump(mode="json")
    if person.role:
        payload["role_code"] = person.role.code
        payload["role_name"] = person.role.name
        payload["job_group"] = person.role.job_group
    else:
        payload["role_name"] = person.role_name
    return payload


@router.get("")
def list_personnel(
    session: DbSession,
    params: ListParams = Depends(),
    group_name: str | None = None,
    team_name: str | None = None,
    position_name: str | None = None,
    employment_status: EmploymentStatus | None = None,
    role_id: str | None = None,
    is_active: bool | None = None,
    scope: str | None = None,
) -> dict[str, object]:
    if scope not in (None, "pmo", "sales_owner"):
        raise HTTPException(status_code=400, detail="지원하지 않는 인력 보기 범위입니다.")
    statement = select(Personnel).outerjoin(Role, Personnel.role_id == Role.id).options(joinedload(Personnel.role))
    statement = apply_personnel_scope(statement, scope)
    statement = apply_text_search(
        statement,
        params.q,
        [
            Personnel.id,
            Personnel.employee_no,
            Personnel.name,
            Personnel.email,
            Personnel.group_name,
            Personnel.team_name,
            Personnel.position_name,
            Personnel.role_name,
            Role.code,
            Role.name,
            Role.job_group,
        ],
    )
    if group_name:
        statement = statement.where(Personnel.group_name == group_name)
    if team_name:
        statement = statement.where(Personnel.team_name == team_name)
    if position_name:
        statement = statement.where(Personnel.position_name == position_name)
    if employment_status:
        statement = statement.where(Personnel.employment_status == employment_status)
    if role_id:
        statement = statement.where(Personnel.role_id == role_id)
    if is_active is not None:
        statement = statement.where(Personnel.is_active == is_active)
    statement = statement.order_by(
        parse_sort(
            params.sort,
            {
                "name": Personnel.name,
                "employee_no": Personnel.employee_no,
                "group_name": Personnel.group_name,
                "team_name": Personnel.team_name,
                "position_name": Personnel.position_name,
                "employment_status": Personnel.employment_status,
                "updated_at": Personnel.updated_at,
            },
            default="name",
        )
    )
    rows, total = paginate(session, statement, params.page, params.page_size)
    return envelope(
        [serialize_personnel(row) for row in rows],
        {"page": params.page, "page_size": params.page_size, "total": total},
    )


@router.get("/sales-owner-candidates")
def list_sales_owner_candidates(session: DbSession) -> dict[str, object]:
    statement = select(Personnel).join(Role, Personnel.role_id == Role.id).options(joinedload(Personnel.role))
    rows = session.scalars(
        apply_personnel_scope(statement, "sales_owner").order_by(Personnel.group_name, Personnel.team_name, Personnel.name)
    ).all()
    return envelope([
        {
            "id": person.id,
            "name": person.name,
            "display_name": f"{person.name} {person.position_name or ''}".strip(),
            "group_name": person.group_name,
            "team_name": person.team_name,
            "position_name": person.position_name,
            "role_id": person.role_id,
            "role_name": person.role.name if person.role else person.role_name,
        }
        for person in rows
    ])


@router.post("", status_code=201)
def create_personnel(
    payload: PersonnelCreate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    require_personnel_create(user, "인력 등록 권한이 없습니다.")
    values = normalize_payload(payload.model_dump())
    values["name"] = require_nonblank(values.get("name"), "성명")
    values["group_name"] = require_nonblank(values.get("group_name"), "본부")
    normalize_sales_owner_personnel(session, values)
    ensure_unique_personnel_fields(
        session,
        employee_no=values.get("employee_no") if isinstance(values.get("employee_no"), str) else None,
        email=values.get("email") if isinstance(values.get("email"), str) else None,
    )
    person = Personnel(**values)
    session.add(person)
    session.commit()
    person = session.scalar(select(Personnel).options(joinedload(Personnel.role)).where(Personnel.id == person.id))
    if person is None:
        raise HTTPException(status_code=500, detail="인력 등록 결과를 확인할 수 없습니다.")
    return envelope(serialize_personnel(person))


@router.patch("/{personnel_id}")
def update_personnel(
    personnel_id: str,
    payload: PersonnelUpdate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    person = session.get(Personnel, personnel_id)
    if person is None:
        raise HTTPException(status_code=404, detail="인력을 찾을 수 없습니다.")
    updates = normalize_payload(payload.model_dump(exclude_unset=True))
    require_personnel_update(user, updates, "인력 수정 권한이 없습니다.")
    if "name" in updates:
        updates["name"] = require_nonblank(updates["name"], "성명")
    if "group_name" in updates:
        updates["group_name"] = require_nonblank(updates["group_name"], "본부")
    normalize_sales_owner_personnel(session, updates, person)
    ensure_unique_personnel_fields(
        session,
        employee_no=updates.get("employee_no") if isinstance(updates.get("employee_no"), str) else None,
        email=updates.get("email") if isinstance(updates.get("email"), str) else None,
        personnel_id=personnel_id,
    )
    for field, value in updates.items():
        setattr(person, field, value)
    session.commit()
    person = session.scalar(select(Personnel).options(joinedload(Personnel.role)).where(Personnel.id == person.id))
    if person is None:
        raise HTTPException(status_code=500, detail="인력 수정 결과를 확인할 수 없습니다.")
    return envelope(serialize_personnel(person))
