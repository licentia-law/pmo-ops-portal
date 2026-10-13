"""PMO monthly projection from preserved MM ledgers, without rewriting history."""
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.people import apply_personnel_scope
from app.enums import AssignmentType
from app.models.core import MonthlyAssignmentMM, MonthlyEmploymentMM, MonthlyKpiSummary, Personnel


def pmo_monthly_kpi_values(session: Session, year: int, month: int) -> dict[str, float]:
    employment = session.scalars(apply_personnel_scope(
        select(MonthlyEmploymentMM).join(Personnel, MonthlyEmploymentMM.personnel_id == Personnel.id)
        .where(MonthlyEmploymentMM.year == year, MonthlyEmploymentMM.month == month), "pmo",
    )).all()
    assignments = session.scalars(apply_personnel_scope(
        select(MonthlyAssignmentMM).join(Personnel, MonthlyAssignmentMM.personnel_id == Personnel.id)
        .where(MonthlyAssignmentMM.year == year, MonthlyAssignmentMM.month == month), "pmo",
    )).all()
    denominator = sum(float(row.employment_mm or 0) for row in employment)
    totals = defaultdict(float)
    for row in assignments:
        totals[row.assignment_type] += float(
            row.weighted_mm if row.weighted_mm is not None else row.assignment_mm
        )
    running = totals[AssignmentType.DELIVERY]
    proposing = totals[AssignmentType.PROPOSAL]
    support = totals[AssignmentType.SUPPORT]
    assigned = running + proposing + support
    # Preserve existing generator formulas. PRD 8.1 reconciliation is a separate task.
    return {
        "avg_headcount_mm": round(denominator, 4),
        "running_mm": round(running, 4),
        "proposing_mm": round(proposing, 4),
        "support_mm": round(support, 4),
        "idle_mm": round(max(denominator - assigned, 0), 4),
        "utilization_rate": round(running / denominator * 100, 2) if denominator else 0.0,
        "contract_rate": round(assigned / denominator * 100, 2) if denominator else 0.0,
    }


def scoped_kpi_projection(session: Session, stored: MonthlyKpiSummary | None) -> MonthlyKpiSummary | None:
    if stored is None:
        return None
    # Transient object: preserve the stored snapshot and never flush calculated values.
    return MonthlyKpiSummary(
        id=stored.id, year=stored.year, month=stored.month,
        organization_name=stored.organization_name, source_snapshot_date=stored.source_snapshot_date,
        **pmo_monthly_kpi_values(session, stored.year, stored.month),
    )
