from app.enums import ProjectStatus, UserPermission
from app.models.core import Project, User

ALLOWED_STATUS_TRANSITIONS: dict[ProjectStatus, set[ProjectStatus]] = {
    ProjectStatus.PROPOSING: {ProjectStatus.PRESENTED, ProjectStatus.DROP},
    ProjectStatus.PRESENTED: {ProjectStatus.WIN, ProjectStatus.LOSS},
    ProjectStatus.WIN: {ProjectStatus.RUNNING},
    ProjectStatus.RUNNING: {ProjectStatus.DONE},
    ProjectStatus.SUPPORT: {ProjectStatus.DONE},
    ProjectStatus.LOSS: set(),
    ProjectStatus.DROP: set(),
    ProjectStatus.DONE: set(),
}


def allowed_next_statuses(status: ProjectStatus) -> list[ProjectStatus]:
    return sorted(ALLOWED_STATUS_TRANSITIONS[status], key=lambda item: item.value)


def is_valid_status_transition(current: ProjectStatus, next_status: ProjectStatus) -> bool:
    return current == next_status or next_status in ALLOWED_STATUS_TRANSITIONS[current]


def can_mutate_project(user: User, project: Project | None = None) -> bool:
    if user.permission == UserPermission.READ_ONLY:
        return False
    if user.permission in {UserPermission.ADMIN, UserPermission.GENERAL_EDITOR}:
        return True
    if user.permission != UserPermission.PROJECT_EDITOR or project is None:
        return False

    allowed_statuses = {
        ProjectStatus.PRESENTED,
        ProjectStatus.WIN,
        ProjectStatus.LOSS,
        ProjectStatus.RUNNING,
        ProjectStatus.DONE,
    }
    # TODO: "제안팀" 판정 기준은 조직/인력 모델 확정 후 PM 외 조건을 추가한다.
    return project.status in allowed_statuses and project.pm_name == user.name


def can_mutate_master(user: User) -> bool:
    # TODO: 본부장 마스터 수정 허용 여부는 organization_role 운영 정책 확정 후 반영한다.
    return user.permission in {UserPermission.ADMIN, UserPermission.GENERAL_EDITOR}
