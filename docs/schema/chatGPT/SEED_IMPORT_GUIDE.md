# PMO Import-ready Seed Bundle

## 파일 목록 및 헤더
- **users_seed.csv**
  - rows: 12
  - headers: id, email, name, permission, data_scope, organization_role, team_name
- **personnel_seed.csv**
  - rows: 17
  - headers: id, employee_no, name, email, group_name, team_name, department_name, position_name, role_name, grade_name, employment_status, joined_on, employment_start_date, employment_end_date, unit_price, base_mm, monthly_mm, total_mm, note
- **project_codes_seed.csv**
  - rows: 133
  - headers: id, code, name, project_type, status, certainty, sales_department, sales_owner, support_lead, owner_name, start_date, end_date, is_active, source_sheet, note
- **projects_seed.csv**
  - rows: 133
  - headers: id, project_code_id, code, name, client_name, owner_department, lead_department, sales_department, sales_owner, project_type, status, certainty, pm_name, proposal_pm_name, presentation_pm_name, support_lead, proposal_team_text, amount_text, total_amount, company_amount, currency, start_date, end_date, bid_notice_no, bid_notice_date, pre_notice_no, pre_notice_date, submission_at, submission_format, submission_note, presentation_at, presentation_format, presentation_note, recent_activity_at, memo, source_sheet, raw_payload
- **project_assignments_seed.csv**
  - rows: 38
  - headers: id, project_id, personnel_id, assignment_type, assignment_role, assignment_status, win_loss, onsite_type, is_primary, sequence_no, start_date, end_date, mm, monthly_mm, total_mm, current_mm, certainty_rate, unit_price, note, source_sheet
- **project_logs_seed.csv**
  - rows: 85
  - headers: id, project_id, status, previous_status, next_status, category, logged_at, author_name, author_team, summary, content, detail, related_schedule_label, related_schedule_at, source_sheet
- **holidays_seed.csv**
  - rows: 16
  - headers: holiday_date, name, holiday_type, is_counted_as_workday
- **monthly_employment_mm_seed.csv**
  - rows: 102
  - headers: personnel_id, year, month, workdays, employed_workdays, employment_mm
- **monthly_assignment_mm_seed.csv**
  - rows: 132
  - headers: assignment_id, project_id, personnel_id, year, month, assignment_mm, certainty_rate, weighted_mm, assignment_type
- **current_assignment_snapshots_seed.csv**
  - rows: 17
  - headers: as_of_date, personnel_id, representative_status, project_id, project_name, project_code, assignment_id, current_start_date, current_end_date, next_project_id, next_project_name, weekly_note, monthly_mm
- **weekly_load_snapshots_seed.csv**
  - rows: 51
  - headers: as_of_date, personnel_id, week_offset, week_label, representative_status, project_id, project_name, start_date, end_date
- **monthly_kpi_summaries_seed.csv**
  - rows: 24
  - headers: year, month, organization_name, avg_headcount_mm, running_mm, proposing_mm, support_mm, idle_mm, utilization_rate, contract_rate, source_snapshot_date

## 적재 순서
1. users_seed.csv
2. personnel_seed.csv
3. project_codes_seed.csv
4. projects_seed.csv
5. project_assignments_seed.csv
6. project_logs_seed.csv
7. holidays_seed.csv
8. monthly_employment_mm_seed.csv
9. monthly_assignment_mm_seed.csv
10. current_assignment_snapshots_seed.csv
11. weekly_load_snapshots_seed.csv
12. monthly_kpi_summaries_seed.csv

## 검증 체크리스트
- [ ] projects.project_code_id 값이 모두 project_codes.id에 존재하는지 확인
- [ ] project_assignments.project_id 값이 모두 projects.id에 존재하는지 확인
- [ ] project_assignments.personnel_id 값이 모두 personnel.id에 존재하는지 확인
- [ ] project_logs.project_id 값이 모두 projects.id에 존재하는지 확인
- [ ] project_codes.code 와 projects.code 가 1:1로 맞는지 확인
- [ ] 대표 프로젝트 P2026001 상세 필드가 모두 채워졌는지 확인
- [ ] current_assignment_snapshots 기준 2026-05-07에 running 8 / proposing 6 / waiting 3 인지 확인
- [ ] projects 총 건수가 40건 이상인지 확인
- [ ] project_logs 60건 이상인지 확인
- [ ] 날짜 형식이 YYYY-MM-DD / YYYY-MM-DDTHH:MM:SS 로 통일되었는지 확인

## 비고
- organizations_seed.csv, teams_seed.csv 는 생성하지 않았음
- 조직/팀은 문자열 컬럼(group_name, team_name, lead_department, sales_department 등)에 직접 반영
- enum 값은 화면 라벨이 아니라 DB 내부 value 사용
- project_logs.user_id 컬럼은 업로드된 스키마 문서에 실제 DB 컬럼으로 명시되지 않아 제외함