# 프로젝트 전용 엑셀 구현·검증 기록

2026-10-12, P3.2 DTL 0.1~0.2/0.5와 22.1의 4번, P1 DTL 3.5.1 및 현재 PRD를 적용했다.

## 변경 범위

- 프로젝트 관리: 권한 있는 사용자에게 기존 다운로드 오른쪽 업로드 버튼. 서버 다운로드/동일 양식 템플릿, 파일 검증, 신규·수정·동일·오류 및 필드 변경 미리보기, 누락 기본 유지/개별·일괄 비활성화 선택, 확인 후 반영, 성공 후 목록 재조회.
- API/service: `project_excel_manage`, 코드 기준 upsert, 기존 master helper·상태 전환·필수값 재사용. 자동 통합 백업, 사용자/파일 해시/토큰/DB 변경 재확인, 기존 공통 JobLock, 단일 트랜잭션 및 실패 롤백. SQLite는 BEGIN IMMEDIATE, 다른 dialect는 행 잠금을 사용한다.
- 프로젝트 팀 계산 helper를 기존 화면에서 domain으로 옮겨 다운로드와 함께 사용한다. 프로젝트 참여 범위는 비PMO도 유지한다.
- 신규 DB 컬럼/migration/의존성 없음. 이번 작업에서 실제 DB에 업로드·필수값 보정·파생 데이터 재생성을 하지 않았다. 실제 DB는 기존 revision `261012_0021`이다.
- 인력 전용 업로드·배정 CRUD·전체 초기화·통합 업로드 제거는 이번에 구현하지 않았다.

주요 변경 파일:

- `apps/api/app/services/project_excel.py`, `app/api/routes/project_excel.py`, `app/main.py`
- `apps/api/app/domain/projects.py`, `app/api/routes/p1_screens.py`
- `apps/api/tests/test_project_excel.py`
- `apps/web/app/lib/api.ts`, `design/pages/CodePage.tsx`, `design/components/ProjectWorkbookImportModal.tsx`
- `apps/web/design/pages/DataBackupRestorePage.tsx` (자동 백업 종류 라벨)
- PRD·P3.2 DTL·API 가이드·정책/구현 비교표·프로젝트 스키마 문서

## 실제 DB 사본 검증 및 적용 경계

실제 개발 DB는 sqlite read-only 연결로 복사했고, 수정·백업·복원은 사본에서만 실행했다. 실제 실행 중 API에는 다운로드/템플릿/검증 요청만 보냈다. 원본 DB 파일 SHA256이 검증 전후 동일했다.

- [검증 결과](../../apps/api/.runtime/project_excel_rollout/20261012_172929_KST/verification.json)
- [읽기 전용 원본 스냅샷](../../apps/api/.runtime/project_excel_rollout/20261012_172929_KST/source_snapshot.db)
- 사본: `apps/api/.runtime/project_excel_rollout/20261012_172929_KST/verification.db`
- 증빙·DB 사본·JSON 백업은 `.runtime` 내 Git 제외 파일이다.

| 원본 업무 데이터 | 건수 |
|---|---:|
| 인력 | 18 |
| 프로젝트/코드 | 각 137 |
| 배정 | 38 |
| 진행이력 | 88 |
| 재직 MM/투입 MM | 102 / 132 |
| 현재/주간 스냅샷 | 17 / 51 |
| 월간 KPI | 24 |

사본에서 정상 프로젝트 1건의 이름을 수정하고 기본 누락 유지로 반영했다. UUID·배정·인력·MM·KPI 보존, FK 정합성을 확인했다. 업로드 전 자동 백업으로 사본을 통합 복원해 원래 업무 데이터 세트와 일치함을 확인했다.

### 기존 필수값 누락

현재 137건 전체 다운로드를 그대로 검증한 결과: 동일 39건, 오류 98건. 오류는 기존 저장 행의 필수값 누락이며 새 엑셀 출력이 값을 잃은 것은 아니다.

- 55건: 제안 제출일·제안 발표일 누락.
- 41건: 제안 발표일 누락.
- 2건(`P2026135`, `P2026136`): 고객사·금액·영업대표/부서·사업 시작/종료일·PM 등 핵심 필수값 누락.

정책 및 기존 마스터 API의 필수값 규칙을 유지했다. 임의 생성/빈 값 우회/실제 DB 수정은 하지 않았다. 오류가 있는 파일은 반영할 수 없으며, 사용자가 원본에서 값을 보완하거나 정상 프로젝트만 포함한 파일을 사용할 수 있다. 후자의 파일 누락 처리 기본값은 유지다.

## 검증 결과

- `.venv\Scripts\python.exe -m pytest tests -q --tb=short`: **84 passed, 1 skipped**. 프로젝트 전용 테스트 28개 포함.
- 마지막 행 수 제한·반복 동일 업로드 보완 후 전용 28개를 재실행해 통과했고 관련 Ruff/웹 typecheck·lint도 재확인했다. 최종 실제 API 다운로드/검증의 200 응답과 원본 DB 파일 무변경을 다시 확인했다.
- skip은 실제 개발 DB revision이 이미 최신이라 구형 revision 전용 사본 migration 테스트가 건너뛴 것이다. 임시 스키마 신규/upgrade 테스트 및 이번 실제 DB 사본 검증은 통과했다.
- 인가/인가 회수, 신규·수정·동일, 개별/일괄 누락 비활성화, 코드/enum/필수값/일정/금액/수식/파일 형식/크기 오류, 사용자·해시·만료·소비 토큰, 검증 중/후 DB 변경, 같은 초 내 변경을 검증했다.
- 중간 반영 실패 및 백업 저장 실패에서 원본 업무 데이터 롤백과 잠금 해제를 확인했다. 자동 백업 복원·FK 및 비PMO 배정·이력·MM·KPI·과거 스냅샷 보존도 확인했다.
- 전체 workspace `npm.cmd run typecheck`, 관련 Python Ruff, 변경 프론트 파일 ESLint CLI(parser + react-hooks 규칙) 통과. 기존 ESLint 설정이 없어 Next lint 대신 기존 개발 의존성으로 CLI를 사용했다.
- 실행 중 개발 웹 서버의 홈·프로젝트·인력·백업 URL HTTP 200 확인. 실제 API export/template/validate 및 미인증 차단 확인. 브라우저 조작은 하지 않았고 사용자 요청대로 프론트 build는 실행하지 않았다.
- 기존 utcnow() DeprecationWarning은 남아 있다.

## 데이터/복구 및 후속 작업

- 실제 DB 반영: 없음. 코드가 준비되어 사용자가 화면에서 검증·확인 후 업로드할 수 있다.
- 유형 변환: 이번 작업에서 0건. 인력 유형을 쓰거나 변경하는 업로드가 아니다.
- 파생 데이터: 기존 MM/KPI/과거 스냅샷 보존. 실제 DB 재계산 없음. 프로젝트를 수정하는 업로드는 오늘자 스냅샷 이름만 동기화한다.
- 백업: 기존 통합 JSON 형식/유형 필드/구형 JSON 복원 경로를 그대로 재사용한다. 권한 있는 백업 화면에서 `프로젝트 업로드 전 백업`을 선택해 전체 업무 세트를 복원할 수 있다. 복원은 프로젝트만이 아니라 백업의 전체 업무 데이터로 되돌리는 기존 정책이다.
- 실패: DB 전체 롤백. 이미 저장된 업로드 전 JSON 백업은 복구 증빙으로 남는다. 토큰을 소비하지 않아 DB 변경이 없으면 재시도 가능하다.
- 토큰: 메모리 캐시, 30분/최대 100건. 서버 재시작 후 다시 검증한다. 여러 worker에 걸친 공유 검증 캐시는 후속 운영 구성에서 검토한다. PostgreSQL 통합 검증과 운영 로그인 연결은 이번 로컬 SQLite 검증 범위에 포함하지 않았다.
- 최종 로컬 API는 Windows 자동 재시작 중 프로세스가 종료되는 현상을 피해 `--reload` 없이 실행했다. 최종 응답 증빙은 `apps/api/.runtime/project_excel_rollout/server/api_final_verification.json`이다. 다음 API 코드 수정 시 서버 재시작이 필요하며 기존 dev launcher/Windows 자동 재시작 원인 확인은 별도다.
- 후속 재실행 점검: 검증용 API/웹이 8001/3000을 점유하여 사용자 실행이 실패한 것을 확인했다. 해당 프로젝트 프로세스만 종료 후 `npm run dev:api`(reload 포함)/`npm run dev:web` 정상 기동 및 HTTP 200을 확인했다. 점검 서버도 종료하여 두 포트를 비웠다. 위 `--reload` 없는 검증 서버는 현재 실행 중이 아니다. 기존 실행 스크립트는 변경하지 않았다.
- 다음 시작점: DTL 22.1의 5번, 인력 4종/전체 보기와 인력 전용 엑셀 검증·업로드·누락 처리. 프로젝트 파일과 인력 파일은 독립적으로 유지한다.

사용자 브라우저 확인: `/projects/codes`에서 다운로드/업로드 버튼, 템플릿, 검증 미리보기·오류 안내·누락 기본 유지/일괄 선택을 확인한다. 실제 반영이 필요 없는 확인은 파일 검증 후 모달을 닫으면 된다.
