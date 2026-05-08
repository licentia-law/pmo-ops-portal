from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text
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
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    team_name: Mapped[str | None] = mapped_column(String(100))
    role_name: Mapped[str | None] = mapped_column(String(100))
    employment_status: Mapped[EmploymentStatus] = mapped_column(Enum(EmploymentStatus, **ENUM_VALUE_KWARGS), nullable=False)


class ProjectCode(Base, TimestampMixin):
    __tablename__ = "project_codes"

    id: Mapped[str] = uuid_pk()
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    project_type: Mapped[ProjectType] = mapped_column(Enum(ProjectType, **ENUM_VALUE_KWARGS), nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, **ENUM_VALUE_KWARGS), nullable=False)
    owner_name: Mapped[str | None] = mapped_column(String(100))

    projects: Mapped[list["Project"]] = relationship(back_populates="project_code")


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = uuid_pk()
    project_code_id: Mapped[str | None] = mapped_column(ForeignKey("project_codes.id"))
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    client_name: Mapped[str | None] = mapped_column(String(255))
    project_type: Mapped[ProjectType] = mapped_column(Enum(ProjectType, **ENUM_VALUE_KWARGS), nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, **ENUM_VALUE_KWARGS), nullable=False)
    pm_name: Mapped[str | None] = mapped_column(String(100))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)

    project_code: Mapped[ProjectCode | None] = relationship(back_populates="projects")
    assignments: Mapped[list["ProjectAssignment"]] = relationship(back_populates="project")
    logs: Mapped[list["ProjectLog"]] = relationship(back_populates="project")


class ProjectAssignment(Base, TimestampMixin):
    __tablename__ = "project_assignments"

    id: Mapped[str] = uuid_pk()
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    personnel_id: Mapped[str | None] = mapped_column(ForeignKey("personnel.id"))
    assignment_type: Mapped[AssignmentType] = mapped_column(Enum(AssignmentType, **ENUM_VALUE_KWARGS), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    mm: Mapped[float | None] = mapped_column(Numeric(6, 2))
    # TODO: MM 계산 기준(주말/공휴일 제외, 연차 제외 미구현)은 서비스 계층에서 확정 필요.

    project: Mapped[Project | None] = relationship(back_populates="assignments")
    personnel: Mapped[Personnel | None] = relationship()


class ProjectLog(Base, TimestampMixin):
    __tablename__ = "project_logs"

    id: Mapped[str] = uuid_pk()
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"))
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus, **ENUM_VALUE_KWARGS), nullable=False)
    logged_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    author_name: Mapped[str | None] = mapped_column(String(100))
    content: Mapped[str] = mapped_column(Text, nullable=False)

    project: Mapped[Project | None] = relationship(back_populates="logs")


class Holiday(Base, TimestampMixin):
    __tablename__ = "holidays"

    id: Mapped[str] = uuid_pk()
    holiday_date: Mapped[date] = mapped_column(Date, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    holiday_type: Mapped[HolidayType] = mapped_column(Enum(HolidayType, **ENUM_VALUE_KWARGS), nullable=False)
    is_counted_as_workday: Mapped[bool] = mapped_column(default=False, nullable=False)
    # TODO: 공휴일 계산 반영 여부/회사휴일 정책은 P3 admin support DTL 확정 후 보정.
