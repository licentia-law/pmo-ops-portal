from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.enums import DataScope, OrganizationRole, UserPermission
from app.models.core import User

DbSession = Annotated[Session, Depends(get_session)]


def get_current_user(
    x_user_name: Annotated[str | None, Header()] = None,
    x_user_email: Annotated[str | None, Header()] = None,
    x_user_permission: Annotated[UserPermission | None, Header()] = None,
) -> User:
    # TODO: 로컬 계정 로그인/JWT가 붙기 전까지 개발용 헤더로 최소 권한 흐름을 검증한다.
    return User(
        id="request-user",
        email=x_user_email or "admin@example.local",
        name=x_user_name or "관리자",
        permission=x_user_permission or UserPermission.ADMIN,
        data_scope=DataScope.ALL,
        organization_role=OrganizationRole.OTHER,
        team_name=None,
    )


CurrentUser = Annotated[User, Depends(get_current_user)]
