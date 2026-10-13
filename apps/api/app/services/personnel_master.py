"""Incremental personnel projections; preserve historical ledgers/snapshots."""
from datetime import date

from fastapi import HTTPException
from sqlalchemy import select, delete

from app.domain.people import is_pmo_personnel
from app.domain.holidays import business_days_between, month_workday_summary
from app.models.core import CurrentAssignmentSnapshot, WeeklyLoadSnapshot, MonthlyEmploymentMM, MonthlyKpiSummary, ProjectAssignment, Project
from app.domain.kpi import pmo_monthly_kpi_values
from app.services import data_backup as backup


def annual_employment_mm(session, person, year=None):
    if not is_pmo_personnel(person) or not person.is_active or not person.mm_start_date:
        return None
    today = date.today()
    year = year or today.year
    total = 0.0
    for month in range(1, 13):
        window = backup._person_employment_window(person, year, month, today)
        workdays = int(month_workday_summary(session, year=year, month=month)["workdays"])
        total += business_days_between(session, *window) / workdays if window and workdays else 0
    return round(total, 2)


def refresh_personnel_projections(session, person, *, employment=True):
    today = date.today()
    if employment:
        person.yearly_mm = annual_employment_mm(session, person)
    # Past MM and snapshots are not replaced. Only the current/future months of
    # the current year are generated from the existing workday/window rules.
    if employment and is_pmo_personnel(person) and person.mm_start_date:
        for month in range(today.month, 13):
            rows = session.scalars(select(MonthlyEmploymentMM).where(
                MonthlyEmploymentMM.personnel_id == person.id,
                MonthlyEmploymentMM.year == today.year, MonthlyEmploymentMM.month == month,
            )).all()
            if len(rows) > 1:
                raise HTTPException(status_code=409, detail="같은 인력/월의 재직 MM 원장이 중복되어 먼저 확인이 필요합니다.")
            workdays = int(month_workday_summary(session, year=today.year, month=month)["workdays"])
            window = backup._person_employment_window(person, today.year, month, today) if person.is_active else None
            employed = business_days_between(session, *window) if window else 0
            row = rows[0] if rows else MonthlyEmploymentMM(personnel_id=person.id, year=today.year, month=month)
            row.workdays, row.employed_workdays = workdays, employed
            row.employment_mm = round(employed / workdays if workdays else 0, 4)
            session.add(row)
    # Only today's operational projections are refreshed. Past snapshots/KPI,
    # assignment history and its MM ledger remain intact.
    snapshots = {
        model: session.scalars(select(model).where(model.personnel_id == person.id, model.as_of_date == today)).all()
        for model in (CurrentAssignmentSnapshot, WeeklyLoadSnapshot)
    }
    if is_pmo_personnel(person) and person.is_active:
        assignments = session.scalars(select(ProjectAssignment).where(ProjectAssignment.personnel_id == person.id)).all()
        projects = {p.id: p for p in session.scalars(select(Project)).all()}
        backup._generate_person_snapshots(session, person, today, assignments, projects)
        generated = [row for row in session.new if isinstance(row, (CurrentAssignmentSnapshot, WeeklyLoadSnapshot)) and row.personnel_id == person.id]
        for row in generated:
            existing = next((old for old in snapshots[type(row)] if not isinstance(row, WeeklyLoadSnapshot) or old.week_offset == row.week_offset), None)
            if existing is not None:
                for column in row.__table__.columns:
                    if column.name not in {"id", "created_at", "updated_at", "weekly_note", "monthly_mm"}:
                        setattr(existing, column.name, getattr(row, column.name))
                session.expunge(row)
    else:
        for model in snapshots:
            session.execute(delete(model).where(model.personnel_id == person.id, model.as_of_date == today))


def refresh_open_kpi(session, *, through=None):
    today = date.today()
    session.flush()
    year, month = today.year, today.month
    through = through or (today.year, 12)
    while (year, month) <= through:
        rows = session.scalars(select(MonthlyKpiSummary).where(MonthlyKpiSummary.year == year, MonthlyKpiSummary.month == month, MonthlyKpiSummary.organization_name == "PMO본부")).all()
        if len(rows) > 1:
            raise HTTPException(status_code=409, detail="같은 조직/월의 KPI 원장이 중복되어 먼저 확인이 필요합니다.")
        if rows or session.scalar(select(MonthlyEmploymentMM.id).where(MonthlyEmploymentMM.year == year, MonthlyEmploymentMM.month == month).limit(1)):
            row = rows[0] if rows else MonthlyKpiSummary(year=year, month=month, organization_name="PMO본부")
            for key, value in pmo_monthly_kpi_values(session, year, month).items():
                setattr(row, key, value)
            row.source_snapshot_date = today
            session.add(row)
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)
