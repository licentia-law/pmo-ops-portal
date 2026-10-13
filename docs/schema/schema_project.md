# Project Schema Manual

작성일: 2026-05-19  
대상: 프로젝트 관리/업무수행현황/프로젝트 상세/진행이력(P1)  
기준: 현재 구현 코드(`apps/api/app/api/routes/p1_screens.py`, `projects.py`, `project_logs.py`, `project_codes.py`)

## 1. 스키마 운영 원칙

1. 화면 표시/업무 데이터의 SSOT는 `projects` 중심으로 유지한다.
2. `project_codes`는 코드 마스터(식별자 + 활성여부 + 기본 상태/유형)로 최소화한다.
3. 인력 참여/역할/상태는 `project_assignments`를 SSOT로 사용한다.
4. 진행 이력 시간/작성자 정보는 `project_logs`를 SSOT로 사용한다.

---

## 2. 프로젝트 관리 페이지 목록 컬럼 매핑

기준 화면: 프로젝트 관리 > 프로젝트 목록 (`/p1-screens/code`)

| 목록 컬럼 | API 필드 | DB 스키마 소스(현재 SSOT) |
| --- | --- | --- |
| 코드 | `code` | `project_codes.code` |
| 프로젝트명 | `name` | `projects.name` |
| 고객사 | `clientName` | `projects.client_name` |
| 사업유형 | `projectType` | `projects.project_type` |
| 확도 | `certainty` | `projects.certainty` |
| 사업금액 | `amountText` | `projects.amount_text` (없으면 `projects.total_amount/company_amount` 계산) |
| 공고번호 | `bidNoticeNo` | `projects.bid_notice_no` |
| 공고일 | `bidNoticeDate` | `projects.bid_notice_date` |
| 상태 | `status` | `projects.status` |
| 영업부서 | `salesDept` | `projects.sales_department` |
| 영업대표 | `salesOwner` | `projects.sales_owner` |
| 제안PM | `proposalPm` | `projects.proposal_pm_name` |
| 발표PM | `presentPm` | `projects.presentation_pm_name` |
| 수행PM | `deliveryPm` | `projects.delivery_pm_name` |
| 제안/수행팀 | `proposalDeliveryTeam` | `project_assignments` + `personnel` 조합 계산 |
| 시작일 | `fromDate` | `projects.start_date` |
| 종료일 | `toDate` | `projects.end_date` |
| 제안 제출일 | `proposalSubmissionAt` | `projects.submission_at` |
| 제출 형식 | `submissionFormat` | `projects.submission_format` |
| 제출 유의사항 | `submissionNote` | `projects.submission_note` |
| 제안 발표일 | `proposalPresentationAt` | `projects.presentation_at` |
| 발표 형식 | `presentationFormat` | `projects.presentation_format` |
| 발표 유의사항 | `presentationNote` | `projects.presentation_note` |
| 최근활동일 | `recentActivityAt` | `projects.recent_activity_at` |
| 사용여부 | `useStatus` | `project_codes.is_active` |

---

## 3. 목록 미표시 스키마와 사용 여부

| 스키마 | 목록 테이블 직접 표시 | 다른 페이지 사용 여부 |
| --- | --- | --- |
| `projects.id` | 없음 | 상세/수정/이력 연결 키로 사용 |
| `projects.project_code_id` | 없음 | 코드-프로젝트 FK 연결에 사용 |
| `projects.memo` | 없음 | 상세/업무수행/편집에서 사용 |
| `projects.total_amount` | 직접 컬럼 없음 | 금액 계산/편집 저장에 사용 |
| `projects.company_amount` | 직접 컬럼 없음 | 금액 계산/편집 저장에 사용 |
| `projects.created_at`, `projects.updated_at` | 없음 | 엔터티 메타(정렬/감사 보조) |
| `project_codes.id` | 없음 | 코드 마스터 식별/수정에 사용 |
| `project_codes.project_type` | 직접 표시는 projects 기준 | 코드 마스터 관리에 사용 |
| `project_codes.status` | 직접 표시는 projects 기준 | 코드 마스터 관리에 사용 |
| `project_codes.certainty` | 직접 표시는 projects 기준 | 코드 마스터 관리에 사용 |
| `project_codes.created_at`, `project_codes.updated_at` | 없음 | 엔터티 메타 |
| `project_assignments.assignment_status` | 없음 | 상세 투입인원 현재 상태 판정에 사용 |
| `project_assignments.assignment_role` | 없음 | 상세 역할 표시 SSOT |
| `project_logs.logged_at` | 없음 | 진행이력 시간 SSOT |
| `project_logs.author_name`, `project_logs.updated_by_name` | 없음 | 진행이력 작성자/변경자 표시 |

---

## 4. 현재 삭제 반영 대상(스키마 정리)

다음 컬럼은 정리 완료/진행 대상으로 관리한다.

- 제거 반영 대상:
  - `projects.pre_notice_no`
  - `projects.pre_notice_date`
  - `projects.owner_department`
  - `projects.lead_department`
  - `projects.source_sheet`
  - `projects.raw_payload`
  - `project_codes.owner_name`
  - `project_codes.note`
  - `project_codes.sales_department`
  - `project_codes.sales_owner`
  - `project_codes.start_date`
  - `project_codes.end_date`

- 유지:
  - `projects.project_code_id` (FK)
  - `project_codes.is_active`
  - `project_codes.created_at`, `project_codes.updated_at`

---

## 5. 인력/이력 SSOT 규칙

### 5.1 참여 인력 역할

- `project_assignments.assignment_role`를 프로젝트 역할 SSOT로 사용한다.
- 역할 코드:
  - `proposal_pm`
  - `presentation_pm`
  - `delivery_pm`
  - `proposal_team`
  - `delivery_team`
  - `support_team`

### 5.2 투입 상태

- `project_assignments.assignment_status` enum:
  - `planned`
  - `assigned`
  - `ended`
  - `cancelled` (행 삭제 없이 취소 이력 유지)

### 5.3 진행 이력 작성자/변경자

- 등록/변경 시 로그인 사용자 기준으로 자동 입력한다.
- 저장 테이블: `project_logs.author_name`, `project_logs.updated_by_name`
- 시간 SSOT: `project_logs.logged_at` (`created_at`, `updated_at`는 엔터티 메타)

---

## 6. 운영 체크리스트

1. 프로젝트 코드 생성 후 프로젝트 생성 시 `project_code_id` 연결을 반드시 유지한다.
2. 목록/상세 표시 값은 `projects` 기준으로 채워지지 않으면 저장 단계에서 에러를 반환한다.
3. 화면 표시에서 fallback로 정합성을 숨기지 않는다.
4. 스키마 변경 후 항상 `alembic upgrade head`와 API 컴파일 검증을 수행한다.

## 7. 프로젝트 엑셀 계약 (2026-10-12)

- DB 구조 변경 없음. 코드 식별자 `P+연도+3자리 번호`로 기존 마스터를 추가/수정하며 `project_codes.is_active`로 비활성화한다. 프로젝트 코드 수정은 엑셀에서 기존 행의 ID 변경으로 취급하지 않는다: 다른 코드 입력은 신규, 원래 코드는 파일 누락으로 표시한다.
- 다운로드와 템플릿은 `프로젝트관리` 시트와 같은 2행 그룹 헤더·26개 업무 컬럼을 사용한다. 프로젝트 코드/사업명, 기본정보, 인력 정보, 일정, 기타의 그룹 구조를 유지한다.
- `총 사업금액`, `당사 사업금액`은 별도 숫자 열이며 원 단위·소수 둘째 자리까지, 0 이상·Numeric(16,2) 범위로 검증한다. 당사 금액은 총액 이하. `amount_text`는 서버가 표시용으로 생성한다.
- 영업대표/PM은 저장된 원본 성명, 날짜는 ISO 날짜, 일시는 시간대 없는 ISO 일시로 출력한다. 직위가 붙은 화면 표시 이름을 마스터에 역저장하지 않는다.
- 기존 25개 컬럼 `사업금액`(총액/당사금액) 파일은 호환 파싱한다. 기존 표시 문자열과 동일하면 반올림된 표시액 대신 정확한 저장 금액을 유지한다. 금액 변경은 새 분리 양식을 권장한다.
- `제안/수행팀`, `최근 활동일`은 참고 열로 출력하되 입력을 무시한다. 팀은 배정/활성 인력 공통 helper, 최근 활동일은 진행이력 최대 logged_at에서 계산한다. 신규/수정/비활성화 시 이력을 기록하고 최근 활동일을 갱신한다.
- 필수값·제안 PM 조건부 일정은 기존 `get_missing_project_fields`를 적용한다. 날짜 순서·enum·코드 중복·상태 전환·문자열 길이·수식 입력도 검증한다. 기존 불완전 행의 누락값을 임의 생성하거나 검증에서 우회하지 않는다.
- 사용여부 빈칸은 기존 저장값 유지/신규 true다. 다른 빈칸은 빈 값으로 검증하므로 선택 항목을 지울 수 있고 필수값은 오류가 된다.
- 누락 프로젝트는 기본 유지, 개별/일괄 삭제 선택은 비활성화만 수행한다. 기존 UUID/FK·비PMO 배정·로그·MM·KPI·과거 스냅샷은 보존한다. 오늘자 현재/주간 스냅샷의 프로젝트 이름 표시만 갱신한다. 배정이나 월마감 데이터 전체 재생성은 하지 않는다.
- 인가/검증 토큰/해시/잠금 계약은 [API 가이드](../harness/api_guide.md)의 12절을 따른다.

## 8. 프로젝트 상세 투입 배정 계약 (2026-10-13)

- `project_assignments.monthly_base_mm`: nullable Numeric(6,2), 새 배정의 월 기준 투입량. 신규 기본 1, 0~9999.99, 소수 둘째 자리까지 허용한다. `unassigned`는 0을 요구한다. 신규·기간/계산 변경 시 시작일/종료일은 필수다.
- 기존 38건은 NULL을 유지한다. NULL이면 기존 `current_mm → total_mm → mm → 0` 계산 기준을 사용한다. 저장된 3개 원본 MM을 일괄 치환하지 않는다. note 등 단순 수정은 기존 NULL/상주 문자열/날짜 누락을 유지하며, 월 기준 MM을 명시한 경우에만 새 기준을 사용한다.
- Alembic `261013_0022`: 컬럼 추가만 수행하고 UUID/FK/기존 값 보정은 없다. PostgreSQL에는 기존 `assignmentstatus`에 `cancelled`를 추가한다. 신규 월 기준 입력이 존재하면 downgrade를 차단한다. PostgreSQL downgrade는 취소 enum 값을 제거하지 않는다.
- 역할 SSOT는 `assignment_role`; 인력 기본 역할과 PM 성명 마스터를 자동 변경하지 않는다. proposal 역할 3종은 proposal, delivery 역할 2종은 delivery, support_team은 support에만 새로 저장할 수 있다. 미지정은 허용한다.
- 상주 유형 신규 입력은 `onsite|remote|hybrid` 또는 NULL이다. DB String(50)은 구형 값 보존을 위해 유지한다. `certainty_rate`는 NULL(100%) 또는 0~100이고 0%는 실제 0으로 계산한다.
- 프로젝트/인력 ID는 PATCH로 교체하지 않는다. 네 가지 유형의 활성 인력이 참여할 수 있다. 새 운영 배정은 활성 프로젝트, PMO의 재직 상태/MM 시작일을 확인한다. 예정 또는 시작 전 배정만 취소하며, 진행 중 배정은 실제 종료일+ended로 종료한다. 취소는 재활성화하지 않고 새 행을 등록한다.
- 같은 인력의 겹치는 기간은 확인 후 저장 가능하다. 같은 프로젝트·인력·유형·역할·기간의 완전 중복 신규/계산·역할 변경은 차단한다. 종료/과거 수정과 legacy 계산 유지도 경고한다. 월 기준 입력·기간·상태 등의 수정은 현재 월 이후 MM과 오늘자 스냅샷/KPI만 갱신한다. 계산 기간은 100년 이내이며 현재 기준 100년을 넘는 미래 원장은 자동 계산하지 않는다.
- `monthly_assignment_mm`과 `monthly_mm`의 지난 월, 지난 스냅샷/KPI 및 수동 조정 재직 MM은 보존한다. 오늘자 스냅샷 ID/메모를 유지한다. 수행 > 제안 > 지원 우선순위, 같은 유형 안에서 대표 여부/시작일/ID를 사용한다. 예정·종료·취소는 현재 투입에서 제외하며, 예정은 미래 예측에 사용할 수 있다.
- 비PMO 배정도 프로젝트 원장과 투입 MM에 저장한다. PMO KPI 분자·분모와 현재/주간 인력 스냅샷은 PMO 유형만 포함한다. 기존 가동률/가득률 산식 정의는 변경하지 않는다.
- 새 JSON 백업은 월 기준 입력을 보존한다. 필드가 없는 구형 백업은 NULL로 복원하며 기존 MM 기준을 유지한다. 현행 통합 엑셀/구형 seed도 NULL 경로를 사용하며 새 월 기준 입력을 임의 추정하지 않는다.
- API·잠금·인가 계약은 [API 가이드 14절](../harness/api_guide.md), 사본/실제 DB 적용·복구는 [6번 구현 기록](../harness/assignment_rollout_261013.md)을 참조한다.

## 최초 투입 전환 완료 기록 (2026-10-13)

별도 테이블/컬럼을 추가하지 않는다. 최초 전환의 완료 상태는 기존 `project_logs`의 `project_id = NULL`, `log_status = memo`, content 접두어 `[assignment_import_complete]` 뒤 JSON으로 보관한다. 파일명·SHA-256·작업자·완료 시각·사전 백업 ID·반영 건수를 기록하며, 행별 프로젝트 메모에는 원본 배정키와 생성된 assignment UUID를 연결한다. 일반 프로젝트 진행이력 수정 API는 프로젝트 없는 기록을 변경할 수 없다. JSON 백업/복원은 이 시스템 기록을 함께 보존하고 전환 전 백업 복원은 완료 기록도 이전 상태로 돌린다. 신규 배정은 기존 UUID/FK를 참조해 추가하고 기존 배정을 재생성하지 않는다. 스키마 head는 `261013_0022` 그대로다.

