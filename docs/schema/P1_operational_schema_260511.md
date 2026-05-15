# P1 Operational Schema — PMO 업무수행 관리시스템

작성일: 2026-05-11

## 1. 목적

이 문서는 `PRD_260506_1415.md`, `analysis_pmo_excel_260429_1749.md`, 그리고 현재 구현된 P1 화면(홈, 대시보드, 업무수행현황, 프로젝트코드, 프로젝트 상세, 진행이력)을 기준으로 더미/시드 데이터를 만들기 위한 DB 스키마 기준을 정의한다.

이번 스키마의 우선순위는 다음과 같다.

1. P1 화면과 API 검증에 필요한 필드를 누락하지 않는다.
2. 기존 엑셀 2종의 핵심 구조를 정규화하되, 비정형 메모/상세는 JSON 또는 Text로 보존한다.
3. 더미 데이터 생성자가 참조 무결성을 유지하기 쉽도록 테이블 간 관계를 명확히 한다.
4. P2/P3 확장 가능성은 열어두되, 지금 단계에서 불필요한 과정규화는 피한다.

## 2. 상태/유형 코드

### ProjectStatus

| value | 화면 라벨 | 의미 |
| --- | --- | --- |
| `proposing` | 제안중 | 제안 준비/작성/접수 전후 |
| `presented` | 발표완료 | 발표 완료 후 결과 대기 |
| `win` | WIN | 수주 |
| `loss` | LOSS | 실주 |
| `drop` | DROP | 중단/Drop |
| `running` | 수행중 | 수주 후 수행 |
| `support` | 업무지원 | 단기/보조 지원 |
| `done` | 완료 | 수행/지원 종료 |

허용 전환:

| from | to |
| --- | --- |
| `proposing` | `presented`, `drop` |
| `presented` | `win`, `loss` |
| `win` | `running` |
| `running` | `done` |
| `support` | `done` |
| `loss`, `drop`, `done` | 없음 |

### ProjectType

| value | 화면 라벨 |
| --- | --- |
| `main` | 주사업 |
| `sub` | 부사업 |
| `subcontract` | 하도 |
| `partner` | 협력 |

### AssignmentType

| value | 의미 |
| --- | --- |
| `delivery` | 수행 |
| `proposal` | 제안 |
| `support` | 지원 |
| `unassigned` | 미투입/대기 |

### EmploymentStatus

| value | 의미 |
| --- | --- |
| `active` | 재직 |
| `leave` | 휴직 |
| `transferred` | 전배 |
| `retired` | 퇴직 |
| `waiting` | 대기 |

## 3. 핵심 테이블

### users

권한/사용자 검증용 테이블이다. P1에서는 헤더 사용자, 권한 테스트, 수정 권한 판단에 사용한다.

주요 컬럼:

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string uuid | PK |
| `email` | string unique | 로그인/식별 이메일 |
| `name` | string | 사용자명 |
| `permission` | enum | `read_only`, `general_editor`, `project_editor`, `admin` |
| `data_scope` | enum | `all`, `headquarters`, `team`, `own_projects` |
| `organization_role` | enum | `head`, `team_lead`, `member`, `pm`, `pl`, `other` |
| `team_name` | string | 소속팀 |

### personnel

엑셀 `인력재직현황`의 인력 마스터 + 월별 재직 MM 입력원이다.

주요 컬럼:

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string uuid | PK |
| `employee_no` | string unique | 엑셀 No/사번 성격 |
| `name` | string | 성명 |
| `email` | string unique nullable | 이메일 |
| `group_name` | string | 그룹/본부 구분 |
| `team_name` | string | PMO1팀, PMO2팀 등 |
| `department_name` | string | 부서명 |
| `position_name` | string | 직위 |
| `role_name` | string | 역할/직무 |
| `grade_name` | string | 호봉/등급 |
| `employment_status` | enum | 재직/휴직/전배/퇴직/대기 |
| `joined_on` | date | 입사일자 |
| `employment_start_date` | date | 재직 MM 산정 시작일 |
| `employment_end_date` | date | 재직 MM 산정 종료일 |
| `unit_price` | numeric | 사내단가 |
| `base_mm` | numeric | 기준 MM |
| `monthly_mm` | JSON | `{ "2026-01": 1.0, ... }` |
| `total_mm` | numeric | 연간/기간 합계 |
| `note` | text | 비고 |

더미 데이터 기준:

- 최소 17명 이상 생성한다.
- 팀은 `PMO1팀`, `PMO2팀`, `기술지원팀`을 포함한다.
- 대시보드 기준 예시와 맞추려면 현재 인원 17명, 수행 8명, 제안 6명, 대기 3명이 되도록 assignment/snapshot과 맞춘다.

### project_codes

엑셀 `프로젝트코드` 시트 성격의 프로젝트 마스터다. 코드 목록 페이지의 원천이다.

주요 컬럼:

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string uuid | PK |
| `code` | string unique | 예: `P2026001` |
| `name` | string | 프로젝트명 |
| `project_type` | enum | 주사업/부사업/하도/협력 |
| `status` | enum | 정규화 상태 |
| `certainty` | string | 확도/우세/경쟁 등 |
| `sales_department` | string | 영업부서 |
| `sales_owner` | string | 영업대표 |
| `owner_name` | string | 기존 API 호환용 담당자 |
| `start_date` | date | 시작일 |
| `end_date` | date | 종료일 |
| `is_active` | boolean | 사용여부 |
| `source_sheet` | string | 원천 시트명 |
| `note` | text | 비고 |

더미 데이터 기준:

- `projects.code`와 같은 값을 쓰는 레코드를 만든다.
- 78건까지 확장 가능하되, P1 검증은 20~40건이면 충분하다.
- 상태는 8개 상태가 모두 등장하도록 구성한다.

### projects

업무수행현황, 프로젝트 상세, 진행이력의 중심 테이블이다. 엑셀 `업무수행현황`의 비정형 원장을 정규화한 테이블이다.

주요 컬럼:

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string uuid | PK |
| `project_code_id` | FK | `project_codes.id` |
| `code` | string | 프로젝트 코드 |
| `name` | string | 사업명 |
| `client_name` | string | 고객사 |
| `owner_department` | string | 주관부서 |
| `lead_department` | string | 본부/리드부서 |
| `sales_department` | string | 영업부서 |
| `sales_owner` | string | 영업대표 |
| `project_type` | enum | 사업유형 |
| `status` | enum | 현재 상태 |
| `certainty` | string | 확도 |
| `proposal_pm_name` | string | 제안 PM |
| `presentation_pm_name` | string | 발표 PM |
| `delivery_pm_name` | string | 수행 PM |
| `amount_text` | string | 화면 표시 금액 예: `14억/11.9억` |
| `total_amount` | numeric | 총 사업금액(숫자) |
| `company_amount` | numeric | 당사 금액(숫자) |
| `start_date` | date | 프로젝트 기간 시작 |
| `end_date` | date | 프로젝트 기간 종료 |
| `bid_notice_no` | string | 공고번호 |
| `bid_notice_date` | date | 공고일 |
| `pre_notice_no` | string | 사전공고번호 |
| `pre_notice_date` | date | 사전공고일 |
| `submission_at` | datetime | 제출 일시 |
| `submission_format` | string | 제출 형식 |
| `submission_note` | text | 제출 비고 |
| `presentation_at` | datetime | 발표 일시 |
| `presentation_format` | string | 발표 형식 |
| `presentation_note` | text | 발표 비고 |
| `recent_activity_at` | datetime | 최근 활동 일시 |
| `memo` | text | 참고 메모 |
| `source_sheet` | string | 원천 시트명 |
| `raw_payload` | JSON | 엑셀 원본 보존용 |

더미 데이터 기준:

- 업무수행현황 카드 필터가 동작하도록 상태 그룹을 맞춘다.
  - 제안 단계: `proposing`, `presented`
  - 수행 단계: `running`, `support`
  - 종료: `win`, `loss`, `drop`, `done`
- 프로젝트 상세 검증용 대표 레코드 1건은 일정, 금액, PM, 공고, memo를 모두 채운다.
- `amount_text`는 화면 표시용으로 반드시 `총액/당사금액` 형식 문자열을 넣는다.

### 프로젝트 관리 화면 컬럼 매핑 (구현 기준)

기준 화면: `프로젝트 관리 > 프로젝트 목록`

| 화면 컬럼 | API 필드 (`/api/p1-screens/code`) | DB 소스 |
| --- | --- | --- |
| 코드 | `code` | `project_codes.code` |
| 사업명 | `name` | `project_codes.name` |
| 고객사 | `clientName` | `projects.client_name` |
| 상태 | `status` | `project_codes.status` |
| 사업유형 | `projectType` | `project_codes.project_type` |
| 확도 | `certainty` | `project_codes.certainty` |
| 사업금액 | `amountText` | `projects.amount_text` (없으면 `projects.total_amount/company_amount`로 계산) |
| 영업부서 | `salesDept` | `projects.sales_department` 우선, 없으면 `project_codes.sales_department` |
| 영업대표 | `salesOwner` | `project_codes.sales_owner` |
| 제안PM | `proposalPm` | `projects.proposal_pm_name` |
| 발표PM | `presentPm` | `projects.presentation_pm_name` |
| 수행PM | `deliveryPm` | `projects.delivery_pm_name` |
| 시작일 | `fromDate` | `project_codes.start_date` |
| 종료일 | `toDate` | `project_codes.end_date` |
| 공고번호 | `bidNoticeNo` | `projects.bid_notice_no` |
| 공고일 | `bidNoticeDate` | `projects.bid_notice_date` |
| 제안 제출일 | `proposalSubmissionAt` | `projects.submission_at` |
| 제출 형식 | `submissionFormat` | `projects.submission_format` |
| 제출 유의사항 | `submissionNote` | `projects.submission_note` |
| 제안 발표일 | `proposalPresentationAt` | `projects.presentation_at` |
| 발표 형식 | `presentationFormat` | `projects.presentation_format` |
| 발표 유의사항 | `presentationNote` | `projects.presentation_note` |
| 최근활동일 | `recentActivityAt` | `projects.recent_activity_at` |
| 사용여부 | `useStatus` | `project_codes.is_active` |

참고:
- `totalAmount`, `companyAmount`, `memo`는 API에 포함되지만 목록 테이블 보조/편집용 필드다.
- `pre_notice_no`, `pre_notice_date`는 스키마에 존재하나 현재 목록 컬럼에는 미노출이다.

### project_assignments

엑셀 `인력_투입현황MM`의 사람×프로젝트×기간 fact 테이블이다.

주요 컬럼:

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string uuid | PK |
| `project_id` | FK | `projects.id` |
| `personnel_id` | FK | `personnel.id` |
| `assignment_type` | enum | 수행/제안/지원/미투입 |
| `assignment_role` | string | PM, Sub-PM, TA 등 |
| `assignment_status` | string | 투입/철수/예정 등 |
| `win_loss` | string | WIN/LOSS/제안 등 원본 구분 |
| `onsite_type` | string | 상주/비상주/현장 등 |
| `is_primary` | boolean | 대표 투입 여부 |
| `sequence_no` | integer | 엑셀 No |
| `start_date` | date | 계약/투입 시작 |
| `end_date` | date | 계약/투입 종료 |
| `mm` | numeric | 기준 MM |
| `monthly_mm` | JSON | 월별 MM |
| `total_mm` | numeric | 월별 합계 |
| `current_mm` | numeric | 기준일까지 MM |
| `certainty_rate` | numeric | 확도 가중치(100, 50 등) |
| `unit_price` | numeric | 사내단가 |
| `note` | text | 비고 |
| `source_sheet` | string | 원천 시트명 |

더미 데이터 기준:

- `personnel` 17명에 대해 현재 기준 대표 투입/제안/대기 상태가 계산 가능해야 한다.
- 월별 MM JSON 예:

```json
{
  "2026-01": 0.5,
  "2026-02": 1.0,
  "2026-03": 1.0,
  "2026-04": 0.8,
  "2026-05": 0.4
}
```

### project_logs

진행이력 페이지와 프로젝트 상세 최근 진행사항의 원천이다.

주요 컬럼:

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string uuid | PK |
| `project_id` | FK | `projects.id` |
| `log_status` | enum | 진행이력 상태 (`memo`, `in_progress`, `done`) |
| `previous_status` | enum nullable | 상태 변경 전 |
| `next_status` | enum nullable | 상태 변경 후 |
| `logged_at` | datetime | 이력 발생 일시 |
| `author_name` | string | 작성자 |
| `updated_by_name` | string nullable | 최종 변경자 |
| `content` | text | 본문 |

더미 데이터 기준:

- 프로젝트별 최소 2~5건 이상 생성한다.
- 진행이력 페이지 요약 카드 검증을 위해 최근 7일 로그, 상태 변경 로그를 충분히 포함한다.
- 상태 변경 로그는 `previous_status`, `next_status`를 채운다.
- 등록 API에서는 `log_status`를 `memo` 또는 `in_progress`만 허용한다.
- 수정 API에서는 `memo -> memo`, `in_progress -> in_progress|done`만 허용한다.

### holidays

월별 MM 계산에서 근무일 산정에 사용하는 공휴일 테이블이다.

주요 컬럼:

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `holiday_date` | date unique | 공휴일 |
| `name` | string | 명칭 |
| `holiday_type` | enum | `public`, `company` |
| `is_counted_as_workday` | boolean | 근무일 포함 여부 |

## 4. 집계/스냅샷 테이블

### monthly_employment_mm

인력별 월별 재직 MM 결과 테이블이다.

| 컬럼 | 설명 |
| --- | --- |
| `personnel_id` | 인력 |
| `year`, `month` | 기준 월 |
| `workdays` | 해당 월 근무가능일 |
| `employed_workdays` | 재직 근무일 |
| `employment_mm` | 재직 MM |

### monthly_assignment_mm

투입 fact를 월별 MM으로 전개한 결과 테이블이다.

| 컬럼 | 설명 |
| --- | --- |
| `assignment_id` | 투입 fact |
| `project_id` | 프로젝트 |
| `personnel_id` | 인력 |
| `year`, `month` | 기준 월 |
| `assignment_mm` | 투입 MM |
| `certainty_rate` | 확도 |
| `weighted_mm` | 확도 가중 MM |
| `assignment_type` | 수행/제안/지원/미투입 |

### current_assignment_snapshots

기준일 현재 인력별 대표 상태 스냅샷이다.

| 컬럼 | 설명 |
| --- | --- |
| `as_of_date` | 기준일 |
| `personnel_id` | 인력 |
| `representative_status` | 대기/수행/제안/지원/휴직 등 |
| `project_id`, `project_name`, `project_code` | 현재 대표 프로젝트 |
| `assignment_id` | 대표 투입 fact |
| `current_start_date`, `current_end_date` | 현재 투입 기간 |
| `next_project_id`, `next_project_name` | 차기 예정 |
| `weekly_note` | 주간 보조 설명 |
| `monthly_mm` | 월별 제안/수행 MM 요약 |

### weekly_load_snapshots

전주/금주/차주 상태판용 스냅샷이다.

| 컬럼 | 설명 |
| --- | --- |
| `as_of_date` | 기준일 |
| `personnel_id` | 인력 |
| `week_offset` | -1, 0, 1 |
| `week_label` | 전주/금주/차주 |
| `representative_status` | 대표 상태 |
| `project_id`, `project_name` | 대표 프로젝트 |
| `start_date`, `end_date` | 해당 주 투입 기간 |

### monthly_kpi_summaries

대시보드/월별가동현황용 월별 집계 결과다.

| 컬럼 | 설명 |
| --- | --- |
| `year`, `month` | 기준 월 |
| `organization_name` | PMO본부/팀명 |
| `avg_headcount_mm` | 평균 재직 MM |
| `running_mm` | 수행 MM |
| `proposing_mm` | 제안 MM |
| `support_mm` | 지원 MM |
| `idle_mm` | 미투입 MM |
| `utilization_rate` | 가동률 |
| `contract_rate` | 가득률 |
| `source_snapshot_date` | 산출 기준일 |

## 5. 생성 순서

더미/시드 데이터는 아래 순서로 만든다.

1. `users`
2. `personnel`
3. `project_codes`
4. `projects`
5. `project_assignments`
6. `project_logs`
7. `holidays`
8. `monthly_employment_mm`
9. `monthly_assignment_mm`
10. `current_assignment_snapshots`
11. `weekly_load_snapshots`
12. `monthly_kpi_summaries`

## 6. P1 화면별 필요 데이터

| 화면 | 필요 테이블 |
| --- | --- |
| 홈 | `projects`, `project_logs`, `personnel`, `monthly_kpi_summaries` |
| 대시보드 | `personnel`, `project_assignments`, `monthly_kpi_summaries`, `current_assignment_snapshots` |
| 업무수행현황 | `projects`, `project_codes` |
| 프로젝트코드 | `project_codes`, `projects` |
| 프로젝트 상세 | `projects`, `project_assignments`, `personnel`, `project_logs` |
| 진행이력 | `project_logs`, `projects`, `personnel/users` |

## 7. 웹 ChatGPT 더미 데이터 생성 지시 요약

웹 ChatGPT에 더미 데이터를 요청할 때는 다음 조건을 포함한다.

- 기준일은 `2026-05-06` 또는 `2026-05-07`로 통일한다.
- 프로젝트 코드는 `P2026001` 형식으로 생성한다.
- 금액 표시 문자열은 `총액/당사금액` 형식으로 생성한다. 예: `14억/11.9억`.
- 최소 20개 프로젝트, 17명 인력, 60개 이상 로그를 만든다.
- 상태별로 다음 분포를 포함한다.
  - 제안 단계: `proposing`, `presented`
  - 수행 단계: `running`, `support`
  - 종료 단계: `win`, `loss`, `drop`, `done`
- 프로젝트 상세 대표 프로젝트 1건은 모든 상세 필드를 채운다.
- 진행이력은 `상태 변경`, `투입 인력 변경`, `발표 일정 등록`, `진행 메모`, `업무지정 등록`, `일정 변경`, `이슈` 유형을 모두 포함한다.
- 월별 MM은 `monthly_employment_mm`, `monthly_assignment_mm`, `monthly_kpi_summaries` 간 합계가 대략 맞도록 생성한다.

## 8. 현재 생성된 로컬 DB

검증용 SQLite DB:

```text
apps/api/pmo_ops_p1_schema.db
```

생성 명령:

```powershell
cd apps/api
$env:DATABASE_URL="sqlite:///C:/Users/mycho/Downloads/_Licentia/Coding/pmo-ops-portal/apps/api/pmo_ops_p1_schema.db"
.\.venv\Scripts\python -m alembic upgrade head
```
