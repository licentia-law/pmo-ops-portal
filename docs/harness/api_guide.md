# API 구현 가이드

API envelope, 목록 API, CRUD/화면 API 분리, 계산 위치를 정리한다.  
Codex는 API나 백엔드 작업이 있을 때만 이 문서를 참고한다.

---

## 1. SSOT

- API 응답 envelope: `apps/api/app/api/common.py`
- enum/코드값: `apps/api/app/enums/__init__.py`와 `packages/shared-types/src/enums.ts`
- API route 등록: `apps/api/app/main.py`
- API 호출: `apps/web/app/lib/api.ts`
- 공통 검색/정렬/페이지네이션 helper는 기존 backend helper를 재사용한다.

## 2. 응답 Envelope

모든 신규 API는 아래 형식을 따른다.

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

- 정상 응답은 `envelope()` 기준을 따른다.
- 오류 응답도 `error_envelope()` 형식을 따른다.
- 프론트가 화면별로 임의 응답 shape을 추정하지 않도록 API 응답 구조를 명확히 유지한다.

## 3. 목록 API

목록 API는 가능한 한 아래 query를 지원한다.

- `page`
- `page_size`
- `sort`
- `q`
- 상태/유형 등 화면별 필터

응답 `meta`에는 가능한 한 아래 값을 포함한다.

- `page`
- `page_size`
- `total`

## 4. CRUD API와 화면용 API

- CRUD API는 단일 리소스 조회/등록/수정 책임을 가진다.
- 화면용 API는 KPI, 필터 옵션, 대표 행, 보조 패널 데이터를 한 화면에서 쓰기 좋게 조합한다.
- 화면용 API에서 계산한 값이 저장 대상이 아니라면 별도 테이블을 만들지 않는다.
- 저장해야 하는 스냅샷/마감 데이터만 별도 집계 테이블을 둔다.

화면용 API 응답은 아래 형태를 권장한다.

```json
{
  "data": {
    "summary": {},
    "filters": {},
    "rows": [],
    "sidePanels": {},
    "downloadMeta": {}
  },
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0
  },
  "error": null
}
```

## 5. 계산 위치

- KPI, MM, 가동률/가득률, 중복 배정 판단은 백엔드에서 계산한다.
- 프론트는 백엔드 결과를 표시하고 필터/정렬 UI를 제공한다.
- 프론트에서 임시 계산이 필요하면 화면 표시용으로만 제한한다.
- 프론트 임시 계산을 저장/보고 기준으로 사용하지 않는다.

## 6. 코드값과 라벨

DB/API에는 내부 enum value만 저장하고, 화면에는 공통 label helper로 한글 라벨을 표시한다.

| 구분 | 내부값 | 화면 라벨 |
|---|---|---|
| 재직 상태 | active | 재직 |
| 재직 상태 | leave | 휴직 |
| 재직 상태 | transferred | 전배 |
| 재직 상태 | retired | 퇴직 |
| 배정 유형 | delivery | 수행 |
| 배정 유형 | proposal | 제안 |
| 배정 유형 | support | 지원 |
| 배정 유형 | unassigned | 대기 |

## 7. 기준 시점 용어

| 이름 | 의미 | 주요 사용 화면 |
|---|---|---|
| basis_date | 기준일. 현재 스냅샷 산정 기준 | 인력 투입 현황, 인력별 투입 상세 |
| basis_week | 기준주. 주간 운영판과 주간 KPI 산정 기준 | 주간현황 |
| basis_month | 기준월. 월별 MM과 월별 KPI 산정 기준 | 월별가동현황, 월별 MM |
| basis_year | 기준연도. 연간 재직 MM과 월별 추이 산정 기준 | 인력 관리, 월별가동현황 |

화면 라벨은 `기준일`, `기준주`, `기준월`, `기준연도`로 표시하되 API query와 내부 변수명은 위 이름을 우선 사용한다.

## 8. 참고 파일

1. `apps/api/app/api/common.py`
2. `apps/api/app/main.py`
3. `apps/api/app/api/routes/p1_screens.py`
4. `apps/api/app/api/routes/projects.py`
5. `apps/api/app/api/routes/project_codes.py`
6. `apps/api/app/api/routes/project_logs.py`
7. `apps/api/app/schemas/projects.py`
8. `apps/api/app/domain/projects.py`
9. `apps/api/app/domain/project_code_policy.py`
10. `apps/api/app/domain/personnel.py`

## 9. 인력/API 적용 기준

- 인력 유형·역할 API·권한·주간 KPI API의 현재 구현과 목표 차이는 [정책/구현 비교표](policy_implementation_status.md)를 참고한다. 정책 우선순위는 [핵심 가이드](dev_guide.md)의 2절을 따른다.
- DTL 대상 `AssignmentStatus.cancelled`, `WorkLocationType` 변경은 실제 enum·사용 타입을 먼저 확인하고 백엔드/프론트를 함께 맞춘다.

## 10. 권한·DB 변경 원칙

- 권한은 인증된 사용자 기준으로 백엔드에서 검증하고 기존 공통 권한 함수를 우선 재사용한다. 메뉴/버튼 숨김만으로 처리하지 않으며, 허용된 데이터 범위도 조회·수정 API에 적용한다.
- 기능별 허용 범위는 [공통 DTL](../DTL/DTL_common_PMO_work_management_system_260508_0702.md)의 6절과 적용 기능 DTL을 참조한다. 개발용 헤더 권한 흐름과 운영 인증·인가를 구분하고, 미확정 예외는 [정책/구현 비교표](policy_implementation_status.md)의 충돌 기록을 확인한다.
- DB 변경 전 `apps/api/app/models/core.py`, API 스키마, `docs/schema`의 관련 문서, `apps/api/alembic/versions`의 변경 이력을 함께 확인한다. 코드와 문서가 충돌하면 먼저 알린다.
- 기존 DB에 필요한 스키마·데이터 변경은 Alembic migration으로 반영한다. 모델 수정이나 seed 재생성만으로 기존 DB가 갱신되었다고 판단하지 않는다.
- 컬럼·enum·기준값 변경 시 기존 값의 변환/기본값, 필수값·유일성, UUID/FK 참조 보존, 연결된 MM·스냅샷·KPI 영향과 실패 시 복구 방법을 확인한다. 재실행 가능한 데이터 보정은 중복 생성되지 않게 한다.
- 데이터 반영은 기존 트랜잭션·롤백 패턴을 따른다. 업로드·복원·초기화의 백업/잠금/감사 이력 등 상세 조건은 [P3.2 DTL](../DTL/DTL_P3.2_data_backup_upload_restore_260622.md)의 우선 적용 정책과 해당 절을 따른다.


## 11. 기능 권한 공통 함수 (2026-10-12)

- 기능 권한 코드는 backend Capability/shared CAPABILITIES를 사용한다. 저장 SSOT는 users.is_developer와 user_capabilities다.
- 기능 권한 API는 api/deps.py의 CapabilityUser/capability_guard와 domain/capabilities.py의 require_capabilities를 재사용한다. 기존 CurrentUser의 헤더 permission으로 기능 권한을 대신하지 않는다.
- 후속 업로드/배정 API는 필요한 기능 권한을 의존성으로 명시하고 서비스의 파괴적 작업 전에 재검증한다.
- 개발용 이메일 어댑터는 production에서 차단되며 로그인/세션은 별도 연계한다. 상세 계약은 [권한 스키마](../schema/schema_permissions.md), 실제 적용/검증은 [구현 기록](capability_rollout_261012.md)을 따른다.

## 12. 프로젝트 전용 엑셀 (2026-10-12)

- `/api/project-excel/template` GET, `/export` POST, `/validate` POST, `/apply` POST는 모두 `project_excel_manage`를 요구한다. export의 `codes` 누락/null은 전체, 배열은 선택 코드이며 빈 배열은 헤더만 출력한다.
- validate는 원본 `.xlsx` 바이너리와 URL 인코딩한 `x-upload-filename`을 받는다. 프로젝트관리 단일 시트, 20MB·5,000행 제한. DB 쓰기 없이 신규/수정/동일/오류, 변경 필드, 누락 목록, 오류/주의사항을 반환한다.
- apply는 `validation_id`, `file_sha256`, `missing_actions: {코드: keep|deactivate}`를 받는다. 미선택은 keep. 검증 사용자/30분 만료/오류/프로젝트·코드 DB 변경을 확인하고 공통 JobLock과 트랜잭션 안에서 반영한다. SQLite는 BEGIN IMMEDIATE로 재확인 이후 일반 CRUD 쓰기도 막는다.
- 자동 통합 JSON 백업을 먼저 저장하며 실패 시 원본 DB를 롤백한다. 기존 ProjectMaster 생성/수정 함수와 상태 전환 규칙을 재사용한다. 검증 토큰은 성공 시 소비되며 서버 재시작 시 다시 검증한다.
- 컬럼/파생값/구형 파일 정책은 [프로젝트 스키마](../schema/schema_project.md)의 7절, 사본 검증·실제 데이터 누락 결과는 [구현 기록](project_excel_rollout_261012.md)을 참조한다.

## 13. 인력 유형/전용 엑셀 (2026-10-13)

- `GET /api/personnel?personnel_type=pmo|sales|technical|external`는 저장 유형으로 목록을 필터한다. 누락하면 전체이며 기존 scope=pmo/sales_owner 및 후보 API는 유지한다. 영업 유형 보기는 후보 활성 조건으로 숨기지 않는다.
- `/api/personnel-excel/template` GET, `/export` POST(ids 배열/null 전체), `/validate` POST, `/apply` POST 모두 `personnel_excel_manage`를 요구한다. 검증은 원본 바이너리/인코딩 파일명이며 20MB·5,000행 제한, DB 쓰기 없음.
- validate의 선택 `personnel_type`은 파일 누락 비교 범위를 고정한다. 다른 유형을 누락 비활성화할 수 없다. 기존 행은 personnel_id가 필수이고 신규는 비운다. 성명/사번으로 기존 UUID를 추정 수정하지 않는다.
- apply 계약은 validation_id/file_sha256/missing_actions(ID: keep|deactivate). 사용자·30분 토큰·해시·인력/역할/공휴일/업무 원장 변경을 재확인하고 자동 백업·공통 JobLock·SQLite BEGIN IMMEDIATE·롤백을 적용한다. 신규 UUID 목록과 업로드 전 백업 ID를 반환한다.
- 엄격 PMO 필수값은 새 엑셀 및 명시 유형 CRUD에 적용한다. 유형을 누락한 구형 등록의 전환/누락 PATCH 보존 계약은 유지한다. 일반 CRUD admin/본부장 상태 수정 예외와 엑셀 capability를 별개로 검증한다.
- 연간 MM은 기존 근무일/재직기간 산식으로 서버 계산한다. 필요한 원본 변화만 현재 이후 재직 MM·오늘 스냅샷·당월 이후 KPI에 반영하고 과거 원장/스냅샷은 보존한다. 상세 경계는 [인력 스키마](../schema/schema_human.md)의 10절과 [구현 기록](personnel_excel_rollout_261013.md)을 따른다.

## 14. 프로젝트 상세 투입 배정 (2026-10-13)

- `GET /api/project-assignments`: project_id/personnel_id/assignment_status, q/page/page_size/sort 필터. 취소·종료와 비PMO를 포함한 배정별 원장이며 현재 화면 읽기 정책을 유지한다. 결과에는 저장 월 기준 MM, legacy 여부, 유효 MM 기준, 당월 MM과 현재 투입 여부가 포함된다. `meta.version`은 검증/저장 충돌 확인용이다.
- `GET /api/project-assignments/candidates`, `POST /api/project-assignments/validate`, `POST /api/project-assignments/{id}/validate`, `POST /api/project-assignments`, `PATCH /api/project-assignments/{id}`는 `assignment_manage`를 UI/API/서비스에서 적용한다. 인력 후보는 네 가지 활성 유형을 포함하고 PMO 상태/MM 시작일의 등록 가능 여부를 반환한다.
- create는 project_id/personnel_id/type/start_date/end_date 필수, status 기본 planned, monthly_base_mm 기본 1, 역할 선택, 확도율 NULL=100%, 상주 유형 선택이다. 타입/상태/역할/상주 enum 및 Decimal 범위를 검증한다. PATCH는 ID 교체/알 수 없는 필드를 차단하며 누락값을 보존하고 필수값을 명시 NULL로 지울 수 없다. legacy MM NULL은 명시 입력 전까지 유지한다.
- validate는 쓰기 없이 version/warnings/overlaps/changes를 반환한다. PATCH validate에도 expected_version(목록에서 받은 값)을 전달하며 validate가 반환한 최신 version을 저장에 사용한다. 저장에는 expected_version이 필수이며 경고가 있으면 acknowledge_warnings=true가 필요하다. 변경 후 저장/완전 중복/잠금 충돌은 409다. stale 검증은 다시 검증한다.
- 저장은 공통 JobLock(업로드/복원과 같은 잠금), SQLite BEGIN IMMEDIATE 또는 PostgreSQL 업무 행 잠금으로 원본 변경을 재확인하고 파생 변경/프로젝트 감사 로그와 함께 한 트랜잭션으로 반영한다. 실패 시 원본·MM·스냅샷·KPI·로그 전체 롤백 후 잠금을 해제한다. 일반 단건 배정마다 전체 JSON 자동 백업은 만들지 않으며 변경 전/후 감사 정보는 project_logs에 저장한다.
- 삭제 API는 제공하지 않는다. 예정/시작 전 배정은 PATCH cancelled로 보존하고 진행 중 배정은 실제 종료일+ended를 사용한다. 과거 월마감 데이터나 수동 재직 MM은 소급 변경하지 않는다. PMO KPI 유형 범위와 기존 산식을 유지한다.
- `GET /api/monthly-assignment-mm`: project_id/personnel_id/year/month 및 페이징으로 원장 조회. 프로젝트 지표이므로 비PMO도 포함한다. 이 GET 계약은 PMO 보고 집계 범위를 바꾸지 않는다.
- DB/전환·백업 계약은 [프로젝트 스키마 8절](../schema/schema_project.md), 테스트/실제 DB 경계는 [6번 구현 기록](assignment_rollout_261013.md)을 따른다.
## 15. 최초 투입 배정 전환 도구 (2026-10-13)

- `/api/assignment-import/{status,template,references,validate,apply}`는 모두 저장된 `assignment_manage`로 인가한다. 스위치는 `Settings.assignment_import_enabled`(기본 false), production 차단이다. 화면 숨김만으로 접근을 제한하지 않는다.
- `.xlsx` 단일 `최초투입전환` 시트, 20MB/5000행, 엄격한 헤더 순서와 명시적인 월 기준 MM. 이름 매칭·누락 행 삭제·기존 행 업데이트는 하지 않는다. 원본 배정키는 필수 고유 텍스트, 인력은 UUID/프로젝트는 코드로 연결한다. 참조 안내 다운로드는 업로드 파일과 별도다.
- 수동 배정 서비스의 `_values`/`refresh_assignment_mm`를 재사용하되 `historical_import=True`는 최초 전환 내부에서만 지정한다. 종료/취소 이력을 새로 옮길 수 있고 신규 배정의 과거 MM도 생성한다. 수동 API의 과거 보존/취소 규칙은 바꾸지 않는다.
- 검증 토큰은 사용자·SHA-256·전체 업무/휴일 fingerprint·30분 TTL에 묶인다. 반영 시 공통 작업 잠금과 SQLite BEGIN IMMEDIATE/다른 DB 행 잠금 후 인가·완료 여부·DB 상태를 재확인한다. 사전 JSON 백업 실패 또는 반영 실패는 전체 롤백하며 잠금을 해제한다.
- `project_logs`의 project_id=NULL 시스템 메모 `[assignment_import_complete]`가 1회 완료 SSOT다. 일반 진행이력 CRUD로 변경할 수 없으며 JSON 복원에 포함된다. 성공한 데이터에 다른 파일을 추가하는 것도 차단된다. 전환 전 백업으로 복원하면 재시도할 수 있다.
- 기존 과거 MM/KPI/스냅샷을 덮어쓰지 않는다. 누락된 PMO 재직 MM은 인력 MM 시작/종료 기준 기간에 생성하고, 과거 KPI는 없는 월만 추가한다. 오늘의 PMO 스냅샷과 현재/미래 KPI는 공통 계산식으로 갱신한다. 산식 충돌을 이 작업에서 결정하지 않는다.
- 전체 적용 경계·복구 절차·파일 목록은 [7번 기록](assignment_import_rollout_261013.md)을 참고한다.

## 16. 통합 엑셀 경로 제거 (2026-10-13)

- POST `/api/data-backup/validate`, `/api/data-backup/apply`는 제거했으며 미인증/일반 사용자/개발자 모두 404다. OpenAPI에도 노출하지 않는다. 기존 검증 토큰으로 전체 교체하는 호환 경로를 남기지 않는다.
- 통합 시트 파서·전용 헤더/코드 매핑·검증 캐시·전체 교체 삽입/반영 서비스와 프론트 호출/타입/템플릿은 제거했다. 금액/날짜/사용여부 파서, `ValidationIssue`, MM·스냅샷 계산, JSON 직렬화/복원, 전체 업무 삭제 helper, 공통 JobLock 이름은 기존 소비자가 있어 유지한다. 공통 잠금 키를 바꾸어 작업끼리 충돌 보호를 잃지 않는다.
- JSON 백업 생성·상세·삭제·복원은 `backup_restore`만으로 인가한다. 프로젝트/인력 전용 엑셀 및 최초 투입 전환 API·권한·백업/잠금 처리는 유지한다. 전용 기능에 필요한 openpyxl/프론트 엑셀 패키지를 제거하지 않는다.
- `overview.upload_history`와 manifest/기존 파일은 과거 감사·전용 엑셀 반영 이력 조회를 위해 유지한다. 백업 화면의 `엑셀 반영 이력 (조회 전용)`은 파일 선택·검증·반영을 제공하지 않는다.
- 삭제 기능의 부활 금지·사본 복원 검증·실제 DB 경계는 [8번 기록](backup_upload_removal_261013.md)에 정리한다. 전체 초기화 UI/API의 별도 계약은 17절을 따른다.

## 17. 통제된 업무 데이터 전체 초기화 (2026-10-13)

- `GET /api/data-backup/reset/preview`, `POST /api/data-backup/reset`는 저장된 개발자/admin 및 `backup_restore`+`data_reset`을 공통 인가로 검증한다. 헤더의 관리자 주장만으로 실행할 수 없으며 기존 개발용 이메일 인증은 production에서 차단한다.
- `DATA_RESET_ENABLED` 기본값은 모든 환경에서 false다. preview는 비활성화 또는 감사 테이블 미적용 상태에서도 건수와 사유를 안전하게 조회한다. 실행 API는 각각 403/409로 차단한다. 감사 migration 적용 없이 자동 테이블 생성하지 않는다.
- preview의 10분 `validation_id`는 사용자·업무/기준/권한 데이터 fingerprint와 묶인다. 최대 100개 인메모리 확인 결과를 보관하고 만료를 정리한다. 재시작/다른 프로세스에서 토큰이 없으면 재조회한다. 실행 입력은 `validation_id`, 정확한 `confirmation='업무 데이터 전체 초기화'`, 선택 `memo`(최대 1000자)다. 미정의 필드는 거절한다.
- 실행은 기존 공통 JobLock, SQLite `BEGIN IMMEDIATE`/PostgreSQL 테이블 쓰기 잠금, 재인가/상태 재검증 후 진행한다. JSON 백업의 해시·10개 테이블·건수·행 내용이 현재 DB와 일치해야 참조 역순 삭제한다. 대상 SSOT는 기존 `data_backup.TABLE_MODELS`/`DELETE_ORDER`이며 별도 목록으로 업무 범위를 복제하지 않는다.
- 수동 JSON 백업 생성/파일 삭제 API도 같은 JobLock을 획득한다. 초기화/복원/전용 업로드 실행 중 복구용 백업을 삭제하거나 manifest를 동시에 변경하는 요청은 409로 차단한다. 조회는 계속 허용한다. DB 잠금 획득 이후에도 토큰 유효기간을 재확인한다.
- 삭제와 성공 `data_reset_audits` 기록은 단일 트랜잭션이다. 실패 시 삭제와 성공 기록을 롤백하고 별도 실패 기록을 저장한다. 감사 DB 실패는 manifest의 `reset_failed`로 보완한다. 커밋 이후 잠금 해제/manifest 기록 실패는 이미 성공한 초기화를 실패로 보고하지 않고 경고 메시지를 반환한다.
- 결과는 `audit_id`, `pre_backup_id`, `deleted_counts`, `remaining_counts`, `message`다. 감사 이력은 최근 20건 조회한다. 사용자·권한·역할·공휴일·작업 잠금·백업 파일/manifest·감사 테이블은 삭제/JSON 복원 범위 밖이다. 성공 토큰은 DB 감사 이력으로 재실행을 막으며, 복원해도 과거 감사 기록은 유지한다.
- 모델과 실제 적용 경계는 [감사 스키마](../schema/schema_data_reset.md), 테스트/사본 브라우저 결과·복구 방법은 [9번 기록](data_reset_rollout_261013.md)을 따른다. PostgreSQL 잠금 분기는 구현되어 있으나 현재 SQLite 환경에서만 실행 검증했다.
