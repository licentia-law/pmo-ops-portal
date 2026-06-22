from datetime import date
from io import StringIO

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.enums import HolidayType
from app.integrations.public_holidays import ExternalHolidayRecord
from app.models.core import Holiday
from app.tools.sync_public_holidays import main


class FakeProvider:
    provider_name = "fake_provider"

    def fetch_year(self, year: int) -> list[ExternalHolidayRecord]:
        return [
            ExternalHolidayRecord(
                holiday_date=date(year, 1, 1),
                name="신정",
                holiday_type=HolidayType.PUBLIC,
                source_external_id=f"{year}0101:1",
                source_year=year,
            )
        ]


def make_session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


def test_sync_public_holidays_cli_supports_dry_run_and_normal_run() -> None:
    SessionLocal = make_session_factory()

    stdout = StringIO()
    stderr = StringIO()
    exit_code = main(
        ["--year", "2026", "--dry-run"],
        session_factory=SessionLocal,
        provider_factory=FakeProvider,
        stdout=stdout,
        stderr=stderr,
    )
    assert exit_code == 0
    assert "SYNC_OK" in stdout.getvalue()
    assert "years: [2026]" in stdout.getvalue()
    with SessionLocal() as session:
        assert session.query(Holiday).count() == 0

    stdout = StringIO()
    exit_code = main(
        ["--from-year", "2026", "--to-year", "2026"],
        session_factory=SessionLocal,
        provider_factory=FakeProvider,
        stdout=stdout,
        stderr=stderr,
    )
    assert exit_code == 0
    with SessionLocal() as session:
        assert session.query(Holiday).count() == 1


def test_sync_public_holidays_cli_defaults_to_current_and_next_year() -> None:
    SessionLocal = make_session_factory()
    stdout = StringIO()
    exit_code = main(
        [],
        session_factory=SessionLocal,
        provider_factory=FakeProvider,
        stdout=stdout,
        stderr=StringIO(),
    )
    assert exit_code == 0
    assert "years: [2026, 2027]" in stdout.getvalue()


def test_sync_public_holidays_cli_returns_nonzero_for_invalid_args() -> None:
    stdout = StringIO()
    stderr = StringIO()
    exit_code = main(
        ["--from-year", "2027", "--to-year", "2026"],
        session_factory=make_session_factory(),
        provider_factory=FakeProvider,
        stdout=stdout,
        stderr=stderr,
    )
    assert exit_code == 1
    assert "SYNC_FAILED" in stderr.getvalue()
