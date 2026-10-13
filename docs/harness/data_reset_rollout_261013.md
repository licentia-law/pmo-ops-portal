# 9번: 통제된 업무 데이터 전체 초기화 구현·검증

2026-10-13. 기준은 PRD `PRD_261012_1328.md`, P3.2 0.4·6.8·22.1의 9번, 핵심/API/프론트/검증 하네스다. 이전 단계와 사용자 변경분은 보존했다. 이번 단계는 기능 구현과 사본 검증까지이며 실제 DB 삭제/복원/신규 migration 적용은 하지 않았다.

## 현재 상태 진단과 구현 결정

- 기존 JSON 백업의 10개 `TABLE_MODELS`와 FK 역순 `DELETE_ORDER`, `_delete_dataset`, 직렬화/해시 검증, 공통 JobLock을 재사용했다. 전체 업무 범위를 새 목록으로 복제하지 않았다.
- 기존 `data_reset` 공통 인가는 개발자/저장된 admin 및 `backup_restore`를 이미 요구했다. 기존 일반 관리자에게 권한을 추가하지 않았다.
- 기존 수동 JSON 백업 생성/파일 삭제 API에는 공통 잠금이 없었다. 초기화 중 복구용 파일 삭제/manifest 경합을 막기 위해 해당 API에도 기존 JobLock을 연결했다.
- 별도 초기화 API/UI와 성공 감사 테이블은 없었다. 파일 manifest만으로는 삭제 커밋과 성공 기록의 원자성을 보장할 수 없어 업무 데이터 밖의 `DataResetAudit` 모델/migration을 추가했다. 파일은 보완 기록이고 성공 SSOT는 DB 감사 기록이다.
- 실제 DB는 `261013_0022`, 인력 18명/프로젝트 137건/배정 39건이었다. 실행 플래그는 모든 환경에서 기본 false로 설정하며 실제 `.env`는 변경하지 않았다. 운영 의존성은 추가하지 않았다.

## 변경 파일

- `.env.example`, `apps/api/app/core/config.py`: 기본 false인 `DATA_RESET_ENABLED` 안내/설정.
- `apps/api/app/models/core.py`, `apps/api/alembic/versions/261013_0023_data_reset_audit.py`: 감사 모델·제약·인덱스·감사 이력이 있는 downgrade 차단.
- `apps/api/app/services/data_reset.py`, `apps/api/app/api/routes/data_backup.py`: preview/실행, 인가·확인 토큰·잠금·백업 검증·롤백·감사 처리.
- `apps/api/app/services/excel_common.py`: fingerprint 정렬을 실제 PK 컬럼으로 통일. 복합 PK인 user_capabilities도 인가 상태 재검증에 포함하며 기존 단일 id 정렬은 유지한다.
- `apps/web/design/components/DataResetPanel.tsx`, `apps/web/design/pages/DataBackupRestorePage.tsx`, `apps/web/app/lib/api.ts`: 하단 위험 영역·건수·확인 모달·결과/복구 백업·감사 조회·API 계약·작업 유형 라벨.
- `apps/api/tests/test_data_reset.py`, `test_data_reset_migration.py`, `test_alembic_migrations.py`: 초기화 및 최신 migration 회귀 검증.
- PRD/P3.2 DTL, `docs/harness/api_guide.md`, `policy_implementation_status.md`, `docs/schema/schema_permissions.md`, `schema_data_reset.md`, 이 기록: 모델/계약/정책·실제 적용 상태.

## 실행/복구 계약

1. 권한 있는 사용자는 `GET /api/data-backup/reset/preview`에서 업무 10개 테이블 건수/활성 상태/최근 20건 감사 이력을 본다. 감사 migration이 없거나 플래그가 꺼져도 페이지는 안전하게 비활성 사유를 표시한다.
2. 10분 확인 토큰은 사용자와 업무/기준/권한 DB 상태에 묶인다. 정확한 문구 `업무 데이터 전체 초기화`를 입력해야 실행한다. 다른 사용자/만료/상태 변경/이미 성공한 토큰은 차단한다. 캐시는 프로세스 메모리이며 재시작/다른 프로세스에서는 재조회가 필요하다.
3. 공통 JobLock과 DB 쓰기 잠금 후 권한/데이터를 다시 확인한다. 자동 JSON 백업이 생성되고 해시·테이블·건수·행 내용이 현재 DB와 일치해야 삭제를 시작한다.
4. 업무 삭제와 성공 감사 기록은 같은 트랜잭션으로 커밋한다. 실패하면 전체 롤백하고 실패 감사를 별도 저장한다. 감사 DB 실패는 manifest로 보완하며 DB/파일 모두 불가하면 원래 오류가 반환된다. 커밋 후 잠금 해제/manifest 오류는 성공을 유지하고 메시지에 경고한다.
5. 사용자/권한/역할/공휴일/잠금/백업 파일/manifest/감사 테이블은 대상 밖이다. 복구는 같은 페이지의 `데이터 복원`에서 반환된 `pre_backup_id`를 선택한다. 복원 후 감사 이력은 남고 기존 성공 토큰을 다시 사용할 수 없다.

## 자동 검증 결과

- `apps/api/.venv/Scripts/python.exe -m pytest -q`(apps/api): **174 passed, 1 skipped**, 최종 코드로 실행 완료. 건너뛴 테스트는 개발 DB가 과거 0019 스키마일 때만 수행하는 기존 사본 테스트다. 현재 0022 사본 upgrade와 신규 DB/head, 합성 legacy upgrade는 별도 테스트에서 통과했다. 기존 UTC datetime 경고는 이번 범위에서 변경하지 않았다.
- 초기화/감사 migration 대상은 17개 테스트다. 기본 비활성/누락 migration, 관리자·기능 권한·헤더 위조·production 차단, 정확한 문구/사용자/만료/DB 변경/재실행, 전체 업무 삭제와 protected/FK 보존, 백업 round-trip, JobLock 경합/실행 중 권한 회수, 백업 손상/디스크 실패/부분 삭제/감사 insert/commit 실패 롤백, 커밋 후 잠금/manifest 실패, 감사 DB 실패의 파일 보완을 포함한다. 잠금 대기 중 토큰 만료와 초기화 내부의 수동 백업/파일 삭제 요청 차단도 검증했다. 마지막 잠금 보완 후 초기화+기존 백업 대상 실행은 **19 passed**다.
- 기존 0022→0023→반복 upgrade는 업무 UUID/FK/원장을 그대로 보존했다. 빈 감사 downgrade/재upgrade 성공, 감사 기록이 있을 때 downgrade 거절 검증 완료.
- `npm run typecheck`: shared-types/shared-ui/shared-mocks/web 모두 통과.
- 관련 ESLint parser/react-hooks 검사 및 Ruff 검사 통과. 프론트 production build는 요청에 따라 실행하지 않았다.

## 실제 DB 사본 및 브라우저 검증

격리 폴더: `.runtime/data_reset_check/20261013_161456/`. SQLite backup API로 실제 DB를 복사하고 별도 backup_runtime과 web 소스/`.next`를 사용했다. API `18001`, WEB `13000`에서 검증했으며 기존 실행 서버에 mutation을 보내지 않았다.

| 업무 테이블 | 초기화 전 | 초기화 후 | 자동 백업 복구 후 |
|---|---:|---:|---:|
| personnel | 18 | 0 | 18 |
| project_codes | 137 | 0 | 137 |
| projects | 137 | 0 | 137 |
| project_assignments | 39 | 0 | 39 |
| project_logs | 90 | 0 | 90 |
| monthly_employment_mm | 102 | 0 | 102 |
| monthly_assignment_mm | 135 | 0 | 135 |
| current_assignment_snapshots | 18 | 0 | 18 |
| weekly_load_snapshots | 56 | 0 | 56 |
| monthly_kpi_summaries | 24 | 0 | 24 |
| 합계 | **756** | **0** | **756** |

- 사본 migration 적용 전후 기존 모든 테이블 원시 행/UUID/FK/시간값 동일. 삭제/복구 후 FK 오류 0건. 복구 후 업무 10개 테이블의 직렬화된 행은 자동 JSON 백업과 모두 동일했다.
- 사용자 12명, 권한 부여 0건, 역할 3건, 공휴일 46건의 원시 행 보존. 기존 백업 파일/manifest는 보존하고 자동 백업/작업 기록만 추가했다. 초기화 성공 감사 1건은 복원 후에도 동일 ID로 유지됐다.
- 브라우저: 틀린 확인 문구 실행 차단/취소, 정확한 문구 실행, 결과 배너 및 자동 백업 표시, 업무 건수 0/빈 데이터 재초기화 차단, 새로고침 후 감사 보존, 자동 백업 복원/756건 복구, 플래그 false 시 실행 버튼 차단 확인. 마지막 콘솔 error/warn 0건.
- 자동 백업: `BKP20261013071738226B`, 감사 ID: `8903ea03-b957-421a-97ce-1d58aa409c67`(사본에만 존재).
- 근거: `setup.json`, `reset_result.json`, `restore_result.json`, `cleanup.json`, `01-confirmation.jpg`, `02-reset-complete.jpg`, `03-restored.jpg`, `04-disabled.jpg`(격리 폴더). 검증용 서버만 종료했고 기존 WEB 3000은 HTTP 200을 유지했다. 기존 API 8001은 검증 시작/종료 시 모두 연결 거절 상태였으며 재시작하지 않았다. WEB 종료 요청의 자동 승인 검토 시간 초과 후 테스트 경로와 프로세스 부모를 확인해 사본 프로세스만 종료했다.

## 실제 적용 경계와 다음 단계

- **코드/마이그레이션 준비 완료, 임시 DB·실제 DB 사본 검증 완료. 실제 개발 DB migration 0023/초기화/복원은 미실행.** 실제 DB SHA-256 `275849120cb1320ce88487bf669708a2479f97a33a2b72032f4f93c5e28eef5a`, `.env` SHA-256 `1a21ce86d3aaabd0b5bd5a94f688d719a23a371bd4d79310b285130a26fb0324` 전후 동일. 실제 revision은 0022이며 감사 테이블은 없다.
- 현재 실제 화면은 API/WEB 재시작 후 하단 위험 영역과 대상 건수를 보여주되 `DB 마이그레이션 필요` 사유로 실행이 막힌다. 0023을 적용해도 `DATA_RESET_ENABLED=false`이므로 자동 활성화되지 않는다.
- 실제 적용은 DB 파일·환경·백업 폴더를 보존한 뒤 migration 0023을 별도로 적용해야 한다. 이 migration은 업무 데이터를 변경하지 않는다. 빈 감사 테이블일 때만 downgrade 가능하며 기록이 있으면 전체 DB 사본으로 복구/보존 계획을 먼저 세운다. 기능 활성화와 실제 업무 초기화는 별도 실행 결정이다.
- PostgreSQL 쓰기 잠금 분기는 구현됐지만 현재 환경에서 실행 검증하지 않았다. 기존 개발용 이메일 인증은 production에서 차단하며 운영 인증 연계가 남아 있다. 다중 워커 토큰 공유는 도입하지 않았고 다른 프로세스의 토큰은 안전하게 재조회하도록 거절한다.
- 다음 시작점은 **22.1의 10번 실제 원본 전환**이다. 원본 인력/프로젝트 파일·필수값을 먼저 검토하고 사본에서 인력→프로젝트→최초 투입 배정 순서로 업로드 및 UUID/FK/MM/스냅샷/KPI 건수 대사를 수행한 뒤 실제 초기화/전환 적용을 결정한다.
