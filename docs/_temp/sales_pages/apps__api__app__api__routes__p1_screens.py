from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter
from sqlalchemy import desc, func, select

from app.api.common import envelope
from app.api.deps import DbSession
from app.enums import AssignmentStatus, ProjectAssignmentRole, ProjectStatus, ProjectType
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
PERSON_TITLE_CACHE_KEY = "p1_person_title_cache"


@router.get("/home")
def home_screen(session: DbSession) -> dict[str, object]:
    as_of = _latest_snapshot_date(session)
    kpi = _latest_kpi(session)
    prev_kpi = _previous_kpi(session, kpi)
    snapshot_counts = _snapshot_counts(session, as_of)
    current_year = date.today().year
    year_closed = _year_closed_counts(session, current_year)
    prev_year_closed = _year_closed_counts(session, current_year - 1)

    recent_projects = _recent_projects(session, 8)
    _prefetch_person_titles(session, _project_people_names(recent_projects))

    return envelope({
        "meta": _meta(session, as_of),
        "hero": {
            "title": "PMO 업무수행 관리시스템",
            "subtitle": "업무 수행 현황을 빠르게 확인하고, 주요 화면으로 이동하세요.",
        },
        "quickLinks": [
            {"id": "execution", "icon": "execution", "tone": "blue", "title": "업무수행현황", "desc": "프로젝트별\n업무 수행 현황 확인", "href": "/projects/operations"},
            {"id": "code", "icon": "folder", "tone": "green", "title": "프로젝트 마스터", "desc": "프로젝트 등록 및\n코드 관리", "href": "/projects/codes"},
            {"id": "people", "icon": "users", "tone": "purple", "title": "인력재직현황", "desc": "재직 인력 및\n월별 MM 관리", "href": "/people/employment"},
            {"id": "kpi", "icon": "report", "tone": "amber", "title": "KPI 보고서", "desc": "주간·월별\n가동률·가득률 보고서", "href": "/reports/monthly"},
        ],
        "kpis": _dashboard_kpis(snapshot_counts, kpi, prev_kpi, year_closed, prev_year_closed),
        "trend": _kpi_trend(session),
        "teamHeadcount": _team_headcount(session, as_of),
        "teamUtilization": _team_utilization(session, as_of),
        "recentProjects": {"rows": [_project_row(session, project) for project in recent_projects]},
        "monthSummary": _month_summary(session, kpi, prev_kpi),
    })


@router.get("/execution")
def execution_screen(session: DbSession) -> dict[str, object]:
    projects = session.scalars(select(Project).order_by(desc(Project.recent_activity_at), Project.code)).all()
    _prefetch_person_titles(session, _project_people_names(projects))
    team_members_by_project_id = _code_team_members(session, [project.id for project in projects])
    rows = [_execution_row(session, project, team_members_by_project_id.get(project.id, [])) for project in projects]
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
        "filters": _execution_filters(session, projects),
        "rows": rows,
        "selectedRow": _execution_detail(session, _representative_project(session) or projects[0]),
        "pagination": {"totalCount": len(rows), "pageSize": 20, "currentPage": 1, "totalPages": max(1, (len(rows) + 19) // 20)},
    })


@router.get("/code")
def code_screen(session: DbSession) -> dict[str, object]:
    codes = session.scalars(select(ProjectCode).order_by(ProjectCode.code)).all()
    code_ids = [code.id for code in codes]
    projects_by_code_id: dict[str, Project] = {}
    team_members_by_project_id: dict[str, list[str]] = {}
    if code_ids:
        linked_projects = session.scalars(
            select(Project)
            .where(Project.project_code_id.in_(code_ids))
            .order_by(desc(Project.updated_at))
        ).all()
        for project in linked_projects:
            if project.project_code_id and project.project_code_id not in projects_by_code_id:
                projects_by_code_id[project.project_code_id] = project
        _prefetch_person_titles(session, _project_people_names(linked_projects))
        team_members_by_project_id = _code_team_members(session, [project.id for project in linked_projects])
    counts = Counter(project.status for project in projects_by_code_id.values())
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

    missing_links = [code.code for code in codes if code.id not in projects_by_code_id]
    if missing_links:
        raise RuntimeError(f"Project link missing for project_code(s): {', '.join(missing_links)}")

    return envelope({
        "meta": _meta(session, _latest_snapshot_date(session)),
        "summary": [
            {"id": status.value, "code": status.value, "label": STATUS_LABELS[status], "value": counts[status], "unit": "건"}
            for status in status_order
        ],
        "rows": [
            _code_row(
                session,
                code,
                projects_by_code_id[code.id],
                team_members_by_project_id.get(projects_by_code_id[code.id].id, []),
            )
            for code in codes
        ],
    })


@router.get("/project-detail")
def project_detail_screen(session: DbSession, project_id: str | None = None, code: str | None = None) -> dict[str, object]:
    as_of = _latest_snapshot_date(session) or date.today()
    project = _find_project(session, project_id, code)
    assignments_raw = session.scalars(
        select(ProjectAssignment).where(ProjectAssignment.project_id == project.id).order_by(ProjectAssignment.sequence_no)
    ).all()
    participant_rows = _project_participant_rows(session, project, assignments_raw, as_of)
    logs = session.scalars(
        select(ProjectLog).where(ProjectLog.project_id == project.id).order_by(desc(ProjectLog.logged_at))
    ).all()
    _prefetch_person_titles(
        session,
        _project_people_names([project]) + [log.author_name for log in logs] + [log.updated_by_name for log in logs],
    )

    return envelope({
        "meta": _meta(session, _latest_snapshot_date(session)),
        "project": _project_detail_header(session, project),
        "projectMaster": _project_detail_master_row(session, project),
        "schedule": {"items": _schedule_items(project)},
        "kpi": _project_kpi(project, participant_rows),
        "assignments": participant_rows,
        "logs": [_project_recent_log(session, log) for log in logs],
    })


@router.get("/history")
def history_screen(session: DbSession) -> dict[str, object]:
    logs = session.scalars(select(ProjectLog).join(Project, isouter=True).order_by(desc(ProjectLog.logged_at)).limit(10)).all()
    _prefetch_person_titles(session, [log.author_name for log in logs] + [log.updated_by_name for log in logs])
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
        "logs": [_history_log(session, log, idx + 1) for idx, log in enumerate(logs)],
        "byProject": _history_by_project(session),
        "recentStatusChanges": _recent_status_changes(session),
        "pagination": {"totalCount": total, "pageSize": 10, "currentPage": 1, "totalPages": max(1, (total + 9) // 10)},
    })


def _meta(session: DbSession, as_of: date | None) -> dict[str, Any]:
    user = (
        session.scalar(select(User).where(User.permission == "admin", User.name == "조승현").limit(1))
        or session.scalar(select(User).where(User.permission == "admin").order_by(User.name))
        or session.scalar(select(User).order_by(User.name))
    )
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
    statement = select(CurrentAssignmentSnapshot.representative_status).join(Personnel, CurrentAssignmentSnapshot.personnel_id == Personnel.id)
    if as_of:
        statement = statement.where(CurrentAssignmentSnapshot.as_of_date == as_of)
    statement = statement.where(Personnel.is_active.is_(True))
    return Counter(session.scalars(statement).all())


def _year_closed_counts(session: DbSession, year: int) -> dict[str, int]:
    year_start = datetime(year, 1, 1)
    next_year_start = datetime(year + 1, 1, 1)

    log_counts = Counter(
        session.scalars(
            select(ProjectLog.next_status).where(
                ProjectLog.next_status.in_([ProjectStatus.WIN, ProjectStatus.LOSS]),
                ProjectLog.logged_at >= year_start,
                ProjectLog.logged_at < next_year_start,
            )
        ).all()
    )

    projects_with_status_logs = set(
        session.scalars(
            select(ProjectLog.project_id).where(
                ProjectLog.project_id.is_not(None),
                ProjectLog.previous_status.is_not(None),
                ProjectLog.next_status.is_not(None),
            )
        ).all()
    )

    fallback_projects = session.scalars(
        select(Project).where(
            Project.status.in_([ProjectStatus.WIN, ProjectStatus.LOSS]),
            ~Project.id.in_(projects_with_status_logs),
        )
    ).all()

    fallback_counts = Counter()
    for project in fallback_projects:
        activity_at = project.recent_activity_at or project.updated_at
        if activity_at and year_start <= activity_at < next_year_start:
            fallback_counts[project.status] += 1

    return {
        "win": int(log_counts[ProjectStatus.WIN] + fallback_counts[ProjectStatus.WIN]),
        "loss": int(log_counts[ProjectStatus.LOSS] + fallback_counts[ProjectStatus.LOSS]),
    }


def _dashboard_kpis(
    counts: Counter[str],
    kpi: MonthlyKpiSummary | None,
    prev: MonthlyKpiSummary | None,
    year_closed: dict[str, int],
    prev_year_closed: dict[str, int],
) -> list[dict[str, Any]]:
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
        {
            "id": "yearWin",
            "label": "WIN",
            "icon": "check",
            "tone": "green",
            "value": year_closed["win"],
            "unit": "건",
            "footer": "올해 누적",
            "delta": _delta(float(year_closed["win"] - prev_year_closed["win"]), "건"),
        },
        {
            "id": "yearLoss",
            "label": "LOSS",
            "icon": "report",
            "tone": "rose",
            "value": year_closed["loss"],
            "unit": "건",
            "footer": "올해 누적",
            "delta": _delta(float(year_closed["loss"] - prev_year_closed["loss"]), "건"),
        },
        {"id": "utilization", "label": "가동률", "donut": True, "color": "brand", "value": utilization, "unit": "%", "delta": _delta(utilization - prev_utilization, "%p")},
        {"id": "contract", "label": "가득률", "donut": True, "color": "info", "value": contract, "unit": "%", "delta": _delta(contract - prev_contract, "%p")},
    ]


def _kpi_trend(session: DbSession) -> dict[str, list[Any]]:
    rows = list(reversed(session.scalars(
        select(MonthlyKpiSummary)
        .where(MonthlyKpiSummary.organization_name == "PMO본부")
        .order_by(desc(MonthlyKpiSummary.year), desc(MonthlyKpiSummary.month))
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
    statement = statement.where(Personnel.is_active.is_(True))
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


def _project_row(session: DbSession, project: Project) -> dict[str, Any]:
    return {
        "code": project.code,
        "name": project.name,
        "businessType": PROJECT_TYPE_LABELS[project.project_type],
        "status": project.status.value,
        "updatedAt": _datetime(project.recent_activity_at or project.updated_at),
        "updatedBy": _person_name_with_title(session, project.proposal_pm_name or project.presentation_pm_name or project.delivery_pm_name or "관리자"),
    }


def _month_summary(session: DbSession, kpi: MonthlyKpiSummary | None, prev: MonthlyKpiSummary | None) -> dict[str, Any]:
    if kpi:
        year = kpi.year
        month_no = kpi.month
    else:
        today = date.today()
        year = today.year
        month_no = today.month
    month = f"{year:04d}-{month_no:02d}"
    month_start = date(year, month_no, 1)
    if month_no == 12:
        month_end = date(year + 1, 1, 1)
        prev_start = date(year, 11, 1)
    else:
        month_end = date(year, month_no + 1, 1)
        prev_start = date(year - 1, 12, 1) if month_no == 1 else date(year, month_no - 1, 1)

    utilization = _num(kpi.utilization_rate if kpi else 0)
    contract = _num(kpi.contract_rate if kpi else 0)
    prev_utilization = _num(prev.utilization_rate if prev else utilization)
    prev_contract = _num(prev.contract_rate if prev else contract)

    new_projects = session.scalar(
        select(func.count()).select_from(Project).where(Project.start_date >= month_start, Project.start_date < month_end)
    ) or 0
    prev_new_projects = session.scalar(
        select(func.count()).select_from(Project).where(Project.start_date >= prev_start, Project.start_date < month_start)
    ) or 0

    ending_projects = session.scalar(
        select(func.count()).select_from(Project).where(Project.end_date >= month_start, Project.end_date < month_end)
    ) or 0
    prev_ending_projects = session.scalar(
        select(func.count()).select_from(Project).where(Project.end_date >= prev_start, Project.end_date < month_start)
    ) or 0

    completed_projects = session.scalar(
        select(func.count()).select_from(Project).where(
            Project.status == ProjectStatus.DONE,
            Project.end_date >= month_start,
            Project.end_date < month_end,
        )
    ) or 0
    prev_completed_projects = session.scalar(
        select(func.count()).select_from(Project).where(
            Project.status == ProjectStatus.DONE,
            Project.end_date >= prev_start,
            Project.end_date < month_start,
        )
    ) or 0

    return {
        "month": month,
        "rows": [
            {"id": "newProject", "icon": "calendar", "tone": "blue", "label": "신규 프로젝트", "value": f"{new_projects}건", "delta": _delta(float(new_projects - prev_new_projects), "건")},
            {"id": "endingProject", "icon": "check", "tone": "green", "label": "완료 예정 프로젝트", "value": f"{ending_projects}건", "delta": _delta(float(ending_projects - prev_ending_projects), "건")},
            {"id": "completedProject", "icon": "check", "tone": "slate", "label": "완료 프로젝트", "value": f"{completed_projects}건", "delta": _delta(float(completed_projects - prev_completed_projects), "건")},
            {"id": "headcountDelta", "icon": "users", "tone": "purple", "label": "인력 변동", "value": "+1명"},
            {"id": "utilization", "donut": True, "color": "brand", "pct": utilization, "label": "가동률", "value": f"{utilization:.1f}%", "delta": _delta(utilization - prev_utilization, "%p")},
            {"id": "contract", "donut": True, "color": "info", "pct": contract, "label": "가득률", "value": f"{contract:.1f}%", "delta": _delta(contract - prev_contract, "%p")},
        ],
    }


def _execution_filters(session: DbSession, projects: list[Project]) -> dict[str, Any]:
    proposal_pms = {
        _person_name_with_title(session, pm_name)
        for p in projects
        for pm_name in (p.proposal_pm_name, p.presentation_pm_name, p.delivery_pm_name)
        if pm_name
    }
    sales_owners = {
        _person_name_with_title(session, p.sales_owner, fallback_to_raw=True)
        for p in projects
        if p.sales_owner
    }
    return {
        "headquarters": ["전체", *sorted({p.sales_department for p in projects if p.sales_department})],
        "teams": ["전체", "PMO1팀", "PMO2팀", "기술지원팀"],
        "businessTypes": ["전체", *[PROJECT_TYPE_LABELS[t] for t in ProjectType]],
        "statuses": ["전체", *[STATUS_LABELS[s] for s in ProjectStatus]],
        "proposalPms": ["전체", *sorted(name for name in proposal_pms if name and name != "-")],
        "salesOwners": ["전체", *sorted(name for name in sales_owners if name and name != "-")],
        "from": "2025-01-01",
        "to": "2026-12-31",
    }


def _execution_row(session: DbSession, project: Project, team_members: list[str] | None = None) -> dict[str, Any]:
    pm_exclusions = {
        (project.proposal_pm_name or "").strip(),
        (project.presentation_pm_name or "").strip(),
        (project.delivery_pm_name or "").strip(),
    }
    filtered_members = []
    for member in team_members or []:
        member_name = member.split(" ", 1)[0].strip()
        if member_name and member_name in pm_exclusions:
            continue
        filtered_members.append(member)
    team_text = " / ".join(filtered_members) if filtered_members else "-"

    return {
        "projectId": project.id,
        "code": project.code,
        "name": project.name,
        "clientName": project.client_name or "-",
        "businessType": PROJECT_TYPE_LABELS[project.project_type],
        "status": project.status.value,
        "amountText": project.amount_text or _amount_text(project),
        "proposalPm": _person_name_with_title(session, project.proposal_pm_name),
        "presentPm": _person_name_with_title(session, project.presentation_pm_name),
        "deliveryPm": _person_name_with_title(session, project.delivery_pm_name),
        "proposalDeliveryTeam": team_text,
        "salesOwner": _person_name_with_title(session, project.sales_owner, fallback_to_raw=True),
        "leadDept": project.sales_department or "-",
        "startDate": _date(project.start_date),
        "endDate": _date(project.end_date) or "-",
        "remark": project.memo or "-",
        "execDept": project.sales_department or "PMO본부",
        "modifiedAt": _datetime(project.recent_activity_at or project.updated_at),
        "modifier": _person_name_with_title(session, project.proposal_pm_name or project.presentation_pm_name or project.delivery_pm_name or "관리자"),
        "team": _execution_team_text(session, project),
        "submission": {"datetime": _datetime(project.submission_at), "format": project.submission_format or "-", "note": project.submission_note or "-"},
        "presentation": {"datetime": _datetime(project.presentation_at), "format": project.presentation_format or "-", "note": project.presentation_note or "-"},
        "rfpNo": project.bid_notice_no or "-",
        "rfpDate": _date(project.bid_notice_date) or "-",
    }


def _execution_detail(session: DbSession, project: Project) -> dict[str, Any]:
    logs = [
        log.content
        for log in project.logs[:2]
        if log.content
    ]
    return {
        **_execution_row(session, project),
        "presentPm": _person_name_with_title(session, project.presentation_pm_name),
        "deliveryPm": _person_name_with_title(session, project.delivery_pm_name),
        "team": _execution_team_text(session, project),
        "period": f"{_date(project.start_date)} ~ {_date(project.end_date)}",
        "recentActivity": {"datetime": _datetime(project.recent_activity_at), "lines": logs or [project.memo or "-"]},
        "memo": [line for line in (project.memo or "-").splitlines() if line],
    }


def _execution_team_text(session: DbSession, project: Project) -> str:
    # 업무수행현황 상세의 제안팀은 "이름 직책" 목록을 기본으로 사용한다.
    members: list[str] = []
    seen: set[str] = set()
    assignments = session.scalars(
        select(ProjectAssignment)
        .where(ProjectAssignment.project_id == project.id)
        .order_by(ProjectAssignment.sequence_no, ProjectAssignment.created_at)
    ).all()
    for assignment in assignments:
        person = assignment.personnel
        if not person or not person.is_active or not person.name:
            continue
        dedup_key = person.id or person.name
        if dedup_key in seen:
            continue
        seen.add(dedup_key)
        position = (person.position_name or "").strip()
        members.append(f"{person.name} {position}".strip())
    if members:
        return f"{' / '.join(members)} (총 {len(members)}명)"
    return "-"


def _code_team_members(session: DbSession, project_ids: list[str]) -> dict[str, list[str]]:
    if not project_ids:
        return {}
    grouped: dict[str, list[str]] = defaultdict(list)
    seen: dict[str, set[str]] = defaultdict(set)
    assignments = session.scalars(
        select(ProjectAssignment)
        .where(ProjectAssignment.project_id.in_(project_ids))
        .order_by(ProjectAssignment.sequence_no, ProjectAssignment.created_at)
    ).all()
    for assignment in assignments:
        if not assignment.project_id:
            continue
        person = assignment.personnel
        if not person or not person.is_active or not person.name:
            continue
        position = (person.position_name or "").strip()
        member = f"{person.name} {position}".strip()
        dedup_key = f"{person.id or person.name}|{member}"
        if dedup_key in seen[assignment.project_id]:
            continue
        seen[assignment.project_id].add(dedup_key)
        grouped[assignment.project_id].append(member)
    return grouped


def _code_row(session: DbSession, code: ProjectCode, project: Project | None = None, team_members: list[str] | None = None) -> dict[str, Any]:
    if project is None:
        raise RuntimeError(f"Project not found for project_code {code.code}")
    pm_exclusions = {
        (project.proposal_pm_name or "").strip(),
        (project.presentation_pm_name or "").strip(),
        (project.delivery_pm_name or "").strip(),
    }
    filtered_members = []
    for member in team_members or []:
        member_name = member.split(" ", 1)[0].strip()
        if member_name and member_name in pm_exclusions:
            continue
        filtered_members.append(member)
    team_text = " / ".join(filtered_members) if filtered_members else "-"

    return {
        "id": code.id,
        "projectId": project.id,
        "code": code.code,
        "name": project.name,
        "clientName": project.client_name or "-",
        "status": project.status.value,
        "projectType": PROJECT_TYPE_LABELS[project.project_type],
        "amountText": project.amount_text or _amount_text(project),
        "totalAmount": _num(project.total_amount) if project.total_amount is not None else None,
        "companyAmount": _num(project.company_amount) if project.company_amount is not None else None,
        "certainty": project.certainty or "-",
        "salesDept": project.sales_department or "-",
        "salesOwner": _person_name_with_title(session, project.sales_owner, fallback_to_raw=True),
        "proposalPm": _person_name_with_title(session, project.proposal_pm_name),
        "presentPm": _person_name_with_title(session, project.presentation_pm_name),
        "deliveryPm": _person_name_with_title(session, project.delivery_pm_name),
        "proposalDeliveryTeam": team_text,
        "fromDate": _date(project.start_date) or "-",
        "toDate": _date(project.end_date) or "-",
        "bidNoticeNo": project.bid_notice_no or "-",
        "bidNoticeDate": _date(project.bid_notice_date) or "-",
        "proposalSubmissionAt": _datetime(project.submission_at) or "-",
        "submissionFormat": project.submission_format or "-",
        "submissionNote": project.submission_note or "-",
        "proposalPresentationAt": _datetime(project.presentation_at) or "-",
        "presentationFormat": project.presentation_format or "-",
        "presentationNote": project.presentation_note or "-",
        "recentActivityAt": _datetime(project.recent_activity_at) or "-",
        "memo": project.memo or "-",
        "useStatus": "사용" if code.is_active else "미사용",
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


def _project_detail_header(session: DbSession, project: Project) -> dict[str, Any]:
    return {
        "id": project.id,
        "code": project.code,
        "name": project.name,
        "clientName": project.client_name or "-",
        "status": project.status.value,
        "businessType": PROJECT_TYPE_LABELS[project.project_type],
        "amountTotal": project.amount_text or _amount_text(project),
        "salesDept": project.sales_department or "-",
        "salesOwner": _person_name_with_title(session, project.sales_owner, fallback_to_raw=True),
        "proposalPm": _person_name_with_title(session, project.proposal_pm_name),
        "presentPm": _person_name_with_title(session, project.presentation_pm_name),
        "deliveryPm": _person_name_with_title(session, project.delivery_pm_name),
        "startDate": _date(project.start_date) or "-",
        "endDate": _date(project.end_date) or "-",
        "bidNoticeNo": project.bid_notice_no or "-",
        "bidNoticeDate": _date(project.bid_notice_date) or "-",
        "recentActivityAt": _datetime(project.recent_activity_at) or "-",
        "memo": project.memo or "-",
    }


def _project_detail_master_row(session: DbSession, project: Project) -> dict[str, Any]:
    team_members = _code_team_members(session, [project.id]).get(project.id, [])
    code = session.scalar(select(ProjectCode).where(ProjectCode.id == project.project_code_id)) if project.project_code_id else None
    if code:
        return _code_row(session, code, project, team_members)
    return {
        "id": "",
        "projectId": project.id,
        "code": project.code,
        "name": project.name,
        "clientName": project.client_name or "-",
        "status": project.status.value,
        "projectType": PROJECT_TYPE_LABELS[project.project_type],
        "amountText": project.amount_text or _amount_text(project),
        "totalAmount": _num(project.total_amount) if project.total_amount is not None else None,
        "companyAmount": _num(project.company_amount) if project.company_amount is not None else None,
        "certainty": "-",
        "salesDept": project.sales_department or "-",
        "salesOwner": _person_name_with_title(session, project.sales_owner, fallback_to_raw=True),
        "proposalPm": _person_name_with_title(session, project.proposal_pm_name),
        "presentPm": _person_name_with_title(session, project.presentation_pm_name),
        "deliveryPm": _person_name_with_title(session, project.delivery_pm_name),
        "proposalDeliveryTeam": " / ".join(team_members) if team_members else "-",
        "fromDate": _date(project.start_date) or "-",
        "toDate": _date(project.end_date) or "-",
        "bidNoticeNo": project.bid_notice_no or "-",
        "bidNoticeDate": _date(project.bid_notice_date) or "-",
        "proposalSubmissionAt": _datetime(project.submission_at) or "-",
        "submissionFormat": project.submission_format or "-",
        "submissionNote": project.submission_note or "-",
        "proposalPresentationAt": _datetime(project.presentation_at) or "-",
        "presentationFormat": project.presentation_format or "-",
        "presentationNote": project.presentation_note or "-",
        "recentActivityAt": _datetime(project.recent_activity_at) or "-",
        "memo": project.memo or "-",
        "useStatus": "사용",
    }


def _schedule_items(project: Project) -> list[dict[str, Any]]:
    return [
        {"label": "프로젝트 시작", "date": _date(project.start_date) or "-", "extras": [{"v": "착수"}]},
        {
            "label": "제출",
            "date": _datetime(project.submission_at) or "-",
            "extras": [{"v": project.submission_format or "-"}, {"v": project.submission_note or "-"}],
        },
        {
            "label": "발표",
            "date": _datetime(project.presentation_at) or "-",
            "extras": [{"v": project.presentation_format or "-"}, {"v": project.presentation_note or "-"}],
        },
        {"label": "프로젝트 종료", "date": _date(project.end_date) or "-", "extras": [{"v": STATUS_LABELS[project.status]}]},
    ]


def _is_active_assignment(assignment: ProjectAssignment, as_of: date) -> bool:
    if assignment.assignment_type.value == "unassigned":
        return False
    status = assignment.assignment_status.value if assignment.assignment_status else ""
    if status in {AssignmentStatus.PLANNED.value, AssignmentStatus.ENDED.value}:
        return False
    if assignment.start_date and assignment.start_date > as_of:
        return False
    if assignment.end_date and assignment.end_date < as_of:
        return False
    return True


def _normalize_person_name(value: str | None) -> str:
    return (value or "").strip()


def _person_name_with_title(session: DbSession | None, raw_name: str | None, *, fallback_to_raw: bool = False) -> str:
    name = _normalize_person_name(raw_name)
    if not name or name == "-":
        return "-"
    if session is None:
        return name
    cache = _person_title_cache(session)
    cached = cache.get(name)
    if cached is not None:
        return cached
    base_name, existing_title = (name.split(" ", 1) + [""])[:2] if " " in name else (name, "")
    person = session.scalar(
        select(Personnel)
        .where(Personnel.name == base_name, Personnel.is_active.is_(True))
        .order_by(desc(Personnel.updated_at))
    )
    if not person:
        resolved = name if fallback_to_raw else "-"
        cache[name] = resolved
        return resolved
    title = _normalize_person_name(existing_title or person.position_name)
    resolved = f"{person.name} {title}".strip() if title else person.name
    cache[name] = resolved
    return resolved


def _person_title_cache(session: DbSession) -> dict[str, str]:
    cache = session.info.get(PERSON_TITLE_CACHE_KEY)
    if isinstance(cache, dict):
        return cache
    created: dict[str, str] = {}
    session.info[PERSON_TITLE_CACHE_KEY] = created
    return created


def _prefetch_person_titles(session: DbSession, raw_names: list[str | None]) -> None:
    names = sorted({
        _normalize_person_name(raw_name)
        for raw_name in raw_names
        if _normalize_person_name(raw_name) and _normalize_person_name(raw_name) != "-" and " " not in _normalize_person_name(raw_name)
    })
    if not names:
        return
    cache = _person_title_cache(session)
    missing = [name for name in names if name not in cache]
    if not missing:
        return
    for name in missing:
        cache[name] = "-"
    rows = session.scalars(
        select(Personnel)
        .where(Personnel.name.in_(missing), Personnel.is_active.is_(True))
        .order_by(Personnel.name, desc(Personnel.updated_at))
    ).all()
    seen: set[str] = set()
    for person in rows:
        name = _normalize_person_name(person.name)
        if not name or name not in cache or name in seen:
            continue
        seen.add(name)
        title = _normalize_person_name(person.position_name)
        cache[name] = f"{name} {title}".strip() if title else name


def _project_people_names(projects: list[Project]) -> list[str]:
    names: list[str] = []
    for project in projects:
        names.extend([
            project.sales_owner,
            project.proposal_pm_name,
            project.presentation_pm_name,
            project.delivery_pm_name,
        ])
    return names


def _assignment_person_name(assignment: ProjectAssignment) -> str:
    if assignment.personnel and assignment.personnel.name:
        base = assignment.personnel.name.strip()
        title = _normalize_person_name(assignment.personnel.position_name)
        return f"{base} {title}".strip() if title else base
    return ""


def _pm_name_set(project: Project) -> set[str]:
    return {
        name
        for name in (
            _normalize_person_name(project.proposal_pm_name),
            _normalize_person_name(project.presentation_pm_name),
            _normalize_person_name(project.delivery_pm_name),
        )
        if name and name != "-"
    }


def _assignment_window(assignment: ProjectAssignment, project: Project, as_of: date) -> tuple[date, date] | None:
    start = assignment.start_date or project.start_date
    end = assignment.end_date or project.end_date or as_of
    if start is None or end is None:
        return None
    if end > as_of:
        end = as_of
    if project.start_date and start < project.start_date:
        start = project.start_date
    if project.end_date and end > project.end_date:
        end = project.end_date
    if start > end:
        return None
    return start, end


def _merge_ranges(ranges: list[tuple[date, date]]) -> list[tuple[date, date]]:
    if not ranges:
        return []
    ordered = sorted(ranges, key=lambda item: (item[0], item[1]))
    merged: list[tuple[date, date]] = [ordered[0]]
    for start, end in ordered[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end + timedelta(days=1):
            merged[-1] = (last_start, end if end > last_end else last_end)
            continue
        merged.append((start, end))
    return merged


def _range_days(window: tuple[date, date]) -> int:
    return (window[1] - window[0]).days + 1


def _assignment_mm_value(assignment: ProjectAssignment) -> float:
    return _num(
        assignment.current_mm
        if assignment.current_mm is not None
        else (assignment.total_mm if assignment.total_mm is not None else (assignment.mm or 0))
    )


def _assignment_person_key(assignment: ProjectAssignment) -> str | None:
    if assignment.personnel_id:
        return f"id:{assignment.personnel_id}"
    if assignment.personnel and assignment.personnel.name:
        name = assignment.personnel.name.strip()
        if name:
            return f"name:{name}"
    return None


def _dedupe_assignments_by_person(assignments: list[ProjectAssignment]) -> list[ProjectAssignment]:
    # Keep one row per person for UI-level participant views.
    order: list[str] = []
    deduped: dict[str, ProjectAssignment] = {}
    passthrough: list[ProjectAssignment] = []
    for assignment in assignments:
        key = _assignment_person_key(assignment)
        if key is None:
            passthrough.append(assignment)
            continue
        if key not in deduped:
            order.append(key)
        deduped[key] = assignment
    return [deduped[key] for key in order] + passthrough


def _position_rank(position_name: str | None) -> int:
    rank_map = {
        "부사장": 1,
        "전무": 2,
        "상무": 3,
        "이사": 4,
        "수석": 5,
        "책임": 6,
        "선임": 7,
        "대리": 8,
        "사원": 9,
    }
    return rank_map.get((position_name or "").strip(), 99)


def _project_pm_specs(project: Project) -> list[tuple[str, str]]:
    return [
        ("제안PM", _normalize_person_name(project.proposal_pm_name)),
        ("발표PM", _normalize_person_name(project.presentation_pm_name)),
        ("수행PM", _normalize_person_name(project.delivery_pm_name)),
    ]


ROLE_LABEL_MAP = {
    ProjectAssignmentRole.PROPOSAL_PM.value: "제안PM",
    ProjectAssignmentRole.PRESENTATION_PM.value: "발표PM",
    ProjectAssignmentRole.DELIVERY_PM.value: "수행PM",
    ProjectAssignmentRole.PROPOSAL_TEAM.value: "제안팀",
    ProjectAssignmentRole.DELIVERY_TEAM.value: "수행팀",
    ProjectAssignmentRole.SUPPORT_TEAM.value: "지원팀",
}

ROLE_TONE_MAP = {
    ProjectAssignmentRole.PROPOSAL_PM.value: "violet",
    ProjectAssignmentRole.PRESENTATION_PM.value: "blue",
    ProjectAssignmentRole.DELIVERY_PM.value: "indigo",
    ProjectAssignmentRole.PROPOSAL_TEAM.value: "sky",
    ProjectAssignmentRole.DELIVERY_TEAM.value: "amber",
    ProjectAssignmentRole.SUPPORT_TEAM.value: "green",
}

ROLE_ORDER = {
    ProjectAssignmentRole.PROPOSAL_PM.value: 0,
    ProjectAssignmentRole.PRESENTATION_PM.value: 1,
    ProjectAssignmentRole.DELIVERY_PM.value: 2,
    ProjectAssignmentRole.PROPOSAL_TEAM.value: 3,
    ProjectAssignmentRole.DELIVERY_TEAM.value: 4,
    ProjectAssignmentRole.SUPPORT_TEAM.value: 5,
}


def _infer_assignment_role(project: Project, assignment: ProjectAssignment, display_name: str) -> str | None:
    person_base_name = display_name.split(" ", 1)[0].strip()
    proposal_base = _normalize_person_name(project.proposal_pm_name).split(" ", 1)[0].strip()
    presentation_base = _normalize_person_name(project.presentation_pm_name).split(" ", 1)[0].strip()
    delivery_base = _normalize_person_name(project.delivery_pm_name).split(" ", 1)[0].strip()
    if person_base_name and person_base_name == proposal_base:
        return ProjectAssignmentRole.PROPOSAL_PM.value
    if person_base_name and person_base_name == presentation_base:
        return ProjectAssignmentRole.PRESENTATION_PM.value
    if person_base_name and person_base_name == delivery_base:
        return ProjectAssignmentRole.DELIVERY_PM.value
    return None


def _project_participant_rows(
    session: DbSession,
    project: Project,
    assignments_raw: list[ProjectAssignment],
    as_of: date,
) -> list[dict[str, Any]]:
    dedup_assignments = _dedupe_assignments_by_person(assignments_raw)
    deploy_label = {"delivery": "수행", "proposal": "제안", "support": "지원", "unassigned": "-"}
    status_label = {
        AssignmentStatus.ASSIGNED.value: "투입",
        AssignmentStatus.PLANNED.value: "예정",
        AssignmentStatus.ENDED.value: "종료",
    }
    onsite_label = {"onsite": "상주", "remote": "비상주", "hybrid": "혼합"}

    rows: list[dict[str, Any]] = []
    for assignment in dedup_assignments:
        display_name = _assignment_person_name(assignment) or "-"
        pm_role_code = _infer_assignment_role(project, assignment, display_name)
        if pm_role_code:
            role_code = pm_role_code
        elif assignment.assignment_role:
            role_code = assignment.assignment_role.value
        elif assignment.assignment_type.value == "proposal":
            role_code = ProjectAssignmentRole.PROPOSAL_TEAM.value
        elif assignment.assignment_type.value == "delivery":
            role_code = ProjectAssignmentRole.DELIVERY_TEAM.value
        else:
            role_code = ProjectAssignmentRole.SUPPORT_TEAM.value
        person = assignment.personnel
        if not person or not person.is_active:
            continue
        rows.append({
            "initials": _initials(display_name),
            "name": display_name,
            "role": ROLE_LABEL_MAP.get(role_code, "수행팀"),
            "roleTone": ROLE_TONE_MAP.get(role_code, "indigo"),
            "team": person.team_name if person else "-",
            "deployType": deploy_label.get(assignment.assignment_type.value, assignment.assignment_type.value),
            "status": status_label.get(assignment.assignment_status.value, assignment.assignment_status.value) if assignment.assignment_status else "-",
            "onsite": onsite_label.get((assignment.onsite_type or "").strip(), assignment.onsite_type) if assignment.onsite_type else "-",
            "from": _date(assignment.start_date) or "-",
            "to": _date(assignment.end_date) or "-",
            "note": assignment.note or "-",
            "isCurrent": _is_active_assignment(assignment, as_of),
            "personKey": _assignment_person_key(assignment) or f"name:{display_name}",
            "_roleOrder": ROLE_ORDER.get(role_code, 99),
            "_positionRank": _position_rank(person.position_name if person else None),
        })

    rows.sort(key=lambda row: (row["_roleOrder"], row["_positionRank"], row["name"]))
    for row in rows:
        row.pop("_roleOrder", None)
        row.pop("_positionRank", None)
    return rows


def _project_kpi(project: Project, participant_rows: list[dict[str, Any]]) -> dict[str, Any]:
    d_day = ""
    today = date.today()
    if project.end_date:
        d_day = f"D+{(today - project.end_date).days}" if project.end_date < today else f"D-{(project.end_date - today).days}"
    total_people = {str(row.get("personKey", "")) for row in participant_rows if str(row.get("personKey", "")).strip()}
    current_people = {str(row.get("personKey", "")) for row in participant_rows if row.get("isCurrent")}
    return {
        "dDay": d_day or "-",
        "accumMm": "-",
        "accumMmNote": "(인력 관리 구현 후 산정)",
        "headcountTotal": f"{len(total_people)}명",
        "headcountCurrent": f"{len(current_people)}명",
        "headcount": f"{len(current_people)}명",
        "reportStatus": "정상",
        "lastReport": "최근 진행사항 등록",
    }


def _assignment_row(assignment: ProjectAssignment) -> dict[str, Any]:
    person = assignment.personnel
    if not person or not person.is_active:
        return {
            "initials": "-",
            "name": "-",
            "role": "-",
            "roleTone": "indigo",
            "team": "-",
            "deployType": "-",
            "status": "assigned",
            "onsite": "-",
            "from": _date(assignment.start_date) or "-",
            "to": _date(assignment.end_date) or "-",
            "note": assignment.note or "-",
        }
    name = person.name if person else "-"
    role_code = assignment.assignment_role.value if assignment.assignment_role else ""
    return {
        "initials": _initials(name),
        "name": name,
        "role": ROLE_LABEL_MAP.get(role_code, "-"),
        "roleTone": ROLE_TONE_MAP.get(role_code, "indigo"),
        "team": person.team_name if person else "-",
        "deployType": {"delivery": "수행", "proposal": "제안", "support": "지원", "unassigned": "대기"}.get(assignment.assignment_type.value, assignment.assignment_type.value),
        "status": assignment.assignment_status.value if assignment.assignment_status else "assigned",
        "onsite": assignment.onsite_type or "-",
        "from": _date(assignment.start_date) or "-",
        "to": _date(assignment.end_date) or "-",
        "note": assignment.note or "-",
    }


def _project_recent_log(session: DbSession, log: ProjectLog) -> dict[str, Any]:
    author_name = _person_name_with_title(session, log.author_name)
    updated_by_name = _person_name_with_title(session, log.updated_by_name)
    author_display = (
        author_name if not updated_by_name or author_name == updated_by_name else f"{author_name}/{updated_by_name}"
    )
    return {
        "id": log.id,
        "datetime": _datetime(log.logged_at),
        "summary": log.content,
        "content": log.content,
        "author": author_display,
        "authorName": author_name,
        "updatedByName": updated_by_name,
        "authorRole": "",
        "logStatus": log.log_status.value,
        "stateLabel": "완료" if log.log_status.value == "done" else ("진행" if log.log_status.value == "in_progress" else "메모"),
    }


def _history_filters(session: DbSession) -> dict[str, Any]:
    projects = session.scalars(select(Project).order_by(Project.code).limit(20)).all()
    author_names = session.scalars(select(ProjectLog.author_name)).all()
    _prefetch_person_titles(session, list(author_names))
    authors = sorted({name for name in (_person_name_with_title(session, raw_name) for raw_name in author_names if raw_name) if name and name != "-"})
    categories = ["메모", "진행", "완료"]
    today = date.today()
    from_date = today - timedelta(days=90)
    return {
        "projects": [{"value": "all", "label": "전체"}, *[{"value": p.code, "label": f"{p.code} · {p.name}"} for p in projects]],
        "categories": ["전체", *categories],
        "authors": ["전체", *authors],
        "periodPresets": ["이번 달", "지난 달", "특정 월", "올해", "최근 3개월"],
        "defaultPreset": "최근 3개월",
        "from": _date(from_date),
        "to": _date(today),
    }


def _history_log(session: DbSession, log: ProjectLog, idx: int) -> dict[str, Any]:
    project = log.project
    return {
        "id": idx,
        "projectId": project.id if project else None,
        "datetime": _datetime(log.logged_at),
        "category": "완료" if log.log_status.value == "done" else ("진행" if log.log_status.value == "in_progress" else "메모"),
        "projectCode": project.code if project else "-",
        "projectName": project.name if project else "-",
        "author": _person_name_with_title(session, log.author_name),
        "authorInitials": _initials(_person_name_with_title(session, log.author_name)),
        "authorTeam": "-",
        "summary": log.content,
        "detail": {},
    }


def _history_by_project(session: DbSession) -> list[dict[str, Any]]:
    statement = (
        select(Project.code, Project.name, func.count(ProjectLog.id))
        .join(ProjectLog, ProjectLog.project_id == Project.id)
        .group_by(Project.id)
        .order_by(desc(func.count(ProjectLog.id)))
        .limit(10)
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
            "from": log.previous_status.value if log.previous_status else "-",
            "to": log.next_status.value if log.next_status else "-",
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
