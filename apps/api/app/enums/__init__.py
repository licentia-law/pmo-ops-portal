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


class AssignmentStatus(StrEnum):
    PLANNED = "planned"
    ASSIGNED = "assigned"
    ENDED = "ended"
    CANCELLED = "cancelled"


class WorkLocationType(StrEnum):
    ONSITE = "onsite"
    REMOTE = "remote"
    HYBRID = "hybrid"


class ProjectAssignmentRole(StrEnum):
    PROPOSAL_PM = "proposal_pm"
    PRESENTATION_PM = "presentation_pm"
    DELIVERY_PM = "delivery_pm"
    PROPOSAL_TEAM = "proposal_team"
    DELIVERY_TEAM = "delivery_team"
    SUPPORT_TEAM = "support_team"


class PersonnelType(StrEnum):
    PMO = "pmo"
    SALES = "sales"
    TECHNICAL = "technical"
    EXTERNAL = "external"


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


class Capability(StrEnum):
    PROJECT_EXCEL_MANAGE = "project_excel_manage"
    PERSONNEL_EXCEL_MANAGE = "personnel_excel_manage"
    ASSIGNMENT_MANAGE = "assignment_manage"
    BACKUP_RESTORE = "backup_restore"
    DATA_RESET = "data_reset"
    PERMISSIONS_MANAGE = "permissions_manage"


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


class HolidayType(StrEnum):
    PUBLIC = "public"
    COMPANY = "company"


class HolidaySourceKind(StrEnum):
    MANUAL = "manual"
    SEED = "seed"
    EXTERNAL_API = "external_api"
