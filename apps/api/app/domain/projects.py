from collections.abc import Mapping

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
    # TODO: "담당 프로젝트" 판정 기준은 조직/인력 모델 확정 후 PM 외 조건을 추가한다.
    project_pms = {project.proposal_pm_name, project.presentation_pm_name, project.delivery_pm_name}
    return project.status in allowed_statuses and user.name in project_pms


def can_mutate_master(user: User) -> bool:
    # TODO: 본부장 마스터 수정 허용 여부는 organization_role 운영 정책 확정 후 반영한다.
    return user.permission in {UserPermission.ADMIN, UserPermission.GENERAL_EDITOR}


def _is_missing_project_value(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def _project_field(values: Mapping[str, object] | object, field_name: str) -> object:
    if isinstance(values, Mapping):
        return values.get(field_name)
    return getattr(values, field_name, None)


def get_missing_project_fields(values: Mapping[str, object] | object) -> list[str]:
    required_checks: list[tuple[str, object]] = [
        ("프로젝트명", _project_field(values, "name")),
        ("고객사", _project_field(values, "client_name")),
        ("사업유형", _project_field(values, "project_type")),
        ("상태", _project_field(values, "status")),
        ("확도", _project_field(values, "certainty")),
        ("총 사업금액", _project_field(values, "total_amount")),
        ("당사 사업금액", _project_field(values, "company_amount")),
        ("영업대표", _project_field(values, "sales_owner")),
        ("영업부서", _project_field(values, "sales_department")),
        ("시작일", _project_field(values, "start_date")),
        ("종료일", _project_field(values, "end_date")),
        ("프로젝트 코드 연결값", _project_field(values, "project_code_id")),
    ]
    missing_required = [label for label, value in required_checks if _is_missing_project_value(value)]
    has_proposal_pm = not _is_missing_project_value(_project_field(values, "proposal_pm_name"))
    has_delivery_pm = not _is_missing_project_value(_project_field(values, "delivery_pm_name"))
    if not has_proposal_pm and not has_delivery_pm:
        missing_required.append("제안PM 또는 수행PM")
    if has_proposal_pm:
        proposal_required_checks: list[tuple[str, object]] = [
            ("발표PM", _project_field(values, "presentation_pm_name")),
            ("제안 제출일", _project_field(values, "submission_at")),
            ("제출 형식", _project_field(values, "submission_format")),
            ("제안 발표일", _project_field(values, "presentation_at")),
            ("발표 형식", _project_field(values, "presentation_format")),
        ]
        missing_required.extend(label for label, value in proposal_required_checks if _is_missing_project_value(value))
    return missing_required


def get_missing_project_create_fields(**values: object) -> list[str]:
    """Backward-compatible entry point for existing project creation callers."""
    return get_missing_project_fields(values)
