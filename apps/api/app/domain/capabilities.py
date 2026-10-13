"""Capability authorization uses persisted users and grants, never request flags."""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import Capability, UserPermission
from app.models.core import User, UserCapability

RESERVED_CAPABILITIES = {Capability.PERMISSIONS_MANAGE, Capability.DATA_RESET}


def persisted_user(session: Session, user: User) -> User:
    stored = session.get(User, user.id)
    if stored is None:
        raise HTTPException(status_code=401, detail="등록된 사용자 식별이 필요합니다.")
    return stored


def effective_capabilities(session: Session, user: User) -> set[Capability]:
    stored = persisted_user(session, user)
    if stored.is_developer:
        return set(Capability)
    return set(session.scalars(select(UserCapability.capability).where(UserCapability.user_id == stored.id)).all())


def require_capabilities(session: Session, user: User, *required: Capability) -> User:
    stored = persisted_user(session, user)
    needed = set(required)
    if Capability.DATA_RESET in needed:
        needed.add(Capability.BACKUP_RESTORE)
        if not stored.is_developer and stored.permission != UserPermission.ADMIN:
            raise HTTPException(status_code=403, detail="전체 초기화는 개발자 또는 지정된 시스템 관리자만 가능합니다.")
    if not needed <= effective_capabilities(session, stored):
        raise HTTPException(status_code=403, detail="필요한 기능 권한이 없습니다.")
    return stored


def require_permission_manager(session: Session, user: User) -> User:
    stored = require_capabilities(session, user, Capability.PERMISSIONS_MANAGE)
    if not stored.is_developer and stored.permission != UserPermission.ADMIN:
        raise HTTPException(status_code=403, detail="기능 권한 관리는 지정된 관리자만 가능합니다.")
    return stored


def replace_capabilities(session: Session, actor: User, target: User, desired: set[Capability]) -> None:
    manager = require_permission_manager(session, actor)
    target = persisted_user(session, target)
    if target.is_developer:
        raise HTTPException(status_code=409, detail="개발자 권한은 이 API로 변경할 수 없습니다.")
    current = {
        row.capability: row for row in session.scalars(
            select(UserCapability).where(UserCapability.user_id == target.id)
        ).all()
    }
    if not manager.is_developer and (desired & RESERVED_CAPABILITIES) != (set(current) & RESERVED_CAPABILITIES):
        raise HTTPException(status_code=403, detail="권한 관리 및 전체 초기화 권한은 개발자만 부여·회수할 수 있습니다.")
    if desired & RESERVED_CAPABILITIES and target.permission != UserPermission.ADMIN:
        raise HTTPException(status_code=400, detail="권한 관리 및 전체 초기화 권한은 관리자에게만 지정할 수 있습니다.")
    if Capability.DATA_RESET in desired and Capability.BACKUP_RESTORE not in desired:
        raise HTTPException(status_code=400, detail="전체 초기화 권한에는 백업/복원 권한이 함께 필요합니다.")
    for capability, row in current.items():
        if capability not in desired:
            session.delete(row)
    for capability in desired - set(current):
        session.add(UserCapability(user_id=target.id, capability=capability, granted_by_user_id=manager.id))
    session.flush()


def appoint_administrator(session: Session, actor: User, target: User) -> None:
    developer = require_permission_manager(session, actor)
    if not developer.is_developer:
        raise HTTPException(status_code=403, detail="관리자 임명은 개발자만 가능합니다.")
    target = persisted_user(session, target)
    if target.is_developer:
        raise HTTPException(status_code=409, detail="개발자 계정은 관리자 임명 대상이 아닙니다.")
    target.permission = UserPermission.ADMIN
    current = effective_capabilities(session, target)
    replace_capabilities(session, developer, target, current | {Capability.PERMISSIONS_MANAGE})
