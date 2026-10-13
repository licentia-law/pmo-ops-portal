from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from app.api.common import envelope
from app.api.deps import CapabilityUser, DbSession
from app.domain.capabilities import (
    appoint_administrator, effective_capabilities, replace_capabilities, require_permission_manager,
)
from app.enums import Capability
from app.models.core import User

router = APIRouter()


class CapabilitiesUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    capabilities: list[Capability]


def serialize_capabilities(session: DbSession, user: User) -> dict[str, object]:
    return {
        "user_id": user.id, "name": user.name, "email": user.email,
        "permission": user.permission.value, "is_developer": user.is_developer,
        "capabilities": sorted(capability.value for capability in effective_capabilities(session, user)),
    }


def find_user(session: DbSession, user_id: str) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user


@router.get("/me/capabilities")
def my_capabilities(session: DbSession, user: CapabilityUser) -> dict[str, object]:
    return envelope(serialize_capabilities(session, user))


@router.get("/{user_id}/capabilities")
def user_capabilities(user_id: str, session: DbSession, user: CapabilityUser) -> dict[str, object]:
    if user_id != user.id:
        require_permission_manager(session, user)
    return envelope(serialize_capabilities(session, find_user(session, user_id)))


@router.patch("/{user_id}/capabilities")
def update_capabilities(
    user_id: str, payload: CapabilitiesUpdate, session: DbSession, user: CapabilityUser,
) -> dict[str, object]:
    require_permission_manager(session, user)
    target = find_user(session, user_id)
    replace_capabilities(session, user, target, set(payload.capabilities))
    session.commit()
    return envelope(serialize_capabilities(session, target))


@router.post("/{user_id}/appoint-admin")
def appoint_admin(user_id: str, session: DbSession, user: CapabilityUser) -> dict[str, object]:
    require_permission_manager(session, user)
    target = find_user(session, user_id)
    appoint_administrator(session, user, target)
    session.commit()
    return envelope(serialize_capabilities(session, target))
