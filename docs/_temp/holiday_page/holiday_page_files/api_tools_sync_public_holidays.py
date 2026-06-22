from __future__ import annotations

import argparse
import sys
from collections.abc import Callable, Sequence
from typing import TextIO

from app.core.config import settings
from app.core.database import SessionLocal
from app.integrations.public_holidays import KrPublicHolidayApiAdapter, PublicHolidayProviderError
from app.services.holiday_sync import HolidaySyncLockError, resolve_default_sync_years, run_public_holiday_sync


def build_provider() -> KrPublicHolidayApiAdapter:
    return KrPublicHolidayApiAdapter(
        service_key=settings.public_holiday_api_service_key,
        base_url=settings.public_holiday_api_base_url,
        timeout_seconds=settings.public_holiday_api_timeout_seconds,
    )


def main(
    argv: Sequence[str] | None = None,
    *,
    session_factory: Callable[[], object] = SessionLocal,
    provider_factory: Callable[[], object] = build_provider,
    stdout: TextIO | None = None,
    stderr: TextIO | None = None,
) -> int:
    stdout = stdout or sys.stdout
    stderr = stderr or sys.stderr

    parser = argparse.ArgumentParser(description="Sync public holidays from external API into holidays table.")
    parser.add_argument("--year", type=int, help="Sync one year.")
    parser.add_argument("--from-year", dest="from_year", type=int, help="Sync start year.")
    parser.add_argument("--to-year", dest="to_year", type=int, help="Sync end year.")
    parser.add_argument("--dry-run", action="store_true", help="Preview sync without DB changes.")
    args = parser.parse_args(argv)

    try:
        years = _resolve_years(year=args.year, from_year=args.from_year, to_year=args.to_year)
        provider = provider_factory()
        with session_factory() as session:
            summary = run_public_holiday_sync(
                session,
                provider=provider,
                years=years,
                dry_run=args.dry_run,
                lock_owner="cli",
            )
    except (HolidaySyncLockError, PublicHolidayProviderError, ValueError) as error:
        print(f"SYNC_FAILED: {error}", file=stderr)
        return 1
    except Exception as error:
        print(f"SYNC_FAILED: {error}", file=stderr)
        return 1

    print("SYNC_OK", file=stdout)
    for key, value in summary.as_dict().items():
        print(f"{key}: {value}", file=stdout)
    return 0


def _resolve_years(*, year: int | None, from_year: int | None, to_year: int | None) -> list[int]:
    if year is not None:
        if from_year is not None or to_year is not None:
            raise ValueError("--year and --from-year/--to-year cannot be used together.")
        return [year]
    if from_year is None and to_year is None:
        return resolve_default_sync_years()
    if from_year is None or to_year is None:
        raise ValueError("Both --from-year and --to-year are required when range sync is used.")
    if to_year < from_year:
        raise ValueError("--to-year must be greater than or equal to --from-year.")
    return list(range(from_year, to_year + 1))


if __name__ == "__main__":
    raise SystemExit(main())
