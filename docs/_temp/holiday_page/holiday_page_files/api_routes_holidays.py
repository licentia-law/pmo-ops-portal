from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.api.common import ListParams, envelope
from app.api.deps import CurrentUser, DbSession
from app.domain.holidays import (
    ProjectedHoliday,
    business_days_between,
    list_projected_holidays,
    month_workday_summary,
    normalize_holiday_payload,
    require_manual_holiday_mutation,
    require_holiday_mutation,
    require_nonblank,
    validate_holiday_rules,
)
from app.enums import HolidaySourceKind, HolidayType
from app.models.core import Holiday
from app.schemas.holidays import (
    HolidayCreate,
    HolidayMonthlyBucketRead,
    HolidayRead,
    HolidaySyncRead,
    HolidaySyncRequest,
    HolidayUpcomingRead,
    HolidayUpdate,
)
from app.core.config import settings
from app.integrations.public_holidays import KrPublicHolidayApiAdapter, PublicHolidayProviderError
from app.services.holiday_sync import HolidaySyncLockError, run_public_holiday_sync

router = APIRouter()


def build_public_holiday_provider() -> KrPublicHolidayApiAdapter:
    return KrPublicHolidayApiAdapter(
        service_key=settings.public_holiday_api_service_key,
        base_url=settings.public_holiday_api_base_url,
        timeout_seconds=settings.public_holiday_api_timeout_seconds,
    )


def serialize_holiday(item: ProjectedHoliday) -> dict[str, object]:
    source = item.source
    return HolidayRead(
        id=source.id,
        holiday_date=item.holiday_date,
        source_holiday_date=source.holiday_date,
        name=source.name,
        holiday_type=source.holiday_type,
        repeats_annually=source.repeats_annually,
        is_active=source.is_active,
        is_counted_as_workday=source.is_counted_as_workday,
        source_kind=source.source_kind,
        source_provider=source.source_provider,
        source_external_id=source.source_external_id,
        source_year=source.source_year,
        last_synced_at=source.last_synced_at,
        note=source.note,
        is_projected=item.is_projected,
        created_at=source.created_at,
        updated_at=source.updated_at,
    ).model_dump(mode="json")


def serialize_holiday_model(row: Holiday) -> dict[str, object]:
    return serialize_holiday(ProjectedHoliday(source=row, holiday_date=row.holiday_date, is_projected=False))


def apply_python_sort(items: list[ProjectedHoliday], sort: str) -> list[ProjectedHoliday]:
    sort_value = sort or "holiday_date"
    reverse = sort_value.startswith("-")
    field = sort_value[1:] if reverse else sort_value
    if field not in {"holiday_date", "name", "holiday_type", "updated_at", "created_at"}:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 정렬 필드입니다: {field}")

    def key(item: ProjectedHoliday) -> object:
        if field == "holiday_date":
            return item.holiday_date
        if field == "name":
            return item.source.name
        if field == "holiday_type":
            return item.source.holiday_type
        if field == "created_at":
            return item.source.created_at
        return item.source.updated_at

    return sorted(items, key=key, reverse=reverse)


def build_summary(items: list[ProjectedHoliday], basis_date: date) -> dict[str, object]:
    monthly = []
    for month in range(1, 13):
        month_items = [item for item in items if item.holiday_date.month == month]
        monthly.append(
            HolidayMonthlyBucketRead(
                month=month,
                count=len(month_items),
                active_count=sum(1 for item in month_items if item.source.is_active),
            ).model_dump(mode="json")
        )
    upcoming = []
    for item in sorted(
        [item for item in items if item.source.is_active and item.holiday_date >= basis_date],
        key=lambda item: item.holiday_date,
    )[:4]:
        upcoming.append(
            HolidayUpcomingRead(
                id=item.source.id,
                holiday_date=item.holiday_date,
                name=item.source.name,
                holiday_type=item.source.holiday_type,
                d_day=(item.holiday_date - basis_date).days,
            ).model_dump(mode="json")
        )
    return {
        "total_count": len(items),
        "public_count": sum(1 for item in items if item.source.holiday_type == HolidayType.PUBLIC),
        "company_count": sum(1 for item in items if item.source.holiday_type == HolidayType.COMPANY),
        "active_count": sum(1 for item in items if item.source.is_active),
        "monthly_counts": monthly,
        "upcoming": upcoming,
    }


@router.get("")
def list_holidays(
    session: DbSession,
    params: ListParams = Depends(),
    year: int = date.today().year,
    month: int | None = None,
    holiday_type: HolidayType | None = None,
    is_active: bool | None = None,
    repeats_annually: bool | None = None,
) -> dict[str, object]:
    projected = list_projected_holidays(
        session,
        year=year,
        month=month,
        q=params.q,
        holiday_type=holiday_type,
        is_active=is_active,
        repeats_annually=repeats_annually,
    )
    sorted_items = apply_python_sort(projected, params.sort or "holiday_date")
    total = len(sorted_items)
    start = (params.page - 1) * params.page_size
    paged_items = sorted_items[start : start + params.page_size]
    basis_date = date.today() if year == date.today().year else date(year, 1, 1)
    summary = build_summary(projected, basis_date)
    workday_summary = month_workday_summary(session, year=year, month=month) if month is not None else None
    return envelope(
        [serialize_holiday(item) for item in paged_items],
        {
            "page": params.page,
            "page_size": params.page_size,
            "total": total,
            "year": year,
            "month": month,
            "basis_date": basis_date.isoformat(),
            "summary": summary,
            "workday_summary": workday_summary,
        },
    )


@router.post("", status_code=201)
def create_holiday(payload: HolidayCreate, session: DbSession, user: CurrentUser) -> dict[str, object]:
    require_holiday_mutation(user, "공휴일 등록 권한이 없습니다.")
    values = normalize_holiday_payload(payload.model_dump())
    values["name"] = require_nonblank(values.get("name"), "명칭")
    holiday_date = payload.holiday_date
    holiday_type = payload.holiday_type
    repeats_annually = payload.repeats_annually
    validate_holiday_rules(
        session,
        holiday_date=holiday_date,
        holiday_type=holiday_type,
        repeats_annually=repeats_annually,
        source_kind=HolidaySourceKind.MANUAL,
    )
    values["is_counted_as_workday"] = not bool(values.get("is_active", True))
    values["source_kind"] = HolidaySourceKind.MANUAL
    values["source_year"] = holiday_date.year
    row = Holiday(**values)
    session.add(row)
    session.commit()
    session.refresh(row)
    return envelope(serialize_holiday_model(row))


@router.post("/sync")
def sync_holidays(
    payload: HolidaySyncRequest,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    require_holiday_mutation(user, "공휴일 동기화 권한이 없습니다.")
    try:
        summary = run_public_holiday_sync(
            session,
            provider=build_public_holiday_provider(),
            lock_owner=f"api:{user.email}",
        )
    except HolidaySyncLockError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except PublicHolidayProviderError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return envelope(HolidaySyncRead(**summary.as_dict()).model_dump(mode="json"))


@router.patch("/{holiday_id}")
def update_holiday(
    holiday_id: str,
    payload: HolidayUpdate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    require_holiday_mutation(user, "공휴일 수정 권한이 없습니다.")
    row = session.get(Holiday, holiday_id)
    if row is None:
        raise HTTPException(status_code=404, detail="공휴일을 찾을 수 없습니다.")
    require_manual_holiday_mutation(row, "수정")
    updates = normalize_holiday_payload(payload.model_dump(exclude_unset=True))
    next_date = updates.get("holiday_date", row.holiday_date)
    next_type = updates.get("holiday_type", row.holiday_type)
    next_repeats = updates.get("repeats_annually", row.repeats_annually)
    if not isinstance(next_date, date):
        raise HTTPException(status_code=400, detail="유효한 날짜가 필요합니다.")
    if not isinstance(next_type, HolidayType):
        raise HTTPException(status_code=400, detail="유효한 공휴일 구분이 필요합니다.")
    if not isinstance(next_repeats, bool):
        raise HTTPException(status_code=400, detail="반복 여부가 올바르지 않습니다.")
    validate_holiday_rules(
        session,
        holiday_date=next_date,
        holiday_type=next_type,
        repeats_annually=next_repeats,
        source_kind=row.source_kind,
        holiday_id=holiday_id,
    )
    if "name" in updates:
        updates["name"] = require_nonblank(updates["name"], "명칭")
    if "is_active" in updates:
        updates["is_counted_as_workday"] = not bool(updates["is_active"])
    for field, value in updates.items():
        setattr(row, field, value)
    session.commit()
    session.refresh(row)
    return envelope(serialize_holiday_model(row))


@router.delete("/{holiday_id}")
def delete_holiday(holiday_id: str, session: DbSession, user: CurrentUser) -> dict[str, object]:
    require_holiday_mutation(user, "공휴일 삭제 권한이 없습니다.")
    row = session.get(Holiday, holiday_id)
    if row is None:
        raise HTTPException(status_code=404, detail="공휴일을 찾을 수 없습니다.")
    require_manual_holiday_mutation(row, "삭제")
    session.delete(row)
    session.commit()
    return envelope({"id": holiday_id, "deleted": True})


@router.get("/workdays")
def get_workday_summary(
    session: DbSession,
    start_date: date,
    end_date: date,
) -> dict[str, object]:
    return envelope(
        {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "workdays": business_days_between(session, start_date, end_date),
        }
    )
