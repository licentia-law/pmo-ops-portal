from datetime import UTC, date, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.enums import HolidaySourceKind, HolidayType
from app.integrations.public_holidays import ExternalHolidayRecord
from app.models.core import Holiday, JobLock
from app.services.holiday_sync import (
    normalize_external_holiday_type,
    resolve_default_sync_years,
    run_public_holiday_sync,
    sync_public_holidays,
)


class FakeProvider:
    provider_name = "fake_provider"

    def __init__(self, records_by_year: dict[int, list[ExternalHolidayRecord]]) -> None:
        self._records_by_year = records_by_year

    def fetch_year(self, year: int) -> list[ExternalHolidayRecord]:
        return list(self._records_by_year.get(year, []))


def make_session() -> Session:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    return SessionLocal()


def test_sync_public_holidays_upserts_and_preserves_manual_company_rows() -> None:
    with make_session() as session:
        session.add_all(
            [
                Holiday(
                    holiday_date=date(2026, 1, 1),
                    name="구 시드 신정",
                    holiday_type=HolidayType.PUBLIC,
                    repeats_annually=False,
                    is_active=True,
                    is_counted_as_workday=False,
                    source_kind=HolidaySourceKind.SEED,
                    source_year=2026,
                ),
                Holiday(
                    holiday_date=date(2026, 5, 1),
                    name="창립기념 휴무",
                    holiday_type=HolidayType.COMPANY,
                    repeats_annually=False,
                    is_active=True,
                    is_counted_as_workday=False,
                    source_kind=HolidaySourceKind.MANUAL,
                    source_year=2026,
                ),
                Holiday(
                    holiday_date=date(2026, 3, 1),
                    name="예전 외부 데이터",
                    holiday_type=HolidayType.PUBLIC,
                    repeats_annually=False,
                    is_active=True,
                    is_counted_as_workday=False,
                    source_kind=HolidaySourceKind.EXTERNAL_API,
                    source_provider="fake_provider",
                    source_external_id="20260301:1",
                    source_year=2026,
                ),
            ]
        )
        session.commit()

        provider = FakeProvider(
            {
                2026: [
                    ExternalHolidayRecord(
                        holiday_date=date(2026, 1, 1),
                        name="신정",
                        holiday_type=HolidayType.PUBLIC,
                        source_external_id="20260101:1",
                        source_year=2026,
                    ),
                    ExternalHolidayRecord(
                        holiday_date=date(2026, 3, 2),
                        name="삼일절 대체공휴일",
                        holiday_type=HolidayType.PUBLIC,
                        source_external_id="20260302:1",
                        source_year=2026,
                    ),
                    ExternalHolidayRecord(
                        holiday_date=date(2026, 5, 1),
                        name="근로자의 날",
                        holiday_type=HolidayType.PUBLIC,
                        source_external_id="20260501:1",
                        source_year=2026,
                    ),
                ]
            }
        )

        summary = sync_public_holidays(session, provider=provider, years=[2026])
        assert summary.created == 1
        assert summary.updated == 1
        assert summary.deactivated == 1
        assert summary.conflicts == 1

        rows = session.query(Holiday).order_by(Holiday.holiday_date).all()
        assert len(rows) == 4
        assert rows[0].source_kind == HolidaySourceKind.EXTERNAL_API
        assert rows[0].name == "신정"
        assert rows[0].source_provider == "fake_provider"

        company_row = session.query(Holiday).filter(Holiday.holiday_date == date(2026, 5, 1)).one()
        assert company_row.source_kind == HolidaySourceKind.MANUAL
        assert company_row.holiday_type == HolidayType.COMPANY

        stale_row = session.query(Holiday).filter(Holiday.holiday_date == date(2026, 3, 1)).one()
        assert stale_row.is_active is False
        assert stale_row.is_counted_as_workday is True


def test_sync_public_holidays_is_idempotent() -> None:
    provider = FakeProvider(
        {
            2026: [
                ExternalHolidayRecord(
                    holiday_date=date(2026, 10, 9),
                    name="한글날",
                    holiday_type=HolidayType.PUBLIC,
                    source_external_id="20261009:1",
                    source_year=2026,
                )
            ]
        }
    )

    with make_session() as session:
        first = sync_public_holidays(session, provider=provider, years=[2026])
        second = sync_public_holidays(session, provider=provider, years=[2026])

        assert first.created == 1
        assert second.created == 0
        assert second.updated == 0
        assert session.query(Holiday).count() == 1


def test_sync_public_holidays_stores_substitute_holiday_as_public() -> None:
    provider = FakeProvider(
        {
            2026: [
                ExternalHolidayRecord(
                    holiday_date=date(2026, 8, 17),
                    name="대체공휴일(광복절)",
                    holiday_type=HolidayType.PUBLIC,
                    source_external_id="20260817:1",
                    source_year=2026,
                )
            ]
        }
    )

    with make_session() as session:
        summary = sync_public_holidays(session, provider=provider, years=[2026])
        assert summary.created == 1
        row = session.query(Holiday).one()
        assert row.holiday_type == HolidayType.PUBLIC
        assert row.source_kind == HolidaySourceKind.EXTERNAL_API


def test_sync_public_holidays_keeps_seed_row_when_provider_omits_date() -> None:
    with make_session() as session:
        session.add(
            Holiday(
                holiday_date=date(2026, 1, 30),
                name="설날연휴",
                holiday_type=HolidayType.PUBLIC,
                repeats_annually=False,
                is_active=True,
                is_counted_as_workday=False,
                source_kind=HolidaySourceKind.SEED,
                source_year=2026,
            )
        )
        session.commit()

        summary = sync_public_holidays(session, provider=FakeProvider({2026: []}), years=[2026])
        assert summary.created == 0
        row = session.query(Holiday).filter(Holiday.holiday_date == date(2026, 1, 30)).one()
        assert row.source_kind == HolidaySourceKind.SEED
        assert row.is_active is True


def test_normalize_external_holiday_type_keeps_public() -> None:
    assert normalize_external_holiday_type(HolidayType.PUBLIC) == HolidayType.PUBLIC


def test_run_public_holiday_sync_uses_current_and_next_year_defaults() -> None:
    assert resolve_default_sync_years(date(2026, 12, 31)) == [2026, 2027]


def test_run_public_holiday_sync_releases_job_lock() -> None:
    provider = FakeProvider({})
    with make_session() as session:
        summary = run_public_holiday_sync(
            session,
            provider=provider,
            lock_owner="test",
            now=datetime(2026, 6, 19, 1, 0, tzinfo=UTC),
        )
        assert summary.years == [2026, 2027]
        assert session.query(JobLock).count() == 0
