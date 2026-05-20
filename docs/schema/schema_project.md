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

