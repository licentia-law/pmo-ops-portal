from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.holidays import validate_holiday_rules
from app.enums import HolidaySourceKind, HolidayType
from app.integrations.public_holidays import ExternalHolidayRecord, PublicHolidayProvider
from app.models.core import Holiday, JobLock

PUBLIC_HOLIDAY_SYNC_JOB_NAME = "holiday_public_sync"
PUBLIC_HOLIDAY_LOCK_TTL = timedelta(minutes=30)


class HolidaySyncLockError(RuntimeError):
    pass


@dataclass(slots=True)
class HolidaySyncSummary:
    provider: str
    years: list[int]
    synced_at: datetime
    created: int = 0
    updated: int = 0
    deactivated: int = 0
    skipped: int = 0
    conflicts: int = 0

    def as_dict(self) -> dict[str, object]:
        return {
            "provider": self.provider,
            "years": self.years,
            "created": self.created,
            "updated": self.updated,
            "deactivated": self.deactivated,
            "skipped": self.skipped,
            "conflicts": self.conflicts,
            "synced_at": self.synced_at,
        }


def resolve_default_sync_years(today: date | None = None) -> list[int]:
    basis = today or datetime.now(UTC).date()
    return [basis.year, basis.year + 1]


def run_public_holiday_sync(
    session: Session,
    *,
    provider: PublicHolidayProvider,
    years: list[int] | None = None,
    dry_run: bool = False,
    lock_owner: str = "system",
    now: datetime | None = None,
) -> HolidaySyncSummary:
    synced_at = now or datetime.now(UTC)
    target_years = sorted(set(years or resolve_default_sync_years(synced_at.date())))
    _acquire_job_lock(
        session,
        job_name=PUBLIC_HOLIDAY_SYNC_JOB_NAME,
        locked_by=lock_owner,
        locked_at=synced_at,
        expires_at=synced_at + PUBLIC_HOLIDAY_LOCK_TTL,
    )
    try:
        return sync_public_holidays(
            session,
            provider=provider,
            years=target_years,
            dry_run=dry_run,
            synced_at=synced_at,
        )
    finally:
        _release_job_lock(session, job_name=PUBLIC_HOLIDAY_SYNC_JOB_NAME)


def sync_public_holidays(
    session: Session,
    *,
    provider: PublicHolidayProvider,
    years: list[int],
    dry_run: bool = False,
    synced_at: datetime | None = None,
) -> HolidaySyncSummary:
    years = sorted(set(years))
    synced_at = synced_at or datetime.now(UTC)
    summary = HolidaySyncSummary(provider=provider.provider_name, years=years, synced_at=synced_at)
    seen_external_ids: set[str] = set()

    for year in years:
        for record in provider.fetch_year(year):
            stored_type = normalize_external_holiday_type(record.holiday_type)
            if stored_type is None:
                summary.skipped += 1
                continue
            seen_external_ids.add(record.source_external_id)
            target = _resolve_target_row(session, provider.provider_name, record)
            if target is None:
                if _conflicts_with_manual_company_row(session, record.holiday_date):
                    summary.conflicts += 1
                    continue
                validate_holiday_rules(
                    session,
                    holiday_date=record.holiday_date,
                    holiday_type=stored_type,
                    repeats_annually=False,
                    source_kind=HolidaySourceKind.EXTERNAL_API,
                )
                row = Holiday(
                    holiday_date=record.holiday_date,
                    name=record.name,
                    holiday_type=stored_type,
                    repeats_annually=False,
                    is_active=True,
                    is_counted_as_workday=False,
                    source_kind=HolidaySourceKind.EXTERNAL_API,
                    source_provider=provider.provider_name,
                    source_external_id=record.source_external_id,
                    source_year=record.source_year,
                    last_synced_at=synced_at,
                )
                summary.created += 1
                if not dry_run:
                    session.add(row)
                continue

            changed = _apply_external_record(
                target,
                record,
                provider.provider_name,
                stored_type,
                synced_at,
            )
            if changed:
                summary.updated += 1

    stale_rows = session.scalars(
        select(Holiday).where(
            Holiday.source_kind == HolidaySourceKind.EXTERNAL_API,
            Holiday.source_provider == provider.provider_name,
            Holiday.source_year.in_(years),
        )
    ).all()
    for row in stale_rows:
        if row.source_external_id in seen_external_ids:
            continue
        if row.is_active:
            row.is_active = False
            row.is_counted_as_workday = True
            row.last_synced_at = synced_at
            summary.deactivated += 1

    if dry_run:
        session.rollback()
    else:
        session.commit()
    return summary


def _acquire_job_lock(
    session: Session,
    *,
    job_name: str,
    locked_by: str,
    locked_at: datetime,
    expires_at: datetime,
) -> None:
    lock = JobLock(
        job_name=job_name,
        locked_at=locked_at,
        locked_by=locked_by,
        expires_at=expires_at,
    )
    try:
        session.add(lock)
        session.commit()
        return
    except IntegrityError:
        session.rollback()

    existing = session.get(JobLock, job_name)
    if existing is not None and existing.expires_at <= locked_at:
        session.execute(delete(JobLock).where(JobLock.job_name == job_name))
        session.commit()
        try:
            session.add(lock)
            session.commit()
            return
        except IntegrityError:
            session.rollback()

    raise HolidaySyncLockError("공휴일 동기화가 이미 실행 중입니다. 잠시 후 다시 시도해 주세요.")


def _release_job_lock(session: Session, *, job_name: str) -> None:
    session.execute(delete(JobLock).where(JobLock.job_name == job_name))
    session.commit()


def _resolve_target_row(
    session: Session,
    provider_name: str,
    record: ExternalHolidayRecord,
) -> Holiday | None:
    row = session.scalar(
        select(Holiday).where(
            Holiday.source_kind == HolidaySourceKind.EXTERNAL_API,
            Holiday.source_provider == provider_name,
            Holiday.source_external_id == record.source_external_id,
        )
    )
    if row is not None:
        return row

    by_date = session.scalar(select(Holiday).where(Holiday.holiday_date == record.holiday_date))
    if by_date is None:
        return None
    if by_date.holiday_type == HolidayType.COMPANY:
        return None
    if by_date.source_kind == HolidaySourceKind.MANUAL:
        return None
    return by_date


def _conflicts_with_manual_company_row(session: Session, holiday_date: date) -> bool:
    row = session.scalar(select(Holiday).where(Holiday.holiday_date == holiday_date))
    if row is None:
        return False
    return row.source_kind == HolidaySourceKind.MANUAL or row.holiday_type == HolidayType.COMPANY


def _apply_external_record(
    row: Holiday,
    record: ExternalHolidayRecord,
    provider_name: str,
    stored_type: HolidayType,
    synced_at: datetime,
) -> bool:
    changed = False
    next_values = {
        "holiday_date": record.holiday_date,
        "name": record.name,
        "holiday_type": stored_type,
        "repeats_annually": False,
        "is_active": True,
        "is_counted_as_workday": False,
        "source_kind": HolidaySourceKind.EXTERNAL_API,
        "source_provider": provider_name,
        "source_external_id": record.source_external_id,
        "source_year": record.source_year,
    }
    for field, value in next_values.items():
        if getattr(row, field) != value:
            setattr(row, field, value)
            changed = True
    row.last_synced_at = synced_at
    return changed


def normalize_external_holiday_type(source_type: HolidayType) -> HolidayType | None:
    if source_type == HolidayType.PUBLIC:
        return HolidayType.PUBLIC
    return None
