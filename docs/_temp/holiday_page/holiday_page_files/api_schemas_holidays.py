from datetime import date, datetime

from pydantic import BaseModel, Field

from app.enums import HolidaySourceKind, HolidayType


class HolidayBase(BaseModel):
    holiday_date: date
    name: str = Field(min_length=1, max_length=100)
    holiday_type: HolidayType
    repeats_annually: bool = False
    is_active: bool = True
    note: str | None = None


class HolidayCreate(HolidayBase):
    pass


class HolidayUpdate(BaseModel):
    holiday_date: date | None = None
    name: str | None = Field(default=None, min_length=1, max_length=100)
    holiday_type: HolidayType | None = None
    repeats_annually: bool | None = None
    is_active: bool | None = None
    note: str | None = None


class HolidayRead(HolidayBase):
    id: str
    source_holiday_date: date
    is_counted_as_workday: bool
    source_kind: HolidaySourceKind
    source_provider: str | None = None
    source_external_id: str | None = None
    source_year: int | None = None
    last_synced_at: datetime | None = None
    is_projected: bool
    created_at: datetime
    updated_at: datetime


class HolidayMonthlyBucketRead(BaseModel):
    month: int
    count: int
    active_count: int


class HolidayUpcomingRead(BaseModel):
    id: str
    holiday_date: date
    name: str
    holiday_type: HolidayType
    d_day: int


class HolidayWorkdaySummaryRead(BaseModel):
    year: int
    month: int
    workdays: int
    holiday_count: int


class HolidaySyncRequest(BaseModel):
    mode: str | None = None


class HolidaySyncRead(BaseModel):
    provider: str
    years: list[int]
    created: int
    updated: int
    deactivated: int
    skipped: int
    conflicts: int
    synced_at: datetime
