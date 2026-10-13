from fastapi import HTTPException
import re
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import OrganizationRole, PersonnelType, UserPermission
from app.domain.personnel_types import PMO_GROUP_NAME, SALES_OWNER_ROLE_CODE, classify_legacy_personnel
from app.models.core import Personnel, Role, User

def pmo_personnel_predicate():
    return Personnel.personnel_type == PersonnelType.PMO


def is_pmo_personnel(person: Personnel | None) -> bool:
    return person is not None and person.personnel_type == PersonnelType.PMO


def can_mutate_people(user: User) -> bool:
    return user.permission == UserPermission.ADMIN or user.organization_role == OrganizationRole.HEAD


def can_create_personnel(user: User) -> bool:
    return user.permission == UserPermission.ADMIN


def can_mutate_roles(user: User) -> bool:
    return user.permission == UserPermission.ADMIN


def require_personnel_create(user: User, message: str) -> None:
    if not can_create_personnel(user):
        raise HTTPException(status_code=403, detail=message)


def require_admin(user: User, message: str) -> None:
    if user.permission != UserPermission.ADMIN:
        raise HTTPException(status_code=403, detail=message)


def require_personnel_update(user: User, updates: dict[str, object], message: str) -> None:
    if user.permission == UserPermission.ADMIN:
        return
    if user.organization_role == OrganizationRole.HEAD and set(updates) <= {"employment_status"}:
        return
    raise HTTPException(status_code=403, detail=message)


def require_people_mutation(user: User, message: str) -> None:
    if not can_mutate_people(user):
        raise HTTPException(status_code=403, detail=message)


def require_role_mutation(user: User, message: str) -> None:
    if not can_mutate_roles(user):
        raise HTTPException(status_code=403, detail=message)


def require_active_role(session: Session, role_id: str | None) -> Role | None:
    if role_id is None:
        return None
    role = session.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="역할/직무 기준값을 찾을 수 없습니다.")
    if not role.is_active:
        raise HTTPException(status_code=400, detail="사용 중인 역할/직무 기준값만 지정할 수 있습니다.")
    return role


def is_sales_owner_role(role: Role | None) -> bool:
    return role is not None and role.code == SALES_OWNER_ROLE_CODE


def apply_personnel_scope(statement, scope: str | None):
    """Apply the single source of truth for personnel list scopes."""
    if scope == "sales_owner":
        return statement.where(
            Personnel.personnel_type == PersonnelType.SALES,
            Personnel.is_active.is_(True),
            Role.is_active.is_(True),
            Role.code == SALES_OWNER_ROLE_CODE,
        )
    if scope == "pmo":
        return statement.where(pmo_personnel_predicate())
    return statement


def normalize_sales_owner_personnel(
    session: Session, values: dict[str, object], current: Personnel | None = None,
    *, check_name_uniqueness: bool = True, strict_pmo: bool = False,
) -> Role | None:
    """Validate personnel type; legacy inference is allowed only on creation."""
    role_id = values.get("role_id", current.role_id if current else None)
    role = require_active_role(session, role_id if isinstance(role_id, str) else None)
    if "personnel_type" in values and values["personnel_type"] is None:
        raise HTTPException(status_code=400, detail="인력 유형은 비울 수 없습니다.")
    personnel_type = values.get("personnel_type", current.personnel_type if current else None)
    if personnel_type is None:
        try:
            personnel_type = classify_legacy_personnel(
                values.get("group_name"), role.code if role else None, values.get("role_name"),
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    personnel_type = PersonnelType(personnel_type)
    if current is None or "personnel_type" in values:
        values["personnel_type"] = personnel_type
    if strict_pmo and personnel_type == PersonnelType.PMO:
        for field, label in [("name", "성명"), ("group_name", "본부"), ("team_name", "팀"), ("position_name", "직위"), ("employee_no", "사번"), ("email", "이메일")]:
            require_nonblank(values.get(field, getattr(current, field, None)), label)
        if values.get("mm_start_date", current.mm_start_date if current else None) is None:
            raise HTTPException(status_code=400, detail="필수 항목 누락: MM 시작일")
    email = values.get("email")
    if email and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", str(email)):
        raise HTTPException(status_code=400, detail="이메일 형식이 올바르지 않습니다.")
    start = values.get("mm_start_date", current.mm_start_date if current else None)
    end = values.get("mm_end_date", current.mm_end_date if current else None)
    if start and end and start > end:
        raise HTTPException(status_code=400, detail="MM 종료일은 시작일보다 빠를 수 없습니다.")
    if personnel_type != PersonnelType.PMO:
        require_nonblank(values.get("name", current.name if current else None), "성명")
        require_nonblank(values.get("group_name", current.group_name if current else None), "본부")
        require_nonblank(values.get("position_name", current.position_name if current else None), "직위")
    if is_sales_owner_role(role) and personnel_type != PersonnelType.SALES:
        raise HTTPException(status_code=400, detail="영업대표 역할은 sales 인력 유형으로 지정해 주세요.")
    if personnel_type != PersonnelType.SALES:
        return role
    if not is_sales_owner_role(role):
        raise HTTPException(status_code=400, detail="영업대표는 SALES_OWNER 역할이 필요합니다.")

    name = require_nonblank(values.get("name", current.name if current else None), "성명")
    group_name = require_nonblank(values.get("group_name", current.group_name if current else None), "본부")
    if group_name == PMO_GROUP_NAME:
        raise HTTPException(status_code=400, detail="영업대표의 본부는 PMO본부로 지정할 수 없습니다.")
    require_nonblank(values.get("position_name", current.position_name if current else None), "직위")
    duplicate = select(Personnel).where(Personnel.name == name, Personnel.is_active.is_(True))
    if current is not None:
        duplicate = duplicate.where(Personnel.id != current.id)
    if check_name_uniqueness and session.scalar(duplicate):
        raise HTTPException(status_code=409, detail="활성 인력과 영업대표 성명이 중복될 수 없습니다.")

    values["employment_status"] = "active"
    values["mm_start_date"] = None
    values["mm_end_date"] = None
    values["yearly_mm"] = None
    values["role_name"] = role.name
    return role


def protect_sales_owner_role(session: Session, role: Role, updates: dict[str, object]) -> None:
    """A populated SALES_OWNER role cannot be renamed by code or deactivated."""
    if role.code != SALES_OWNER_ROLE_CODE:
        return
    invalid = updates.get("code") not in (None, SALES_OWNER_ROLE_CODE) or updates.get("is_active") is False
    if invalid and session.scalar(select(Personnel.id).where(Personnel.role_id == role.id).limit(1)):
        raise HTTPException(status_code=409, detail="연결된 인력이 있는 영업대표 역할의 코드 변경 또는 비활성화는 허용되지 않습니다.")


def normalize_optional_text(value: object) -> object:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return value


def normalize_payload(payload: dict[str, object]) -> dict[str, object]:
    return {key: normalize_optional_text(value) for key, value in payload.items()}


def require_nonblank(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise HTTPException(status_code=400, detail=f"필수 항목 누락: {label}")
    return value.strip()


def ensure_unique_personnel_fields(
    session: Session,
    *,
    employee_no: str | None = None,
    email: str | None = None,
    personnel_id: str | None = None,
) -> None:
    if employee_no:
        statement = select(Personnel).where(Personnel.employee_no == employee_no)
        if personnel_id:
            statement = statement.where(Personnel.id != personnel_id)
        if session.scalar(statement):
            raise HTTPException(status_code=409, detail="이미 사용 중인 사번입니다.")
    if email:
        statement = select(Personnel).where(Personnel.email == email)
        if personnel_id:
            statement = statement.where(Personnel.id != personnel_id)
        if session.scalar(statement):
            raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")


def ensure_unique_role_code(session: Session, code: str, role_id: str | None = None) -> None:
    statement = select(Role).where(Role.code == code)
    if role_id:
        statement = statement.where(Role.id != role_id)
    if session.scalar(statement):
        raise HTTPException(status_code=409, detail="이미 사용 중인 역할 코드입니다.")
