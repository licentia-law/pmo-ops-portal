"""Transactional deployment editing, with prospective projections and audit logs."""
from datetime import date
import json

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError, OperationalError

from app.domain.assignments import ROLE_TYPES, base_assignment_mm, is_cancelled, is_current_assignment, person_can_be_deployed
from app.domain.capabilities import require_capabilities
from app.domain.people import is_pmo_personnel
from app.domain.personnel import user_display_name
from app.domain.holidays import business_days_between, month_workday_summary
from app.enums import AssignmentStatus, AssignmentType, Capability, ProjectLogStatus
from app.models.core import ProjectAssignment, Personnel, Project, Holiday, MonthlyAssignmentMM, ProjectLog
from app.schemas.assignments import AssignmentRead
from app.services import data_backup as backup
from app.services.excel_common import fingerprint, scalar
from app.services.personnel_master import refresh_personnel_projections, refresh_open_kpi

EDIT_FIELDS = ("assignment_type", "assignment_role", "assignment_status", "start_date", "end_date", "monthly_base_mm", "certainty_rate", "onsite_type", "is_primary", "sequence_no", "note")
PROJECTION_FIELDS = {"assignment_type", "assignment_status", "start_date", "end_date", "monthly_base_mm", "certainty_rate", "is_primary"}
VERSION_MODELS = (*backup.TABLE_MODELS.values(), Holiday)


def version(session):
    return fingerprint(session, VERSION_MODELS)


def serialize_assignment(session, row):
    today = date.today()
    payload = AssignmentRead.model_validate(row).model_dump(mode="json")
    for field in ("monthly_base_mm", "certainty_rate"):
        payload[field] = float(getattr(row, field)) if getattr(row, field) is not None else None
    person, project = row.personnel, row.project
    ledger = session.scalars(select(MonthlyAssignmentMM).where(MonthlyAssignmentMM.assignment_id == row.id)).all()
    payload.update(
        personnel_name=person.name if person else "참조 인력 없음",
        personnel_type=person.personnel_type.value if person else None,
        personnel_active=person.is_active if person else False,
        project_name=project.name if project else "참조 프로젝트 없음",
        project_code=project.code if project else None,
        effective_base_mm=base_assignment_mm(row),
        legacy_mm_input=row.monthly_base_mm is None,
        current_month_mm=round(sum(float(r.assignment_mm) for r in ledger if (r.year, r.month) == (today.year, today.month)), 4),
        total_recorded_mm=round(sum(float(r.assignment_mm) for r in ledger), 4),
        is_current=is_current_assignment(row, today) and bool(person and person.is_active),
    )
    return payload


def _values(session, payload, assignment_id=None, *, historical_import=False):
    current = session.get(ProjectAssignment, assignment_id) if assignment_id else None
    if assignment_id and current is None:
        raise HTTPException(status_code=404, detail="배정을 찾을 수 없습니다.")
    supplied = payload.model_dump(exclude_unset=True)
    supplied = {k: v for k, v in supplied.items() if k in EDIT_FIELDS or k in {"project_id", "personnel_id"}}
    if current:
        values = {field: getattr(current, field) for field in EDIT_FIELDS}
        values.update(project_id=current.project_id, personnel_id=current.personnel_id)
        values.update(supplied)
    else:
        values = {k: v for k, v in payload.model_dump().items() if k in EDIT_FIELDS or k in {"project_id", "personnel_id"}}
    geometry_changed = current is None or any(field in PROJECTION_FIELDS and getattr(current, field) != value for field, value in supplied.items())
    for field in ("assignment_type", "assignment_status", "start_date", "end_date", "is_primary", "sequence_no"):
        if values.get(field) is None:
            # Preserve null legacy status/sequence only when not newly supplied.
            if current and field not in supplied and field in {"assignment_status", "sequence_no"}:
                continue
            if current and not geometry_changed and field not in supplied and field in {"start_date", "end_date"}:
                continue
            raise HTTPException(status_code=400, detail=f"배정 필수값을 비울 수 없습니다: {field}")
    if "monthly_base_mm" in supplied and supplied["monthly_base_mm"] is None:
        raise HTTPException(status_code=400, detail="월 기준 MM은 비울 수 없습니다.")
    if values["start_date"] and values["end_date"] and values["start_date"] > values["end_date"]:
        raise HTTPException(status_code=400, detail="종료일은 시작일보다 빠를 수 없습니다.")
    if values["start_date"] and values["end_date"] and values["end_date"].year - values["start_date"].year > 100:
        raise HTTPException(status_code=400, detail="배정 기간은 100년 이내로 입력해 주세요.")
    project = session.get(Project, values["project_id"])
    person = session.get(Personnel, values["personnel_id"])
    if project is None or person is None:
        raise HTTPException(status_code=404, detail="프로젝트 또는 인력 참조가 유효하지 않습니다.")
    if geometry_changed and values["assignment_status"] not in (AssignmentStatus.CANCELLED, AssignmentStatus.ENDED):
        if project.project_code is None or not project.project_code.is_active:
            raise HTTPException(status_code=400, detail="비활성 프로젝트에 운영 배정을 등록/변경할 수 없습니다.")
        if not person_can_be_deployed(person):
            raise HTTPException(status_code=400, detail="비활성·휴직·전배·퇴직 인력은 운영 배정할 수 없습니다. 인력 상태를 확인해 주세요.")
        if is_pmo_personnel(person) and person.mm_start_date is None:
            raise HTTPException(status_code=400, detail="PMO 인력의 MM 시작일을 먼저 설정해 주세요.")
    today = date.today()
    if geometry_changed and values["end_date"] and values["end_date"].year > today.year + 100:
        raise HTTPException(status_code=400, detail="현재 기준 100년 이내의 배정만 계산할 수 있습니다.")
    if values["assignment_status"] == AssignmentStatus.CANCELLED:
        if current is None and not historical_import:
            raise HTTPException(status_code=400, detail="취소는 기존 예정/진행 전 배정에서 처리해 주세요.")
        if current and current.assignment_status not in (AssignmentStatus.PLANNED, AssignmentStatus.CANCELLED) and (not current.start_date or current.start_date <= today):
            raise HTTPException(status_code=400, detail="진행 중·종료 배정은 취소할 수 없습니다. 실제 종료일과 종료 상태를 입력해 주세요.")
    if current and current.assignment_status == AssignmentStatus.CANCELLED and values["assignment_status"] != AssignmentStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="취소 이력은 다시 활성화하지 않습니다. 새 배정을 등록해 주세요.")
    if values["assignment_status"] == AssignmentStatus.ENDED and values["end_date"] and values["end_date"] > today and (current is None or "end_date" in supplied or "assignment_status" in supplied):
        raise HTTPException(status_code=400, detail="종료 처리에는 본일까지의 실제 종료일이 필요합니다.")
    if values["assignment_role"] is not None and (current is None or "assignment_role" in supplied or "assignment_type" in supplied) and ROLE_TYPES[values["assignment_role"]] != values["assignment_type"]:
        raise HTTPException(status_code=400, detail="배정 유형과 프로젝트 역할이 일치하지 않습니다.")
    if values["assignment_type"] == AssignmentType.UNASSIGNED and (values["monthly_base_mm"] or 0) != 0:
        raise HTTPException(status_code=400, detail="미투입 배정의 월 기준 MM은 0이어야 합니다.")
    if values.get("note") is not None:
        values["note"] = values["note"].strip() or None
    warnings = []
    if (current and current.assignment_status == AssignmentStatus.ENDED) or (values["end_date"] and values["end_date"] < today):
        warnings.append("최초 전환: 새 배정의 과거 MM을 생성하며 기존 과거 원장·스냅샷·KPI는 보존합니다." if historical_import else "종료/과거 배정입니다. 과거 MM·스냅샷·KPI를 소급 변경하지 않습니다.")
    if current and current.monthly_base_mm is None and "monthly_base_mm" not in supplied:
        warnings.append("기존 MM의 의미를 재분류하지 않고 현재 MM→총 MM→MM의 기존 계산 기준을 유지합니다.")
    overlaps = []
    duplicate_changed = geometry_changed or current is not None and "assignment_role" in supplied and current.assignment_role != supplied["assignment_role"]
    if values["assignment_status"] != AssignmentStatus.CANCELLED and values["assignment_type"] != AssignmentType.UNASSIGNED and values["start_date"] and values["end_date"]:
        others = session.scalars(select(ProjectAssignment).where(ProjectAssignment.personnel_id == person.id, ProjectAssignment.id != (assignment_id or ""))).all()
        for other in others:
            if is_cancelled(other) or other.assignment_type == AssignmentType.UNASSIGNED or not other.start_date or not other.end_date:
                continue
            if other.start_date > values["end_date"] or other.end_date < values["start_date"]:
                continue
            duplicate = other.project_id == project.id and other.assignment_type == values["assignment_type"] and other.assignment_role == values["assignment_role"] and other.start_date == values["start_date"] and other.end_date == values["end_date"]
            if duplicate and duplicate_changed:
                raise HTTPException(status_code=409, detail="같은 프로젝트·인력·유형·역할·기간의 완전 중복 배정입니다.")
            overlaps.append({"id": other.id, "project_code": other.project.code if other.project else "-", "start_date": scalar(other.start_date), "end_date": scalar(other.end_date), "is_primary": other.is_primary})
        if overlaps:
            warnings.append(f"다른 배정 {len(overlaps)}건과 기간이 겹칩니다. 중복 투입을 확인한 후 저장해 주세요.")
        if values["is_primary"] and any(row["is_primary"] for row in overlaps):
            warnings.append("겹치는 대표 배정이 있습니다. 기존 배정을 자동 해제하지 않으며 대표 우선순위로 현재 표시를 결정합니다.")
    return current, values, warnings, overlaps, geometry_changed


def preflight(session, user, payload, assignment_id=None):
    require_capabilities(session, user, Capability.ASSIGNMENT_MANAGE)
    before = version(session)
    current, values, warnings, overlaps, _ = _values(session, payload, assignment_id)
    if version(session) != before:
        raise HTTPException(status_code=409, detail="검증 중 데이터가 변경되었습니다. 다시 확인해 주세요.")
    changes = [{"field": field, "before": scalar(getattr(current, field)) if current else None, "after": scalar(value)} for field, value in values.items() if current is None or scalar(getattr(current, field)) != scalar(value)]
    return {"version": before, "warnings": warnings, "overlaps": overlaps, "changes": changes}


def refresh_assignment_mm(session, assignment, *, historical_import=False):
    today = date.today()
    records = session.scalars(select(MonthlyAssignmentMM).where(MonthlyAssignmentMM.assignment_id == assignment.id)).all()
    existing = {}
    for row in records:
        key = (row.year, row.month)
        if key in existing:
            raise HTTPException(status_code=409, detail="같은 배정/월의 투입 MM이 중복되어 먼저 확인이 필요합니다.")
        existing[key] = row
    monthly = dict(assignment.monthly_mm or {})
    json_months = []
    for key in monthly:
        try:
            parsed = date.fromisoformat(f"{key}-01")
            json_months.append((parsed.year, parsed.month))
        except (ValueError, TypeError):
            continue  # Unrecognised legacy keys are preserved, not interpreted.
    last = max([(today.year, 12), (assignment.end_date.year, assignment.end_date.month), *existing.keys(), *json_months])
    if last[0] > today.year + 100:
        raise HTTPException(status_code=409, detail="100년을 초과한 미래 MM 데이터가 있어 원장을 먼저 확인해야 합니다.")
    year, month = (assignment.start_date.year, assignment.start_date.month) if historical_import else (today.year, today.month)
    while (year, month) <= last:
        window = backup._assignment_overlap_window(assignment, year, month)
        workdays = int(month_workday_summary(session, year=year, month=month)["workdays"])
        valid = assignment.personnel is not None and (historical_import and (year, month) < (today.year, today.month) or person_can_be_deployed(assignment.personnel))
        mm = round(base_assignment_mm(assignment) * business_days_between(session, *window) / workdays, 4) if window and workdays and valid else 0.0
        rate = float(assignment.certainty_rate) if assignment.certainty_rate is not None else 100.0
        row = existing.get((year, month)) or MonthlyAssignmentMM(assignment_id=assignment.id, year=year, month=month)
        row.project_id, row.personnel_id = assignment.project_id, assignment.personnel_id
        row.assignment_type, row.certainty_rate = assignment.assignment_type, assignment.certainty_rate
        row.assignment_mm, row.weighted_mm = mm, round(mm * rate / 100, 4)
        session.add(row)
        monthly[f"{year:04}-{month:02}"] = mm
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
    assignment.monthly_mm = monthly
    return last


def save_assignment(session, user, payload, assignment_id=None):
    require_capabilities(session, user, Capability.ASSIGNMENT_MANAGE)
    if not payload.expected_version:
        raise HTTPException(status_code=409, detail="저장 전에 배정을 검증해 주세요.")
    backup._acquire_lock(session, locked_by=user.name)
    try:
        if session.get_bind().dialect.name == "sqlite":
            session.connection().exec_driver_sql("BEGIN IMMEDIATE")
        else:
            for model in VERSION_MODELS:
                session.scalars(select(model).order_by(model.id).with_for_update()).all()
        require_capabilities(session, user, Capability.ASSIGNMENT_MANAGE)
        if version(session) != payload.expected_version:
            raise HTTPException(status_code=409, detail="검증 후 데이터가 변경되었습니다. 다시 확인해 주세요.")
        current, values, warnings, _, projection_changed = _values(session, payload, assignment_id)
        if warnings and not payload.acknowledge_warnings:
            raise HTTPException(status_code=409, detail="주의사항을 확인한 후 저장해 주세요: " + " / ".join(warnings))
        before = {field: scalar(getattr(current, field)) for field in EDIT_FIELDS} if current else None
        if current and all(scalar(getattr(current, field)) == scalar(value) for field, value in values.items()):
            return {"assignment": serialize_assignment(session, current), "message": "변경 내용이 없습니다."}
        row = current or ProjectAssignment(project_id=values["project_id"], personnel_id=values["personnel_id"])
        for field in EDIT_FIELDS:
            setattr(row, field, values[field])
        session.add(row)
        session.flush()
        if projection_changed:
            horizon = refresh_assignment_mm(session, row)
            refresh_personnel_projections(session, row.personnel, employment=False)
            refresh_open_kpi(session, through=horizon)
        action = "등록" if current is None else "취소" if row.assignment_status == AssignmentStatus.CANCELLED and (before or {}).get("assignment_status") != AssignmentStatus.CANCELLED else "수정"
        actor = user_display_name(session, user)
        detail = {"assignment_id": row.id, "personnel_id": row.personnel_id, "before": before, "after": {field: scalar(getattr(row, field)) for field in EDIT_FIELDS}}
        session.add(ProjectLog(project_id=row.project_id, log_status=ProjectLogStatus.MEMO, logged_at=backup._now(), author_name=actor, updated_by_name=actor, content=f"투입 배정 {action}: {row.personnel.name}\n" + json.dumps(detail, ensure_ascii=False)))
        session.flush()
        row.project.recent_activity_at = session.scalar(select(func.max(ProjectLog.logged_at)).where(ProjectLog.project_id == row.project_id))
        session.commit()
        return {"assignment": serialize_assignment(session, row), "message": f"배정 {action}을 완료했습니다."}
    except (IntegrityError, OperationalError) as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="배정 반영 중 충돌이 발생해 롤백했습니다. 다시 확인해 주세요.") from exc
    except Exception:
        session.rollback()
        raise
    finally:
        backup._release_lock(session)
