from datetime import date, datetime

from pydantic import BaseModel, Field

from app.enums import EmploymentStatus


class RoleBase(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    job_group: str | None = Field(default=None, max_length=100)
    description: str | None = None
    is_active: bool = True
    sort_order: int = 0


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    job_group: str | None = Field(default=None, max_length=100)
    description: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class RoleRead(RoleBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PersonnelBase(BaseModel):
    employee_no: str | None = Field(default=None, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    group_name: str | None = Field(default=None, max_length=100)
    team_name: str | None = Field(default=None, max_length=100)
    position_name: str | None = Field(default=None, max_length=100)
    role_id: str | None = None
    employment_status: EmploymentStatus = EmploymentStatus.ACTIVE
    mm_start_date: date | None = None
    mm_end_date: date | None = None
    yearly_mm: float | None = None
    is_active: bool = True
    note: str | None = None


class PersonnelCreate(PersonnelBase):
    group_name: str = Field(min_length=1, max_length=100)


class PersonnelUpdate(BaseModel):
    employee_no: str | None = Field(default=None, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    group_name: str | None = Field(default=None, min_length=1, max_length=100)
    team_name: str | None = Field(default=None, max_length=100)
    position_name: str | None = Field(default=None, max_length=100)
    role_id: str | None = None
    employment_status: EmploymentStatus | None = None
    mm_start_date: date | None = None
    mm_end_date: date | None = None
    yearly_mm: float | None = None
    is_active: bool | None = None
    note: str | None = None


class PersonnelRead(PersonnelBase):
    id: str
    role_code: str | None = None
    role_name: str | None = None
    job_group: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MonthlyEmploymentMMRead(BaseModel):
    id: str
    personnel_id: str | None = None
    personnel_name: str | None = None
    group_name: str | None = None
    team_name: str | None = None
    year: int
    month: int
    workdays: int | None = None
    employed_workdays: int | None = None
    employment_mm: float
    note: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MonthlyEmploymentMMUpdate(BaseModel):
    workdays: int | None = Field(default=None, ge=0, le=31)
    employed_workdays: int | None = Field(default=None, ge=0, le=31)
    employment_mm: float | None = Field(default=None, ge=0)
    note: str | None = None
