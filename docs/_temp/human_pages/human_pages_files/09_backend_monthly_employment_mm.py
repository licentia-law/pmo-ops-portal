from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select

from app.api.common import ListParams, apply_text_search, envelope, parse_sort
from app.api.deps import CurrentUser, DbSession
from app.domain.people import require_admin
from app.models.core import MonthlyEmploymentMM, Personnel
from app.schemas.people import MonthlyEmploymentMMRead, MonthlyEmploymentMMUpdate

router = APIRouter()


def serialize_monthly_employment_mm(row: MonthlyEmploymentMM) -> dict[str, object]:
    person = row.personnel
    return MonthlyEmploymentMMRead(
        id=row.id,
        personnel_id=row.personnel_id,
        personnel_name=person.name if person else None,
        group_name=person.group_name if person else None,
        team_name=person.team_name if person else None,
        year=row.year,
        month=row.month,
        workdays=row.workdays,
        employed_workdays=row.employed_workdays,
        employment_mm=float(row.employment_mm),
        note=row.note,
        created_at=row.created_at,
        updated_at=row.updated_at,
    ).model_dump(mode="json")


@router.get("")
def list_monthly_employment_mm(
    session: DbSession,
    params: ListParams = Depends(),
    year: int | None = None,
    month: int | None = None,
    personnel_id: str | None = None,
    group_name: str | None = None,
    team_name: str | None = None,
    is_active: bool | None = True,
) -> dict[str, object]:
    statement = select(MonthlyEmploymentMM).join(Personnel, MonthlyEmploymentMM.personnel_id == Personnel.id, isouter=True)
    statement = apply_text_search(
        statement,
        params.q,
        [Personnel.name, Personnel.employee_no, Personnel.email, Personnel.group_name, Personnel.team_name],
    )
    if year is not None:
        statement = statement.where(MonthlyEmploymentMM.year == year)
    if month is not None:
        if month < 1 or month > 12:
            raise HTTPException(status_code=400, detail="월은 1부터 12 사이여야 합니다.")
        statement = statement.where(MonthlyEmploymentMM.month == month)
    if personnel_id:
        statement = statement.where(MonthlyEmploymentMM.personnel_id == personnel_id)
    if group_name:
        statement = statement.where(Personnel.group_name == group_name)
    if team_name:
        statement = statement.where(Personnel.team_name == team_name)
    if is_active is not None:
        statement = statement.where(Personnel.is_active == is_active)
    statement = statement.order_by(
        parse_sort(
            params.sort,
            {
                "year": MonthlyEmploymentMM.year,
                "month": MonthlyEmploymentMM.month,
                "personnel_id": MonthlyEmploymentMM.personnel_id,
                "employment_mm": MonthlyEmploymentMM.employment_mm,
                "updated_at": MonthlyEmploymentMM.updated_at,
            },
            default="-year",
        ),
        MonthlyEmploymentMM.month.asc(),
        Personnel.name.asc(),
    )
    total = session.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    rows = session.scalars(statement.offset((params.page - 1) * params.page_size).limit(params.page_size)).all()
    return envelope(
        [serialize_monthly_employment_mm(row) for row in rows],
        {"page": params.page, "page_size": params.page_size, "total": total},
    )


@router.patch("/{monthly_employment_mm_id}")
def update_monthly_employment_mm(
    monthly_employment_mm_id: str,
    payload: MonthlyEmploymentMMUpdate,
    session: DbSession,
    user: CurrentUser,
) -> dict[str, object]:
    require_admin(user, "월별 재직 MM 수정 권한이 없습니다.")
    row = session.get(MonthlyEmploymentMM, monthly_employment_mm_id)
    if row is None:
        raise HTTPException(status_code=404, detail="월별 재직 MM을 찾을 수 없습니다.")
    updates = payload.model_dump(exclude_unset=True)
    next_workdays = updates.get("workdays", row.workdays)
    next_employed_workdays = updates.get("employed_workdays", row.employed_workdays)
    if next_workdays is not None and next_employed_workdays is not None and next_employed_workdays > next_workdays:
        raise HTTPException(status_code=400, detail="재직 근무일수는 월 근무일수를 초과할 수 없습니다.")
    for field, value in updates.items():
        setattr(row, field, value)
    session.commit()
    session.refresh(row)
    return envelope(serialize_monthly_employment_mm(row))
