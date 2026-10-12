# DTL 정책과 현재 구현 비교

2026-10-12 코드 확인 기준. 하네스에서 혼동하기 쉬운 주요 항목만 기록한다. 실행·브라우저·개발 DB 검증 결과가 아니며, 작업 시 코드와 DTL을 다시 확인한다. 이 문서는 정책 원문을 대체하지 않는다.

## 1. 정책 근거

- [P3.2 백업/엑셀 DTL](../DTL/DTL_P3.2_data_backup_upload_restore_260622.md): `0. 2026-10-07 정책 우선순위`의 0.1~0.5를 적용한다. 아래에 남은 통합 엑셀·전체 교체 설명은 현재 구현의 전환 참고 기준이다.
- [P2 인력 DTL](../DTL/DTL_P2_people_operations_rewritten_260611_no_report_download.md): `0.0 2026-10-07 확정 정책`, 인력 관리/투입 현황/상세, `12.3 관리자 인력 관리 권한`을 확인한다.
- [P3.3 영업대표 DTL](../DTL/DTL_P3.3_sales_owner_role_personnel_scope_260624_1359.md): 내부 정책 업데이트는 2026-10-07이며, `P0. 기준값·데이터 정책 정리`에 인력 유형과 후보 상세 조건이 있다. 배경 절의 과거 동작을 현재 구현으로 단정하지 않는다.
- [공통 DTL](../DTL/DTL_common_PMO_work_management_system_260508_0702.md): `6.2 권한별 공통 동작`에 기능 권한 정책이 있다.
- [P1 프로젝트 DTL](../DTL/DTL_P1_core_operations_260508_0702.md): 머리말은 코드 구현 우선의 정합본이지만, `3.5.1 프로젝트 엑셀 업로드/권한`과 `4.2 적용 규칙`은 적용 목표도 포함한다. 문서 전체를 구현 완료 기록으로 취급하지 않는다.

## 2. 주요 차이

| 항목 | 현재 코드에서 확인한 내용 | DTL 적용 목표 / 남은 차이 |
|---|---|---|
| 백업 메뉴·화면 | `/admin/data-backup`의 명칭은 `데이터 백업/업로드/복원`. 통합 엑셀 검증·반영 UI와 API가 남아 있다. | P3.2 0.1~0.4: `데이터 백업/복원`으로 책임을 정리하고 통합 업로드를 제거한다. 통제된 전체 초기화는 해당 화면/API에서 확인되지 않아 적용이 남아 있다. |
| 프로젝트·인력 엑셀 | 각 관리 화면에 다운로드가 있다. 화면별 추가·수정 업로드는 확인되지 않으며 업로드 API는 백업 화면에 연결되어 있다. | P3.2 0.1~0.2 및 P1 3.5.1: 각 마스터 화면에서 별도 파일 검증·추가/수정 업로드, 누락 행 유지/비활성화 선택, 기능 권한 검증이 필요하다. |
| 인력 유형·필수값 | 인력 관리 보기는 PMO/영업대표 2종. `Personnel.personnel_type`은 없고 본부명·역할 코드로 분류한다. 영업대표 저장 시 팀도 필수 검증한다. | P2 0.0, P3.3 P0: `pmo/sales/technical/external` 4종과 전체 보기, 유형별 최소 필수값이 필요하다. 팀은 선택값이며 PMO MM/KPI 포함 기준도 유형에 따라 확인해야 한다. |
| 영업대표·역할 기준값 | `Role`과 `/api/roles`가 정의되어 있고 영업대표 모달은 인력 후보 API를 조회한다. 후보 조건은 활성 인력·활성 역할·`SALES_OWNER` 코드다. | P3.3의 후보 API 방향은 일부 반영되어 있다. 기존 모델·API·마이그레이션을 재사용하고 실제 DB 반영 여부는 별도 확인한다. `personnel_type = sales` 조건과 유형 마이그레이션은 남아 있으며, DTL 배경의 프로젝트 rows 기반 후보 수집을 다시 구현하지 않는다. |
| 인력 관리 권한 | 메뉴/화면은 admin 또는 본부장 접근을 허용한다. 인력 등록은 admin, 수정은 admin 또는 재직상태만 변경하는 본부장을 허용한다. | P2 12.3의 본부장 재직상태 변경 예외를 유지하되, 엑셀·배정 기능 권한 적용은 별도 확인한다. 인력 관리 전체를 admin 전용으로 기술하지 않는다. |
| 인증·기능 권한 | 개발용 요청 헤더로 사용자를 구성하며 권한 미지정 시 admin이다. 백업 API는 admin 판정을 사용하고 `User` 모델에 기능 권한 정의는 확인되지 않는다. | 공통 6.2, P3.2 0.5: 인증된 사용자와 기능 권한 6종에 따른 UI/API 통제가 필요하다. 현행 개발용 권한 흐름을 운영 인증·인가 완료로 표현하지 않는다. |
| 인력 투입 현황·상세 | 메뉴는 `/people/assignments`를 연결하고 해당 페이지는 `assignmentsMock`·`AppShell`을 사용한다. 숨김 인력 상세 라우트는 확인되지 않는다. | P2 5.1: 메인은 `/people/current-assignments`로 요구된다. 6.2의 숨김 상세 라우트 후보를 확인해 실제 API 연결과 함께 구현해야 한다. 기존 mock은 참고용이다. |
| 주간 KPI API | `main.py`와 등록된 라우트에서 `/api/weekly-kpi-summaries`는 확인되지 않는다. 스냅샷 모델 존재만으로 API 제공을 판단할 수 없다. | P2의 주간 KPI 요구는 스냅샷 기반 파생 응답 API다. 별도 집계 테이블을 자동 추가하지 않고 API 구현 여부부터 확인한다. |

## 3. 코드 근거

- 메뉴/경로: [menu.ts](../../packages/shared-types/src/menu.ts), [routes.ts](../../packages/shared-types/src/routes.ts), [PmoShell.tsx](../../apps/web/design/components/PmoShell.tsx)
- 백업/업로드: [DataBackupRestorePage.tsx](../../apps/web/design/pages/DataBackupRestorePage.tsx), [data_backup.py 라우트](../../apps/api/app/api/routes/data_backup.py), [data_backup.py 서비스](../../apps/api/app/services/data_backup.py)
- 마스터 화면/영업대표: [CodePage.tsx](../../apps/web/design/pages/CodePage.tsx), [PeopleEmploymentPage.tsx](../../apps/web/design/pages/PeopleEmploymentPage.tsx), [ProjectMasterEditModal.tsx](../../apps/web/design/components/ProjectMasterEditModal.tsx)
- 모델/후보/수정 권한: [core.py](../../apps/api/app/models/core.py), [people.py](../../apps/api/app/domain/people.py), [personnel.py](../../apps/api/app/api/routes/personnel.py), [roles.py](../../apps/api/app/api/routes/roles.py)
- 인증/API 등록: [deps.py](../../apps/api/app/api/deps.py), [main.py](../../apps/api/app/main.py), [p1_screens.py](../../apps/api/app/api/routes/p1_screens.py)
- mock 투입 현황: [page.tsx](../../apps/web/app/%28protected%29/people/assignments/page.tsx)

## 4. 미확정 충돌과 사용 방법

- P2 0.0의 영업대표 식별은 `personnel_type = sales` **또는** `SALES_OWNER` 역할로 표현되어 있으나 P3.3 P0는 유형·역할 조건을 함께 요구한다. 실제 후보 조건을 변경하기 전에 이 차이를 알리고 확정한다. 이번 문서 정리는 둘 중 하나를 새 정책으로 결정하지 않는다.
- 공통 DTL의 조회 전용 수정 제한과 P2의 본부장 재직상태 변경 예외가 한 사용자에게 겹칠 때의 우선순위는 별도 확인이 필요하다. 현재 코드의 허용과 정책 확정을 구분한다.
- 요청된 기능의 현재 구현·목표·차이만 확인하고, 비교표의 미구현 항목을 한꺼번에 구현하지 않는다. 이후 정책이나 구현이 바뀌면 관련 행과 근거를 함께 갱신한다.
