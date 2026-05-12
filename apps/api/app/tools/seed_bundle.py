from __future__ import annotations

import csv
import json
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, Integer, JSON, Numeric, delete
from sqlalchemy.orm import Session

from app.models.core import (
    CurrentAssignmentSnapshot,
    Holiday,
    MonthlyAssignmentMM,
    MonthlyEmploymentMM,
    MonthlyKpiSummary,
    Personnel,
    Project,
    ProjectAssignment,
    ProjectCode,
    ProjectLog,
    User,
    WeeklyLoadSnapshot,
)

SEED_SPECS: list[tuple[str, type[Any]]] = [
    ("users_seed.csv", User),
    ("personnel_seed.csv", Personnel),
    ("project_codes_seed.csv", ProjectCode),
    ("projects_seed.csv", Project),
    ("project_assignments_seed.csv", ProjectAssignment),
    ("project_logs_seed.csv", ProjectLog),
    ("holidays_seed.csv", Holiday),
    ("monthly_employment_mm_seed.csv", MonthlyEmploymentMM),
    ("monthly_assignment_mm_seed.csv", MonthlyAssignmentMM),
    ("current_assignment_snapshots_seed.csv", CurrentAssignmentSnapshot),
    ("weekly_load_snapshots_seed.csv", WeeklyLoadSnapshot),
    ("monthly_kpi_summaries_seed.csv", MonthlyKpiSummary),
]


def resolve_seed_dir(seed_dir: str | Path) -> Path:
    path = Path(seed_dir).expanduser().resolve()
    if not path.is_dir():
        raise FileNotFoundError(f"Seed directory not found: {path}")
    return path


def import_seed_bundle(session: Session, seed_dir: str | Path, truncate: bool = False) -> dict[str, int]:
    directory = resolve_seed_dir(seed_dir)

    if truncate:
        for _, model in reversed(SEED_SPECS):
            session.execute(delete(model))
        session.flush()

    inserted: dict[str, int] = {}
    for filename, model in SEED_SPECS:
        filepath = directory / filename
        if not filepath.exists():
            raise FileNotFoundError(f"Required seed file missing: {filepath}")

        with filepath.open("r", encoding="utf-8-sig", newline="") as file_obj:
            reader = csv.DictReader(file_obj)
            headers = reader.fieldnames or []
            column_map = {column.name: column for column in model.__table__.columns}

            unknown = [header for header in headers if header not in column_map]
            if unknown:
                raise ValueError(f"{filename} has unknown columns: {unknown}")

            rows: list[Any] = []
            for line_no, row in enumerate(reader, start=2):
                payload: dict[str, Any] = {}
                for key, raw_value in row.items():
                    if key is None:
                        continue
                    payload[key] = _convert(raw_value, column_map[key].type, filename, line_no, key)
                rows.append(model(**payload))

        session.add_all(rows)
        session.flush()
        inserted[filename] = len(rows)

    session.commit()
    return inserted


def _convert(raw_value: str, column_type: Any, filename: str, line_no: int, column_name: str) -> Any:
    if raw_value == "":
        return None

    try:
        if isinstance(column_type, DateTime):
            return datetime.fromisoformat(raw_value)
        if isinstance(column_type, Date):
            return date.fromisoformat(raw_value)
        if isinstance(column_type, JSON):
            return json.loads(raw_value)
        if isinstance(column_type, Boolean):
            return raw_value.strip().lower() in {"true", "1", "y", "yes"}
        if isinstance(column_type, Integer):
            return int(raw_value)
        if isinstance(column_type, Numeric):
            return Decimal(raw_value)
    except Exception as error:  # pragma: no cover - conversion branch is validated by runtime data.
        raise ValueError(
            f"Invalid value in {filename}:{line_no} column {column_name} -> {raw_value}"
        ) from error

    return raw_value
