from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import Date, DateTime, Enum, Integer, Numeric, delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import REPO_ROOT
from app.domain.capabilities import require_capabilities
from app.domain.holidays import business_days_between, month_workday_summary
from app.domain.assignments import base_assignment_mm, is_cancelled, is_current_assignment, operational_assignments, representative_rank
from app.domain.people import apply_personnel_scope
from app.domain.personnel_types import classify_legacy_personnel
from app.domain.kpi import pmo_monthly_kpi_values
from app.enums import (
    AssignmentType,
    EmploymentStatus,
    PersonnelType,
    ProjectStatus,
    ProjectType,
    Capability,
)
from app.models.core import (
    CurrentAssignmentSnapshot,
    JobLock,
    MonthlyAssignmentMM,
    MonthlyEmploymentMM,
    MonthlyKpiSummary,
    Personnel,
    Project,
    ProjectAssignment,
    ProjectCode,
    ProjectLog,
    Role,
    User,
    WeeklyLoadSnapshot,
)

DATA_BACKUP_JOB_NAME = "data_backup_upload_restore"
DATA_RUNTIME_DIR = REPO_ROOT / "apps" / "api" / ".runtime" / "data_backup"
BACKUP_DIR = DATA_RUNTIME_DIR / "backups"
MANIFEST_PATH = DATA_RUNTIME_DIR / "manifest.json"
LOCK_EXPIRE_MINUTES = 30
INCLUDED_TABLE_NAMES = [
    "personnel",
    "project_codes",
    "projects",
    "project_assignments",
    "project_logs",
    "monthly_employment_mm",
    "monthly_assignment_mm",
    "current_assignment_snapshots",
    "weekly_load_snapshots",
    "monthly_kpi_summaries",
]
PROJECT_SHEET_NAME = "프로젝트관리"

PROJECT_TYPE_MAP = {
    "주사업": ProjectType.MAIN,
    "부사업": ProjectType.SUB,
    "하도": ProjectType.SUBCONTRACT,
    "협력": ProjectType.PARTNER,
}
PROJECT_STATUS_MAP = {
    "제안중": ProjectStatus.PROPOSING,
    "발표완료": ProjectStatus.PRESENTED,
    "WIN": ProjectStatus.WIN,
    "LOSS": ProjectStatus.LOSS,
    "DROP": ProjectStatus.DROP,
    "수행중": ProjectStatus.RUNNING,
    "업무지원": ProjectStatus.SUPPORT,
    "완료": ProjectStatus.DONE,
}
EMPLOYMENT_STATUS_MAP = {
    "재직": EmploymentStatus.ACTIVE,
    "휴직": EmploymentStatus.LEAVE,
    "전배": EmploymentStatus.TRANSFERRED,
    "퇴직": EmploymentStatus.RETIRED,
    "대기": EmploymentStatus.WAITING,
}
BOOLEAN_TRUE = {"사용", "Y", "y", "true", "TRUE", "1", "예"}
BOOLEAN_FALSE = {"미사용", "N", "n", "false", "FALSE", "0", "아니오"}
TABLE_MODELS = {
    "personnel": Personnel,
    "project_codes": ProjectCode,
    "projects": Project,
    "project_assignments": ProjectAssignment,
    "project_logs": ProjectLog,
    "monthly_employment_mm": MonthlyEmploymentMM,
    "monthly_assignment_mm": MonthlyAssignmentMM,
    "current_assignment_snapshots": CurrentAssignmentSnapshot,
    "weekly_load_snapshots": WeeklyLoadSnapshot,
    "monthly_kpi_summaries": MonthlyKpiSummary,
}
DELETE_ORDER = [
    MonthlyAssignmentMM,
    MonthlyEmploymentMM,
    CurrentAssignmentSnapshot,
    WeeklyLoadSnapshot,
    MonthlyKpiSummary,
    ProjectLog,
    ProjectAssignment,
    Project,
    ProjectCode,
    Personnel,
]
RESTORE_INSERT_ORDER = [
    Personnel,
    ProjectCode,
    Project,
    ProjectAssignment,
    ProjectLog,
    MonthlyEmploymentMM,
    MonthlyAssignmentMM,
    CurrentAssignmentSnapshot,
    WeeklyLoadSnapshot,
    MonthlyKpiSummary,
]


@dataclass
class ValidationIssue:
    sheet: str
    row_number: int
    column: str
    input_value: str
    level: str
    message: str

    def to_dict(self) -> dict[str, object]:
        return {
            "sheet": self.sheet,
            "row_number": self.row_number,
            "column": self.column,
            "input_value": self.input_value,
            "level": self.level,
            "message": self.message,
        }


def _ensure_runtime_dirs() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    if not MANIFEST_PATH.exists():
        MANIFEST_PATH.write_text("[]", encoding="utf-8")


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _read_manifest() -> list[dict[str, Any]]:
    _ensure_runtime_dirs()
    try:
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="데이터 백업 manifest를 읽을 수 없습니다.") from exc


def _write_manifest(records: list[dict[str, Any]]) -> None:
    _ensure_runtime_dirs()
    MANIFEST_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def _append_manifest(record: dict[str, Any]) -> None:
    records = _read_manifest()
    records.insert(0, record)
    _write_manifest(records[:200])


def _table_count(session: Session, model: type[Any]) -> int:
    return int(session.scalar(select(func.count()).select_from(model)) or 0)


def _serialize_scalar(value: object) -> object:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    if isinstance(value, date):
        return value.isoformat()
    if hasattr(value, "value"):
        return getattr(value, "value")
    return value


def _serialize_table_rows(session: Session, model: type[Any]) -> list[dict[str, object]]:
    rows = session.scalars(select(model)).all()
    serialized: list[dict[str, object]] = []
    for row in rows:
        payload: dict[str, object] = {}
        for column in row.__table__.columns:
            payload[column.name] = _serialize_scalar(getattr(row, column.name))
        serialized.append(payload)
    return serialized


def _make_id(prefix: str) -> str:
    stamp = _now().strftime("%Y%m%d%H%M%S")
    return f"{prefix}{stamp}{uuid4().hex[:4].upper()}"


def _dataset_counts(session: Session) -> dict[str, int]:
    return {
        "projects": _table_count(session, Project),
        "personnel": _table_count(session, Personnel),
        "assignments": _table_count(session, ProjectAssignment),
        "monthly_mm": _table_count(session, MonthlyEmploymentMM) + _table_count(session, MonthlyAssignmentMM),
        "snapshots": _table_count(session, CurrentAssignmentSnapshot) + _table_count(session, WeeklyLoadSnapshot),
    }


def _latest_backup_at(records: list[dict[str, Any]]) -> str | None:
    for record in records:
        if record.get("backup_id") and record.get("status") == "success":
            return str(record.get("created_at"))
    return None


def overview(session: Session) -> dict[str, object]:
    records = _read_manifest()
    backups = [record for record in records if record.get("backup_id")]
    restore_history = [record for record in records if str(record.get("kind", "")).startswith("restore")]
    upload_history = [record for record in records if str(record.get("kind", "")).startswith("upload")]
    return {
        "summary": {
            **_dataset_counts(session),
            "latest_backup_at": _latest_backup_at(records),
        },
        "backups": backups[:20],
        "restore_history": restore_history[:20],
        "upload_history": upload_history[:20],
    }


def _file_sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _normalize_cell(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return None if stripped in {"", "-"} else stripped
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="minutes")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (int, float, Decimal)):
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value)
    return str(value).strip() or None


def _parse_bool(value: str | None, *, sheet: str, row_number: int, column: str, issues: list[ValidationIssue]) -> bool | None:
    if value is None:
        return None
    if value in BOOLEAN_TRUE:
        return True
    if value in BOOLEAN_FALSE:
        return False
    issues.append(ValidationIssue(sheet, row_number, column, value, "error", "지원하지 않는 사용여부 값입니다."))
    return None


def _parse_date(
    value: str | None,
    *,
    sheet: str,
    row_number: int,
    column: str,
    issues: list[ValidationIssue],
) -> date | None:
    if value is None:
        return None
    text = value.strip()
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    issues.append(ValidationIssue(sheet, row_number, column, value, "error", "날짜 형식이 올바르지 않습니다."))
    return None


def _parse_datetime(
    value: str | None,
    *,
    sheet: str,
    row_number: int,
    column: str,
    issues: list[ValidationIssue],
) -> datetime | None:
    if value is None:
        return None
    text = value.strip()
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d", "%Y.%m.%d %H:%M", "%Y.%m.%d"):
        try:
            parsed = datetime.strptime(text, fmt)
            if " " not in fmt:
                return datetime.combine(parsed.date(), datetime.min.time())
            return parsed
        except ValueError:
            continue
    issues.append(ValidationIssue(sheet, row_number, column, value, "error", "일시 형식이 올바르지 않습니다."))
    return None


def _format_amount_value(value: float) -> str:
    if value >= 100_000_000:
        return f"{value / 100_000_000:.1f}억"
    if value >= 10_000:
        return f"{value / 10_000:.0f}만"
    if float(value).is_integer():
        return f"{int(value)}"
    return f"{value:.2f}"


def _parse_single_amount(value: str) -> float:
    text = value.strip().replace(",", "")
    unit_map = {"억": 100_000_000, "천만": 10_000_000, "백만": 1_000_000, "만": 10_000}
    for unit, multiplier in unit_map.items():
        if text.endswith(unit):
            return float(text[: -len(unit)]) * multiplier
    return float(text)


def _parse_amount_text(
    value: str | None,
    *,
    row_number: int,
    issues: list[ValidationIssue],
) -> tuple[float | None, float | None, str | None]:
    if value is None:
        return None, None, None
    parts = [part.strip() for part in value.split("/")]
    if len(parts) != 2 or not parts[0] or not parts[1]:
        issues.append(ValidationIssue(PROJECT_SHEET_NAME, row_number, "사업금액", value, "error", "사업금액은 총액/당사금액 형식이어야 합니다."))
        return None, None, None
    try:
        total_amount = _parse_single_amount(parts[0])
        company_amount = _parse_single_amount(parts[1])
    except ValueError:
        issues.append(ValidationIssue(PROJECT_SHEET_NAME, row_number, "사업금액", value, "error", "사업금액 형식이 올바르지 않습니다."))
        return None, None, None
    if total_amount < 0 or company_amount < 0:
        issues.append(ValidationIssue(PROJECT_SHEET_NAME, row_number, "사업금액", value, "error", "사업금액은 음수일 수 없습니다."))
        return None, None, None
    if company_amount > total_amount:
        issues.append(ValidationIssue(PROJECT_SHEET_NAME, row_number, "사업금액", value, "error", "당사 사업금액은 총 사업금액보다 클 수 없습니다."))
        return None, None, None
    return total_amount, company_amount, f"{_format_amount_value(total_amount)}/{_format_amount_value(company_amount)}"


def _acquire_lock(session: Session, *, locked_by: str) -> None:
    locked_at = _now()
    lock = JobLock(
        job_name=DATA_BACKUP_JOB_NAME,
        locked_at=locked_at,
        locked_by=locked_by,
        expires_at=locked_at + timedelta(minutes=LOCK_EXPIRE_MINUTES),
    )
    try:
        session.add(lock)
        session.commit()
        return
    except IntegrityError:
        session.rollback()
    existing = session.get(JobLock, DATA_BACKUP_JOB_NAME)
    if existing is not None and existing.expires_at <= locked_at:
        session.execute(delete(JobLock).where(JobLock.job_name == DATA_BACKUP_JOB_NAME))
        session.commit()
        try:
            session.add(lock)
            session.commit()
            return
        except IntegrityError:
            session.rollback()
    raise HTTPException(status_code=409, detail="데이터 반영/복원 작업이 이미 실행 중입니다.")


def _release_lock(session: Session) -> None:
    session.execute(delete(JobLock).where(JobLock.job_name == DATA_BACKUP_JOB_NAME))
    session.commit()


def create_backup(session: Session, *, actor_name: str, kind: str, memo: str | None = None, source_file_name: str | None = None) -> dict[str, object]:
    _ensure_runtime_dirs()
    backup_id = _make_id("BKP")
    counts = {table_name: _table_count(session, model) for table_name, model in TABLE_MODELS.items()}
    payload = {
        "backup_id": backup_id,
        "created_at": _now().isoformat(timespec="seconds"),
        "actor_name": actor_name,
        "kind": kind,
        "memo": memo,
        "source_file_name": source_file_name,
        "tables": {table_name: _serialize_table_rows(session, model) for table_name, model in TABLE_MODELS.items()},
        "counts": counts,
        "included_tables": INCLUDED_TABLE_NAMES,
    }
    raw = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    file_hash = _file_sha256(raw)
    file_path = BACKUP_DIR / f"{backup_id}.json"
    file_path.write_bytes(raw)
    record = {
        "id": _make_id("OPR"),
        "created_at": payload["created_at"],
        "kind": kind,
        "status": "success",
        "backup_id": backup_id,
        "source_file_name": source_file_name,
        "actor_name": actor_name,
        "memo": memo,
        "counts": counts,
        "included_tables": INCLUDED_TABLE_NAMES,
        "file_name": file_path.name,
        "file_size": file_path.stat().st_size,
        "file_hash": file_hash,
    }
    _append_manifest(record)
    return record


def backup_detail(backup_id: str) -> dict[str, object]:
    path = BACKUP_DIR / f"{backup_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="백업 파일을 찾을 수 없습니다.")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="백업 파일을 읽을 수 없습니다.") from exc
    return {
        "backup_id": backup_id,
        "created_at": payload.get("created_at"),
        "actor_name": payload.get("actor_name"),
        "kind": payload.get("kind"),
        "memo": payload.get("memo"),
        "source_file_name": payload.get("source_file_name"),
        "included_tables": payload.get("included_tables", INCLUDED_TABLE_NAMES),
        "counts": payload.get("counts", {}),
        "file_name": path.name,
        "file_size": path.stat().st_size,
        "file_hash": _file_sha256(path.read_bytes()),
    }


def delete_backup(backup_id: str) -> dict[str, object]:
    _ensure_runtime_dirs()
    path = BACKUP_DIR / f"{backup_id}.json"
    records = _read_manifest()
    def _references_backup(record: dict[str, Any]) -> bool:
        return any(
            record.get(field) == backup_id
            for field in ("backup_id", "source_backup_id", "pre_backup_id")
        )

    matched_records = [record for record in records if _references_backup(record)]
    if not matched_records and not path.exists():
        raise HTTPException(status_code=404, detail="삭제할 백업 파일을 찾을 수 없습니다.")

    remaining_records = [record for record in records if not _references_backup(record)]
    if len(remaining_records) != len(records):
        _write_manifest(remaining_records)

    file_deleted = False
    if path.exists():
        path.unlink()
        file_deleted = True

    return {
        "backup_id": backup_id,
        "deleted": True,
        "manifest_removed": bool(matched_records),
        "manifest_removed_count": len(records) - len(remaining_records),
        "file_deleted": file_deleted,
    }


def _delete_dataset(session: Session) -> None:
    for model in DELETE_ORDER:
        session.execute(delete(model))
    session.flush()


def _relevant_months(personnel_rows: list[Personnel], assignment_rows: list[ProjectAssignment], today: date) -> list[tuple[int, int]]:
    months: set[tuple[int, int]] = {(today.year, today.month)}
    for person in personnel_rows:
        if person.mm_start_date:
            months.add((person.mm_start_date.year, person.mm_start_date.month))
        if person.mm_end_date:
            months.add((person.mm_end_date.year, person.mm_end_date.month))
    for assignment in assignment_rows:
        if assignment.start_date:
            months.add((assignment.start_date.year, assignment.start_date.month))
        if assignment.end_date:
            months.add((assignment.end_date.year, assignment.end_date.month))
    if not months:
        return [(today.year, today.month)]
    start = min(months)
    end = max(months)
    cursor = date(start[0], start[1], 1)
    end_date = date(end[0], end[1], 1)
    expanded: list[tuple[int, int]] = []
    while cursor <= end_date:
        expanded.append((cursor.year, cursor.month))
        next_month = cursor.month + 1
        next_year = cursor.year + (1 if next_month == 13 else 0)
        cursor = date(next_year, 1 if next_month == 13 else next_month, 1)
    return expanded


def _month_last_day(year: int, month: int) -> date:
    if month == 12:
        return date(year, 12, 31)
    return date(year, month + 1, 1) - timedelta(days=1)


def _person_employment_window(person: Personnel, year: int, month: int, today: date) -> tuple[date, date] | None:
    month_start = date(year, month, 1)
    month_end = _month_last_day(year, month)
    start = person.mm_start_date or month_start
    end = person.mm_end_date or month_end
    if person.employment_status in {EmploymentStatus.RETIRED, EmploymentStatus.TRANSFERRED} and person.mm_end_date is None:
        end = min(end, today)
    if end < month_start or start > month_end:
        return None
    return max(start, month_start), min(end, month_end)


def _assignment_overlap_window(assignment: ProjectAssignment, year: int, month: int) -> tuple[date, date] | None:
    if is_cancelled(assignment) or assignment.assignment_type == AssignmentType.UNASSIGNED:
        return None
    if assignment.start_date is None or assignment.end_date is None:
        return None
    month_start = date(year, month, 1)
    month_end = _month_last_day(year, month)
    if assignment.end_date < month_start or assignment.start_date > month_end:
        return None
    return max(assignment.start_date, month_start), min(assignment.end_date, month_end)


def _base_assignment_mm(assignment: ProjectAssignment) -> float:
    return base_assignment_mm(assignment)


def _generate_person_snapshots(session: Session, person: Personnel, today: date, active_assignments, project_by_id) -> None:
    person_assignments = operational_assignments([assignment for assignment in active_assignments if assignment.personnel_id == person.id])
    person_assignments.sort(key=representative_rank)
    current_assignments = [
        assignment
        for assignment in person_assignments
        if assignment.start_date and assignment.end_date and is_current_assignment(assignment, today)
    ]
    current_assignments.sort(key=representative_rank)
    if person.employment_status != EmploymentStatus.ACTIVE:
        current_assignments = []
        person_assignments = []
    next_assignments = [
        assignment for assignment in person_assignments if assignment.start_date and assignment.start_date > today
    ]
    next_assignments.sort(key=lambda row: row.start_date or today)
    current = current_assignments[0] if current_assignments else None
    next_assignment = next_assignments[0] if next_assignments else None
    representative_status = (
        current.assignment_type.value
        if current is not None
        else ("unassigned" if person.employment_status == EmploymentStatus.ACTIVE else EmploymentStatus(person.employment_status).value)
    )
    current_project = project_by_id.get(current.project_id) if current and current.project_id else None
    next_project = project_by_id.get(next_assignment.project_id) if next_assignment and next_assignment.project_id else None
    session.add(
        CurrentAssignmentSnapshot(
            as_of_date=today,
            personnel_id=person.id,
            representative_status=representative_status,
            project_id=current.project_id if current else None,
            project_name=current_project.name if current_project else None,
            project_code=current_project.code if current_project else None,
            assignment_id=current.id if current else None,
            current_start_date=current.start_date if current else None,
            current_end_date=current.end_date if current else None,
            next_project_id=next_assignment.project_id if next_assignment else None,
            next_project_name=next_project.name if next_project else None,
        )
    )
    week_start = today - timedelta(days=today.weekday())
    for week_offset in range(5):
        range_start = week_start + timedelta(days=week_offset * 7)
        range_end = range_start + timedelta(days=6)
        week_assignment = next(
            (
                assignment
                for assignment in person_assignments
                if assignment.start_date
                and assignment.end_date
                and assignment.start_date <= range_end
                and assignment.end_date >= range_start
            ),
            None,
        )
        week_project = project_by_id.get(week_assignment.project_id) if week_assignment and week_assignment.project_id else None
        session.add(
            WeeklyLoadSnapshot(
                as_of_date=today,
                personnel_id=person.id,
                week_offset=week_offset,
                week_label=f"{range_start.month}/{range_start.day}",
                representative_status=week_assignment.assignment_type.value if week_assignment else EmploymentStatus(person.employment_status).value if person.employment_status != EmploymentStatus.ACTIVE else "unassigned",
                project_id=week_assignment.project_id if week_assignment else None,
                project_name=week_project.name if week_project else None,
                start_date=range_start,
                end_date=range_end,
            )
        )


def _generate_derived_rows(session: Session) -> None:
    today = date.today()
    personnel_statement = select(Personnel)
    personnel_rows = session.scalars(apply_personnel_scope(personnel_statement, "pmo").where(Personnel.is_active.is_(True))).all()
    assignment_rows = session.scalars(apply_personnel_scope(
        select(ProjectAssignment).join(Personnel, ProjectAssignment.personnel_id == Personnel.id), "pmo",
    )).all()
    months = _relevant_months(personnel_rows, assignment_rows, today)

    for person in personnel_rows:
        for year, month in months:
            window = _person_employment_window(person, year, month, today)
            if window is None:
                continue
            summary = month_workday_summary(session, year=year, month=month)
            workdays = int(summary["workdays"])
            employed_workdays = business_days_between(session, window[0], window[1])
            employment_mm = round((employed_workdays / workdays) if workdays else 0.0, 4)
            session.add(
                MonthlyEmploymentMM(
                    personnel_id=person.id,
                    year=year,
                    month=month,
                    workdays=workdays,
                    employed_workdays=employed_workdays,
                    employment_mm=employment_mm,
                )
            )

    for assignment in assignment_rows:
        if assignment.personnel_id is None or assignment.project_id is None:
            continue
        for year, month in months:
            window = _assignment_overlap_window(assignment, year, month)
            if window is None:
                continue
            summary = month_workday_summary(session, year=year, month=month)
            month_workdays = int(summary["workdays"])
            overlap_days = business_days_between(session, window[0], window[1])
            ratio = (overlap_days / month_workdays) if month_workdays else 0.0
            base_mm = _base_assignment_mm(assignment)
            assignment_mm = round(base_mm * ratio, 4)
            certainty_rate = float(assignment.certainty_rate) if assignment.certainty_rate is not None else None
            weighted_mm = assignment_mm * ((100.0 if certainty_rate is None else certainty_rate) / 100.0)
            session.add(
                MonthlyAssignmentMM(
                    assignment_id=assignment.id,
                    project_id=assignment.project_id,
                    personnel_id=assignment.personnel_id,
                    year=year,
                    month=month,
                    assignment_mm=assignment_mm,
                    certainty_rate=certainty_rate,
                    weighted_mm=round(weighted_mm, 4),
                    assignment_type=assignment.assignment_type,
                )
            )

    active_assignments = session.scalars(select(ProjectAssignment)).all()
    project_by_id = {project.id: project for project in session.scalars(select(Project)).all()}
    for person in personnel_rows:
        _generate_person_snapshots(session, person, today, active_assignments, project_by_id)

    session.flush()
    for year, month in months:
        session.add(MonthlyKpiSummary(
            year=year, month=month, organization_name="PMO본부", source_snapshot_date=today,
            **pmo_monthly_kpi_values(session, year, month),
        ))


def _load_backup_payload(backup_id: str) -> dict[str, Any]:
    path = BACKUP_DIR / f"{backup_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="복원할 백업을 찾을 수 없습니다.")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="백업 파일이 손상되었습니다.") from exc


def _deserialize_scalar(value: Any, column: Any) -> Any:
    if value is None:
        return None
    column_type = column.type
    if isinstance(column_type, DateTime):
        return datetime.fromisoformat(value)
    if isinstance(column_type, Date):
        return date.fromisoformat(value)
    if isinstance(column_type, Enum) and getattr(column_type, "enum_class", None) is not None:
        return column_type.enum_class(value)
    if isinstance(column_type, Numeric):
        return Decimal(str(value))
    if isinstance(column_type, Integer):
        return int(value)
    return value


def _deserialize_row(model: type[Any], payload: dict[str, Any]) -> dict[str, Any]:
    next_payload: dict[str, Any] = {}
    for column in model.__table__.columns:
        if column.name not in payload:
            continue
        next_payload[column.name] = _deserialize_scalar(payload[column.name], column)
    return next_payload


def _restore_table(session: Session, model: type[Any], rows: list[dict[str, Any]]) -> None:
    for payload in rows:
        session.add(model(**_deserialize_row(model, payload)))
    session.flush()


def restore_backup(session: Session, *, backup_id: str, memo: str | None, user: User) -> dict[str, object]:
    require_capabilities(session, user, Capability.BACKUP_RESTORE)
    backup_payload = _load_backup_payload(backup_id)
    # Missing legacy type must not overwrite an already established UUID's type.
    current_types = dict(session.execute(select(Personnel.id, Personnel.personnel_type)).all())
    for row in backup_payload.get("tables", {}).get("personnel", []):
        if "personnel_type" not in row:
            existing_type = current_types.get(row.get("id"))
            role = session.get(Role, row.get("role_id")) if row.get("role_id") else None
            try:
                row["personnel_type"] = (existing_type or classify_legacy_personnel(
                    row.get("group_name"), role.code if role else None, row.get("role_name"),
                )).value
            except ValueError as exc:
                raise HTTPException(status_code=409, detail=str(exc)) from exc
        if row.get("personnel_type") not in {kind.value for kind in PersonnelType}:
            raise HTTPException(status_code=409, detail="백업의 인력 유형이 유효하지 않습니다.")
    actor_name = user.name or "관리자"
    current_backup = create_backup(session, actor_name=actor_name, kind="restore_before_backup", memo=memo)
    role_ids = {role.id for role in session.scalars(select(Role).where(Role.is_active.is_(True))).all()}
    for row in backup_payload.get("tables", {}).get("personnel", []):
        role_id = row.get("role_id")
        if role_id and role_id not in role_ids:
            raise HTTPException(status_code=409, detail="백업 데이터가 현재 활성 역할 기준값과 맞지 않아 복원할 수 없습니다.")
    _acquire_lock(session, locked_by=actor_name)
    try:
        _delete_dataset(session)
        for model in RESTORE_INSERT_ORDER:
            table_name = model.__tablename__
            _restore_table(session, model, backup_payload.get("tables", {}).get(table_name, []))
        session.commit()
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        _append_manifest(
            {
                "id": _make_id("OPR"),
                "created_at": _now().isoformat(timespec="seconds"),
                "kind": "restore_failed",
                "status": "failed",
                "backup_id": None,
                "actor_name": actor_name,
                "memo": memo,
                "source_backup_id": backup_id,
                "message": str(exc),
            }
        )
        raise
    finally:
        _release_lock(session)
    record = {
        "id": _make_id("OPR"),
        "created_at": _now().isoformat(timespec="seconds"),
        "kind": "restore_complete",
        "status": "success",
        "backup_id": None,
        "actor_name": actor_name,
        "memo": memo,
        "source_backup_id": backup_id,
        "counts": _dataset_counts(session),
        "pre_backup_id": current_backup["backup_id"],
    }
    _append_manifest(record)
    return record
