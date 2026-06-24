# 인력 관련 페이지 구현 설명

이 문서는 PMO 업무수행 관리시스템에서 구현된 인력 관련 화면과 지원 백엔드 구조를 ChatGPT에게 설명하기 위한 전달용 문서다. 원본 파일은 수정하지 않았고, 관련 구현 파일은 `docs/_temp/human_pages/human_pages_files` 폴더 아래에 번호가 붙은 단일 파일명으로 복사해 두었다.

## 대상 화면

| 화면명 | URL | 원본 Next.js 라우트 파일 | 원본 실제 화면 컴포넌트 | 복사본 라우트 파일 | 복사본 화면 컴포넌트 |
| --- | --- | --- | --- | --- | --- |
| 인력 관리 | `/people/employment` | `apps/web/app/(protected)/people/employment/page.tsx` | `apps/web/design/pages/PeopleEmploymentPage.tsx` | `docs/_temp/human_pages/human_pages_files/01_route_people_employment_page.tsx` | `docs/_temp/human_pages/human_pages_files/03_frontend_PeopleEmploymentPage.tsx` |
| 인력 투입 현황(임시/보조) | `/people/assignments` | `apps/web/app/(protected)/people/assignments/page.tsx` | 라우트 파일 자체에 화면 구현 포함 | `docs/_temp/human_pages/human_pages_files/02_route_people_assignments_page.tsx` | 동일 파일 |

## 전체 구조

프론트엔드는 Next.js App Router 구조다. `apps/web/app/(protected)/people/.../page.tsx` 파일은 라우트 엔트리 역할을 한다. 실제 인력 관리 UI와 상태 관리는 `apps/web/design/pages/PeopleEmploymentPage.tsx`에 구현되어 있다.

현재 인력 관련 핵심 구현은 `인력 관리` 화면에 집중되어 있다. `/people/assignments`는 아직 shared mock 기반의 간단한 보조 화면이며, 프로젝트 화면군처럼 완전한 API 연동형 페이지는 아니다.

API 호출은 `apps/web/app/lib/api.ts`에 모여 있다. 인력 관련 주요 함수는 다음과 같다.

- `listPersonnel`, `createPersonnel`, `updatePersonnel`
- `listRoles`, `createRole`, `updateRole`
- `listMonthlyEmploymentMM`, `updateMonthlyEmploymentMM`
- `getDevUserContext`

백엔드는 FastAPI + SQLAlchemy 기반이다. 인력 CRUD는 `personnel.py`, 역할/직무 기준값은 `roles.py`, 월별 재직 MM은 `monthly_employment_mm.py`에서 처리한다. 인력 운영판/스냅샷 성격의 데이터는 `p1_screens.py`에서 함께 사용한다. 데이터 모델은 `apps/api/app/models/core.py`, 요청/응답 스키마는 `apps/api/app/schemas/people.py`, 권한/정합성 규칙은 `apps/api/app/domain/people.py`와 `apps/api/app/domain/personnel.py`에 있다.

## 공통 UI와 공통 동작

인력 관리 화면은 `PmoShell`을 사용한다. `PmoShell`은 좌측 내비게이션, 상단 헤더, 현재 메뉴 활성화, 사용자 정보, 알림 표시를 담당한다.

인력 관리 화면의 주요 특징은 다음과 같다.

- 상태 요약 카드 제공
- 팀/사용여부/검색어 필터 제공
- 인력 등록/편집 모달 제공
- 역할 기준값과 재직/MM 기준을 같은 화면 문맥 안에서 관리
- 엑셀/워크북 다운로드는 `downloadPersonnelWorkbook`을 통해 처리
- 관리자/본부장 권한에 따라 수정 가능 범위가 달라짐

## 1. 인력 관리 화면

인력 관리 화면은 `/people/employment`에서 접근한다. 라우트 파일은 `PeopleEmploymentPage`를 렌더링한다.

`PeopleEmploymentPage.tsx`의 핵심 역할은 인력 마스터 목록 관리다.

- `listPersonnel()`로 인력 목록을 가져온다.
- `listRoles()`로 역할/직무 기준값을 가져온다.
- 화면 내부에서 팀 목록/선택 옵션을 계산한다.
- 상태 카드 요약 영역을 제공한다.
- 팀, 사용여부, 검색어 기반 필터를 제공한다.
- 엑셀 다운로드는 `downloadPersonnelWorkbook()`으로 처리한다.
- 등록/수정 모달에서 필수값 검증, 역할 활성 여부, 권한별 수정 제한을 처리한다.

인력 등록/수정 모달은 한 화면 안에서 다음 입력군을 나눈다.

- 인력 기본정보
- 재직/MM 기준
- 기타

모달 검증 UX는 필수값 누락 시 상단 경고와 필드 강조를 제공하는 구조다.

## 2. 인력 투입 현황(임시/보조) 화면

`/people/assignments`는 현재 shared mock 기반의 간단한 테이블 화면이다.

- `@pmo/shared-mocks`의 `assignmentsMock`을 사용한다.
- `AppShell`, `BaseTable`, `FilterBar`, `Pagination` 등 shared UI 컴포넌트를 사용한다.
- 아직 `PeopleEmploymentPage.tsx`처럼 디자인 시스템 기반의 실제 연동형 페이지로 전환되지는 않았다.

따라서 현재 인력 관련 분석/구현 기준에서 가장 중요한 실제 페이지는 `/people/employment`다.

## 3. 백엔드 CRUD와 권한 규칙

### 3.1 인력 CRUD

`apps/api/app/api/routes/personnel.py`가 담당한다.

- `GET /api/personnel`
- `POST /api/personnel`
- `PATCH /api/personnel/{id}`

핵심 규칙은 다음과 같다.

- 인력 생성은 `admin`만 가능
- 인력 수정은 `admin` 가능
- `head` 조직 역할은 `employment_status`만 제한적으로 수정 가능
- `employee_no`, `email`은 중복 검증 수행
- `group_name`과 `name`은 필수값으로 검증
- `role_id`는 활성 role만 허용

### 3.2 역할/직무 CRUD

`apps/api/app/api/routes/roles.py`가 담당한다.

- `GET /api/roles`
- `POST /api/roles`
- `PATCH /api/roles/{id}`

핵심 규칙은 다음과 같다.

- 역할 등록/수정은 `admin`만 가능
- `code`, `name`은 필수
- `code`는 unique 검증

### 3.3 월별 재직 MM

`apps/api/app/api/routes/monthly_employment_mm.py`가 담당한다.

- `GET /api/monthly-employment-mm`
- `PATCH /api/monthly-employment-mm/{id}`

핵심 규칙은 다음과 같다.

- 목록은 연도/월/인력/본부/팀/사용여부 기준 필터 가능
- 수정은 `admin`만 가능
- `employed_workdays`는 `workdays`를 초과할 수 없음

## 4. 주요 데이터 모델

인력 관련 핵심 테이블은 다음과 같다.

- `Personnel`: 인력 마스터. 사번, 성명, 이메일, 본부, 팀, 직위, 역할, 재직 상태, MM 시작/종료일, 연간 MM, 사용여부, 비고를 가진다.
- `Role`: 역할/직무 기준값. 코드, 이름, 직무군, 설명, 사용여부, 정렬순서를 가진다.
- `MonthlyEmploymentMM`: 월별 재직 MM. 연/월, 근무일수, 재직 근무일수, 재직 MM, 비고를 가진다.
- `MonthlyAssignmentMM`: 월별 프로젝트 투입 MM. 프로젝트/인력/배정 기준 월별 MM 수치를 가진다.
- `CurrentAssignmentSnapshot`: 특정 기준일의 현재 인력 운영 상태 스냅샷이다.
- `WeeklyLoadSnapshot`: 주간 운영판 전개용 스냅샷이다.

`personnel.id`는 인력 식별의 기준 키다. 다른 테이블은 이 값을 통해 인력을 참조한다.

## 5. 인력 관련 원본 스크립트 경로

아래는 인력 관리 화면과 직접 연결된 원본 구현/보조 파일이다.

### Next.js 라우트

1. `apps/web/app/(protected)/people/employment/page.tsx`
2. `apps/web/app/(protected)/people/assignments/page.tsx`

### 프론트엔드 화면/공통 파일

1. `apps/web/design/pages/PeopleEmploymentPage.tsx`
2. `apps/web/design/pages/personnelWorkbookExport.ts`
3. `apps/web/design/components/PmoShell.tsx`
4. `apps/web/app/lib/api.ts`

### 백엔드 API/도메인/모델

1. `apps/api/app/api/routes/personnel.py`
2. `apps/api/app/api/routes/roles.py`
3. `apps/api/app/api/routes/monthly_employment_mm.py`
4. `apps/api/app/api/routes/p1_screens.py`
5. `apps/api/app/models/core.py`
6. `apps/api/app/schemas/people.py`
7. `apps/api/app/domain/people.py`
8. `apps/api/app/domain/personnel.py`
9. `apps/api/app/api/deps.py`
10. `apps/api/app/enums/__init__.py`

### 테스트/마이그레이션 참고

1. `apps/api/tests/test_p1_api.py`
2. `apps/api/alembic/versions/260616_0010_add_roles_and_personnel_role_fk.py`
3. `apps/api/alembic/versions/260617_0013_repair_personnel_mm_schema.py`

## 6. 복사본 파일 목록

다음 19개 파일을 `docs/_temp/human_pages/human_pages_files` 폴더에 복사해 두었다.

1. `01_route_people_employment_page.tsx`
2. `02_route_people_assignments_page.tsx`
3. `03_frontend_PeopleEmploymentPage.tsx`
4. `04_frontend_personnelWorkbookExport.ts`
5. `05_component_PmoShell.tsx`
6. `06_frontend_api.ts`
7. `07_backend_personnel.py`
8. `08_backend_roles.py`
9. `09_backend_monthly_employment_mm.py`
10. `10_backend_p1_screens.py`
11. `11_backend_models_core.py`
12. `12_backend_schemas_people.py`
13. `13_backend_domain_people.py`
14. `14_backend_domain_personnel.py`
15. `15_backend_deps.py`
16. `16_backend_enums_init.py`
17. `17_backend_test_p1_api.py`
18. `18_backend_migration_add_roles_personnel_fk.py`
19. `19_backend_migration_repair_personnel_mm_schema.py`
