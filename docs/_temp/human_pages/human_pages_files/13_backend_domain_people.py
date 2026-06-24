from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import OrganizationRole, UserPermission
from app.models.core import Personnel, Role, User


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
