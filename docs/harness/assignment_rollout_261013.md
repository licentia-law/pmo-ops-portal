# P3.2 22.1의 6번: 프로젝트 상세 투입 배정 구현 기록

2026-10-13. 기준: PRD_261012_1328, P3.2 0절/22.1, 공통 DTL, P1 프로젝트 상세, P2 6.6~6.10/9.2/10.1 및 harness dev/API/frontend/verification 가이드. 브라우저 확인은 사용자 담당, 웹 build는 실행하지 않았다.

## 1. 진단 및 구현 범위

- 기존 프로젝트 상세는 인력당 한 행으로 참여 정보를 요약했고 배정 ID별 등록/수정 API/UI는 없었다. 요약을 유지하면서 모든 기간/종료/취소 배정을 조회하는 별도 원장을 추가했다.
- 기존 DB 배정 38건(투입 18, 종료 20) 중 36건은 mm/current_mm/total_mm 값이 달랐다. 기존 값을 월 기준 입력으로 일괄 해석하지 않고 nullable `monthly_base_mm`을 추가했다. 기존 NULL은 종전 fallback, 새 행은 명시 월 기준 입력을 사용한다.
- Enum AssignmentStatus.cancelled는 Python에는 있었으나 과거 PostgreSQL migration에는 없었다. 새 migration에서 보완했다. WorkLocationType/shared 상태·역할·상주 라벨과 API 계약을 맞췄다.
- 공통 역할/현재 투입/취소/대표 상태/MM 기준 helper와 기존 근무일·스냅샷·KPI·fingerprint·기능 인가·JobLock을 재사용했다. 1회성 투입 업로드, 통합 엑셀 제거, 전체 초기화, 로그인/기능 권한 관리 UI, 인력 투입 메인/숨김 상세·보고 화면 전환은 구현하지 않았다.

## 2. 동작 및 보존 경계

- 프로젝트 상세에서 네 종류 활성 인력의 배정 유형/역할/기간/상태/월 기준 MM/확도율/상주/대표/순서/비고를 입력하고 사전 검증 후 저장한다. 편집 시 인력·프로젝트 ID는 고정한다. 후보 표시와 직접 API 쓰기는 assignment_manage로 제한한다. 개발자는 기존 조승현/law@cmtinfo.co.kr 설정을 유지한다.
- 필수 인력/날짜/MM 입력과 범위를 화면에서 안내하고 타입/역할 조합, 날짜, 필수값, Decimal 범위, 활성 프로젝트, PMO 재직 상태/MM 시작일을 서버에서 다시 검증한다. 기간 겹침·종료/과거 수정·legacy MM 유지·겹치는 대표 배정은 경고 및 확인 후 저장한다. 같은 프로젝트·인력·유형·역할·기간의 완전 중복 신규/계산·역할 변경은 차단한다.
- 예정/진행 전 배정만 취소하며 행/참조를 보존한다. 진행 중 배정은 실제 종료일과 ended로 종료한다. 취소 이력은 재활성화하지 않는다. 화면의 취소는 수정 모달의 상태 선택으로 처리한다.
- 검증 후 업무/공휴일 변경 시 409와 재검증을 요구한다. 공통 JobLock과 SQLite BEGIN IMMEDIATE/PostgreSQL 행 잠금 아래 재검증, 배정·파생값·로그를 한 트랜잭션으로 저장한다. 실패하면 전체 롤백 후 잠금을 해제한다. 단건 배정마다 전체 자동 백업을 새로 만들지 않으며 감사 로그에 저장 전/후 배정 값을 기록한다.
- 현재 월 이후 투입 MM은 기존 공휴일/근무일 비례 방식으로 계산한다. 0% 확도는 0으로 계산한다. 기존 0%가 `or 100`에 의해 100%가 되던 생성기 처리도 같은 규칙으로 수정했다. 신규 입력은 월 기준 1 MM 기본이고 미투입은 0이다.
- PMO만 오늘자 현재/주간 스냅샷과 KPI 분자·분모에 포함한다. 수행 > 제안 > 지원 우선순위, 같은 유형의 대표 여부/시작일/ID로 선택한다. 예정·종료·취소는 현재 투입에서 제외한다. 앞으로 배정이 없는 주는 미투입으로 표시한다. 인력 상태가 휴직/전배/퇴직이면 프로젝트 상태보다 우선한다.
- 과거 월 투입 MM/JSON·스냅샷·KPI는 덮어쓰지 않는다. 배정 변경으로 수동 조정 재직 MM을 재생성하지 않는다. 오늘 스냅샷의 기존 ID/메모를 보존한다. 과거 배정 수정으로 소급 정정이 필요하면 별도 확인/보정 작업이 필요하다.
- 비PMO 배정·투입 MM·프로젝트 참여 정보는 유지한다. 저장된 원본 mm/current_mm/total_mm이나 인력 기본 역할/프로젝트 PM 성명은 자동 치환하지 않는다. 기존 가동률/가득률 산식 정의 충돌은 정책/구현 비교표에 남겨 두었다.
- 신규 JSON 백업은 monthly_base_mm과 cancelled를 round-trip한다. 구형 백업의 필드 누락은 NULL로 복원하고 종전 MM fallback을 유지한다. 현행 통합 엑셀/seed는 legacy NULL 경로로 호환하며 입력 의미를 추정하지 않는다.

## 3. 사본 검증 및 실제 DB 적용

사본/적용 기록: `.runtime/assignment_rollout/20261013_110138_KST/`

- `before.db`: 실제 DB를 읽기 전용 연결로 스냅샷 백업한 원본. `verification.db`: upgrade/등록/취소/복원 검증용 사본.
- `verification.json`: 사본 결과 및 최초 원본 해시. `application.json`: 실제 스키마 적용·무변경 비교·읽기 전용 API 결과.
- 원본 revision 261012_0021 → 목표/실제 revision 261013_0022. 사본에서 upgrade를 두 번 수행하고 기존 모든 테이블의 모든 이전 컬럼을 비교했다. UUID/FK/이전 값 무변경, foreign_key_check 0건, 38건의 monthly_base_mm 모두 NULL.
- 적용 전 건수: 인력 18(PMO 18, 영업/기술/외부 0), 프로젝트/코드 각 137, 배정 38, 진행이력 88, 재직 MM 102, 투입 MM 132, 현재 스냅샷 17, 주간 스냅샷 51, KPI 24. 사용자 12/역할 3/공휴일 46/기능 권한 부여 0/잠금 0도 보존했다.
- 인력 유형 변환/기존 MM 값 변환/파생 데이터 전체 재생성은 모두 0건. 테스트용 신규 인력·배정은 사본에서만 저장 후 백업 복원으로 원래 데이터와 같음을 비교했다.
- 사본 결과·변환 건수·백업/복구 방법을 사용자에게 보고한 뒤 실제 개발 DB에는 nullable 컬럼 추가 migration만 적용했다. 적용 후 이전 모든 컬럼을 백업과 비교했고 업무 데이터 변화는 0건이다. 실제 데이터 업로드/시험 배정 저장/유형 재분류는 수행하지 않았다.
- 실제 DB는 `mode=ro`로만 열어 홈·프로젝트 관리·인력 조회·프로젝트 상세·배정 목록/후보·월 투입 MM GET 7개가 200임을 확인했다. 해당 읽기 검증 전후 DB 해시가 동일하다. 사용자 소유 서버/포트는 변경하거나 새로 실행하지 않았다.
- 최초 원본 SHA256: `278bc06fefd8aeff2743d86810849a73299adb7cf535ccbb1e10d47983b0e035`. 스키마 적용 후: `f3565ff41f8806adfffceac5201a8f329ef79c276e8a0ca1328b8768bde2bdf7`.

복구: 아직 monthly_base_mm이 모두 NULL일 때는 기존 코드로 되돌린 후 `apps/api` 가상환경의 `python -m alembic downgrade 261012_0021`을 사용할 수 있다. 신규 입력이 있으면 migration이 중단되며 데이터는 유지된다. 전체 복구가 필요하면 API를 중지하고 이후 변경분을 먼저 별도 백업한 뒤 before.db를 복구한다. JSON 백업은 사용자/권한/역할/공휴일을 포함한 전체 스키마 백업을 대신하지 않는다. PostgreSQL 취소 enum 추가는 downgrade 때 제거하지 않는다.

## 4. 검증 결과

- 전체 pytest: **129 passed, 1 skipped**. 신규 배정 테스트 20개, nullable migration upgrade/반복/downgrade/입력 손실 차단 포함. 최종 역할 변경 중복 차단 보완 후 관련 20개를 다시 통과했다. 1개 skip은 개발 DB가 더 이상 0019가 아니어서 0019 전환용 사본 테스트를 건너뛴 것이다. 해당 전환은 합성 임시 DB 테스트가 담당하며 이번 실제 사본의 0021→0022는 위 별도 검증이 통과했다.
- 권한 없음/위조 헤더 차단·기능 권한 부여/회수, 4종 후보, 등록/조회/수정/종료/취소, 날짜/역할/상주/MM/NULL 검증, 완전 중복/경고 확인/stale version/무변경 저장, 0% 확도, 비PMO KPI 제외와 프로젝트 참여 보존을 검증했다.
- 기존 원본 MM/날짜 누락/상주 문자열 유지, 과거 월 MM/JSON/KPI·스냅샷 보존, 수동 재직 MM 보존, 대표 상태/미래 빈 주, 취소 백업·구형 필드 누락 복원, 파생 저장 중 실패의 전체 롤백/잠금 해제/재시도를 검증했다.
- workspace 전체 `npm run typecheck`, 변경 Python/migration/tests Ruff, 변경 프론트 TSX/API ESLint 구문·React hooks 검사 통과. 저장소 전체 Ruff 확인 시 변경 범위 밖 `app/domain/holidays.py`의 기존 unused OrganizationRole 1건은 남아 있으며 해당 파일은 수정하지 않았다.
- 기존 datetime.utcnow 폐기 예정 경고가 남아 있다. Windows TestClient는 샌드박스 밖 실행 시 정상 종료했고 멈춘 테스트를 성공 처리하지 않았다. 브라우저/웹 build는 사용자의 요청대로 실행하지 않았다. PostgreSQL 분기는 이 환경에서 실행 검증하지 못했다.

## 5. 변경 파일 및 다음 시작점

- Backend: enums/__init__.py, models/core.py, main.py, domain/assignments.py, domain/projects.py, schemas/assignments.py, api/routes/project_assignments.py, api/routes/p1_screens.py, services/project_assignments.py, services/personnel_master.py, services/data_backup.py (모두 apps/api/app 아래).
- Migration: apps/api/alembic/versions/261013_0022_assignment_monthly_base.py.
- Tests: apps/api/tests/test_project_assignments.py, test_assignment_migration.py, test_alembic_migrations.py.
- Front/shared: apps/web/design/components/ProjectAssignmentsPanel.tsx, design/pages/ProjectDetailPage.tsx, app/lib/api.ts, packages/shared-types/src/enums.ts, domain.ts.
- Docs: PRD_261012_1328, P2/P3.2 DTL, harness/api_guide, policy_implementation_status, schema/schema_project 및 이 기록. 개발 DB는 스키마 migration만 변경했다. 이전 단계/사용자 dirty 변경분은 보존했다.
- 사용자 확인: API 재시작 후 프로젝트 상세 아래 `투입 배정 관리` 영역, 등록/수정 검증→저장, 겹침 경고/확인, 예정 배정의 취소 상태 선택, 진행이력 반영을 확인한다. 실제 운영 입력을 원치 않으면 읽기 화면/모달 확인까지만 수행한다.
- 다음 구현은 **22.1의 7번: 최초 원본 전환용 별도 투입 파일 검증/업로드**다. 이번 공통 배정/역할/월 기준 MM·인가·잠금 계약을 재사용하되 현행 미완성 원본 MM 의미를 임의 추정하지 않는다.

## 6. 사용자 화면 검토 후 3건 보완 (2026-10-13)

- 조회 목록은 정상이나 등록/수정 버튼이 없는 화면을 검토했다. Next가 apps/web 환경변수를 먼저 읽은 뒤 next.config.mjs의 루트 loadEnvConfig 호출이 캐시를 재사용해 개발자 이메일을 로딩하지 못하는 경로를 재현했다. 백엔드는 승인된 개발자 이메일에 assignment_manage를 포함한 권한을 200으로 반환하고 기본 admin@example.local은 401이었다.
- next.config.mjs에서 개발/운영 모드를 명시하고 루트 환경변수를 forceReload로 다시 읽는다. 개발자 이메일을 코드에 하드코딩하거나 권한 검사를 우회하지 않는다. 브라우저에 저장된 개발 계정 선택값이 있으면 기존 우선순위대로 유지한다.
- ProjectAssignmentsPanel의 권한 확인 중/정상 권한 없음/조회 실패 상태를 구분했다. 정상 시 현재 계정과 관리 가능 여부를 표시하며 실패 시 계정·API 오류·다시 확인 버튼을 제공한다. 실패를 조용히 조회 권한으로 간주하지 않는다. 백엔드 인가는 변경하지 않았다.
- .gitignore에 루트 `.runtime/`을 추가했다. 사본/백업 파일은 삭제하지 않았으며 git check-ignore로 기존 before.db/verification.db 제외를 확인했다.
- 실제 Next 초기 로딩 순서의 캐시를 만든 뒤 설정 파일을 불러오는 Node 재현에서 루트 개발자 이메일 로딩을 확인했다. WEB 타입 검사 및 변경 TSX/config ESLint를 통과했다. DB/기존 배정/서버 프로세스는 변경하지 않았고 브라우저/build는 실행하지 않았다. WEB 재시작 후 실제 버튼/모달 검증은 사용자가 수행한다.
- 캡처 위치: 프로젝트 관리 → 프로젝트 상세 → 하단 투입 배정 관리. 승인된 계정/등록/수정 버튼을 확인한다. 새 배정은 예정, 시작일은 미래, 비고에 화면 검증용을 명시하고 등록 모달의 검증 완료 화면을 캡처한다. 저장 후 새 행의 수정 모달에서 비고 또는 MM을 바꾸고 검증 완료 화면을 캡처한다. 저장 후 같은 행 수정에서 상태를 취소로 바꾸고 검증 완료 화면과 저장 후 취소 행을 캡처한다. 과거 종료 배정을 취소하지 않는다.

## 7. Codex 직접 브라우저 검증 추가

사용자 허용 후 내장 브라우저로 비고/MM/확도율 저장·새로고침 유지, 날짜/범위/정밀도 오류와 기간 중복/완전 중복을 검증했다. 저장은 사본 전용 WEB/API에서만 수행하고 실제 DB 해시와 기존 서버를 유지했다. 하네스의 기본 브라우저 검증 담당을 Codex로 전환했다. 결과·스크린샷·영문 정밀도 오류 문구의 후속 보완 항목은 [직접 브라우저 검증 기록](assignment_browser_verification_261013.md)을 따른다. 위 과거 단계의 사용자 검증/브라우저 미실행 기록은 당시 수행 범위이며 현재 기본 원칙은 dev_guide 4절을 따른다.
