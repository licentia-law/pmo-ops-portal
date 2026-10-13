from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.config import settings
from app.domain.capabilities import require_capabilities
from app.enums import Capability
from app.enums import DataScope, OrganizationRole, UserPermission
from app.models.core import User

DbSession = Annotated[Session, Depends(get_session)]


def get_current_user(
    x_user_name: Annotated[str | None, Header()] = None,
    x_user_email: Annotated[str | None, Header()] = None,
    x_user_permission: Annotated[UserPermission | None, Header()] = None,
    x_user_organization_role: Annotated[OrganizationRole | None, Header()] = None,
) -> User:
    # TODO: 로컬 계정 로그인/JWT가 붙기 전까지 개발용 헤더로 최소 권한 흐름을 검증한다.
    return User(
        id="request-user",
        email=x_user_email or "admin@example.local",
        name=x_user_name or "관리자",
        permission=x_user_permission or UserPermission.ADMIN,
        data_scope=DataScope.ALL,
        organization_role=x_user_organization_role or OrganizationRole.OTHER,
        team_name=None,
    )


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_capability_user(
    session: DbSession,
    x_user_email: Annotated[str | None, Header()] = None,
) -> User:
    # Development identity adapter only. Production requires trusted authentication.
    if settings.app_environment == "production":
        raise HTTPException(status_code=403, detail="운영 환경에서는 신뢰할 수 있는 인증 연동이 필요합니다.")
    if not x_user_email:
        raise HTTPException(status_code=401, detail="사용자 식별이 필요합니다.")
    user = session.scalar(select(User).where(User.email == x_user_email.strip().lower()))
    if user is None:
        raise HTTPException(status_code=401, detail="등록된 사용자 식별이 필요합니다.")
    return user


CapabilityUser = Annotated[User, Depends(get_capability_user)]


def capability_guard(*required: Capability):
    def dependency(session: DbSession, user: CapabilityUser) -> User:
        return require_capabilities(session, user, *required)
    return dependency
