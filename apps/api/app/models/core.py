from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.enums import (
    AssignmentType,
    DataScope,
    EmploymentStatus,
    HolidayType,
    OrganizationRole,
    ProjectStatus,
    ProjectType,
    UserPermission,
)

ENUM_VALUE_KWARGS = {"values_callable": lambda enum_cls: [item.value for item in enum_cls]}


def uuid_pk() -> Mapped[str]:
    return mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = uuid_pk()
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    permission: Mapped[UserPermission] = mapped_column(Enum(UserPermission, **ENUM_VALUE_KWARGS), nullable=False)
    data_scope: Mapped[DataScope] = mapped_column(Enum(DataScope, **ENUM_VALUE_KWARGS), nullable=False, default=DataScope.TEAM)
    organization_role: Mapped[OrganizationRole] = mapped_column(Enum(OrganizationRole, **ENUM_VALUE_KWARGS), nullable=False)
    team_name: Mapped[str | None] = mapped_column(String(100))
    # TODO: organizations/teams 테이블은 scaffolding DTL 7.1에는 있으나 사용자 구현 범위에서 제외됨.
    # 확정 전까지 team_name 문자열로만 시작한다.


class Personnel(Base, TimestampMixin):
    __tablename__ = "personnel"

    id: Mapped[str] = uuid_pk()
    employee_no: Mapped[str | None] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    group_name: Mapped[str | None] = mapped_column(String(100))
    team_name: Mapped[str | None] = mapped_column(String(100))
    department_name: Mapped[str | None] = mapped_column(String(100))
    position_name: Mapped[str | None] = mapped_column(String(100))
    role_name: Mapped[str | None] = mapped_column(String(100))
    grade_name: Mapped[str | None] = mapped_column(String(50))
    employment_status: Mapped[EmploymentStatus] = mapped_column(Enum(EmploymentStatus, **ENUM_VALUE_KWARGS), nullable=False)
    joined_on: Mapped[date | None] = mapped_column(Date)
    employment_start_date: Mapped[date | None] = mapped_column(Date)
    employment_end_date: Mapped[date | None] = mapped_column(Date)
    unit_price: Mapped[float | None] = mapped_column(Numeric(14, 2))
    base_mm: Mapped[float | None] = mapped_column(Numeric(6, 2))
    monthly_mm: Mapped[dict | None] = mapped_column(JSON)
    total_mm: Mapped[float | None] = mapped_column(Numeric(8, 2))
    note: Mapped[str | None] = mapped_column(Text)


class ProjectCode(Base, TimestampMixin):
    __tablename__ = "project_codes"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    project_type: Mapped[ProjectType] = mapped_column(Enum(ProjectType, **ENUM_VALUE_KWARGS), nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, **ENUM_VALUE_KWARGS), nullable=False)
    certainty: Mapped[str | None] = mapped_column(String(50))
    sales_department: Mapped[str | None] = mapped_column(String(100))
    sales_owner: Mapped[str | None] = mapped_column(String(100))
    support_lead: Mapped[str | None] = mapped_column(String(100))
    owner_name: Mapped[str | None] = mapped_column(String(100))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    source_sheet: Mapped[str | None] = mapped_column(String(100))
    note: Mapped[str | None] = mapped_column(Text)

    projects: Mapped[list["Project"]] = relationship(back_populates="project_code")


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = uuid_pk()
    project_code_id: Mapped[str | None] = mapped_column(ForeignKey("project_codes.id"))
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    client_name: Mapped[str | None] = mapped_column(String(255))
    owner_department: Mapped[str | None] = mapped_column(String(100))
    lead_department: Mapped[str | None] = mapped_column(String(100))
    sales_department: Mapped[str | None] = mapped_column(String(100))
    sales_owner: Mapped[str | None] = mapped_column(String(100))
    project_type: Mapped[ProjectType] = mapped_column(Enum(ProjectType, **ENUM_VALUE_KWARGS), nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, **ENUM_VALUE_KWARGS), nullable=False)
    certainty: Mapped[str | None] = mapped_column(String(50))
    pm_name: Mapped[str | None] = mapped_column(String(100))
    proposal_pm_name: Mapped[str | None] = mapped_column(String(100))
    presentation_pm_name: Mapped[str | None] = mapped_column(String(100))
    support_lead: Mapped[str | None] = mapped_column(String(100))
    proposal_team_text: Mapped[str | None] = mapped_column(Text)
    amount_text: Mapped[str | None] = mapped_column(String(100))
    total_amount: Mapped[float | None] = mapped_column(Numeric(16, 2))
    company_amount: Mapped[float | None] = mapped_column(Numeric(16, 2))
    currency: Mapped[str | None] = mapped_column(String(10), default="KRW")
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    bid_notice_no: Mapped[str | None] = mapped_column(String(100))
    bid_notice_date: Mapped[date | None] = mapped_column(Date)
    pre_notice_no: Mapped[str | None] = mapped_column(String(100))
    pre_notice_date: Mapped[date | None] = mapped_column(Date)
    submission_at: Mapped[datetime | None] = mapped_column(DateTime)
    submission_format: Mapped[str | None] = mapped_column(String(100))
    submission_note: Mapped[str | None] = mapped_column(Text)
    presentation_at: Mapped[datetime | None] = mapped_column(DateTime)
    presentation_format: Mapped[str | None] = mapped_column(String(100))
    presentation_note: Mapped[str | None] = mapped_column(Text)
    recent_activity_at: Mapped[datetime | None] = mapped_column(DateTime)
    memo: Mapped[str | None] = mapped_column(Text)
    source_sheet: Mapped[str | None] = mapped_column(String(100))
    raw_payload: Mapped[dict | None] = mapped_column(JSON)

    project_code: Mapped[ProjectCode | None] = relationship(back_populates="projects")
    assignments: Mapped[list["ProjectAssignment"]] = relationship(back_populates="project")
    logs: Mapped[list["ProjectLog"]] = relationship(back_populates="project")


class ProjectAssignment(Base, TimestampMixin):
    __tablename__ = "project_assignments"

    id: Mapped[str] = uuid_pk()
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    personnel_id: Mapped[str | None] = mapped_column(ForeignKey("personnel.id"))
    assignment_type: Mapped[AssignmentType] = mapped_column(Enum(AssignmentType, **ENUM_VALUE_KWARGS), nullable=False)
    assignment_role: Mapped[str | None] = mapped_column(String(100))
    assignment_status: Mapped[str | None] = mapped_column(String(50))
    win_loss: Mapped[str | None] = mapped_column(String(50))
    onsite_type: Mapped[str | None] = mapped_column(String(50))
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sequence_no: Mapped[int | None] = mapped_column(Integer)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    mm: Mapped[float | None] = mapped_column(Numeric(6, 2))
    monthly_mm: Mapped[dict | None] = mapped_column(JSON)
    total_mm: Mapped[float | None] = mapped_column(Numeric(8, 2))
    current_mm: Mapped[float | None] = mapped_column(Numeric(8, 2))
    certainty_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))
    unit_price: Mapped[float | None] = mapped_column(Numeric(14, 2))
    note: Mapped[str | None] = mapped_column(Text)
    source_sheet: Mapped[str | None] = mapped_column(String(100))
    # TODO: MM 계산 기준(주말/공휴일 제외, 연차 제외 미구현)은 서비스 계층에서 확정 필요.

    project: Mapped[Project | None] = relationship(back_populates="assignments")
    personnel: Mapped[Personnel | None] = relationship()


class ProjectLog(Base, TimestampMixin):
    __tablename__ = "project_logs"

    id: Mapped[str] = uuid_pk()
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, **ENUM_VALUE_KWARGS), nullable=False)
    previous_status: Mapped[ProjectStatus | None] = mapped_column(Enum(ProjectStatus, **ENUM_VALUE_KWARGS))
    next_status: Mapped[ProjectStatus | None] = mapped_column(Enum(ProjectStatus, **ENUM_VALUE_KWARGS))
    category: Mapped[str | None] = mapped_column(String(100))
    logged_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    author_name: Mapped[str | None] = mapped_column(String(100))
    author_team: Mapped[str | None] = mapped_column(String(100))
    summary: Mapped[str | None] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    detail: Mapped[dict | None] = mapped_column(JSON)
    related_schedule_label: Mapped[str | None] = mapped_column(String(100))
    related_schedule_at: Mapped[datetime | None] = mapped_column(DateTime)
    source_sheet: Mapped[str | None] = mapped_column(String(100))

    project: Mapped[Project | None] = relationship(back_populates="logs")


class Holiday(Base, TimestampMixin):
    __tablename__ = "holidays"

    id: Mapped[str] = uuid_pk()
    holiday_date: Mapped[date] = mapped_column(Date, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    holiday_type: Mapped[HolidayType] = mapped_column(Enum(HolidayType, **ENUM_VALUE_KWARGS), nullable=False)
    is_counted_as_workday: Mapped[bool] = mapped_column(default=False, nullable=False)
    # TODO: 공휴일 계산 반영 여부/회사휴일 정책은 P3 admin support DTL 확정 후 보정.


class MonthlyEmploymentMM(Base, TimestampMixin):
    __tablename__ = "monthly_employment_mm"

    id: Mapped[str] = uuid_pk()
    personnel_id: Mapped[str | None] = mapped_column(ForeignKey("personnel.id"))
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    workdays: Mapped[int | None] = mapped_column(Integer)
    employed_workdays: Mapped[int | None] = mapped_column(Integer)
    employment_mm: Mapped[float] = mapped_column(Numeric(8, 4), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)

    personnel: Mapped[Personnel | None] = relationship()


class MonthlyAssignmentMM(Base, TimestampMixin):
    __tablename__ = "monthly_assignment_mm"

    id: Mapped[str] = uuid_pk()
    assignment_id: Mapped[str | None] = mapped_column(ForeignKey("project_assignments.id"))
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    personnel_id: Mapped[str | None] = mapped_column(ForeignKey("personnel.id"))
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    assignment_mm: Mapped[float] = mapped_column(Numeric(8, 4), nullable=False)
    certainty_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))
    weighted_mm: Mapped[float | None] = mapped_column(Numeric(8, 4))
    assignment_type: Mapped[AssignmentType | None] = mapped_column(Enum(AssignmentType, **ENUM_VALUE_KWARGS))

    assignment: Mapped[ProjectAssignment | None] = relationship()
    project: Mapped[Project | None] = relationship()
    personnel: Mapped[Personnel | None] = relationship()


class CurrentAssignmentSnapshot(Base, TimestampMixin):
    __tablename__ = "current_assignment_snapshots"

    id: Mapped[str] = uuid_pk()
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    personnel_id: Mapped[str | None] = mapped_column(ForeignKey("personnel.id"))
    representative_status: Mapped[str] = mapped_column(String(50), nullable=False)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    project_name: Mapped[str | None] = mapped_column(String(255))
    project_code: Mapped[str | None] = mapped_column(String(50))
    assignment_id: Mapped[str | None] = mapped_column(ForeignKey("project_assignments.id"))
    current_start_date: Mapped[date | None] = mapped_column(Date)
    current_end_date: Mapped[date | None] = mapped_column(Date)
    next_project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    next_project_name: Mapped[str | None] = mapped_column(String(255))
    weekly_note: Mapped[str | None] = mapped_column(Text)
    monthly_mm: Mapped[dict | None] = mapped_column(JSON)


class WeeklyLoadSnapshot(Base, TimestampMixin):
    __tablename__ = "weekly_load_snapshots"

    id: Mapped[str] = uuid_pk()
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    personnel_id: Mapped[str | None] = mapped_column(ForeignKey("personnel.id"))
    week_offset: Mapped[int] = mapped_column(Integer, nullable=False)
    week_label: Mapped[str] = mapped_column(String(20), nullable=False)
    representative_status: Mapped[str] = mapped_column(String(50), nullable=False)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    project_name: Mapped[str | None] = mapped_column(String(255))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)


class MonthlyKpiSummary(Base, TimestampMixin):
    __tablename__ = "monthly_kpi_summaries"

    id: Mapped[str] = uuid_pk()
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    organization_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avg_headcount_mm: Mapped[float | None] = mapped_column(Numeric(10, 4))
    running_mm: Mapped[float | None] = mapped_column(Numeric(10, 4))
    proposing_mm: Mapped[float | None] = mapped_column(Numeric(10, 4))
    support_mm: Mapped[float | None] = mapped_column(Numeric(10, 4))
    idle_mm: Mapped[float | None] = mapped_column(Numeric(10, 4))
    utilization_rate: Mapped[float | None] = mapped_column(Numeric(6, 2))
    contract_rate: Mapped[float | None] = mapped_column(Numeric(6, 2))
    source_snapshot_date: Mapped[date | None] = mapped_column(Date)
