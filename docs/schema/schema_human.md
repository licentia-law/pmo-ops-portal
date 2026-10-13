# Human Schema Manual

작성일: 2026-06-22  
유형/집계 계약 업데이트: 2026-10-12 (개발 DB 261012_0020 적용 및 API 확인 완료)
대상: 인력 관리/역할·직무/월별 재직 MM/인력 스냅샷(P2)  
기준: 현재 구현 코드(`apps/api/app/api/routes/personnel.py`, `roles.py`, `monthly_employment_mm.py`, `apps/api/app/models/core.py`)

## 1. 스키마 운영 원칙

1. 인력 마스터 SSOT는 `personnel`로 유지한다.
2. 역할/직무 기준정보 SSOT는 `roles`로 유지한다.
3. 월별 재직 MM SSOT는 `monthly_employment_mm`로 유지한다.
4. 인력 투입/상태 운영 데이터는 `current_assignment_snapshots`, `weekly_load_snapshots`, `monthly_assignment_mm`를 보조 SSOT로 사용한다.
5. 프로젝트 참여 인력 연결의 기준 식별자는 `personnel.id`를 사용한다.
6. 인력 유형과 PMO 집계 포함 여부의 SSOT는 `personnel.personnel_type`이다. 조직·팀·역할은 유형과 별도 정보다.

---

## 2. 인력 관리 페이지 목록 컬럼 매핑

기준 화면: 관리 > 인력 관리 (`/people/employment`)

| 목록 컬럼 | API 필드 | DB 스키마 소스(현재 SSOT) |
| --- | --- | --- |
| 사번 | `employee_no` | `personnel.employee_no` |
| 인력 유형 (선택 UI 후속) | `personnel_type` | `personnel.personnel_type` |
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

### 6.7 인력 유형과 전환 계약

- `personnel_type`: `pmo`, `sales`, `technical`, `external`; NOT NULL, CHECK 및 조회 인덱스. DB/ORM 기본값은 두지 않는다.
- Alembic `261012_0020`은 기존 UUID, 역할 FK 및 모든 배정·이력·파생 원본을 유지한다. 명시된 유효 유형은 재보정하지 않는다.
- 변환 우선순위: `SALES_OWNER` 역할 코드 (역할 코드가 없을 때만 `영업대표` 역할명 fallback) → `PMO본부` → `기술본부` → 명시된 기타/외부 소속. 미확인 조직은 DDL 이전에 건수를 보고하고 차단한다.
- 신규 API 요청은 유형 명시가 원칙이다. 유형이 없는 구형 등록·seed·통합 엑셀만 동일 변환 규칙으로 보완한다. PATCH의 유형 누락은 기존 값 유지, 명시적 null은 400, 미지원 enum은 422다.
- PMO 외 등록/수정은 유형·성명·소속·직위 필수이며 팀·사번·이메일·MM은 선택이다. 영업대표는 `sales`와 활성 `SALES_OWNER` 역할을 함께 검증한다.
- 영업 후보 조회는 `sales` + 활성 인력 + 활성 `SALES_OWNER` 역할을 모두 요구한다.
- 재직 MM 조회/수정, 현재 인원·팀별 집계 및 파생 MM·현재/주간 스냅샷 생성은 공통 PMO predicate를 사용한다. 신규 PMO용 배정 MM도 PMO만 생성하며 비PMO 프로젝트 배정 원본은 유지한다.
- 과거 MM/스냅샷은 삭제·재생성하지 않는다. 월간 KPI의 조회 값은 PMO MM 원장에서 재집계하며, 저장된 KPI와 원본 백업은 그대로 보존한다. 원장이 불완전하면 조회 KPI도 그 범위에 한정되므로 원장 완전성 확인이 필요하다.
- 유형 없는 구형 JSON 복원은 동일 UUID의 현재 유형을 우선 유지한다. 현재 UUID가 없는 인력만 변환 규칙으로 보완한다. 명시된 유효 유형은 그대로 복원하며 미확인/무효 유형은 전체 교체 전에 차단한다.
- 실제 DB 적용 절차와 검증 결과: [인력 유형 전환 기록](../harness/personnel_type_rollout_261012.md).

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

## 10. 인력 유형 UI/엑셀 계약 (2026-10-13)

- 새 DB 변경 없음. 인력 유형 SSOT는 personnel.personnel_type, 표시 본부/팀/역할로 재추정하지 않는다. PMO/영업/기술/외부/전체 보기와 등록/수정 선택을 제공한다.
- 새 엑셀의 인력관리 단일 시트·2행 그룹 헤더는 `personnel_id`, `인력 유형`, `사번`, `성명`, `이메일`, `본부`, `팀`, `직위`, `역할 코드`, `역할`, `재직상태`, `MM 시작일`, `MM 종료일`, `연간 재직 MM`, `사용여부`, `비고`다. 다운로드/템플릿이 동일 구조다.
- 사번/ID는 원본 문자열을 출력하고 문자열 서식을 적용한다. 화면 축약/가공 사번과 UUID를 원본값 대신 저장하지 않는다. 역할 코드는 활성 Role.code로 해석하며 표시용 역할명/연간 MM 입력은 무시한다.
- 기존 행은 다운로드한 personnel_id로만 수정한다. 미존재/중복 ID 오류, 신규 ID는 빈칸/서버 발급. 사번/이메일의 기존 다른 UUID와 충돌하거나 기존과 동일한 성명·소속·직위의 ID 없는 행은 오류로 돌려 추정 갱신/반복 중복 생성을 막는다. 반영 후 ID 포함 파일을 재다운로드한다.
- 유형 누락 새 파일은 오류다. PMO 필수값은 성명·소속·팀·직위·사번·이메일·MM 시작일이다. 비PMO는 성명·소속·직위, 영업은 추가 SALES_OWNER 역할 필수. 영업의 상태 active/MM null 정규화와 PMO본부 소속 금지, 활성 이름 중복 금지는 유지한다. 기술/외부의 확보된 선택 MM 날짜는 저장 가능하나 PMO 계산에는 사용하지 않는다.
- 일반 CRUD의 명시 PMO 유형 저장/전환에도 필수값을 적용한다. 유형 없는 구형 등록과 누락 PATCH는 기존 전환/저장값 유지 계약을 보존한다. 본부장 상태만 수정 예외도 유지한다.
- 선택 유형은 누락 비교 범위다. 전체는 모든 유형, 유형별은 해당 저장 유형의 기존 인력만 비교한다. 기본 유지, 선택/일괄 비활성화; 물리 인력 삭제 없음. 유형 변경은 원래 범위 안의 기존 ID에 허용한다.
- 연간 MM은 현재 연도 12개월을 기존 근무일/재직기간 산식으로 계산하는 표시값이다. 입력하지 않는다. 인력 유형/재직상태/MM 기간/사용여부 변경이 필요한 경우만 당월~12월 재직 MM 및 당월 이후 KPI를 갱신한다. 기본정보/비고 변경은 수동 보정된 MM을 덮어쓰지 않는다. 기존 산식 명칭 쟁점은 그대로 후속이다.
- 오늘자 PMO 스냅샷은 기존 생성 규칙을 재사용하고 기존 ID·메모·monthly_mm를 유지한다. 현재 비PMO/비활성은 오늘 PMO 스냅샷에서 제외한다. 과거 MM/스냅샷/KPI·프로젝트 배정/투입 MM/로그는 보존한다. 과거 데이터의 자동 정정은 이번 기능으로 수행하지 않는다.
- 프로젝트의 문자열 PM/영업 성명은 자동 치환하지 않는다. 배정은 기존 personnel UUID/FK를 유지한다. 기능 권한/잠금/백업 계약은 API 가이드 13절을 따른다.

---
