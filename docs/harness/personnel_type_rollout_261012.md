# 인력 유형 첫 구현 묶음 — 전환 및 검증 기록

기준일: 2026-10-12 (Asia/Seoul)

## 1. 적용 경계와 근거

P3.2 0절·22.1의 유형/집계 묶음을 구현했다. PRD `PRD_261012_1328.md` 5.7·8절, 공통 DTL의 유형/계산 정책, P2 0.0, 후보 전용 P3.3 P0, P4의 PMO 분자·분모 범위를 따른다.

- **코드·마이그레이션 구현 및 실제 개발 DB `261012_0020` 적용 완료. 과거 파생 원본은 삭제·재생성하지 않았다.**
- 실제 DB를 읽기 전용으로 진단하고 신규 DB·대표 기존 DB·SQLite backup 사본에서 검증했다. 이후 사용자 요청에 따라 실제 DB에 적용했다. 적용 결과는 9절에 기록한다.
- 기능 권한, 새 엑셀, 배정 CRUD, 전체 초기화, 유형 선택 및 보기 확장 UI는 구현하지 않았다.
- 프론트 빌드와 브라우저 확인은 수행하지 않았다.
- 최초 구현 시작 시 git 변경분은 없었다. 실제 DB 적용 작업에서는 이전 구현 변경분을 보존했다. 운영 의존성을 추가하지 않았다.

## 2. 기존 데이터와 변환 규칙

개발 DB: `apps/api/pmo_ops_p1_schema.db`, 기존 revision `260625_0019`.

| 기존 분포 | 인원 |
|---|---:|
| PMO본부 / PM 역할 | 7 |
| PMO본부 / PL 역할 | 11 |
| 합계 | 18 |

| 유형 | 사본/실제 migration 변환 건수 |
|---|---:|
| pmo | 18 |
| sales | 0 |
| technical | 0 |
| external | 0 |
| 판단 필요 | 0 |

보정 규칙은 `app/domain/personnel_types.py`에 있다. 이 규칙은 migration의 전환 계약이므로 향후 조직 매핑 변경은 새 migration으로 처리한다.

1. 이미 유효한 명시 유형이 있으면 유지한다. NULL/빈 유형만 보정한다.
2. 연결된 역할 코드 `SALES_OWNER`이면 sales. 역할 코드가 없을 때만 기존 역할명 `영업대표`를 fallback으로 사용한다.
3. 공백을 제거한 소속이 정확히 `PMO본부`이면 pmo, `기술본부`이면 technical.
4. 정확히 `외부`, `기타`, `회사 외부`, `기타/외부`, `기타/회사 외부 인력`이면 external.
5. 그 외 소속은 임의 분류하지 않는다. migration은 소속별 대상 수를 출력하고 DDL 전에 중단한다. 조직의 실제 유형 확인이 필요하다. 입력 API/엑셀에서는 명시적 유형을 요구한다.

대표 기존 DB에서는 PMO·영업·기술·외부 각 1명과 기술 인력 배정을 만들어 보정했다. sales 역할은 PMO 소속보다 우선한다. 실제 개발 DB에서는 이러한 충돌 행이 없다.

## 3. 모델·API·입력 계약

- backend `PersonnelType`, shared `PERSONNEL_TYPES`/`PersonnelTypeCode`, shared 인력 및 웹 API 타입을 맞췄다.
- 컬럼은 필수이고 4값 CHECK와 index가 있다. DB/ORM에 모든 인력을 PMO로 만드는 기본값을 두지 않았다.
- API에서 유형을 명시하면 해당 값을 저장/조회/수정한다. 구형 POST의 유형 누락은 위 변환 규칙을 적용한다. 구형 PATCH 누락은 기존 유형을 유지한다. null은 400, 미지원 코드값은 422다.
- PMO 외 인력은 성명·소속·직위 필수, 사번·이메일·팀·MM 선택. sales는 활성 `SALES_OWNER` 역할도 필요하고 MM을 비운다. 기존 PMO API 필수값 정책은 이번에 확대하지 않았다.
- 후보 조건은 PRD 5.7과 P3.3 P0에 따라 sales·활성 인력·활성 역할·`SALES_OWNER`를 모두 만족해야 한다. P2 0.0의 간략한 '또는' 문구와는 후보 전용 상세 계약을 구분했다.
- 기존 UI는 두 보기와 모달을 유지한다. 편집 요청에는 저장된 유형을 전달하며 새 선택 UI는 없다. 영업대표 팀 입력은 선택값으로 맞췄다.
- 기존 CSV seed는 유형이 없으면 같은 규칙을 사용하고 명시 유형은 enum 검증한다.
- 현행 통합 엑셀은 기존 헤더를 유지하고 선택 컬럼 `인력 유형`(내부 enum 코드)을 읽는다. 유형이 없으면 보완하며 모호한 소속은 검증 오류다. 비PMO의 사번/팀/MM 누락은 허용한다. 배정 연결에는 기존 사번 키가 필요하다.
- 통합 엑셀은 일반 API와 같은 유형/영업 검증을 사용한다. 전체 교체 대상 파일 내부의 활성 성명 중복을 검사하며 교체될 현재 DB의 동명 인력을 신규 중복으로 판단하지 않는다.

## 4. 기존 MM·스냅샷·KPI 처리

공통 scope는 `app/domain/people.py`의 PMO predicate이며 `Personnel.personnel_type == pmo`만 판단한다.

- PMO 재직 MM 조회/수정과 신규 재직/배정 MM 생성에 적용했다.
- 신규 현재/주간 스냅샷 생성과 홈 기준일·현재 인원·팀별 집계에 적용했다.
- 기존 비PMO MM·스냅샷은 보존하지만 PMO 조회·집계에서 제외한다. 비PMO 재직 MM의 기존 ID를 직접 수정하는 API도 404로 차단한다.
- 월간 KPI 생성/조회는 같은 `pmo_monthly_kpi_values`를 사용한다. 재직 원장의 PMO 분모와 배정 원장의 PMO 분자를 합산한다.
- 과거 저장 KPI의 값·ID·시점은 그대로 둔다. 홈 KPI, 전월 비교, 추이는 저장 행의 연월/시점 정보를 사용해 **조회 시 PMO MM 원장으로 재집계**한 일시 객체를 반환한다. DB에 계산 결과를 flush하지 않는다.
- 따라서 기존 저장 KPI와 원장에 차이가 있었다면 화면 수치는 달라질 수 있다. 원장이 누락/부분 복원된 월은 해당 원장 범위로 계산되며, 비PMO가 섞였을 수 있는 저장 합계로 fallback하지 않는다. 원장 완전성 확인은 운영 전 필요하다.
- 개발 DB 사본의 102개 재직 MM, 132개 배정 MM, 17개 현재 스냅샷, 51개 주간 스냅샷, 24개 월간 KPI의 원본은 변경하지 않았다.
- 비PMO 프로젝트 배정 및 이력은 보존한다. 프로젝트 자체 참여 인원 helper에는 PMO 필터를 넣지 않았다.
- 주간/월간 보고 화면은 아직 mock 기반이며 신규 보고 API 연결은 이번 범위에 포함하지 않았다.

산식 쟁점은 별도다. 기존 월간 생성기는 가동률=수행/재직, 가득률=(수행+제안+지원)/재직으로 PRD 8.1의 명칭과 반대다. 주간 PRD 7.8과 8.1에는 지원 포함 여부도 다르다. 이번에는 기존 생성기의 공식과 기존 팀별 공식을 유지하고 인력 범위만 통일했다. 생성 상태 `delivery/proposal/unassigned`와 홈의 `running/proposing/waiting` 상태 키 차이도 기존 정합성 과제로, 신규 스냅샷의 상태별 표시 확인이 필요하다.

## 5. 백업/복원 및 실패 복구

- 신규 JSON은 컬럼 serializer를 통해 personnel_type을 포함한다. 명시 유형은 그대로 복원한다.
- 유형 없는 구형 JSON은 동일 UUID의 현재 유형을 우선 유지한다. 현재 UUID가 없는 인력만 위 규칙으로 보완한다.
- 미확인 소속 또는 명시된 null/무효 유형은 전체 교체 전에 409로 중단한다. 역할 FK의 기존 활성 역할 검증도 유지한다.
- 복원 전 JSON 자동 백업, 작업 잠금, 단일 데이터 트랜잭션, 실패 rollback 및 잠금 해제를 유지했다.
- FK를 실제 활성화한 임시 SQLite DB에서 삭제 이후 FK 오류를 주입했고 기존 UUID·배정·데이터가 복구되고 실패 이력이 남는 것을 확인했다. 엑셀 파생 생성 실패도 원본을 복구한다.

## 6. 실제 개발 DB 적용 절차 — 2026-10-12 실행 완료

1. API와 쓰기 작업을 중지하고 DB의 최신 분포/미확인 건수를 다시 확인한다.
2. SQLite `Connection.backup()`으로 적용 직전 DB 전체 파일 사본을 별도 안전한 경로에 저장한다. WAL 사용 중 단순 파일 복사에 의존하지 않는다. JSON 백업 및 `apps/api/.runtime/data_backup` 파일/manifest도 별도 보존한다.
3. 해당 사본에 아래와 같이 DATABASE_URL을 명시해 upgrade하고 유형별 수·UUID/FK·원본 보존을 검증한다.

```powershell
# apps/api에서 실행. 경로는 검증용 사본으로 반드시 지정한다.
$env:DATABASE_URL = 'sqlite:///C:/검증용/적용전사본.db'
.\.venv\Scripts\python.exe -m alembic upgrade head
```

4. 사본 결과·건수·백업 위치를 확인한 후 실제 DB에 `261012_0020`까지 적용한다. 이번 코드의 API 실행 전 컬럼 migration이 필요하다.
5. 실제 DB의 enum/필수값·`PRAGMA foreign_key_check`·후보/PMO 조회를 확인하고 API를 재시작한다. 이번에는 과거 파생 데이터를 재생성할 필요가 없다.
6. 적용 직후 문제가 생기면 쓰기를 중지하고 이전 코드와 적용 전 DB 사본을 함께 복구한다. 이번 migration은 임시 DB에서 `downgrade 260625_0019`도 검증했으나 유형 정보가 사라지므로 새 유형을 운영한 이후에는 전체 백업 복구를 우선한다. `alembic downgrade`만으로 신규 운영 데이터까지 복구되지는 않는다.

## 7. 검증 및 다음 시작점

최초 구현 검증 결과: `python -m pytest tests -q -o faulthandler_timeout=30`에서 **45 passed**. 기존 `utcnow()` 사용 관련 경고 404건은 이번 작업의 실패가 아니다. 관련 backend Ruff·전체 workspace typecheck 통과. 프론트 관련 파일 lint 오류 0, 기존 Hook 경고 1건. 당시 실제 DB는 revision `260625_0019`였고 유형 컬럼 미적용 상태였다. 후속 실제 적용 결과는 9절에 구분한다.

검증 코드:

- `tests/test_alembic_migrations.py`: 신규 head, 기존 4유형 보정, UUID/FK·CHECK·NOT NULL, 반복 실행, 사전 차단/재시도, downgrade, 읽기 전용 개발 DB 사본 원본 보존.
- `tests/test_personnel_types.py`: 유형 API·누락/null·후보 회귀·혼합 유형 집계·프로젝트 참여 보존·과거 원본 보존·전체 JSON round-trip·구형 JSON·엑셀·seed·실패 rollback.
- `tests/test_p1_api.py`: 기존 API 회귀 및 명시 유형 fixture.
- 루트 `npm.cmd run typecheck`: 전체 workspace 타입 검사.
- 웹 수정 파일 lint: 기존 ESLint parser/react-hooks를 CLI로 지정해 검사. 저장소에 ESLint 설정 파일이 없어 Next lint 기본 명령은 수행되지 않았고, sandbox 경로 제한에 의한 자동 설치 시도도 실패했다. 의존성·lock 변경은 없다. 기존 useMemo 의존성 경고 1건, 오류 0건이다.
- TestClient의 이전 정지는 현재 환경에서 재현했다. stack은 Windows asyncio loop의 socketpair/accept에 있었다. 동일 테스트를 샌드박스 밖에서 실행하면 통과하므로 앱/테스트의 이벤트 루프를 변경하지 않았다. 모든 API 검증은 메모리 DB에서 수행했다.

실제 개발 DB 적용과 API 오류 해소는 완료했다. 이후 P3.2 22.1의 3번인 기능 권한 모델·백엔드 인가 공통 함수부터 진행한다. 유형 선택/전체·유형별 보기 UI는 인력 전용 업로드 묶음의 후속 범위다. KPI 산식/상태 키 정합성, 보고 화면 API 연계는 별도 요구사항으로 확정한다.

## 8. 변경 파일

| 영역 | 파일 (저장소 루트 기준) |
|---|---|
| 모델/계약 | `apps/api/app/enums/__init__.py`, `apps/api/app/models/core.py`, `apps/api/app/schemas/people.py` |
| migration | `apps/api/alembic/versions/261012_0020_add_personnel_type.py` |
| 공통 규칙 | `apps/api/app/domain/personnel_types.py`, `apps/api/app/domain/people.py`, `apps/api/app/domain/kpi.py` |
| API/집계 | `apps/api/app/api/routes/personnel.py`, `apps/api/app/api/routes/monthly_employment_mm.py`, `apps/api/app/api/routes/p1_screens.py` |
| 백업/적재 | `apps/api/app/services/data_backup.py`, `apps/api/app/tools/seed_bundle.py` |
| 검증 | `apps/api/tests/test_alembic_migrations.py`, `apps/api/tests/test_personnel_types.py`, `apps/api/tests/test_p1_api.py` |
| 공통 타입/mock | `packages/shared-types/src/enums.ts`, `packages/shared-types/src/domain.ts`, `packages/shared-mocks/src/personnel.mock.ts` |
| 기존 화면 연계 | `apps/web/app/lib/api.ts`, `apps/web/design/pages/PeopleEmploymentPage.tsx` |
| 문서 | `docs/PRD_261012_1328.md`, `docs/DTL/DTL_P3.2_data_backup_upload_restore_260622.md`, `docs/schema/schema_human.md`, `docs/harness/policy_implementation_status.md`, 본 기록 |


## 9. 실제 개발 DB 적용 결과 (2026-10-12 15:45 KST 이후)

사용자가 이 대화에서 권장 순서 실행을 요청해 실제 DB 적용을 수행했다. 기능 권한 구현은 진행하지 않았다.

- 적용 전 실제 API: health 200, `/api/p1-screens/code` 500. 모델의 personnel_type 컬럼이 기존 DB에 없어 발생한 스키마 불일치였다.
- 프로젝트의 기존 uvicorn reload 프로세스만 중지한 뒤 SQLite 온라인 backup API로 전체 DB를 백업했다.
- 별도 JSON 원본 백업과 기존 `.runtime/data_backup`의 JSON/manifest 사본도 보관했다. 별도 JSON 원본은 오프라인 보관용이며 앱의 백업 목록에 새로 등록하지 않았다.
- 백업 폴더: `apps/api/.runtime/personnel_type_migration/20261012_154511_KST` (git 제외 경로).
- 전체 DB 백업: [before_migration.db](../../apps/api/.runtime/personnel_type_migration/20261012_154511_KST/before_migration.db).
- 사본/실제 비교 결과: [verification.json](../../apps/api/.runtime/personnel_type_migration/20261012_154511_KST/verification.json).
- 백업 SHA256: `bfb328af211bd3e70dfde4af47cf3e221a04fc03282871596445430a7673e4dc`.
- 사본에 migration을 적용하고 재실행한 뒤 기존 모든 테이블의 원래 컬럼 값을 해시로 비교했다. 유형 PMO 18명, 나머지 각 0명, 필수값/enum/index 정상, FK 위반 0, integrity_check ok를 확인했다.
- 사본 검증 결과·건수·백업 위치·실패 복구 방법을 사용자에게 보고한 후 실제 DB에 `261012_0020`을 적용했다. 실제 결과는 사본과 일치한다.
- 실제 적용 직전 원본이 백업 이후 바뀌지 않았는지 확인했으며, 적용/검증 실패 시 SQLite backup API로 적용 전 DB를 복구하도록 작업 스크립트에 rollback을 준비했다. 실제 실패/복구는 발생하지 않았다.
- 인력 18, 프로젝트/코드 각 137, 배정 38, 진행이력 88, 재직 MM 102, 배정 MM 132, 현재 스냅샷 17, 주간 스냅샷 51, KPI 24를 포함한 모든 기존 테이블 원본 값이 유지됐다. 과거 MM·스냅샷·KPI를 삭제하거나 재생성하지 않았다.
- 기존 `scripts/dev-api.mjs`로 API를 백그라운드 재시작했다. 실행 로그는 위 백업 폴더의 `api_stdout.log`, `api_stderr.log`에 있다.
- 실제 API GET 14건 모두 200: health, 프로젝트 관리/업무수행현황/홈/이력/상세, PMO 인력/영업 인력/후보, 월별 재직 MM 1·2페이지, 프로젝트 목록 1·2페이지, 백업 overview. 응답 결과는 [api_verification.json](../../apps/api/.runtime/personnel_type_migration/20261012_154511_KST/api_verification.json)에 보관했다.
- PMO 목록 18명, 영업 후보 0명, 프로젝트 목록 137건을 확인했다. 재직 MM 기본 활성 필터 조회는 96건이며 저장 원장은 102건 그대로다.
- 최초 API 검증에서 page_size=200으로 요청한 MM 목록은 기존 API 상한 100에 의해 422를 반환했다. 요청을 상한에 맞게 수정해 200 응답을 확인했다. 코드 변경이 필요한 오류가 아니다.
- 적용 후 관련 테스트: `python -m pytest tests/test_alembic_migrations.py tests/test_personnel_types.py tests/test_p1_api.py -q -o faulthandler_timeout=30` → **29 passed, 1 skipped**. skip은 기존 실제 DB가 구 revision일 때만 실행하는 사본 테스트이며 이미 upgrade된 DB에서는 건너뛴다. 이번 작업에서 적용 전 동일 데이터 사본의 전환·원본 보존·반복 실행 검증을 별도로 완료했다.
- 이번 추가 변경은 실제 DB와 적용 상태 문서 5개다. 기존 코드/사용자 변경분은 보존했고 프론트 코드 변경·빌드·브라우저 실행은 없었다.

사용자는 화면을 새로고침한 뒤 프로젝트 관리·인력 관리·홈이 정상적으로 열리는지 확인하면 된다. 추가 DB 명령 실행은 필요하지 않다. 후속 기능 구현은 별도 요청 시 시작한다.
