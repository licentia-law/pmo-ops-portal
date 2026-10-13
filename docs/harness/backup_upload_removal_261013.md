# 8번: 백업/복원 화면 통합 엑셀 제거 기록

2026-10-13. P3.2 0절·22.1의 8번, PRD 6.3·8의 백업 책임 분리를 적용했다. **현재 프로젝트 코드에 구현 반영 완료. 실제 개발 DB의 업무 데이터·스키마·기존 백업 파일/manifest는 변경하지 않았다.** 사용자의 기존 변경분은 보존했다.

## 1. 진단과 적용 내용

- 통합 화면은 전용 템플릿 → `/api/data-backup/validate` → 검증 캐시 → `/apply` → 전체 삭제/재삽입/파생 생성 경로였다. 전용 프로젝트/인력 업로드와 달리 전체 교체가 가능해 제거했다.
- 메뉴·페이지·metadata·로딩/권한 안내 이름을 `데이터 백업/복원`으로 맞췄다. 통합 파일 선택·템플릿 다운로드·검증/오류 표·전체 교체 버튼·state·handler·API 타입/함수를 제거했다. 복원 절 번호는 2로 맞췄다.
- 브라우저에서 백업 상세 옆 복원 이력 표의 셀 겹침을 확인해 해당 표에 최소 너비 960px/기존 가로 스크롤을 적용했다. 날짜·백업 ID가 옆 셀과 겹치지 않음을 최종 사본 화면에서 확인했다. 전체 레이아웃/공통 스타일은 바꾸지 않았다.
- 백엔드 통합 엔드포인트와 3종 동시 인가 alias, 전용 payload·헤더/매핑·시트 파서·검증 캐시/TTL·검증/전체 교체 서비스·삽입 함수 및 사용되지 않는 import를 제거했다. 제거된 경로는 모든 사용자에게 404이며 OpenAPI에도 없다.
- 실제 사용처가 있는 날짜/사용여부/사업금액 파서·ValidationIssue·MM/스냅샷 helper·JSON 직렬화/복원·백업/삭제·공통 잠금을 유지했다. `_generate_derived_rows`와 관련 기간 helper는 기존 PMO 계산 회귀에서 사용하는 계산 함수로 유지하고 업로드 API나 전체 교체 서비스로 노출하지 않는다. 책임별 모듈 이동이나 패키지 정리는 요청 범위 밖으로 두었다.
- 공통 잠금 이름 `data_backup_upload_restore`는 다른 반영 경로와 동일한 키로 유지했다. 메뉴 명칭과 무관한 내부 호환 키를 바꾸지 않았다.
- 기존 업로드 기록과 전용 엑셀 반영 감사 기록은 `overview.upload_history`/manifest에 보존한다. 화면에는 `엑셀 반영 이력 (조회 전용)`으로 표시하고 입력 기능을 제공하지 않는다.
- JSON 백업/복원(backup_restore), 프로젝트 전용 엑셀(project_excel_manage), 인력 전용 엑셀(personnel_excel_manage), 최초 투입 전환(assignment_manage)의 기능/인가를 보존했다. 최초 전환 링크도 유지한다.

## 2. 변경 파일

- `apps/api/app/api/routes/data_backup.py`: 통합 validate/apply 라우트·payload·인가 제거.
- `apps/api/app/services/data_backup.py`: 통합 업로드 전용 처리 제거, 공통 파서·백업/복원·계산·잠금 유지.
- `apps/api/tests/test_data_backup.py`: 제거된 경로 무변경/404/OpenAPI, JSON 복원/기존 감사, 전용 엑셀 실제 validate/apply 회귀 3건 추가.
- `apps/api/tests/test_capabilities.py`: 통합 권한 테스트를 백업 권한과 전용 엑셀 권한의 독립성 검증으로 변경, 제거된 캐시 fixture/서비스 호출 제거.
- `apps/api/tests/test_personnel_types.py`: 폐기된 통합 엑셀 전용 테스트/워크북 helper만 제거. seed/구형 JSON/PMO MM·스냅샷·KPI/복원 롤백 검증은 유지한다. 전용 인력 엑셀의 유형/참조/롤백 검증은 해당 서비스 테스트로 계속 수행한다.
- `apps/web/design/pages/DataBackupRestorePage.tsx`, `apps/web/app/(protected)/admin/data-backup/page.tsx`, `apps/web/app/lib/api.ts`, `packages/shared-types/src/menu.ts`: 화면·제목·계약/메뉴 정리. `/admin/data-backup` 경로와 currentId는 유지하므로 routes.ts 변경은 필요하지 않았다.
- `apps/web/design/pages/dataBackupWorkbookTemplate.ts`: **삭제**. 통합 양식 전용 파일이며 다른 소비자 없음. 전용 엑셀 템플릿과 패키지는 유지했다.
- PRD, P3.2 DTL, api_guide, policy_implementation_status, 이 기록: 현재 구현/정책/후속 초기화 상태 정합화.

## 3. 자동 검증

- 백엔드 전체 **157 passed, 1 skipped**. skip은 구버전 0019 개발 사본 대상 테스트이고 신규 임시 DB·대표 기존 스키마 upgrade/downgrade·FK 검증은 통과했다. 현재 Windows 환경 TestClient는 소켓 제한 밖에서 실제 종료까지 확인했다.
- 새 테스트는 임시 DB만 사용했다. 제거된 URL 및 trailing slash의 개발자/일반/관리자/미인증 호출도 데이터가 바뀌지 않고 404임을 검증했다. 현대 전용 3종 validate/apply 경로는 OpenAPI에 존재한다.
- JSON round-trip으로 유형·UUID/FK·배정·이력·원장·스냅샷 복구, 사용자 유지, 과거 업로드 이력 조회를 확인했다. 전체 회귀에는 실패 시 복원 롤백, 구형 JSON 유형 호환, 배정/전용 엑셀/최초 전환 회귀도 포함된다.
- 실제 검증/반영 API로 프로젝트·인력 다운로드 파일을 unchanged 처리하고 자동 백업/원본 무변경을 확인했다. 새 테스트에서 필수 logged_at와 기술 인력 소속이 없는 fixture 오류 2건을 고쳤으며 최종 테스트는 모두 통과했다. 기능 코드 실패를 숨기지 않았다.
- `npm run typecheck`: shared-types/shared-ui/shared-mocks/web 모두 통과. 변경 프론트 파일은 저장소에 설정이 없어 기존 설치 parser/react-hooks의 임시 ESLint 설정으로 검사했다. 변경 Python Ruff 통과. 프론트 production build 미실행.
- `rg`: 실행 앱/공통 코드에서 통합 validate_upload/apply_validated_upload·캐시·템플릿·프론트 호출 이름 사용 없음(제거 확인 테스트의 hasattr 검증 제외). Git diff와 문서 참조도 확인했다.

## 4. 내장 브라우저와 실제 DB 사본 검증

증적 폴더: `.runtime/backup_upload_removal/20261013_153203/`. 실제 DB는 SQLite backup으로 `copy.db`에 복사했다. 웹 소스/패키지/.next·.env를 별도 workspace에 복사하고 API18001/WEB13000 및 별도 `backup_runtime`만 사용했다. 기존 백업/manifest도 복사한 후 사본에만 조회 확인용 legacy 이력을 추가했다.

| 항목 | 확인 결과 |
|---|---|
| 메뉴/metadata/페이지 제목 | 데이터 백업/복원으로 표시 |
| 통합 입력 | file input 0, 검증 실행/전체 교체 버튼 0 |
| 기존 이력 | 사본 legacy 이력이 조회 전용 표에 표시 |
| JSON 백업 | 메모 저장, 새 수동 백업 `BKP202610130634346FD0` 생성/목록 갱신 |
| 백업 상세 | 파일 크기·SHA-256·10개 포함 테이블 표시 |
| JSON 복원 | 사본 인력 비고를 임시 변경 후 확인 모달로 복원. 복원 전 자동 백업 `BKP2026101306361368D4`와 완료 이력 표시 |
| 새로고침 | 복원/기존 업로드 이력 유지, 통합 입력 없음 |
| 7번 전환 | 기존 링크로 페이지 열림, 기본 비활성화 안내 유지 |
| 프로젝트/인력 전용 엑셀 | 각 관리 화면의 다운로드·업로드 버튼과 전용 업로드 모달 정상 |
| 브라우저 오류 | 오류 수준 콘솔 로그 0건 |

`result.json`에서 10개 업무 테이블의 직렬화 값/UUID를 새 백업과 전수 비교했다. 임시 비고 복구, FK 오류 0, 인력18/프로젝트코드137/프로젝트137/배정39/로그90/재직MM102/투입MM135/현재스냅샷18/주간스냅샷56/KPI24를 확인했다. 사용자12/기능 권한0/역할3/공휴일46도 원본과 같았다. 기존 JSON의 datetime 초 단위 직렬화 계약은 변경하지 않았다.

- `setup.json`, `mutation.json`, `result.json`, `cleanup.json`, `01-backup-restored.jpg`, 최종 표 개선 `02-final-backup-restored.jpg` 및 사본 JSON 파일을 보존한다. `.runtime/`은 Git 제외 대상이다.
- 원본 DB SHA-256 전후 `275849120cb1320ce88487bf669708a2479f97a33a2b72032f4f93c5e28eef5a` 동일. 실제 데이터 삭제·업로드·복원·파생 재계산·migration 없음.
- 사본 준비 시 원본 WEB3000은 HTTP200, API8001은 연결 거부/리스닝 없음이었다. 원본 서버는 조작하지 않고 새 검증 서버만 실행/종료했다. 완료 시 원본 상태 및 임시 포트 종료를 cleanup.json으로 확인한다. 실제 환경 새 API 사용은 API 재시작 후 추가 확인해야 한다.

## 5. 완료/후속 경계와 사용자 확인

- 현재 코드에 제거 내용 반영 완료. DB 구조 변경이 없어 마이그레이션은 필요하지 않고 head `261013_0022` 유지. 실제 더미 DB·.env·사용자 변경분·기존 백업 파일/manifest는 보존했다.
- 웹/API 재시작 또는 새로고침 후 관리 → 데이터 백업/복원에서 명칭 변경·통합 입력 제거·JSON 목록/복원과 전환 링크 유지를 확인하면 된다. 사용자에게 실제 DB 복원을 검증 목적으로 요구하지 않는다.
- 다음은 **9번 통제된 업무 데이터 전체 초기화 위험 작업**. 이번에는 초기화 UI/API·기능 플래그·CLI·실제 삭제를 추가/실행하지 않았다. 실제 원본 전환은 10번이다.
