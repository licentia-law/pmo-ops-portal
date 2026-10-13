# P3.2 22.1의 3번 — 기능 권한 모델과 공통 인가

기준일: 2026-10-12 (Asia/Seoul).

## 1. 진단·범위·구현

- 기존 DB는 `261012_0020`, 사용자 12명, 일반 관리자 3명이었다. 개발자 구분·기능 권한 저장·신뢰할 수 있는 로그인은 없었다.
- 사용자가 개발자 계정을 **조승현 / law@cmtinfo.co.kr**로 지정했다. 동일 성명 사용자 1명의 기존 UUID `eace2e98-ced1-56dd-930f-d4e3c51d7e25`를 유지했다. 기존 seed 이메일 user04@pmo.local을 확정 이메일로 변경했다.
- 이전 묶음의 미커밋 변경분은 보존했다. 이번에는 6종 enum·사용자 개발자 구분·사용자별 권한 테이블·migration·공통 함수/의존성·최소 조회/관리자 임명/부여·회수 API를 추가했다.
- 기존 백업/복원과 제거 전 통합 엑셀의 backend 권한 검사에 연결했다. 일반 CRUD의 기본 레벨 정책은 유지한다.
- 로그인/JWT, 사용자 생성/비밀번호 관리, 기능 권한 UI, 신규 엑셀, 투입 CRUD, 전체 초기화는 구현하지 않았다. 새 운영 의존성도 없다.
- 상세 모델/API/위임 경계는 [권한 스키마 문서](../schema/schema_permissions.md)에 있다.

## 2. 실제 DB 적용과 백업

기존 API를 잠시 중지하고 전체 SQLite DB와 기존 백업 파일·manifest를 보관했다. 사본에서 migration·bootstrap·반복 실행·기존 값 보존을 확인하고 결과/백업/복구 방법을 사용자에게 보고한 뒤 실제 DB에 적용했다.

- 최종 revision: **261012_0021**.
- 개발자 1명(조승현), 전체 기능 권한 6종. 일반 사용자 11명은 기능 권한 0종. 일반 관리자도 자동 확대하지 않았다.
- user_capabilities 테이블은 초기 0행이다. 개발자 전체 권한은 명시적 is_developer로 판정하며 6개 중복 grant 행을 생성하지 않는다.
- 사용자 12명·인력 18명·프로젝트/코드 각 137건·배정 38건·진행이력 88건·재직 MM 102건·배정 MM 132건·현재 스냅샷 17건·주간 스냅샷 51건·월간 KPI 24건 유지.
- 기존 모든 업무 테이블 값과 사용자 필드를 해시 비교했다. 확정한 개발자 이메일·개발자 플래그·갱신 시각 외 변경은 없다. UUID·FK 보존, foreign_key_check 0, integrity_check ok.
- 백업 폴더: `apps/api/.runtime/capability_rollout/20261012_161107_KST` (git 제외).
- [적용 전 전체 DB](../../apps/api/.runtime/capability_rollout/20261012_161107_KST/before_migration.db), [사본/실제 비교 결과](../../apps/api/.runtime/capability_rollout/20261012_161107_KST/verification.json), [실제 API 결과](../../apps/api/.runtime/capability_rollout/20261012_161107_KST/api_verification.json).
- 백업 SHA256: `ac50fa7cf42c486baa64f406c38c51dedf2e4693ed394a4d9ddfce457a223f23`.
- 적용 스크립트는 migration·bootstrap·비교 실패 시 API 중지 상태에서 SQLite backup API로 적용 전 DB를 복구하도록 준비했다. 실제 복구는 필요하지 않았다.
- 이후 운영 데이터/권한이 추가된 상태에서 복구할 때는 쓰기를 중지하고 현재 상태도 백업한 뒤 이전 코드·DB를 함께 복구해야 한다. downgrade만으로 신규 권한 이력은 복원되지 않는다.

## 3. 개발 환경과 실행 상태

- 루트 `.env`의 APP_ENVIRONMENT=development, NEXT_PUBLIC_DEV_USER_EMAIL=law@cmtinfo.co.kr, NEXT_PUBLIC_DEV_USER_NAME=조승현을 설정했다. 다른 환경값은 유지했고 변경 전 해당 3개 항목만 백업 폴더에 보관했다. 현재 저장소의 `.env`는 git에 추적되어 있다. 이번에는 위 3개 개발 설정만 변경했다.
- 기존 API·웹 개발 서버를 재시작했다. API는 8001, 웹은 3000이며 로그는 위 폴더의 api/web_stdout.log, api/web_stderr.log에 있다.
- 브라우저와 프론트 프로덕션 빌드는 실행하지 않았다. Next 개발 서버 재시작만 수행했다.
- localStorage의 pmo.dev.email은 환경 기본값보다 우선한다. 사용자가 이전 테스트 이메일을 따로 저장했다면 해당 값으로 식별되므로, 권한 없음이 표시되면 개발용 사용자 설정이 확정 이메일인지 확인해야 한다.
- 헤더 식별은 개발용이며 이메일 자체의 위조는 막는 인증 수단이 아니다. 운영 모드에서는 이 어댑터의 기능 권한 API를 차단한다. 로그인/세션은 후속이다.

## 4. 검증

- 최종 전체 backend 회귀: **56 passed, 1 skipped** (`python -m pytest tests -q -o faulthandler_timeout=30`). 기존 utcnow() 경고 584건은 실패가 아니다.
- 신규 capability 테스트 11개: DB 판정·헤더 권한 위조 차단·관리자 자동 권한 없음·개발자/일반 관리자 경계·부여/회수/중복 안전·미지원 enum/추가 필드 차단·서비스 우회 차단·data_reset 이중 조건·운영 모드 거부·bootstrap 반복·JSON 복원 시 권한 보존·seed 재사용 방지.
- 신규/기존 migration: 기존 사용자 보존, 모든 기존 개발자 플래그 false 및 grant 0행, enum/중복/FK 제약, 반복 upgrade, downgrade 검증.
- 기존 인력/MM/스냅샷/백업·공휴일·프로젝트 API 회귀를 포함했다. 구 revision 실제 DB 사본 테스트 1개는 이미 이전 묶음에서 적용한 DB에 대해 skip되며, 이번에는 별도 전체 사본 검증을 완료했다.
- 전체 workspace typecheck 및 수정 후 웹 typecheck 통과. 관련 Python Ruff 및 웹 API 파일 lint 통과. 기존 utcnow() 경고는 남아 있다.
- 실제 API는 GET으로만 검증했다. 개발자 본인 권한 조회/백업 overview는 200, 기능 권한 없는 일반 관리자 backup overview/타인 권한 조회는 403, 익명·미등록 사용자는 401. 역할/권한/개발자 위조 헤더도 DB 판정을 바꾸지 못했다.
- 기존 health·홈·프로젝트 관리·인력 API는 200이다. 실제 DB에서 테스트용 사용자 생성·관리자 임명·권한 부여/회수는 하지 않았다.

## 5. 변경 파일과 후속

| 영역 | 이번 변경 파일 |
|---|---|
| 모델/공통 | `apps/api/app/enums/__init__.py`, `models/core.py`, `domain/capabilities.py`, `api/deps.py`, `core/config.py` |
| API | `apps/api/app/api/routes/users.py`, `data_backup.py`, `app/main.py`, `services/data_backup.py` |
| migration/적재 | `apps/api/alembic/versions/261012_0021_user_capabilities.py`, `app/tools/bootstrap_developer.py`, `seed_bundle.py` |
| 공통/웹 계약 | `packages/shared-types/src/enums.ts`, `apps/web/app/lib/api.ts` |
| 검증 | `apps/api/tests/test_capabilities.py`, `test_alembic_migrations.py`, `test_p1_api.py`, `test_personnel_types.py` |
| 데이터/환경 | `apps/api/pmo_ops_p1_schema.db`, `.env`(기존 추적 파일), `.env.example` |
| 문서 | PRD, P3.2 DTL, 정책/구현 비교표, 권한 스키마 문서, 본 기록 |

다음 순서는 22.1의 4번 프로젝트 전용 엑셀 묶음이다. 기능 권한 메뉴/버튼 적용은 관련 화면 작업에서 이 API/공통 함수를 사용한다. 로그인·사용자 관리 UI와 운영 인증 연계는 별도 요구사항으로 남긴다.

사용자 브라우저 확인: 홈·프로젝트 관리·인력 관리·백업 화면이 열리는지, 개발용 기본 사용자 이름이 조승현인지 확인한다.
