# 프로젝트 관련 페이지 구현 설명

이 문서는 PMO 업무수행 관리시스템에서 구현된 프로젝트 관련 4개 화면을 ChatGPT에게 설명하기 위한 전달용 문서다. 원본 파일은 수정하지 않았고, 관련 구현 파일은 `docs/_temp/project_pages_files` 폴더 아래에 번호가 붙은 단일 파일명으로 복사해 두었다.

## 대상 화면

| 화면명 | URL | 원본 Next.js 라우트 파일 | 원본 실제 화면 컴포넌트 | 복사본 라우트 파일 | 복사본 화면 컴포넌트 |
| --- | --- | --- | --- | --- | --- |
| 프로젝트 관리 | `/projects/codes` | `apps/web/app/(protected)/projects/codes/page.tsx` | `apps/web/design/pages/CodePage.tsx` | `docs/_temp/project_pages_files/01_route_projects_codes_page.tsx` | `docs/_temp/project_pages_files/05_frontend_CodePage.tsx` |
| 업무수행현황 | `/projects/operations` | `apps/web/app/(protected)/projects/operations/page.tsx` | `apps/web/design/pages/ExecutionPage.tsx` | `docs/_temp/project_pages_files/02_route_projects_operations_page.tsx` | `docs/_temp/project_pages_files/06_frontend_ExecutionPage.tsx` |
| 프로젝트 상세 | `/projects/[projectId]` | `apps/web/app/(protected)/projects/[projectId]/page.tsx` | `apps/web/design/pages/ProjectDetailPage.tsx` | `docs/_temp/project_pages_files/03_route_projects_projectId_page.tsx` | `docs/_temp/project_pages_files/07_frontend_ProjectDetailPage.tsx` |
| 진행이력 | `/projects/logs` | `apps/web/app/(protected)/projects/logs/page.tsx` | `apps/web/design/pages/HistoryPage.tsx` | `docs/_temp/project_pages_files/04_route_projects_logs_page.tsx` | `docs/_temp/project_pages_files/08_frontend_HistoryPage.tsx` |

## 전체 구조

프론트엔드는 Next.js App Router 구조다. `apps/web/app/(protected)/projects/.../page.tsx` 파일은 라우트와 메타데이터만 담당하고, 실제 화면 UI와 상태 관리는 `apps/web/design/pages/*.tsx`에 구현되어 있다.

API 호출은 `apps/web/app/lib/api.ts`에 모여 있다. 기본 API 주소는 `NEXT_PUBLIC_API_BASE_URL` 환경변수가 없으면 `http://localhost:8000/api`를 사용한다. 주요 함수는 다음과 같다.

- `getP1Screen(screen)`: 화면 표시용 집계 데이터를 `/api/p1-screens/{screen}`에서 가져온다.
- `getP1ScreenWithQuery(screen, query)`: 프로젝트 상세처럼 `project_id` 또는 `code` 쿼리가 필요한 화면에서 사용한다.
- `listProjects`, `createProject`, `updateProject`: 프로젝트 CRUD API 래퍼다.
- `listProjectCodes`, `createProjectCode`, `updateProjectCode`: 프로젝트 마스터/코드 API 래퍼다.
- `listProjectLogs`, `createProjectLog`, `updateProjectLog`: 진행이력 API 래퍼다.

백엔드는 FastAPI + SQLAlchemy 기반이다. 화면 전용 집계 응답은 `apps/api/app/api/routes/p1_screens.py`에서 만들고, CRUD 성격의 API는 `projects.py`, `project_codes.py`, `project_logs.py`에 분리되어 있다. 데이터 모델은 `apps/api/app/models/core.py`, 요청/응답 스키마는 `apps/api/app/schemas/projects.py`, 프로젝트 상태 전환과 권한 규칙은 `apps/api/app/domain/projects.py`에 있다.

## 공통 UI와 공통 동작

모든 프로젝트 관련 화면은 `PmoShell`을 사용한다. `PmoShell`은 좌측 내비게이션, 상단 헤더, 현재 메뉴 활성화, 사용자 정보, 알림 표시를 담당한다.

기간 필터는 `CommonPeriodPicker`를 재사용한다. 프리셋은 대체로 `전체`, `최근 3개월`, `이번달/이번 달`, `지난달`, `올해`, `직접 선택` 형태이며, 각 화면 컴포넌트에서 `from`, `to` 값을 계산해 필터 상태에 반영한다.

프로젝트 마스터 등록/수정은 `ProjectMasterEditModal`이 핵심 공통 컴포넌트다. 이 모달은 프로젝트 코드와 프로젝트 본문 데이터를 같이 다룬다. 등록 시에는 `createProjectCode` 호출 후 `createProject`를 호출하고, 수정 시에는 `updateProjectCode`와 연결된 `updateProject`를 함께 호출한다.

상태 라벨은 프론트와 백엔드 모두 같은 의미 체계를 사용한다.

| 코드 | 라벨 |
| --- | --- |
| `proposing` | 제안중 |
| `presented` | 발표완료 |
| `win` | WIN |
| `loss` | LOSS |
| `drop` | DROP |
| `running` | 수행중 |
| `support` | 업무지원 |
| `done` | 완료 |

프로젝트 유형은 `main`, `sub`, `subcontract`, `partner`가 각각 `주사업`, `부사업`, `하도`, `협력`으로 표시된다.

## 1. 프로젝트 관리 화면

프로젝트 관리 화면은 `/projects/codes`에서 접근한다. 라우트 파일은 `CodePage`를 렌더링하며, URL 쿼리도 처리한다.

- `?create=1`: 등록 모달을 초기 진입 시 자동으로 연다.
- `?editCode=...`: 해당 프로젝트 코드를 찾아 수정 모달을 자동으로 연다.

`CodePage.tsx`의 핵심 역할은 프로젝트 마스터 목록 관리다.

- `/api/p1-screens/code`에서 프로젝트 코드 목록과 상태별 요약을 가져온다.
- 상태 카드 요약 영역을 제공한다. 카드 클릭 시 해당 상태로 목록을 필터링한다.
- 사업유형, 상태, 확도, 사용여부, 기간, 검색어 기반 필터를 제공한다.
- 페이지네이션과 페이지 크기 변경을 지원한다.
- 엑셀/워크북 다운로드는 `downloadProjectWorkbook`을 통해 처리한다.
- 등록/수정 모달에서 필수값 검증, 금액 문자열 파싱, 날짜/시간 변환, 메모 길이 검증을 수행한다.
- 등록 시 새 프로젝트 코드는 현재 연도 기반 `PYYYYNNN` 패턴으로 자동 생성한다.

프로젝트 관리 화면의 데이터는 백엔드 `p1_screens.py`의 `code_screen()`에서 만들어진다. 이 함수는 `ProjectCode` 전체를 조회하고 각 코드와 연결된 `Project`를 찾아 하나의 행으로 합친다. 코드에 연결된 프로젝트가 없으면 런타임 오류를 발생시키도록 되어 있어, 현재 구현은 프로젝트 코드와 프로젝트 본문이 1:1로 연결되어 있다는 전제를 강하게 둔다.

## 2. 업무수행현황 화면

업무수행현황 화면은 `/projects/operations`에서 접근하며 `ExecutionPage.tsx`가 실제 UI를 담당한다.

화면 구성은 다음과 같다.

- 상단 요약 카드: 전체 프로젝트, 제안 단계, 수행 단계, 종료 상태를 표시한다.
- 필터 영역: 사업유형, 상태, 제안PM, 영업대표, 기간, 검색어를 제공한다.
- 목록 테이블: 프로젝트 코드, 사업명, 고객사, 사업유형, 상태, 제안/발표/수행 PM, 제출/최근활동 등 프로젝트 수행 정보를 표시한다.
- 행 선택 또는 상세 버튼을 통해 `/projects/{projectId 또는 code}` 상세 화면으로 이동할 수 있다.
- 프로젝트 마스터 등록/수정 모달을 열 수 있고, 저장 후 `/api/p1-screens/execution`과 `/api/p1-screens/code` 데이터를 다시 불러온다.

`ExecutionPage.tsx`는 먼저 `getP1Screen("code")`로 코드/마스터 행을 가져와 모달 편집용 기준 데이터로 보관하고, 별도로 `getP1Screen("execution")`을 호출해 업무수행현황 목록과 요약을 가져온다.

백엔드의 `execution_screen()`은 `Project`를 `recent_activity_at` 내림차순과 코드순으로 조회한 뒤 다음 데이터를 만든다.

- `summary`: 상태 그룹별 카드 데이터
- `filters`: 화면 필터 옵션
- `rows`: 목록 테이블 행
- `selectedRow`: 대표 프로젝트 상세 미리보기 데이터
- `pagination`: 초기 페이지네이션 정보

## 3. 프로젝트 상세 화면

프로젝트 상세 화면은 `/projects/[projectId]`에서 접근하며 `ProjectDetailPage.tsx`가 실제 UI를 담당한다. 라우트 파라미터가 UUID 형태이면 `project_id`로, 그렇지 않으면 `code`로 간주해 `/api/p1-screens/project-detail`을 호출한다.

화면 구성은 다음과 같다.

- 브레드크럼과 헤더: 프로젝트명, 상태, 사업유형, 사업금액을 표시한다.
- 상태 전환 컨트롤: 현재 상태 기준으로 허용된 다음 상태만 선택할 수 있고, `updateProject(project.id, { status })`로 저장한다.
- 편집 버튼: `ProjectMasterEditModal`을 열어 프로젝트 마스터 정보를 수정한다.
- 기본 정보 카드: 사업 정보, 인력 정보, 사업 일정 정보를 그룹으로 보여준다.
- 일정 정보 카드: 제출/발표/수행 기간 등 일정 타임라인을 보여준다.
- KPI 카드: 프로젝트 금액, 투입 인원, MM 등 프로젝트 요약 지표를 보여준다.
- 투입 인력 패널: 프로젝트 배정 인력의 역할, 상태, 투입기간, MM, 현장/원격 성격 등을 보여준다.
- 최근 진행이력 패널: 해당 프로젝트의 이력을 표시하고 편집할 수 있다.

진행이력 수정은 `updateProjectLog(log.id, { content, log_status })`를 호출한다. 저장 후에는 같은 프로젝트 상세 데이터를 다시 조회해 화면을 갱신한다.

백엔드 `project_detail_screen()`은 프로젝트를 찾은 뒤 `ProjectAssignment`와 `ProjectLog`를 함께 조회한다. 응답 구조는 다음과 같다.

- `project`: 헤더 표시용 프로젝트 요약
- `projectMaster`: 마스터 편집 및 기본 정보 표시용 데이터
- `schedule`: 일정 타임라인
- `kpi`: 상세 KPI
- `assignments`: 투입 인력 목록
- `logs`: 프로젝트별 최근 진행이력

## 4. 진행이력 화면

진행이력 화면은 `/projects/logs`에서 접근하며 `HistoryPage.tsx`가 실제 UI를 담당한다.

화면 구성은 다음과 같다.

- 상단 KPI 카드: 전체 이력, 최근 7일 등록, 최근 7일 상태 변경, 활성 프로젝트를 표시한다.
- 필터 영역: 프로젝트, 이력 유형, 작성자/변경자, 기간, 검색어를 제공한다.
- 진행 이력 등록 버튼: 새 이력을 등록하는 모달을 연다.
- 이력 테이블: 일시, 사업명, 내용, 작성자/변경자, 상태, 프로젝트 상세 이동 버튼을 제공한다.
- 사이드 패널: 최근 상태 변경, 프로젝트별 이력 건수를 보여준다.
- 페이지네이션: 목록 데이터는 `listProjectLogs` API로 조건 조회하며 페이지 크기를 변경할 수 있다.

초기 진입 시 `Promise.all([getP1Screen("history"), loadAllProjects()])`를 수행한다. `getP1Screen("history")`는 KPI와 초기 요약 데이터를 가져오고, `loadAllProjects()`는 등록 모달과 프로젝트 필터 옵션에 사용할 프로젝트 전체 목록을 가져온다.

이력 목록은 화면 내부의 `loadTableRows()`가 `listProjectLogs`를 호출해 가져온다. API 응답을 화면용 행으로 매핑하면서 다음 처리를 수행한다.

- `log_status`를 `메모`, `진행`, `완료` 라벨로 변환한다.
- `logged_at`을 화면 표시용 날짜/시간 문자열로 변환한다.
- 프로젝트 ID, 프로젝트 코드, 프로젝트명을 상세 이동에 사용할 수 있게 보관한다.

진행이력 등록은 `createProjectLog({ project_id, content, log_status })`를 호출한다. 등록 시 `done` 상태는 선택할 수 없으며, 백엔드도 `done` 등록을 거부한다. 이력 수정은 `updateProjectLog`를 호출하며, 백엔드에서 상태 전환 규칙을 검증한다.

## 백엔드 상태 전환과 권한 규칙

`apps/api/app/domain/projects.py`에 프로젝트 상태 전환 규칙이 있다.

허용 상태 전환은 다음과 같다.

- `proposing -> presented` 또는 `drop`
- `presented -> win` 또는 `loss`
- `win -> running`
- `running -> done`
- `support -> done`
- `loss`, `drop`, `done`은 다음 상태가 없다.

프로젝트 수정 권한은 다음과 같다.

- `read_only` 권한은 수정 불가
- `admin`, `general_editor`는 수정 가능
- `project_editor`는 담당 PM이며 특정 상태의 프로젝트인 경우에만 수정 가능
- 프로젝트 코드/마스터 수정은 현재 `admin`, `general_editor`만 허용

`projects.py`의 `update_project()`는 상태가 바뀌면 `ProjectLog`를 자동 생성한다. 이 자동 로그에는 이전 상태와 다음 상태가 기록되고, 내용은 `상태 변경: 이전 -> 다음` 형식이다.

진행이력 자체의 상태 전환은 `project_logs.py`에 있다.

- 신규 등록 시 `done`은 불가
- `memo -> in_progress` 불가
- `in_progress -> memo` 불가
- `done`은 `in_progress`에서만 전환 가능
- 이미 `done`인 이력은 수정 불가

## 주요 데이터 모델

프로젝트 관련 핵심 테이블은 다음과 같다.

- `ProjectCode`: 프로젝트 코드 마스터. 코드, 이름, 사업유형, 상태, 확도, 사용여부를 가진다.
- `Project`: 실제 프로젝트 본문. 프로젝트 코드 연결값, 고객사, 영업부서, 영업대표, PM, 금액, 일정, 제출/발표 정보, 최근활동일, 메모를 가진다.
- `ProjectAssignment`: 프로젝트 투입 인력. 인력, 역할, 상태, 투입기간, MM, 확도, 단가 등을 가진다.
- `ProjectLog`: 진행이력. 프로젝트, 이력 상태, 이전/다음 프로젝트 상태, 작성시각, 작성자, 수정자, 내용을 가진다.

`ProjectCode`와 `Project`는 현재 UI 기준으로 강하게 연결되어 있다. 특히 프로젝트 관리 화면은 모든 코드에 연결 프로젝트가 있어야 정상 응답을 만든다.

## 관련 원본 스크립트 경로

아래는 업무수행현황, 프로젝트 상세, 진행이력, 프로젝트 관리 화면과 직접 연결된 원본 구현/디자인 파일이다.

### Next.js 라우트

1. `apps/web/app/(protected)/projects/codes/page.tsx`
2. `apps/web/app/(protected)/projects/operations/page.tsx`
3. `apps/web/app/(protected)/projects/[projectId]/page.tsx`
4. `apps/web/app/(protected)/projects/logs/page.tsx`

### 프론트엔드 화면/공통 컴포넌트

1. `apps/web/design/pages/CodePage.tsx`
2. `apps/web/design/pages/ExecutionPage.tsx`
3. `apps/web/design/pages/ProjectDetailPage.tsx`
4. `apps/web/design/pages/HistoryPage.tsx`
5. `apps/web/design/pages/projectWorkbookExport.ts`
6. `apps/web/design/components/PmoShell.tsx`
7. `apps/web/design/components/CommonPeriodPicker.tsx`
8. `apps/web/design/components/ProjectMasterEditModal.tsx`
9. `apps/web/design/constants/projectFormOptions.ts`
10. `apps/web/app/lib/api.ts`

### 백엔드 API/도메인/모델

1. `apps/api/app/api/routes/p1_screens.py`
2. `apps/api/app/api/routes/projects.py`
3. `apps/api/app/api/routes/project_codes.py`
4. `apps/api/app/api/routes/project_logs.py`
5. `apps/api/app/models/core.py`
6. `apps/api/app/schemas/projects.py`
7. `apps/api/app/domain/projects.py`

### 디자인 원본/참고 파일

1. `apps/web/design/03_업무수행현황/PMO Execution.html`
2. `apps/web/design/03_업무수행현황/execution.jsx`
3. `apps/web/design/03_업무수행현황/execution.json`
4. `apps/web/design/04_프로젝트코드/PMO Code.html`
5. `apps/web/design/04_프로젝트코드/code.jsx`
6. `apps/web/design/04_프로젝트코드/code.json`
7. `apps/web/design/05_프로젝트상세/PMO Project.html`
8. `apps/web/design/05_프로젝트상세/project.jsx`
9. `apps/web/design/05_프로젝트상세/project.json`
10. `apps/web/design/06_진행이력/PMO History.html`
11. `apps/web/design/06_진행이력/history.jsx`
12. `apps/web/design/06_진행이력/history.json`
13. `docs/design/draft_260508/03_업무수행현황.png`
14. `docs/design/draft_260508/04_프로젝트코드.png`
15. `docs/design/draft_260508/05_프로젝트상세.png`
16. `docs/design/draft_260508/06_진행이력.png`

### 디자인 완료 파일 (브라우저 화면 캡쳐본)
1. `docs\design\complete\홈_260611_1654.png`
2. `docs\design\complete\프로젝트_관리_01_260611_1744.png`
3. `docs\design\complete\프로젝트_관리_02_260611_1744.png`
4. `docs\design\complete\업무수행현황_260611_1655.png`
5. `docs\design\complete\프로젝트_상세_260611_1740.png`
6. `docs\design\complete\진행이력_260611_1742.png`
