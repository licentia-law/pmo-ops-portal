from datetime import date, datetime

from pydantic import BaseModel, Field

from app.enums import ProjectStatus, ProjectType


class ProjectCodeBase(BaseModel):
    code: str | None = None
    name: str = Field(min_length=1)
    project_type: ProjectType = ProjectType.MAIN
    status: ProjectStatus = ProjectStatus.PROPOSING
    owner_name: str | None = None


class ProjectCodeCreate(ProjectCodeBase):
    pass


class ProjectCodeUpdate(BaseModel):
    code: str | None = None
    name: str | None = Field(default=None, min_length=1)
    project_type: ProjectType | None = None
    status: ProjectStatus | None = None
    owner_name: str | None = None


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
    project_type: ProjectType = ProjectType.MAIN
    status: ProjectStatus = ProjectStatus.PROPOSING
    pm_name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    project_code_id: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    code: str | None = None
    name: str | None = Field(default=None, min_length=1)
    client_name: str | None = None
    project_type: ProjectType | None = None
    status: ProjectStatus | None = None
    pm_name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
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
    logged_at: datetime | None = None
    author_name: str | None = None
    content: str = Field(min_length=1)


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
