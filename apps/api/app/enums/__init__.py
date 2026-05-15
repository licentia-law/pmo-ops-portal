from enum import StrEnum


class ProjectStatus(StrEnum):
    PROPOSING = "proposing"
    PRESENTED = "presented"
    WIN = "win"
    LOSS = "loss"
    DROP = "drop"
    RUNNING = "running"
    SUPPORT = "support"
    DONE = "done"


class ProjectLogStatus(StrEnum):
    MEMO = "memo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class ProjectType(StrEnum):
    MAIN = "main"
    SUB = "sub"
    SUBCONTRACT = "subcontract"
    PARTNER = "partner"


class AssignmentType(StrEnum):
    DELIVERY = "delivery"
    PROPOSAL = "proposal"
    SUPPORT = "support"
    UNASSIGNED = "unassigned"


class EmploymentStatus(StrEnum):
    ACTIVE = "active"
    LEAVE = "leave"
    TRANSFERRED = "transferred"
    RETIRED = "retired"
    # TODO(DTL conflict): scaffolding DTL 예시에만 대기 포함. 공통 DTL과 확정 필요.
    WAITING = "waiting"


class UserPermission(StrEnum):
    READ_ONLY = "read_only"
    GENERAL_EDITOR = "general_editor"
    PROJECT_EDITOR = "project_editor"
    ADMIN = "admin"


class OrganizationRole(StrEnum):
    HEAD = "head"
    TEAM_LEAD = "team_lead"
    MEMBER = "member"
    PM = "pm"
    PL = "pl"
    OTHER = "other"


class DataScope(StrEnum):
    ALL = "all"
    HEADQUARTERS = "headquarters"
    TEAM = "team"
    OWN_PROJECTS = "own_projects"


class ReportType(StrEnum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    WAITING_PROPOSAL = "waiting_proposal"
    PROPOSAL_PROJECTS = "proposal_projects"
    DELIVERY_PROJECTS = "delivery_projects"


class HolidayType(StrEnum):
    PUBLIC = "public"
    COMPANY = "company"
    # TODO: 공휴일 구분 코드 상세 확정 필요.
