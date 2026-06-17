from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.enums import HolidayType, OrganizationRole, UserPermission
from app.models.core import Holiday, User


@dataclass(slots=True)
class ProjectedHoliday:
    source: Holiday
    holiday_date: date
    is_projected: bool


def require_holiday_mutation(user: User, message: str) -> None:
    if user.permission != UserPermission.ADMIN:
        raise HTTPException(status_code=403, detail=message)


def normalize_holiday_payload(payload: dict[str, object]) -> dict[str, object]:
    normalized: dict[str, object] = {}
    for key, value in payload.items():
        if isinstance(value, str):
            stripped = value.strip()
            normalized[key] = stripped or None
        else:
            normalized[key] = value
    return normalized


def require_nonblank(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise HTTPException(status_code=400, detail=f"필수 항목 누락: {label}")
    return value.strip()


def validate_holiday_rules(
    session: Session,
    *,
    holiday_date: date,
    holiday_type: HolidayType,
    repeats_annually: bool,
    holiday_id: str | None = None,
) -> None:
    if holiday_type == HolidayType.ALTERNATIVE and repeats_annually:
        raise HTTPException(status_code=400, detail="대체휴일은 해당연도 기준으로만 등록할 수 있습니다.")

    existing_rows = session.scalars(select(Holiday)).all()
    target_month_day = (holiday_date.month, holiday_date.day)
    for row in existing_rows:
        if holiday_id and row.id == holiday_id:
            continue
        row_month_day = (row.holiday_date.month, row.holiday_date.day)
        if repeats_annually or row.repeats_annually:
            if row_month_day == target_month_day:
                raise HTTPException(status_code=409, detail="같은 월/일의 공휴일이 이미 등록되어 있습니다.")
            continue
        if row.holiday_date == holiday_date:
            raise HTTPException(status_code=409, detail="같은 날짜의 공휴일이 이미 등록되어 있습니다.")


def load_filtered_holidays(
    session: Session,
    *,
    q: str | None = None,
    holiday_type: HolidayType | None = None,
    is_active: bool | None = None,
    repeats_annually: bool | None = None,
) -> list[Holiday]:
    statement = select(Holiday)
    if q:
        keyword = f"%{q.strip()}%"
        if keyword != "%%":
            statement = statement.where(or_(Holiday.name.ilike(keyword), Holiday.note.ilike(keyword)))
    if holiday_type is not None:
        statement = statement.where(Holiday.holiday_type == holiday_type)
    if is_active is not None:
        statement = statement.where(Holiday.is_active == is_active)
    if repeats_annually is not None:
        statement = statement.where(Holiday.repeats_annually == repeats_annually)
    return session.scalars(statement).all()


def project_holiday_for_year(holiday: Holiday, year: int) -> ProjectedHoliday | None:
    if holiday.repeats_annually:
        try:
            projected_date = date(year, holiday.holiday_date.month, holiday.holiday_date.day)
        except ValueError:
            return None
        return ProjectedHoliday(source=holiday, holiday_date=projected_date, is_projected=projected_date != holiday.holiday_date)
    if holiday.holiday_date.year != year:
        return None
    return ProjectedHoliday(source=holiday, holiday_date=holiday.holiday_date, is_projected=False)


def list_projected_holidays(
    session: Session,
    *,
    year: int,
    month: int | None = None,
    q: str | None = None,
    holiday_type: HolidayType | None = None,
    is_active: bool | None = None,
    repeats_annually: bool | None = None,
) -> list[ProjectedHoliday]:
    if month is not None and (month < 1 or month > 12):
        raise HTTPException(status_code=400, detail="월은 1부터 12 사이여야 합니다.")
    rows = load_filtered_holidays(
        session,
        q=q,
        holiday_type=holiday_type,
        is_active=is_active,
        repeats_annually=repeats_annually,
    )
    projected: list[ProjectedHoliday] = []
    for row in rows:
        item = project_holiday_for_year(row, year)
        if item is None:
            continue
        if month is not None and item.holiday_date.month != month:
            continue
        projected.append(item)
    return projected


def holiday_dates_for_range(session: Session, start_date: date, end_date: date) -> set[date]:
    if end_date < start_date:
        return set()
    rows = session.scalars(
        select(Holiday).where(Holiday.is_active.is_(True), Holiday.is_counted_as_workday.is_(False))
    ).all()
    dates: set[date] = set()
    for row in rows:
        if row.repeats_annually:
            for year in range(start_date.year, end_date.year + 1):
                item = project_holiday_for_year(row, year)
                if item and start_date <= item.holiday_date <= end_date:
                    dates.add(item.holiday_date)
            continue
        if start_date <= row.holiday_date <= end_date:
            dates.add(row.holiday_date)
    return dates


def business_days_between(session: Session, start_date: date, end_date: date) -> int:
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="종료일은 시작일보다 빠를 수 없습니다.")
    holiday_dates = holiday_dates_for_range(session, start_date, end_date)
    count = 0
    cursor = start_date
    while cursor <= end_date:
        if cursor.weekday() < 5 and cursor not in holiday_dates:
            count += 1
        cursor += timedelta(days=1)
    return count


def month_workday_summary(session: Session, *, year: int, month: int) -> dict[str, int]:
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="월은 1부터 12 사이여야 합니다.")
    start_date = date(year, month, 1)
    end_date = date(year + (month // 12), (month % 12) + 1, 1) - timedelta(days=1)
    holiday_dates = holiday_dates_for_range(session, start_date, end_date)
    return {
        "year": year,
        "month": month,
        "workdays": business_days_between(session, start_date, end_date),
        "holiday_count": sum(1 for holiday_date in holiday_dates if holiday_date.weekday() < 5),
    }
