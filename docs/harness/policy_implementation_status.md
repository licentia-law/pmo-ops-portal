# DTL 정책과 현재 구현 비교

2026-10-13 코드 확인 기준. 하네스에서 혼동하기 쉬운 주요 항목만 기록한다. 인력 유형 첫 묶음은 임시 DB·개발 DB 사본 검증을 완료했으며 [전환 기록](personnel_type_rollout_261012.md)에 결과를 분리한다. 실제 개발 DB에 인력 유형 `261012_0020`과 기능 권한 `261012_0021`, 배정 월 기준 입력 `261013_0022`를 적용했다. 기능 권한 결과는 [권한 기록](capability_rollout_261012.md), 신규 배정 및 실제 DB 무변경 비교/읽기 검증은 [6번 기록](assignment_rollout_261013.md)을 참조한다. 브라우저 확인은 [핵심 가이드 4절](dev_guide.md)에 따라 Codex가 사본 환경에서 기본 검증하고 사용자가 필요 시 추가 확인한다. 이 문서는 정책 원문을 대체하지 않는다.

## 1. 정책 근거

- [P3.2 백업/엑셀 DTL](../DTL/DTL_P3.2_data_backup_upload_restore_260622.md): `0. 2026-10-07 정책 우선순위`의 0.1~0.5를 적용한다. 아래에 남은 통합 엑셀·전체 교체 설명은 현재 구현의 전환 참고 기준이다.
- [P2 인력 DTL](../DTL/DTL_P2_people_operations_rewritten_260611_no_report_download.md): `0.0 2026-10-07 확정 정책`, 인력 관리/투입 현황/상세, `12.3 관리자 인력 관리 권한`을 확인한다.
- [P3.3 영업대표 DTL](../DTL/DTL_P3.3_sales_owner_role_personnel_scope_260624_1359.md): 내부 정책 업데이트는 2026-10-07이며, `P0. 기준값·데이터 정책 정리`에 인력 유형과 후보 상세 조건이 있다. 배경 절의 과거 동작을 현재 구현으로 단정하지 않는다.
- [공통 DTL](../DTL/DTL_common_PMO_work_management_system_260508_0702.md): `6.2 권한별 공통 동작`에 기능 권한 정책이 있다.
- [P1 프로젝트 DTL](../DTL/DTL_P1_core_operations_260508_0702.md): 머리말은 코드 구현 우선의 정합본이지만, `3.5.1 프로젝트 엑셀 업로드/권한`과 `4.2 적용 규칙`은 적용 목표도 포함한다. 문서 전체를 구현 완료 기록으로 취급하지 않는다.

## 2. 주요 차이

| 항목 | 현재 코드에서 확인한 내용 | DTL 적용 목표 / 남은 차이 |
|---|---|---|
| 백업 메뉴·화면 | `/admin/data-backup`의 명칭은 `데이터 백업/복원`. 2026-10-13 통합 엑셀 UI/템플릿/호출 타입 및 백엔드 검증·전체 교체 경로를 제거했다. JSON 백업/복원·기존 업로드 이력 조회와 공통 파서/계산/잠금은 유지했다. [8번 기록](backup_upload_removal_261013.md) 참조. | 실제 DB 삭제·복원·업로드는 미실행. 전체 초기화 구현은 아래 별도 행을 따른다. |
| 통제된 업무 전체 초기화 | 2026-10-13 하단 위험 작업 UI와 대상/건수 조회·정확한 확인 문구·10분 사용자/DB 상태 토큰·DB 기반 인가·공통 JobLock/쓰기 잠금·검증된 자동 JSON 백업·원자적 삭제/감사 저장·실패 롤백을 구현했다. 별도 감사 테이블은 JSON 복원/초기화 밖에 보존한다. 사본에서 756→0→756건과 감사/기준정보 보존을 검증했다. [9번 기록](data_reset_rollout_261013.md) 참조. | 기본 비활성화. `261013_0023` 신규 감사 migration은 코드 준비/사본 검증 완료, 실제 DB는 `261013_0022` 유지. 실제 DB 초기화 미실행. 원본 전환은 10번이며 PostgreSQL 실행 검증·운영 인증 연계는 남아 있다. |
| 프로젝트·인력 엑셀 | 두 관리 화면의 별도 다운로드/템플릿·검증/반영·누락 처리와 기능 권한을 구현했다. 미리보기/누락 모달과 다운로드를 공통화했다. [4번](project_excel_rollout_261012.md)·[5번](personnel_excel_rollout_261013.md) 사본 검증 참조. 8번 통합 경로 제거 후 전용 업로드 회귀 검증 완료. | 프로젝트 98건 기존 필수값 누락은 남아 있고 인력 18건 새 양식 round-trip은 동일/오류 0건. 실제 DB 업로드·보정 없음. |
| 인력 유형·필수값 | 4종 enum/migration에 이어 2026-10-13 전체/유형별 보기·등록/수정 선택·전용 엑셀과 누락 처리 구현. 명시 유형 PMO 등록/변경 및 신규 엑셀은 PMO 필수값을 검증하며 구형 유형 누락 등록/PATCH 계약은 유지한다. | 실제 DB 업로드·유형 보정 없음. 현재 18명 모두 PMO, 사본에서 4종 신규/복원 검증. [5번 기록](personnel_excel_rollout_261013.md) 참조. |
| 영업대표·역할 기준값 | 기존 후보 API의 `sales` + 활성 인력 + 활성 역할 + `SALES_OWNER` 기준을 유지했다. 영업 유형 목록은 비활성 행도 사용여부 필터로 조회한다. | 유형 목록과 영업대표 후보를 구분한다. 프로젝트 영업/PM 성명 문자열의 FK 전환은 후속이며 이번에 자동 치환하지 않는다. |
| PMO MM·스냅샷·KPI | MM 조회/수정·새 파생 생성·홈/팀별 집계의 PMO 범위를 유형으로 통일했다. 월간 KPI 조회는 PMO 원장만 재집계하고 저장된 과거 MM/스냅샷/KPI는 보존한다. JSON/전용 엑셀/seed의 유형 전환을 반영했다. | 주간/월간 보고 화면은 mock 기반이고 보고 API 연계는 후속. 월간 생성기의 기존 산식은 PRD 8.1과 가동률/가득률 명칭이 반대이므로 이번 범위 변경과 별도로 확인해야 한다. |
| 인력 관리 권한 | 메뉴/화면은 admin 또는 본부장 접근을 허용한다. 인력 등록은 admin, 수정은 admin 또는 재직상태만 변경하는 본부장을 허용한다. | P2 12.3의 본부장 재직상태 변경 예외를 유지하되, 엑셀·배정 기능 권한 적용은 별도 확인한다. 인력 관리 전체를 admin 전용으로 기술하지 않는다. |
| 인증·기능 권한 | 기능 권한 6종과 users.is_developer/user_capabilities, DB 기반 공통 인가/의존성, 최소 조회·임명·부여/회수 API를 구현했다. 조승현/law@cmtinfo.co.kr만 개발자로 지정했으며 일반 관리자 자동 권한은 없다. 백업/복원과 전용 엑셀/배정/최초 전환 API에 연결했다. 제거된 통합 업로드용 3종 동시 인가는 남기지 않았다. | 기능 권한 UI·로그인/JWT·신규 기능 연결은 후속. 기능 권한의 개발용 이메일 헤더는 운영 인증이 아니며 production 모드에서 차단한다. 일반 CRUD의 기존 CurrentUser는 이번에 일괄 전환하지 않았다. |
| 인력 투입 현황·상세 | 메뉴는 `/people/assignments`를 연결하고 해당 페이지는 `assignmentsMock`·`AppShell`을 사용한다. 숨김 인력 상세 라우트는 확인되지 않는다. | P2 5.1: 메인은 `/people/current-assignments`로 요구된다. 6.2의 숨김 상세 라우트 후보를 확인해 실제 API 연결과 함께 구현해야 한다. 기존 mock은 참고용이다. |
| 프로젝트 상세 투입 배정 | 2026-10-13 모든 배정 기간/상태 목록, 4종 인력 후보, 등록/수정/종료/취소 UI/API와 assignment_manage, 날짜/역할/MM/겹침 검증, 감사 로그·잠금·롤백을 구현했다. 현재 이후 투입 MM/오늘 스냅샷/KPI만 갱신하고 과거/수동 재직 MM을 보존한다. 사본 검증 후 실제 DB에 nullable 월 기준 MM migration 261013_0022 적용; 기존 업무 데이터 무변경. [6번 기록](assignment_rollout_261013.md) 참조. | 인력 투입 메인/숨김 상세·보고 화면의 mock 교체는 별도 후속이다. 산식 정의 충돌과 로그인 연계도 유지한다. |
| 최초 투입 파일 전환 | 2026-10-13 숨김 전환 화면·양식/참조 다운로드·파일 검증·전체 자동 백업/추가 반영·DB 완료 기록/재반영 차단을 구현했다. assignment_manage 인가와 기본 비활성화 스위치/production 차단. 임시 DB 및 실제 DB 사본에서 검증했다. [7번 기록](assignment_import_rollout_261013.md) 참조. | 실제 DB 활성화/원본 전환은 미실행. 9번 초기화 기능 구현 이후 실제 원본 전환/건수 대사는 10번으로 남긴다. |
| 주간 KPI API | `main.py`와 등록된 라우트에서 `/api/weekly-kpi-summaries`는 확인되지 않는다. 스냅샷 모델 존재만으로 API 제공을 판단할 수 없다. | P2의 주간 KPI 요구는 스냅샷 기반 파생 응답 API다. 별도 집계 테이블을 자동 추가하지 않고 API 구현 여부부터 확인한다. |

## 3. 코드 근거

- 메뉴/경로: [menu.ts](../../packages/shared-types/src/menu.ts), [routes.ts](../../packages/shared-types/src/routes.ts), [PmoShell.tsx](../../apps/web/design/components/PmoShell.tsx)
- 백업/복원: [DataBackupRestorePage.tsx](../../apps/web/design/pages/DataBackupRestorePage.tsx), [data_backup.py 라우트](../../apps/api/app/api/routes/data_backup.py), [data_backup.py 서비스](../../apps/api/app/services/data_backup.py)
- 전체 초기화: [DataResetPanel.tsx](../../apps/web/design/components/DataResetPanel.tsx), [data_reset.py](../../apps/api/app/services/data_reset.py), [감사 스키마](../schema/schema_data_reset.md)
- 프로젝트 전용 엑셀: [project_excel.py](../../apps/api/app/services/project_excel.py), [검증/누락 모달](../../apps/web/design/components/ProjectWorkbookImportModal.tsx)
- 마스터 화면/영업대표: [CodePage.tsx](../../apps/web/design/pages/CodePage.tsx), [PeopleEmploymentPage.tsx](../../apps/web/design/pages/PeopleEmploymentPage.tsx), [ProjectMasterEditModal.tsx](../../apps/web/design/components/ProjectMasterEditModal.tsx)
- 모델/후보/수정 권한: [core.py](../../apps/api/app/models/core.py), [people.py](../../apps/api/app/domain/people.py), [personnel.py](../../apps/api/app/api/routes/personnel.py), [roles.py](../../apps/api/app/api/routes/roles.py)
- 인증/API 등록: [deps.py](../../apps/api/app/api/deps.py), [main.py](../../apps/api/app/main.py), [p1_screens.py](../../apps/api/app/api/routes/p1_screens.py)
- mock 투입 현황: [page.tsx](../../apps/web/app/%28protected%29/people/assignments/page.tsx)
- 프로젝트 상세 배정: [ProjectAssignmentsPanel.tsx](../../apps/web/design/components/ProjectAssignmentsPanel.tsx), [등록/수정 서비스](../../apps/api/app/services/project_assignments.py), [공통 배정 규칙](../../apps/api/app/domain/assignments.py)

## 4. 미확정 충돌과 사용 방법

- P2 0.0의 영업대표 식별은 `personnel_type = sales` **또는** `SALES_OWNER` 역할로 표현되어 있으나 PRD 5.7 및 후보 전용 정책인 P3.3 P0는 유형·역할을 함께 요구한다. 첫 구현 묶음은 PRD·P3.3의 구체적인 후보 계약을 적용했다.
- PRD 7.8은 주간 가동률에 수행+제안, 8.1은 수행+제안+지원을 기술한다. 기존 팀별 helper는 수행+제안을 사용한다. 월간 생성기는 가동률=수행/재직, 가득률=(수행+제안+지원)/재직으로 PRD 8.1과 반대다. 이번에는 집계 범위만 변경했고 산식 확정·변경은 후속이다.
- 공통 DTL의 조회 전용 수정 제한과 P2의 본부장 재직상태 변경 예외가 한 사용자에게 겹칠 때의 우선순위는 별도 확인이 필요하다. 현재 코드의 허용과 정책 확정을 구분한다.
- 요청된 기능의 현재 구현·목표·차이만 확인하고, 비교표의 미구현 항목을 한꺼번에 구현하지 않는다. 이후 정책이나 구현이 바뀌면 관련 행과 근거를 함께 갱신한다.
