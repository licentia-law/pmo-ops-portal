"""Shared assignment status, monthly input and forecast eligibility rules."""
from datetime import date

from app.enums import AssignmentStatus, AssignmentType, EmploymentStatus, ProjectAssignmentRole
from app.domain.people import is_pmo_personnel

ROLE_TYPES = {
    ProjectAssignmentRole.PROPOSAL_PM: AssignmentType.PROPOSAL,
    ProjectAssignmentRole.PRESENTATION_PM: AssignmentType.PROPOSAL,
    ProjectAssignmentRole.PROPOSAL_TEAM: AssignmentType.PROPOSAL,
    ProjectAssignmentRole.DELIVERY_PM: AssignmentType.DELIVERY,
    ProjectAssignmentRole.DELIVERY_TEAM: AssignmentType.DELIVERY,
    ProjectAssignmentRole.SUPPORT_TEAM: AssignmentType.SUPPORT,
}


def base_assignment_mm(assignment):
    if assignment.monthly_base_mm is not None:
        return float(assignment.monthly_base_mm)
    for candidate in (assignment.current_mm, assignment.total_mm, assignment.mm):
        if candidate is not None:
            return float(candidate)
    return 0.0


def is_cancelled(assignment):
    return assignment.assignment_status == AssignmentStatus.CANCELLED


def is_current_assignment(assignment, as_of: date):
    if assignment.assignment_type == AssignmentType.UNASSIGNED:
        return False
    if assignment.assignment_status not in (None, AssignmentStatus.ASSIGNED):
        return False
    return (not assignment.start_date or assignment.start_date <= as_of) and (not assignment.end_date or assignment.end_date >= as_of)


def operational_assignments(assignments):
    return [a for a in assignments if a.assignment_status not in (AssignmentStatus.CANCELLED, AssignmentStatus.ENDED) and a.assignment_type != AssignmentType.UNASSIGNED]


def representative_rank(assignment):
    return ({AssignmentType.DELIVERY: 0, AssignmentType.PROPOSAL: 1, AssignmentType.SUPPORT: 2}.get(assignment.assignment_type, 3), not assignment.is_primary, assignment.start_date or date.min, assignment.id or "")


def person_can_be_deployed(person):
    return person.is_active and (not is_pmo_personnel(person) or person.employment_status not in (EmploymentStatus.RETIRED, EmploymentStatus.TRANSFERRED, EmploymentStatus.LEAVE))
