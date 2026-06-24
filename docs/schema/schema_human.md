# Human Schema Manual

작성일: 2026-06-22  
대상: 인력 관리/역할·직무/월별 재직 MM/인력 스냅샷(P2)  
기준: 현재 구현 코드(`apps/api/app/api/routes/personnel.py`, `roles.py`, `monthly_employment_mm.py`, `apps/api/app/models/core.py`)

## 1. 스키마 운영 원칙

1. 인력 마스터 SSOT는 `personnel`로 유지한다.
2. 역할/직무 기준정보 SSOT는 `roles`로 유지한다.
3. 월별 재직 MM SSOT는 `monthly_employment_mm`로 유지한다.
4. 인력 투입/상태 운영 데이터는 `current_assignment_snapshots`, `weekly_load_snapshots`, `monthly_assignment_mm`를 보조 SSOT로 사용한다.
5. 프로젝트 참여 인력 연결의 기준 식별자는 `personnel.id`를 사용한다.

---

## 2. 인력 관리 페이지 목록 컬럼 매핑

기준 화면: 관리 > 인력 관리 (`/people/employment`)

| 목록 컬럼 | API 필드 | DB 스키마 소스(현재 SSOT) |
| --- | --- | --- |
| 사번 | `employee_no` | `personnel.employee_no` |
| 성명 | `name` | `personnel.name` |
| 이메일 | `email` | `personnel.email` |
| 본부 | `group_name` | `personnel.group_name` |
| 팀 | `team_name` | `personnel.team_name` |
| 직위 | `position_name` | `personnel.position_name` |
| 역할 | `role_name` | `roles.name` 우선, 없으면 `personnel.role_name` |
| 직무군 | `job_group` | `roles.job_group` |
| 재직 상태 | `employment_status` | `personnel.employment_status` |
| MM 시작일 | `mm_start_date` | `personnel.mm_start_date` |
| MM 종료일 | `mm_end_date` | `personnel.mm_end_date` |
| 연간 MM | `yearly_mm` | `personnel.yearly_mm` |
| 사용여부 | `is_active` | `personnel.is_active` |
| 비고 | `note` | `personnel.note` |
| 최종 수정일 | `updated_at` | `personnel.updated_at` |

---

## 3. 역할/직무 기준정보 컬럼 매핑

기준 API: `GET /api/roles`

| 목록 컬럼 | API 필드 | DB 스키마 소스(현재 SSOT) |
| --- | --- | --- |
| 역할 코드 | `code` | `roles.code` |
| 역할명 | `name` | `roles.name` |
| 직무군 | `job_group` | `roles.job_group` |
| 설명 | `description` | `roles.description` |
| 사용여부 | `is_active` | `roles.is_active` |
| 정렬순서 | `sort_order` | `roles.sort_order` |
| 생성일 | `created_at` | `roles.created_at` |
| 최종 수정일 | `updated_at` | `roles.updated_at` |

---

## 4. 월별 재직 MM 컬럼 매핑

기준 API: `GET /api/monthly-employment-mm`

| 목록 컬럼 | API 필드 | DB 스키마 소스(현재 SSOT) |
| --- | --- | --- |
| 인력 ID | `personnel_id` | `monthly_employment_mm.personnel_id` |
| 인력명 | `personnel_name` | `personnel.name` |
| 본부 | `group_name` | `personnel.group_name` |
| 팀 | `team_name` | `personnel.team_name` |
| 연도 | `year` | `monthly_employment_mm.year` |
| 월 | `month` | `monthly_employment_mm.month` |
| 월 근무일수 | `workdays` | `monthly_employment_mm.workdays` |
| 재직 근무일수 | `employed_workdays` | `monthly_employment_mm.employed_workdays` |
| 재직 MM | `employment_mm` | `monthly_employment_mm.employment_mm` |
| 비고 | `note` | `monthly_employment_mm.note` |
| 생성일 | `created_at` | `monthly_employment_mm.created_at` |
| 최종 수정일 | `updated_at` | `monthly_employment_mm.updated_at` |

---

## 5. 목록 미표시 스키마와 사용 여부

| 스키마 | 목록 테이블 직접 표시 | 다른 페이지 사용 여부 |
| --- | --- | --- |
| `personnel.id` | 없음 | 인력 식별자 SSOT, 상세/배정 연결 키 |
| `personnel.role_id` | 직접 표시는 없음 | `roles.id` FK 연결에 사용 |
| `personnel.role_name` | fallback 용도 | 역할 FK 미결합 상태에서 보조 표시 |
| `personnel.created_at` | 없음 | 엔터티 메타 |
| `roles.id` | 없음 | 역할 수정/연결용 키 |
| `monthly_employment_mm.id` | 없음 | MM 수정용 식별자 |
| `monthly_employment_mm.personnel_id` | 직접 표시는 제한적 | 인력별 MM 연결 키 |
| `current_assignment_snapshots.id` | 없음 | 인력 투입 현황 스냅샷 식별자 |
| `current_assignment_snapshots.personnel_id` | 없음 | 인력 현재 상태 판정 |
| `weekly_load_snapshots.id` | 없음 | 주간 운영판 스냅샷 식별자 |
| `weekly_load_snapshots.personnel_id` | 없음 | 주간 상태 매트릭스 기준 |
| `monthly_assignment_mm.id` | 없음 | 월별 투입 MM 원장 식별자 |
| `monthly_assignment_mm.assignment_id` | 없음 | 프로젝트 배정과 월별 MM 연결 |

---

## 6. 인력 SSOT 규칙

### 6.1 인력 마스터

- 인력의 기본 정보 SSOT는 `personnel`이다.
- `employee_no`, `email`은 unique 후보로 관리되며, API에서 중복 검증을 수행한다.
- 본부(`group_name`)는 생성 시 필수값으로 관리한다.

### 6.2 역할/직무

- 역할 기준값 SSOT는 `roles`다.
- 인력은 `personnel.role_id -> roles.id` FK로 역할을 참조한다.
- 화면 응답은 `roles.name`, `roles.code`, `roles.job_group`를 우선 사용한다.

### 6.3 재직 상태

- `personnel.employment_status` enum:
  - `active`
  - `leave`
  - `transferred`
  - `retired`
  - `waiting`

### 6.4 사용여부

- `personnel.is_active`는 화면 노출/집계 포함 여부의 SSOT다.
- 재직 상태와 별개로 유지한다.

### 6.5 월별 재직 MM

- 월별 재직 MM의 수치 SSOT는 `monthly_employment_mm`다.
- 재직 근무일수는 월 근무일수를 초과할 수 없다.
- 공휴일/근무일 계산의 보조 기준으로 `holidays`를 함께 참조할 수 있다.

### 6.6 인력 운영 스냅샷

- 현재 인력 운영판의 현재 상태 SSOT는 `current_assignment_snapshots`다.
- 주간 상태 전개 SSOT는 `weekly_load_snapshots`다.
- 월별 프로젝트 투입 MM SSOT는 `monthly_assignment_mm`다.

---

## 7. 현재 삭제 반영 대상(스키마 정리)

다음 항목은 현재 인력 스키마 기준에서 제거 완료/비사용 대상으로 본다.

- 제거 반영 대상:
  - `personnel.department_name`
  - `personnel.grade_name`
  - `personnel.joined_on`
  - `personnel.unit_price`
  - `personnel.base_mm`
  - `personnel.monthly_mm`
  - `personnel.total_mm`
  - `personnel.employment_start_date`
  - `personnel.employment_end_date`
  - `personnel.contract_start_date`
  - `personnel.contract_end_date`

- 유지:
  - `personnel.mm_start_date`
  - `personnel.mm_end_date`
  - `personnel.yearly_mm`
  - `personnel.is_active`
  - `roles.code`
  - `roles.name`
  - `monthly_employment_mm`

---

## 8. 참조/연결 규칙

### 8.1 인력 기준 식별자

- 모든 인력 참조는 `personnel.id`를 기준으로 한다.
- 프로젝트 배정, 스냅샷, 월별 MM 모두 `personnel.id`를 기준 키로 사용한다.

### 8.2 프로젝트 배정 연결

- `project_assignments.personnel_id`는 `personnel.id`를 참조한다.
- 인력 상세/투입 현황의 프로젝트 참여 정보는 `project_assignments`를 통해 연결된다.

### 8.3 스냅샷 연결

- `current_assignment_snapshots.personnel_id`는 `personnel.id`를 참조한다.
- `weekly_load_snapshots.personnel_id`는 `personnel.id`를 참조한다.

### 8.4 월별 MM 연결

- `monthly_employment_mm.personnel_id`는 `personnel.id`를 참조한다.
- `monthly_assignment_mm.personnel_id`는 `personnel.id`를 참조한다.

---

## 9. 운영 체크리스트

1. 인력 생성/수정 시 `group_name`, `name`, `employment_status` 정합성을 반드시 유지한다.
2. 역할 연결이 필요한 경우 `role_id`는 활성 `roles` row만 참조해야 한다.
3. `employee_no`, `email` 중복은 저장 단계에서 차단한다.
4. 인력 관련 화면/집계는 `personnel.id` 기준 연결을 우선 사용하고, 이름 기반 fallback에 의존하지 않는다.
5. 스키마 변경 후 항상 `alembic upgrade head`, 인력 API 테스트, 프론트 typecheck를 수행한다.
