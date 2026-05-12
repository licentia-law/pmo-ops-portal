from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter
from sqlalchemy import desc, func, select

from app.api.common import envelope
from app.api.deps import DbSession
from app.enums import ProjectStatus, ProjectType
from app.models.core import (
    CurrentAssignmentSnapshot,
    MonthlyKpiSummary,
    Personnel,
    Project,
    ProjectAssignment,
    ProjectCode,
    ProjectLog,
    User,
)

router = APIRouter()

PROJECT_TYPE_LABELS = {
    ProjectType.MAIN: "주사업",
    ProjectType.SUB: "부사업",
    ProjectType.SUBCONTRACT: "하도",
    ProjectType.PARTNER: "협력",
}

STATUS_LABELS = {
    ProjectStatus.PROPOSING: "제안중",
    ProjectStatus.PRESENTED: "발표완료",
    ProjectStatus.WIN: "WIN",
    ProjectStatus.LOSS: "LOSS",
    ProjectStatus.DROP: "DROP",
    ProjectStatus.RUNNING: "수행중",
    ProjectStatus.SUPPORT: "업무지원",
    ProjectStatus.DONE: "완료",
}

PROPOSAL_STATUSES = {ProjectStatus.PROPOSING, ProjectStatus.PRESENTED}
RUNNING_STATUSES = {ProjectStatus.RUNNING, ProjectStatus.SUPPORT}
CLOSED_STATUSES = {ProjectStatus.WIN, ProjectStatus.LOSS, ProjectStatus.DROP, ProjectStatus.DONE}


@router.get("/home")
def home_screen(session: DbSession) -> dict[str, object]:
    as_of = _latest_snapshot_date(session)
    kpi = _latest_kpi(session)
    prev_kpi = _previous_kpi(session, kpi)
    snapshot_counts = _snapshot_counts(session, as_of)

    return envelope({
        "meta": _meta(session, as_of),
        "hero": {
            "title": "PMO 업무수행 관리시스템",
            "subtitle": "업무 수행 현황을 빠르게 확인하고, 주요 화면으로 이동하세요.",
        },
        "quickLinks": [
            {"id": "execution", "icon": "execution", "tone": "blue", "title": "업무수행현황", "desc": "프로젝트별\n업무 수행 현황 확인", "href": "/projects/operations"},
            {"id": "code", "icon": "folder", "tone": "green", "title": "프로젝트코드", "desc": "프로젝트 등록 및\n코드 관리", "href": "/projects/codes"},
            {"id": "people", "icon": "users", "tone": "purple", "title": "인력재직현황", "desc": "재직 인력 및\n월별 MM 관리", "href": "/people/employment"},
            {"id": "kpi", "icon": "report", "tone": "amber", "title": "KPI 보고서", "desc": "주간·월별\n가동률·가득률 보고서", "href": "/reports/monthly"},
        ],
        "kpis": _dashboard_kpis(snapshot_counts, kpi, prev_kpi),
        "recentProjects": {"rows": [_project_row(project) for project in _recent_projects(session, 8)]},
        "monthSummary": _month_summary(session, kpi, prev_kpi),
    })


@router.get("/dashboard")
def dashboard_screen(session: DbSession) -> dict[str, object]:
    as_of = _latest_snapshot_date(session)
    kpi = _latest_kpi(session)
    prev_kpi = _previous_kpi(session, kpi)
    snapshot_counts = _snapshot_counts(session, as_of)

    return envelope({
        "_invariants": [
            "가동률 = (수행 + 제안) / 현재 인원",
            "가득률 = 수행 / 현재 인원",
            "팀 합계 = 현재 스냅샷 합계",
        ],
        "meta": _meta(session, as_of),
        "kpis": _dashboard_kpis(snapshot_counts, kpi, prev_kpi),
        "trend": _kpi_trend(session),
        "teamHeadcount": _team_headcount(session, as_of),
        "teamUtilization": _team_utilization(session, as_of),
    })


@router.get("/execution")
def execution_screen(session: DbSession) -> dict[str, object]:
    projects = session.scalars(select(Project).order_by(desc(Project.recent_activity_at), Project.code)).all()
    rows = [_execution_row(project) for project in projects]
    counts = Counter(project.status for project in projects)

    return envelope({
        "meta": _meta(session, _latest_snapshot_date(session)),
        "summary": [
            {"id": "all", "label": "전체 프로젝트", "value": len(projects), "unit": "건", "tone": "blue", "icon": "folder", "hint": "등록된 전체 프로젝트"},
            {"id": "proposal", "label": "제안 단계", "value": sum(counts[s] for s in PROPOSAL_STATUSES), "unit": "건", "tone": "purple", "icon": "execution", "hint": f"제안중 {counts[ProjectStatus.PROPOSING]} + 발표완료 {counts[ProjectStatus.PRESENTED]}"},
            {"id": "running", "label": "수행 단계", "value": sum(counts[s] for s in RUNNING_STATUSES), "unit": "건", "tone": "green", "icon": "play", "hint": f"수행중 {counts[ProjectStatus.RUNNING]} + 업무지원 {counts[ProjectStatus.SUPPORT]}"},
            {"id": "closed", "label": "종료", "value": sum(counts[s] for s in CLOSED_STATUSES), "unit": "건", "tone": "amber", "icon": "check", "breakdown": [
                {"code": "win", "label": "WIN", "value": counts[ProjectStatus.WIN]},
                {"code": "loss", "label": "LOSS", "value": counts[ProjectStatus.LOSS]},
                {"code": "drop", "label": "DROP", "value": counts[ProjectStatus.DROP]},
                {"code": "done", "label": "완료", "value": counts[ProjectStatus.DONE]},
            ]},
        ],
        "filters": _execution_filters(projects),
        "rows": rows,
        "selectedRow": _execution_detail(_representative_project(session) or projects[0]),
        "pagination": {"totalCount": len(rows), "pageSize": 20, "currentPage": 1, "totalPages": max(1, (len(rows) + 19) // 20)},
    })


@router.get("/code")
def code_screen(session: DbSession) -> dict[str, object]:
    codes = session.scalars(select(ProjectCode).order_by(ProjectCode.code)).all()
    counts = Counter(code.status for code in codes)
    status_order = [
        ProjectStatus.PROPOSING,
        ProjectStatus.PRESENTED,
        ProjectStatus.WIN,
        ProjectStatus.LOSS,
        ProjectStatus.DROP,
        ProjectStatus.RUNNING,
        ProjectStatus.SUPPORT,
        ProjectStatus.DONE,
    ]

    return envelope({
        "meta": _meta(session, _latest_snapshot_date(session)),
        "summary": [
            {"id": status.value, "code": status.value, "label": STATUS_LABELS[status], "value": counts[status], "unit": "건"}
            for status in status_order
        ],
        "rows": [_code_row(code) for code in codes],
    })


@router.get("/project-detail")
def project_detail_screen(session: DbSession, project_id: str | None = None, code: str | None = None) -> dict[str, object]:
    project = _find_project(session, project_id, code)
    assignments = session.scalars(
        select(ProjectAssignment).where(ProjectAssignment.project_id == project.id).order_by(ProjectAssignment.sequence_no)
    ).all()
    logs = session.scalars(
        select(ProjectLog).where(ProjectLog.project_id == project.id).order_by(desc(ProjectLog.logged_at)).limit(6)
    ).all()

    return envelope({
        "meta": _meta(session, _latest_snapshot_date(session)),
        "project": _project_detail_header(project),
        "schedule": {"items": _schedule_items(project)},
        "kpi": _project_kpi(project, assignments),
        "assignments": [_assignment_row(assignment) for assignment in assignments],
        "logs": [_project_recent_log(log) for log in logs],
    })


@router.get("/history")
def history_screen(session: DbSession) -> dict[str, object]:
    logs = session.scalars(select(ProjectLog).join(Project, isouter=True).order_by(desc(ProjectLog.logged_at)).limit(10)).all()
    total = session.scalar(select(func.count()).select_from(ProjectLog)) or 0
    seven_days_ago = (_latest_log_at(session) or datetime.utcnow()) - timedelta(days=7)
    recent_count = session.scalar(select(func.count()).select_from(ProjectLog).where(ProjectLog.logged_at >= seven_days_ago)) or 0
    status_change_count = session.scalar(
        select(func.count()).select_from(ProjectLog).where(ProjectLog.logged_at >= seven_days_ago, ProjectLog.previous_status.is_not(None))
    ) or 0

    return envelope({
        "meta": _meta(session, _latest_snapshot_date(session)),
        "filters": _history_filters(session),
        "summary": [
            {"id": "total", "label": "전체 이력", "icon": "report", "tone": "blue", "value": total, "unit": "건", "footer": "누적 등록 건수"},
            {"id": "newWeek", "label": "최근 7일 등록", "icon": "calendar", "tone": "green", "value": recent_count, "unit": "건", "footer": "최근 7일 등록된 이력"},
            {"id": "stChg", "label": "최근 7일 상태 변경", "icon": "exchange", "tone": "purple", "value": status_change_count, "unit": "건", "footer": "최근 7일 변경 건수"},
            {"id": "activePrj", "label": "활성 프로젝트", "icon": "briefcase", "tone": "amber", "value": _active_project_count(session), "unit": "건", "footer": "이력 발생 프로젝트"},
        ],
        "logs": [_history_log(log, idx + 1) for idx, log in enumerate(logs)],
        "byProject": _history_by_project(session),
        "recentStatusChanges": _recent_status_changes(session),
        "pagination": {"totalCount": total, "pageSize": 10, "currentPage": 1, "totalPages": max(1, (total + 9) // 10)},
    })


def _meta(session: DbSession, as_of: date | None) -> dict[str, Any]:
    user = session.scalar(select(User).where(User.permission == "admin").order_by(User.name)) or session.scalar(select(User).order_by(User.name))
    return {
        "asOf": _date(as_of),
        "user": {"name": user.name if user else "김PMO 책임", "team": user.team_name if user else "PMO본부", "role": "관리자"},
        "notifications": 3,
    }


def _latest_snapshot_date(session: DbSession) -> date | None:
    return session.scalar(select(func.max(CurrentAssignmentSnapshot.as_of_date)))


def _latest_kpi(session: DbSession) -> MonthlyKpiSummary | None:
    return session.scalar(
        select(MonthlyKpiSummary)
        .where(MonthlyKpiSummary.organization_name == "PMO본부")
        .order_by(desc(MonthlyKpiSummary.year), desc(MonthlyKpiSummary.month))
    )


def _previous_kpi(session: DbSession, kpi: MonthlyKpiSummary | None) -> MonthlyKpiSummary | None:
    if kpi is None:
        return None
    return session.scalar(
        select(MonthlyKpiSummary)
        .where(
            MonthlyKpiSummary.organization_name == kpi.organization_name,
            (MonthlyKpiSummary.year * 100 + MonthlyKpiSummary.month) < (kpi.year * 100 + kpi.month),
        )
        .order_by(desc(MonthlyKpiSummary.year), desc(MonthlyKpiSummary.month))
    )


def _snapshot_counts(session: DbSession, as_of: date | None) -> Counter[str]:
    statement = select(CurrentAssignmentSnapshot.representative_status)
    if as_of:
        statement = statement.where(CurrentAssignmentSnapshot.as_of_date == as_of)
    return Counter(session.scalars(statement).all())


def _dashboard_kpis(counts: Counter[str], kpi: MonthlyKpiSummary | None, prev: MonthlyKpiSummary | None) -> list[dict[str, Any]]:
    headcount = sum(counts.values())
    running = counts["running"]
    proposing = counts["proposing"]
    idle = counts["waiting"]
    utilization = _num(kpi.utilization_rate if kpi else 0)
    contract = _num(kpi.contract_rate if kpi else 0)
    prev_utilization = _num(prev.utilization_rate if prev else utilization)
    prev_contract = _num(prev.contract_rate if prev else contract)
    return [
        {"id": "headcount", "label": "현재 인원", "icon": "users", "tone": "blue", "value": headcount, "unit": "명", "delta": {"dir": "up", "abs": "1명"}},
        {"id": "running", "label": "수행 인원", "icon": "users", "tone": "green", "value": running, "unit": "명", "delta": {"dir": "up", "abs": "1명"}},
        {"id": "proposing", "label": "제안 인원", "icon": "users", "tone": "purple", "value": proposing, "unit": "명", "delta": {"dir": "up", "abs": "1명"}},
        {"id": "idle", "label": "대기 인원", "icon": "clock", "tone": "amber", "value": idle, "unit": "명", "delta": {"dir": "down", "abs": "1명"}},
        {"id": "utilization", "label": "가동률", "donut": True, "color": "brand", "value": utilization, "unit": "%", "delta": _delta(utilization - prev_utilization, "%p")},
        {"id": "contract", "label": "가득률", "donut": True, "color": "info", "value": contract, "unit": "%", "delta": _delta(contract - prev_contract, "%p")},
    ]


def _kpi_trend(session: DbSession) -> dict[str, list[Any]]:
    rows = list(reversed(session.scalars(
        select(MonthlyKpiSummary)
        .where(MonthlyKpiSummary.organization_name == "PMO본부")
        .order_by(desc(MonthlyKpiSummary.year), desc(MonthlyKpiSummary.month))
        .limit(6)
    ).all()))
    return {
        "months": [f"{row.year:04d}-{row.month:02d}" for row in rows],
        "utilization": [_num(row.utilization_rate) for row in rows],
        "contractRate": [_num(row.contract_rate) for row in rows],
    }


def _team_headcount(session: DbSession, as_of: date | None) -> list[dict[str, Any]]:
    statement = select(CurrentAssignmentSnapshot, Personnel).join(Personnel, CurrentAssignmentSnapshot.personnel_id == Personnel.id)
    if as_of:
        statement = statement.where(CurrentAssignmentSnapshot.as_of_date == as_of)
    grouped: dict[str, Counter[str]] = defaultdict(Counter)
    for snapshot, person in session.execute(statement).all():
        grouped[person.team_name or "미지정"][snapshot.representative_status] += 1
    return [
        {"team": team, "total": sum(counts.values()), "running": counts["running"], "proposing": counts["proposing"], "idle": counts["waiting"]}
        for team, counts in sorted(grouped.items())
    ]


def _team_utilization(session: DbSession, as_of: date | None) -> list[dict[str, Any]]:
    rows = _team_headcount(session, as_of)
    for row in rows:
        total = row["total"] or 1
        row["headcount"] = row["total"]
        row["utilization"] = round(((row["running"] + row["proposing"]) / total) * 100, 1)
        row["contractRate"] = round((row["running"] / total) * 100, 1)
    return rows


def _recent_projects(session: DbSession, limit: int) -> list[Project]:
    return session.scalars(select(Project).order_by(desc(Project.recent_activity_at), Project.code).limit(limit)).all()


def _project_row(project: Project) -> dict[str, Any]:
    return {
        "code": project.code,
        "name": project.name,
        "businessType": PROJECT_TYPE_LABELS[project.project_type],
        "status": project.status.value,
        "updatedAt": _datetime(project.recent_activity_at or project.updated_at),
        "updatedBy": project.pm_name or project.support_lead or "관리자",
    }


def _month_summary(session: DbSession, kpi: MonthlyKpiSummary | None, prev: MonthlyKpiSummary | None) -> dict[str, Any]:
    month = f"{kpi.year:04d}-{kpi.month:02d}" if kpi else ""
    utilization = _num(kpi.utilization_rate if kpi else 0)
    contract = _num(kpi.contract_rate if kpi else 0)
    prev_utilization = _num(prev.utilization_rate if prev else utilization)
    prev_contract = _num(prev.contract_rate if prev else contract)
    new_projects = session.scalar(select(func.count()).select_from(Project).where(Project.start_date >= date(2026, 5, 1))) or 0
    ending_projects = session.scalar(select(func.count()).select_from(Project).where(Project.end_date <= date(2026, 5, 31), Project.end_date >= date(2026, 5, 1))) or 0
    return {
        "month": month,
        "rows": [
            {"id": "newProject", "icon": "calendar", "tone": "blue", "label": "신규 프로젝트", "value": f"{new_projects}건"},
            {"id": "endingProject", "icon": "check", "tone": "green", "label": "완료 예정 프로젝트", "value": f"{ending_projects}건"},
            {"id": "headcountDelta", "icon": "users", "tone": "purple", "label": "인력 변동", "value": "+1명"},
            {"id": "utilization", "donut": True, "color": "brand", "pct": utilization, "label": "가동률", "value": f"{utilization:.1f}%", "delta": _delta(utilization - prev_utilization, "%p")},
            {"id": "contract", "donut": True, "color": "info", "pct": contract, "label": "가득률", "value": f"{contract:.1f}%", "delta": _delta(contract - prev_contract, "%p")},
        ],
    }


def _execution_filters(projects: list[Project]) -> dict[str, Any]:
    return {
        "headquarters": ["전체", *sorted({p.lead_department for p in projects if p.lead_department})],
        "teams": ["전체", "PMO1팀", "PMO2팀", "기술지원팀"],
        "businessTypes": ["전체", *[PROJECT_TYPE_LABELS[t] for t in ProjectType]],
        "statuses": ["전체", *[STATUS_LABELS[s] for s in ProjectStatus]],
        "leadPms": ["전체", *sorted({p.pm_name for p in projects if p.pm_name})],
        "salesOwners": ["전체", *sorted({p.sales_owner for p in projects if p.sales_owner})],
        "from": "2025-01-01",
        "to": "2026-12-31",
    }


def _execution_row(project: Project) -> dict[str, Any]:
    return {
        "code": project.code,
        "name": project.name,
        "businessType": PROJECT_TYPE_LABELS[project.project_type],
        "status": project.status.value,
        "amountText": project.amount_text or _amount_text(project),
        "leadPm": project.pm_name or "-",
        "salesOwner": project.sales_owner or "-",
        "leadDept": project.lead_department or "-",
        "startDate": _date(project.start_date),
        "endDate": _date(project.end_date) or "-",
        "remark": project.memo or project.source_sheet or "-",
        "execDept": project.owner_department or "PMO본부",
        "modifiedAt": _datetime(project.recent_activity_at or project.updated_at),
        "modifier": project.pm_name or "관리자",
    }


def _execution_detail(project: Project) -> dict[str, Any]:
    logs = [
        log.summary or log.content
        for log in project.logs[:2]
        if log.summary or log.content
    ]
    return {
        **_execution_row(project),
        "presentPm": project.presentation_pm_name or project.proposal_pm_name or project.pm_name or "-",
        "team": project.proposal_team_text or "-",
        "period": f"{_date(project.start_date)} ~ {_date(project.end_date)}",
        "submission": {"datetime": _datetime(project.submission_at), "format": project.submission_format or "-", "note": project.submission_note or "-"},
        "presentation": {"datetime": _datetime(project.presentation_at), "format": project.presentation_format or "-", "note": project.presentation_note or "-"},
        "rfpNo": project.bid_notice_no or "-",
        "rfpDate": _date(project.bid_notice_date) or "-",
        "recentActivity": {"datetime": _datetime(project.recent_activity_at), "lines": logs or [project.memo or "-"]},
        "memo": [line for line in (project.memo or "-").splitlines() if line],
    }


def _code_row(code: ProjectCode) -> dict[str, Any]:
    return {
        "code": code.code,
        "name": code.name,
        "status": code.status.value,
        "certainty": code.certainty or "-",
        "salesDept": code.sales_department or "-",
        "salesOwner": code.sales_owner or "-",
        "supportLead": code.support_lead or code.owner_name or "-",
        "fromDate": _date(code.start_date) or "-",
        "toDate": _date(code.end_date) or "-",
        "useStatus": "사용" if code.is_active else "미사용",
        "note": code.note or "",
    }


def _find_project(session: DbSession, project_id: str | None, code: str | None) -> Project:
    statement = select(Project)
    if project_id:
        found = session.get(Project, project_id)
        if found:
            return found
    if code:
        found = session.scalar(statement.where(Project.code == code))
        if found:
            return found
    found = session.scalar(statement.where(Project.code == "P2026001")) or session.scalar(statement.order_by(Project.code))
    if found is None:
        raise RuntimeError("No project seed data loaded.")
    return found


def _representative_project(session: DbSession) -> Project | None:
    return session.scalar(select(Project).where(Project.code == "P2026001"))


def _project_detail_header(project: Project) -> dict[str, Any]:
    return {
        "code": project.code,
        "name": project.name,
        "status": project.status.value,
        "businessType": PROJECT_TYPE_LABELS[project.project_type],
        "amountTotal": project.amount_text or _amount_text(project),
        "ownerDept": project.owner_department or "-",
        "salesOwner": project.sales_owner or "-",
        "supportLead": project.support_lead or project.pm_name or "-",
        "bidNoticeNo": project.bid_notice_no or "-",
    }


def _schedule_items(project: Project) -> list[dict[str, Any]]:
    return [
        {"label": "프로젝트 시작", "date": _date(project.start_date) or "-", "extras": [{"k": "형식", "v": "착수"}]},
        {"label": "제출", "date": _datetime(project.submission_at) or "-", "extras": [{"k": "형식", "v": project.submission_format or "-"}]},
        {"label": "발표", "date": _datetime(project.presentation_at) or "-", "extras": [{"k": "형식", "v": project.presentation_format or "-"}]},
        {"label": "프로젝트 종료", "date": _date(project.end_date) or "-", "extras": [{"k": "상태", "v": STATUS_LABELS[project.status]}]},
    ]


def _project_kpi(project: Project, assignments: list[ProjectAssignment]) -> dict[str, Any]:
    d_day = ""
    if project.end_date:
        d_day = f"D+{(date(2026, 5, 7) - project.end_date).days}" if project.end_date < date(2026, 5, 7) else f"D-{(project.end_date - date(2026, 5, 7)).days}"
    total_mm = sum(_num(assignment.total_mm or assignment.mm or 0) for assignment in assignments)
    return {
        "dDay": d_day or "-",
        "accumMm": f"{total_mm:.1f} MM",
        "headcount": f"{len(assignments)}명",
        "reportStatus": "정상",
        "lastReport": "최근 진행사항 등록",
    }


def _assignment_row(assignment: ProjectAssignment) -> dict[str, Any]:
    person = assignment.personnel
    name = person.name if person else "-"
    return {
        "initials": _initials(name),
        "name": name,
        "role": assignment.assignment_role or "-",
        "roleTone": "indigo",
        "team": person.team_name if person else "-",
        "deployType": {"delivery": "수행", "proposal": "제안", "support": "지원", "unassigned": "대기"}.get(assignment.assignment_type.value, assignment.assignment_type.value),
        "status": assignment.assignment_status or "투입",
        "onsite": assignment.onsite_type or "-",
        "from": _date(assignment.start_date) or "-",
        "to": _date(assignment.end_date) or "-",
        "note": assignment.note or "-",
    }


def _project_recent_log(log: ProjectLog) -> dict[str, Any]:
    return {
        "id": log.id,
        "datetime": _datetime(log.logged_at),
        "summary": log.summary or log.content,
        "author": log.author_name or "-",
        "authorRole": log.author_team or "",
        "stateLabel": "진행" if log.status in RUNNING_STATUSES or log.status in PROPOSAL_STATUSES else "완료",
    }


def _history_filters(session: DbSession) -> dict[str, Any]:
    projects = session.scalars(select(Project).order_by(Project.code).limit(20)).all()
    authors = sorted({name for name in session.scalars(select(ProjectLog.author_name)).all() if name})
    categories = sorted({name for name in session.scalars(select(ProjectLog.category)).all() if name})
    return {
        "projects": [{"value": "all", "label": "전체"}, *[{"value": p.code, "label": f"{p.code} · {p.name}"} for p in projects]],
        "categories": ["전체", *categories],
        "authors": ["전체", *authors],
        "periodPresets": ["이번 달", "지난 달", "특정 월", "올해", "최근 3개월"],
        "defaultPreset": "최근 3개월",
        "from": "2026-02-07",
        "to": "2026-05-07",
    }


def _history_log(log: ProjectLog, idx: int) -> dict[str, Any]:
    project = log.project
    return {
        "id": idx,
        "datetime": _datetime(log.logged_at),
        "category": log.category or "기타",
        "projectCode": project.code if project else "-",
        "projectName": project.name if project else "-",
        "author": log.author_name or "-",
        "authorInitials": _initials(log.author_name or "-"),
        "authorTeam": log.author_team or "-",
        "summary": log.summary or log.content,
        "detail": log.detail or {},
    }


def _history_by_project(session: DbSession) -> list[dict[str, Any]]:
    statement = (
        select(Project.code, Project.name, func.count(ProjectLog.id))
        .join(ProjectLog, ProjectLog.project_id == Project.id)
        .group_by(Project.id)
        .order_by(desc(func.count(ProjectLog.id)))
        .limit(6)
    )
    return [
        {"rank": idx + 1, "code": code, "name": name, "count": count}
        for idx, (code, name, count) in enumerate(session.execute(statement).all())
    ]


def _recent_status_changes(session: DbSession) -> list[dict[str, Any]]:
    logs = session.scalars(
        select(ProjectLog).where(ProjectLog.previous_status.is_not(None), ProjectLog.next_status.is_not(None)).order_by(desc(ProjectLog.logged_at)).limit(5)
    ).all()
    return [
        {
            "code": log.project.code if log.project else "-",
            "name": log.project.name if log.project else "-",
            "datetime": _datetime(log.logged_at),
            "from": log.previous_status.value if log.previous_status else log.status.value,
            "to": log.next_status.value if log.next_status else log.status.value,
        }
        for log in logs
    ]


def _latest_log_at(session: DbSession) -> datetime | None:
    return session.scalar(select(func.max(ProjectLog.logged_at)))


def _active_project_count(session: DbSession) -> int:
    return session.scalar(select(func.count(func.distinct(ProjectLog.project_id))).select_from(ProjectLog)) or 0


def _num(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def _delta(value: float, unit: str) -> dict[str, str]:
    direction = "up" if value >= 0 else "down"
    return {"dir": direction, "abs": f"{abs(value):.1f}{unit}"}


def _amount_text(project: Project) -> str:
    if project.total_amount and project.company_amount:
        return f"{_eok(project.total_amount)}억/{_eok(project.company_amount)}억"
    if project.total_amount:
        return f"{_eok(project.total_amount)}억"
    return "-"


def _eok(value: Decimal | float | int) -> str:
    return f"{float(value) / 100000000:.1f}".rstrip("0").rstrip(".")


def _date(value: date | None) -> str:
    return value.isoformat() if value else ""


def _datetime(value: datetime | None) -> str:
    return value.strftime("%Y-%m-%d %H:%M") if value else ""


def _initials(name: str) -> str:
    clean = name.replace(" ", "")
    return clean[:2] if clean else "-"
