import calendar
from datetime import date, timedelta
import json

import pytest
from sqlalchemy import select, func

from app.models.core import Personnel, ProjectAssignment, MonthlyAssignmentMM, MonthlyEmploymentMM, MonthlyKpiSummary, CurrentAssignmentSnapshot, ProjectLog, JobLock, User
from app.services import project_assignments as service, data_backup as backup
from app.domain.kpi import pmo_monthly_kpi_values
from test_capabilities import capability_db as capability_db, headers, grant
from test_project_excel import seed, dataset


def setup(factory):
    project_id = seed(factory, 1)[0]
    today = date.today()
    with factory() as session:
        for kind in ("pmo", "sales", "technical", "external"):
            session.add(Personnel(id=kind + "-new", name=kind + "인력", personnel_type=kind, employment_status="active", is_active=True, mm_start_date=date(today.year, 1, 1) if kind == "pmo" else None))
        session.flush()
        session.add(MonthlyEmploymentMM(id="manual-salary", personnel_id="pmo-new", year=today.year, month=today.month, employment_mm=0.75, workdays=20, employed_workdays=15))
        session.add(CurrentAssignmentSnapshot(id="past-pmo", personnel_id="pmo-new", as_of_date=today - timedelta(days=7), representative_status="unassigned"))
        session.commit()
    return project_id


def values(project_id, person="pmo-new", **changes):
    today = date.today()
    return dict(project_id=project_id, personnel_id=person, assignment_type="delivery", assignment_role="delivery_team", assignment_status="assigned",
                start_date=date(today.year, today.month, 1).isoformat(), end_date=date(today.year, today.month, calendar.monthrange(today.year, today.month)[1]).isoformat(),
                monthly_base_mm=1, certainty_rate=50, onsite_type="hybrid", is_primary=True) | changes


def preview(client, payload, id=None, actor="developer"):
    response = client.post(f"/api/project-assignments{('/' + id) if id else ''}/validate", headers=headers(actor), json=payload)
    assert response.status_code == 200, response.text
    return response.json()["data"]


def save(client, payload, id=None, actor="developer", ack=True):
    check = preview(client, payload, id, actor)
    response = client.request("PATCH" if id else "POST", f"/api/project-assignments{('/' + id) if id else ''}", headers=headers(actor), json=payload | {"expected_version": check["version"], "acknowledge_warnings": ack})
    assert response.status_code == (200 if id else 201), response.text
    return response.json()["data"]["assignment"]


def patch(**changes):
    return {"expected_version": "validate-first", **changes}


def test_permissions_candidates_and_no_header_bypass(capability_db):
    client, factory = capability_db
    project = setup(factory)
    payload = values(project)
    assert client.post("/api/project-assignments/validate", json=payload).status_code == 401
    assert client.post("/api/project-assignments", headers=headers("admin", **{"x-user-capabilities": "assignment_manage", "x-user-is-developer": "true"}), json=payload).status_code == 403
    assert client.get("/api/project-assignments/candidates", headers=headers("member")).status_code == 403
    assert client.get("/api/project-assignments").status_code == 200
    assert grant(client, "member", ["assignment_manage"]).status_code == 200
    candidates = client.get("/api/project-assignments/candidates", headers=headers("member")).json()["data"]
    assert {p["personnel_type"] for p in candidates} == {"pmo", "sales", "technical", "external"}
    saved = save(client, payload, actor="member")
    assert saved["personnel_id"] == "pmo-new"
    assert grant(client, "member", []).status_code == 200
    assert client.patch(f"/api/project-assignments/{saved['id']}", headers=headers("member"), json=patch(note="denied")).status_code == 403


def test_create_mm_snapshots_audit_and_non_pmo_scope(capability_db):
    client, factory = capability_db
    project = setup(factory)
    pmo = save(client, values(project))
    assert pmo["monthly_base_mm"] == 1 and pmo["current_month_mm"] == 1
    for kind in ("sales", "technical", "external"):
        non_pmo = save(client, values(project, kind + "-new", monthly_base_mm=3))
        assert non_pmo["current_month_mm"] == 3
    today = date.today()
    with factory() as session:
        kpi = pmo_monthly_kpi_values(session, today.year, today.month)
        assert kpi["avg_headcount_mm"] == 0.75 and kpi["running_mm"] == 0.5
        assert float(session.get(MonthlyEmploymentMM, "manual-salary").employment_mm) == 0.75
        assert session.get(CurrentAssignmentSnapshot, "past-pmo").representative_status == "unassigned"
        current = session.scalar(select(CurrentAssignmentSnapshot).where(CurrentAssignmentSnapshot.personnel_id == "pmo-new", CurrentAssignmentSnapshot.as_of_date == today))
        assert current.assignment_id == pmo["id"]
        assert session.scalar(select(func.count()).select_from(CurrentAssignmentSnapshot).where(CurrentAssignmentSnapshot.personnel_id.in_(["sales-new", "technical-new", "external-new"]), CurrentAssignmentSnapshot.as_of_date == today)) == 0
        audit = session.scalar(select(ProjectLog).where(ProjectLog.content.contains(pmo["id"])))
        assert audit.author_name == "developer" and "투입 배정 등록" in audit.content
    participants = client.get(f"/api/p1-screens/project-detail?project_id={project}").json()["data"]["assignments"]
    assert {row["name"] for row in participants} >= {"pmo인력", "sales인력", "technical인력", "external인력"}
    assert client.get(f"/api/monthly-assignment-mm?project_id={project}&year={today.year}&month={today.month}").json()["meta"]["total"] == 4
    save(client, patch(certainty_rate=0), pmo["id"])
    with factory() as session:
        assert pmo_monthly_kpi_values(session, today.year, today.month)["running_mm"] == 0


@pytest.mark.parametrize("change,code", [({"end_date":"1900-01-01"},400), ({"monthly_base_mm":-1},422), ({"monthly_base_mm":1.001},422), ({"certainty_rate":101},422), ({"onsite_type":"bad"},422), ({"assignment_role":"proposal_pm"},400), ({"personnel_id":"missing"},404), ({"assignment_status":"cancelled"},400), ({"assignment_type":"unassigned"},400)])
def test_invalid_inputs_do_not_mutate(capability_db, change, code):
    client, factory = capability_db
    project = setup(factory)
    before = dataset(factory)
    response = client.post("/api/project-assignments/validate", headers=headers(), json=values(project, **change))
    assert response.status_code == code, response.text
    assert dataset(factory) == before


def test_overlap_warning_duplicate_and_version_conflict(capability_db):
    client, factory = capability_db
    project = setup(factory)
    row = save(client, values(project))
    duplicate = client.post("/api/project-assignments/validate", headers=headers(), json=values(project))
    assert duplicate.status_code == 409
    overlapping = values(project, assignment_type="support", assignment_role="support_team")
    check = preview(client, overlapping)
    assert len(check["overlaps"]) == 1 and check["warnings"]
    body = overlapping | {"expected_version": check["version"]}
    assert client.post("/api/project-assignments", headers=headers(), json=body).status_code == 409
    save(client, patch(note="stored"), row["id"])
    assert client.post("/api/project-assignments", headers=headers(), json=body | {"acknowledge_warnings":True}).status_code == 409
    assert save(client, overlapping)["id"] != row["id"]
    assert client.patch(f"/api/project-assignments/{row['id']}", headers=headers(), json=patch(personnel_id="external-new")).status_code == 422
    other = save(client, values(project, assignment_role="delivery_pm"))
    assert client.post(f"/api/project-assignments/{other['id']}/validate", headers=headers(), json=patch(assignment_role="delivery_team")).status_code == 409


def test_cancel_preserves_history_and_current_representative(capability_db):
    client, factory = capability_db
    project = setup(factory)
    current = save(client, values(project))
    assert client.post(f"/api/project-assignments/{current['id']}/validate", headers=headers(), json=patch(assignment_status="cancelled")).status_code == 400
    today = date.today()
    future = save(client, values(project, assignment_status="planned", start_date=(today+timedelta(days=40)).isoformat(), end_date=(today+timedelta(days=50)).isoformat()))
    with factory() as session:
        snapshot = session.scalar(select(CurrentAssignmentSnapshot).where(CurrentAssignmentSnapshot.personnel_id=="pmo-new", CurrentAssignmentSnapshot.as_of_date==today))
        snapshot_id = snapshot.id
        assert snapshot.assignment_id == current["id"]
    cancelled = save(client, patch(assignment_status="cancelled"), future["id"])
    assert cancelled["assignment_status"] == "cancelled" and cancelled["current_month_mm"] == 0
    assert client.get(f"/api/project-assignments?project_id={project}&assignment_status=cancelled").json()["meta"]["total"] == 1
    assert client.post(f"/api/project-assignments/{future['id']}/validate", headers=headers(), json=patch(assignment_status="planned")).status_code == 400
    with factory() as session:
        assert session.get(ProjectAssignment, future["id"])
        assert session.get(CurrentAssignmentSnapshot, snapshot_id).assignment_id == current["id"]


def test_legacy_note_edit_preserves_raw_mm_and_historical_ledgers(capability_db):
    client, factory = capability_db
    setup(factory)
    with factory() as session:
        row = session.get(ProjectAssignment, "assignment")
        row.mm, row.current_mm, row.total_mm, row.onsite_type = 5, 3.5, 5.5, "legacy-value"
        row.start_date = None
        session.commit()
        old = backup._serialize_table_rows(session, MonthlyAssignmentMM)
    saved = save(client, patch(note="legacy note"), "assignment")
    assert saved["monthly_base_mm"] is None and saved["effective_base_mm"] == 3.5
    with factory() as session:
        row = session.get(ProjectAssignment, "assignment")
        assert (float(row.mm), float(row.current_mm), float(row.total_mm), row.onsite_type) == (5,3.5,5.5,"legacy-value")
        assert backup._serialize_table_rows(session, MonthlyAssignmentMM) == old


def test_historical_mm_and_kpi_preserved_ended_warning(capability_db):
    client, factory = capability_db
    project = setup(factory)
    today = date.today()
    end = today.replace(day=1) - timedelta(days=1)
    past = save(client, values(project, assignment_status="ended", start_date=end.replace(day=1).isoformat(), end_date=end.isoformat()))
    with factory() as session:
        session.add(MonthlyAssignmentMM(id="closed-mm",assignment_id=past["id"], project_id=project, personnel_id="pmo-new",year=end.year,month=end.month,assignment_type="delivery",assignment_mm=7,weighted_mm=4))
        row=session.get(ProjectAssignment,past["id"])
        row.monthly_mm = {**row.monthly_mm, f"{end.year:04}-{end.month:02}":7}
        session.commit()
        old_kpi = backup._serialize_table_rows(session, MonthlyKpiSummary)
    check=preview(client, patch(monthly_base_mm=2), past["id"])
    assert check["warnings"]
    assert client.patch(f"/api/project-assignments/{past['id']}",headers=headers(),json=patch(monthly_base_mm=2,expected_version=check["version"])).status_code==409
    save(client,patch(monthly_base_mm=2),past["id"])
    with factory() as session:
        assert float(session.get(MonthlyAssignmentMM,"closed-mm").assignment_mm)==7
        assert session.get(ProjectAssignment,past["id"]).monthly_mm[f"{end.year:04}-{end.month:02}"]==7
        assert session.get(MonthlyKpiSummary,"kpi").avg_headcount_mm==old_kpi[0]["avg_headcount_mm"]


def test_transaction_rollback_and_retry(capability_db, monkeypatch):
    client, factory = capability_db
    project = setup(factory)
    payload = values(project)
    check = preview(client,payload)
    before = dataset(factory)
    original = service.refresh_open_kpi
    def fail(session, **_):
        session.flush()
        raise RuntimeError("projection failed")
    monkeypatch.setattr(service,"refresh_open_kpi", fail)
    with pytest.raises(RuntimeError,match="projection failed"):
        client.post("/api/project-assignments",headers=headers(),json=payload | {"expected_version":check["version"]})
    assert dataset(factory)==before
    with factory() as session:
        assert session.scalar(select(JobLock)) is None
    monkeypatch.setattr(service,"refresh_open_kpi",original)
    save(client,payload)


def test_backup_roundtrip_and_legacy_missing_monthly_base(capability_db):
    client, factory = capability_db
    project = setup(factory)
    row = save(client,values(project,monthly_base_mm=1.25))
    with factory() as session:
        record=backup.create_backup(session,actor_name="검증",kind="manual_backup")
        backup.restore_backup(session,backup_id=record["backup_id"],memo=None,user=session.get(User,"developer"))
        assert float(session.get(ProjectAssignment,row["id"]).monthly_base_mm)==1.25
        path=backup.BACKUP_DIR / f"{record['backup_id']}.json"
        data=json.loads(path.read_text(encoding="utf-8"))
        for assignment in data["tables"]["project_assignments"]:
            assignment.pop("monthly_base_mm",None)
        path.write_text(json.dumps(data,ensure_ascii=False),encoding="utf-8")
        backup.restore_backup(session,backup_id=record["backup_id"],memo=None,user=session.get(User,"developer"))
        assert session.get(ProjectAssignment,row["id"]).monthly_base_mm is None


def test_snapshot_priority_and_empty_future_weeks(capability_db):
    client, factory = capability_db
    project = setup(factory)
    today = date.today()
    delivery = save(client, values(project, is_primary=False, end_date=today.isoformat()))
    save(client, values(project, assignment_type="proposal",assignment_role="proposal_team",is_primary=True,end_date=today.isoformat()))
    from app.models.core import WeeklyLoadSnapshot
    with factory() as session:
        snapshot=session.scalar(select(CurrentAssignmentSnapshot).where(CurrentAssignmentSnapshot.personnel_id=="pmo-new",CurrentAssignmentSnapshot.as_of_date==today))
        assert snapshot.assignment_id==delivery["id"] and snapshot.representative_status=="delivery"
        weeks=session.scalars(select(WeeklyLoadSnapshot).where(WeeklyLoadSnapshot.personnel_id=="pmo-new",WeeklyLoadSnapshot.as_of_date==today,WeeklyLoadSnapshot.week_offset>0)).all()
        assert weeks and all(w.representative_status=="unassigned" and w.project_id is None for w in weeks)
    participant=client.get(f"/api/p1-screens/project-detail?project_id={project}").json()["data"]["assignments"]
    pmo=next(row for row in participant if row["name"]=="pmo인력")
    assert pmo["role"]=="수행팀"


def test_eligibility_null_patch_noop_and_post_start_end(capability_db):
    client, factory = capability_db
    project=setup(factory)
    with factory() as session:
        session.get(Personnel,"pmo-new").employment_status="leave"
        session.commit()
    assert client.post("/api/project-assignments/validate",headers=headers(),json=values(project)).status_code==400
    with factory() as session:
        person=session.get(Personnel,"pmo-new")
        person.employment_status="active"
        person.mm_start_date=None
        session.commit()
    assert client.post("/api/project-assignments/validate",headers=headers(),json=values(project)).status_code==400
    row=save(client,values(project,"external-new",certainty_rate=None))
    before=dataset(factory)
    saved=save(client,patch(),row["id"])
    assert saved["id"]==row["id"] and dataset(factory)==before
    for change in ({"monthly_base_mm":None},{"start_date":None},{"is_primary":None}):
        assert client.post(f"/api/project-assignments/{row['id']}/validate",headers=headers(),json=patch(**change)).status_code==400
    ended=save(client,patch(assignment_status="ended",end_date=date.today().isoformat()),row["id"])
    assert not ended["is_current"]


def test_cancelled_backup_and_future_json_mm_cleared(capability_db):
    client,factory=capability_db
    project=setup(factory)
    today=date.today()
    row=save(client,values(project,assignment_status="planned",start_date=(today+timedelta(days=40)).isoformat(),end_date=(today+timedelta(days=50)).isoformat()))
    with factory() as session:
        assignment=session.get(ProjectAssignment,row["id"])
        assignment.monthly_mm={**assignment.monthly_mm,f"{today.year+1}-03":9,"legacy-label":3}
        session.commit()
    saved=save(client,patch(assignment_status="cancelled"),row["id"])
    with factory() as session:
        assignment=session.get(ProjectAssignment,row["id"])
        assert assignment.monthly_mm[f"{today.year+1}-03"]==0 and assignment.monthly_mm["legacy-label"]==3
        record=backup.create_backup(session,actor_name="검증",kind="manual_backup")
        backup.restore_backup(session,backup_id=record["backup_id"],memo=None,user=session.get(User,"developer"))
        assert session.get(ProjectAssignment,saved["id"]).assignment_status=="cancelled"
