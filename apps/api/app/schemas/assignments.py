from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.enums import AssignmentType, AssignmentStatus, ProjectAssignmentRole, WorkLocationType


class AssignmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: str
    personnel_id: str
    assignment_type: AssignmentType
    assignment_role: ProjectAssignmentRole | None = None
    assignment_status: AssignmentStatus = AssignmentStatus.PLANNED
    start_date: date
    end_date: date
    monthly_base_mm: Decimal = Field(default=Decimal("1"), ge=0, le=Decimal("9999.99"), max_digits=6, decimal_places=2)
    certainty_rate: Decimal | None = Field(default=None, ge=0, le=100, max_digits=5, decimal_places=2)
    onsite_type: WorkLocationType | None = None
    is_primary: bool = False
    sequence_no: int = Field(default=0, ge=0, le=100000)
    note: str | None = Field(default=None, max_length=4000)
    acknowledge_warnings: bool = False
    expected_version: str | None = None


class AssignmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # Project/person identities stay fixed; another deployment is a new row.
    assignment_type: AssignmentType | None = None
    assignment_role: ProjectAssignmentRole | None = None
    assignment_status: AssignmentStatus | None = None
    start_date: date | None = None
    end_date: date | None = None
    monthly_base_mm: Decimal | None = Field(default=None, ge=0, le=Decimal("9999.99"), max_digits=6, decimal_places=2)
    certainty_rate: Decimal | None = Field(default=None, ge=0, le=100, max_digits=5, decimal_places=2)
    onsite_type: WorkLocationType | None = None
    is_primary: bool | None = None
    sequence_no: int | None = Field(default=None, ge=0, le=100000)
    note: str | None = Field(default=None, max_length=4000)
    acknowledge_warnings: bool = False
    expected_version: str


class AssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str | None
    personnel_id: str | None
    assignment_type: AssignmentType
    assignment_role: ProjectAssignmentRole | None
    assignment_status: AssignmentStatus | None
    start_date: date | None
    end_date: date | None
    monthly_base_mm: Decimal | None
    certainty_rate: Decimal | None
    onsite_type: str | None
    is_primary: bool
    sequence_no: int | None
    note: str | None
    updated_at: datetime
