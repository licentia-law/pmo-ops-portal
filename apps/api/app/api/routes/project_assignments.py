from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.api.common import ListParams, apply_text_search, envelope, paginate, parse_sort
from app.api.deps import DbSession, capability_guard
from app.domain.assignments import person_can_be_deployed
from app.domain.people import is_pmo_personnel
from app.enums import AssignmentStatus, Capability
from app.models.core import ProjectAssignment, Personnel, MonthlyAssignmentMM, User
from app.schemas.assignments import AssignmentCreate, AssignmentUpdate
from app.services import project_assignments as service

router = APIRouter()
monthly_router = APIRouter()
AssignmentUser = Annotated[User, Depends(capability_guard(Capability.ASSIGNMENT_MANAGE))]


@router.get("")
def list_assignments(session: DbSession, params: ListParams = Depends(), project_id: str | None = None,
                     personnel_id: str | None = None, assignment_status: AssignmentStatus | None = None):
    statement = select(ProjectAssignment).outerjoin(Personnel, Personnel.id == ProjectAssignment.personnel_id)
    if project_id:
        statement = statement.where(ProjectAssignment.project_id == project_id)
    if personnel_id:
        statement = statement.where(ProjectAssignment.personnel_id == personnel_id)
    if assignment_status:
        statement = statement.where(ProjectAssignment.assignment_status == assignment_status)
    statement = apply_text_search(statement, params.q, [Personnel.name, ProjectAssignment.note])
    statement = statement.order_by(parse_sort(params.sort, {"updated_at": ProjectAssignment.updated_at, "start_date": ProjectAssignment.start_date, "name": Personnel.name}), ProjectAssignment.id)
    rows, total = paginate(session, statement, params.page, params.page_size)
    return envelope([service.serialize_assignment(session, row) for row in rows],
                    {"page": params.page, "page_size": params.page_size, "total": total, "version": service.version(session)})


@router.get("/candidates")
def candidates(session: DbSession, user: AssignmentUser):
    rows = session.scalars(select(Personnel).where(Personnel.is_active.is_(True)).order_by(Personnel.name, Personnel.id)).all()
    return envelope([{
        "id": p.id, "name": p.name, "personnel_type": p.personnel_type.value,
        "group_name": p.group_name, "team_name": p.team_name, "employee_no": p.employee_no,
        "eligible": person_can_be_deployed(p) and (not is_pmo_personnel(p) or p.mm_start_date is not None),
        "reason": "" if person_can_be_deployed(p) and (not is_pmo_personnel(p) or p.mm_start_date is not None) else "재직 상태 또는 PMO MM 시작일 확인 필요",
    } for p in rows])


@router.post("/validate")
def validate_create(payload: AssignmentCreate, session: DbSession, user: AssignmentUser):
    return envelope(service.preflight(session, user, payload))


@router.post("/{assignment_id}/validate")
def validate_update(assignment_id: str, payload: AssignmentUpdate, session: DbSession, user: AssignmentUser):
    return envelope(service.preflight(session, user, payload, assignment_id))


@router.post("", status_code=201)
def create(payload: AssignmentCreate, session: DbSession, user: AssignmentUser):
    return envelope(service.save_assignment(session, user, payload))


@router.patch("/{assignment_id}")
def update(assignment_id: str, payload: AssignmentUpdate, session: DbSession, user: AssignmentUser):
    return envelope(service.save_assignment(session, user, payload, assignment_id))


@monthly_router.get("")
def monthly_assignments(session: DbSession, params: ListParams = Depends(), project_id: str | None = None,
                        personnel_id: str | None = None, year: int | None = None, month: int | None = None):
    statement = select(MonthlyAssignmentMM)
    for field, value in (("project_id", project_id), ("personnel_id", personnel_id), ("year", year), ("month", month)):
        if value is not None:
            statement = statement.where(getattr(MonthlyAssignmentMM, field) == value)
    statement = statement.order_by(MonthlyAssignmentMM.year, MonthlyAssignmentMM.month, MonthlyAssignmentMM.id)
    rows, total = paginate(session, statement, params.page, params.page_size)
    return envelope([{c.name: service.scalar(getattr(row, c.name)) for c in row.__table__.columns} for row in rows],
                    {"page": params.page, "page_size": params.page_size, "total": total})
