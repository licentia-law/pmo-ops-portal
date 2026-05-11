from datetime import date, datetime

from pydantic import BaseModel, Field

from app.enums import ProjectStatus, ProjectType


class ProjectCodeBase(BaseModel):
    code: str | None = None
    name: str = Field(min_length=1)
    project_type: ProjectType = ProjectType.MAIN
    status: ProjectStatus = ProjectStatus.PROPOSING
    certainty: str | None = None
    sales_department: str | None = None
    sales_owner: str | None = None
    support_lead: str | None = None
    owner_name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool = True
    source_sheet: str | None = None
    note: str | None = None


class ProjectCodeCreate(ProjectCodeBase):
    pass


class ProjectCodeUpdate(BaseModel):
    code: str | None = None
    name: str | None = Field(default=None, min_length=1)
    project_type: ProjectType | None = None
    status: ProjectStatus | None = None
    certainty: str | None = None
    sales_department: str | None = None
    sales_owner: str | None = None
    support_lead: str | None = None
    owner_name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None
    source_sheet: str | None = None
    note: str | None = None


class ProjectCodeRead(ProjectCodeBase):
    id: str
    code: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectBase(BaseModel):
    code: str | None = None
    name: str = Field(min_length=1)
    client_name: str | None = None
    owner_department: str | None = None
    lead_department: str | None = None
    sales_department: str | None = None
    sales_owner: str | None = None
    project_type: ProjectType = ProjectType.MAIN
    status: ProjectStatus = ProjectStatus.PROPOSING
    certainty: str | None = None
    pm_name: str | None = None
    proposal_pm_name: str | None = None
    presentation_pm_name: str | None = None
    support_lead: str | None = None
    proposal_team_text: str | None = None
    amount_text: str | None = None
    total_amount: float | None = None
    company_amount: float | None = None
    currency: str | None = "KRW"
    start_date: date | None = None
    end_date: date | None = None
    bid_notice_no: str | None = None
    bid_notice_date: date | None = None
    pre_notice_no: str | None = None
    pre_notice_date: date | None = None
    submission_at: datetime | None = None
    submission_format: str | None = None
    submission_note: str | None = None
    presentation_at: datetime | None = None
    presentation_format: str | None = None
    presentation_note: str | None = None
    recent_activity_at: datetime | None = None
    memo: str | None = None
    source_sheet: str | None = None
    raw_payload: dict | None = None
    project_code_id: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    code: str | None = None
    name: str | None = Field(default=None, min_length=1)
    client_name: str | None = None
    owner_department: str | None = None
    lead_department: str | None = None
    sales_department: str | None = None
    sales_owner: str | None = None
    project_type: ProjectType | None = None
    status: ProjectStatus | None = None
    certainty: str | None = None
    pm_name: str | None = None
    proposal_pm_name: str | None = None
    presentation_pm_name: str | None = None
    support_lead: str | None = None
    proposal_team_text: str | None = None
    amount_text: str | None = None
    total_amount: float | None = None
    company_amount: float | None = None
    currency: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    bid_notice_no: str | None = None
    bid_notice_date: date | None = None
    pre_notice_no: str | None = None
    pre_notice_date: date | None = None
    submission_at: datetime | None = None
    submission_format: str | None = None
    submission_note: str | None = None
    presentation_at: datetime | None = None
    presentation_format: str | None = None
    presentation_note: str | None = None
    recent_activity_at: datetime | None = None
    memo: str | None = None
    source_sheet: str | None = None
    raw_payload: dict | None = None
    project_code_id: str | None = None


class ProjectRead(ProjectBase):
    id: str
    code: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectLogBase(BaseModel):
    project_id: str
    status: ProjectStatus
    previous_status: ProjectStatus | None = None
    next_status: ProjectStatus | None = None
    category: str | None = None
    logged_at: datetime | None = None
    author_name: str | None = None
    author_team: str | None = None
    summary: str | None = None
    content: str = Field(min_length=1)
    detail: dict | None = None
    related_schedule_label: str | None = None
    related_schedule_at: datetime | None = None
    source_sheet: str | None = None


class ProjectLogCreate(ProjectLogBase):
    pass


class ProjectLogRead(ProjectLogBase):
    id: str
    logged_at: datetime
    project_name: str | None = None
    project_code: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
