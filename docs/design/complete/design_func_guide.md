# 프로젝트 파트 구현 참고 가이드

이 문서는 인력 파트 개발 시 이미 구현 완료된 프로젝트 파트의 기능/디자인 패턴을 재사용하기 위한 기준이다.  
단순 파일 목록이 아니라, 어떤 구조와 구현 방식을 따라야 하는지에 초점을 둔다.

---

## 1. 결론

현재 프로젝트 파트 구현을 참고하기 위한 기본 자료는 충분히 존재한다.  
다만 기존 문서는 파일 목록만 있어 인력 파트 개발자가 다음 사항을 놓치기 쉽다.

- Next.js 라우트와 실제 화면 컴포넌트의 분리 방식
- `PmoShell` 기반 사이드바/헤더/현재 메뉴 표시 방식
- 화면용 집계 API와 CRUD API를 분리하는 방식
- API envelope, pagination, sort, search 공통 규칙
- 로딩/오류/필터/엑셀 다운로드/모달 저장 후 재조회 패턴
- 완료 캡처본을 기준으로 디자인 밀도와 표 스타일을 맞추는 방식

따라서 인력 파트 개발 시에는 아래 섹션을 기준으로 프로젝트 파트 패턴을 따라간다.

---

## 2. 인력 파트에서 따라야 할 핵심 패턴

### 2.1 라우트와 화면 컴포넌트 분리

프로젝트 파트는 `app/(protected)` 라우트 파일을 얇게 두고, 실제 화면 구현은 `apps/web/design/pages`에 둔다.

인력 파트도 동일하게 구성한다.

```text
a. Next.js 라우트
   apps/web/app/(protected)/people/...

b. 실제 화면 컴포넌트
   apps/web/design/pages/...

c. 공통 UI/모달/피커
   apps/web/design/components/...
```

예시:

- `apps/web/app/(protected)/projects/operations/page.tsx`
- `apps/web/design/pages/ExecutionPage.tsx`
- `apps/web/app/(protected)/projects/codes/page.tsx`
- `apps/web/design/pages/CodePage.tsx`

인력 파트 신규 화면도 라우트 파일에 큰 UI를 직접 넣지 않는다.

### 2.2 Shell과 메뉴

완성된 프로젝트 화면은 `apps/web/design/components/PmoShell.tsx`를 사용한다.

인력 파트도 아래 방식을 따른다.

- `PmoShell`을 사용해 사이드바, 헤더, 사용자 표시를 통일한다.
- 현재 메뉴는 `currentId`로 지정한다.
- 메뉴 항목은 `packages/shared-types/src/routes.ts`, `packages/shared-types/src/menu.ts`를 함께 수정한다.
- 숨김 상세 라우트는 사이드바에 노출하지 않는다.

인력 파트 확정 라우트:

| 화면 | 라우트 | 메뉴 노출 |
|---|---|---|
| 관리 > 인력 관리 | `/people/employment` | 관리 메뉴에만 노출 |
| 인력 > 인력 투입 현황 | `/people/current-assignments` | 인력 메뉴 노출 |
| 인력 > 대기/제안 현황 | `/people/waiting-proposals` | 인력 메뉴 노출 |
| 인력별 투입 상세 | `/people/assignments/[personnelId]` | 비노출 |

### 2.3 화면용 API와 CRUD API 분리

프로젝트 파트는 두 종류의 API를 함께 쓴다.

1. 화면 구성용 API
   - `GET /api/p1-screens/execution`
   - `GET /api/p1-screens/code`
   - `GET /api/p1-screens/project-detail`
   - `GET /api/p1-screens/history`

2. CRUD API
   - `GET/POST/PATCH /api/projects`
   - `GET/POST/PATCH /api/project-codes`
   - `GET/POST/PATCH /api/project-logs`

인력 파트도 같은 원칙을 따른다.

- 목록/상세 화면에 필요한 KPI, 필터 옵션, 대표 행 데이터는 화면용 조회 API에서 한 번에 받을 수 있게 설계한다.
- 등록/수정/상태 변경은 별도 CRUD API로 처리한다.
- 저장 후에는 화면용 API 또는 목록 API를 재조회해 화면을 갱신한다.

권장 인력 API 구성:

| 목적 | API |
|---|---|
| 인력 관리 CRUD | `/api/personnel` |
| 역할/직무 CRUD | `/api/roles` |
| 배정 원장 CRUD | `/api/project-assignments` |
| 현재 투입 현황 | `/api/current-assignment-snapshots` 또는 화면용 조합 API |
| 대기/제안 현황 | `/api/weekly-load-snapshots` 또는 화면용 조합 API |
| 주간 KPI | `/api/weekly-kpi-summaries` |
| 월별 KPI | `/api/monthly-kpi-summaries` |

### 2.4 API envelope와 공통 목록 규칙

백엔드는 `apps/api/app/api/common.py`의 공통 규칙을 따른다.

응답 형태:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

목록 API는 가능하면 아래 공통 규칙을 따른다.

- `page`
- `page_size`
- `sort`
- `q`
- 필요한 상태 필터
- `meta.page`
- `meta.page_size`
- `meta.total`

정렬/검색/페이지네이션은 `parse_sort`, `apply_text_search`, `paginate` 패턴을 재사용한다.

### 2.5 프론트 API 클라이언트

프론트 API 호출은 `apps/web/app/lib/api.ts`에 모은다.

인력 파트 추가 시:

- 타입을 먼저 정의한다.
- `request<T>()`를 재사용한다.
- query string은 기존 `qs()` 패턴을 확장하거나 인력용 query 타입을 추가한다.
- API 오류는 envelope의 `error.message`를 우선 사용한다.

### 2.6 로딩, 오류, 재조회

프로젝트 파트 화면은 다음 흐름을 사용한다.

- 초기 진입 시 `LightweightLoading` 표시
- API 실패 시 화면 안에 오류 메시지 표시
- 등록/수정 성공 후 관련 API 재조회
- 모달은 저장 중 상태와 오류 상태를 가진다

인력 파트도 mock 표시로 끝내지 않고, 실제 API 연결 후 이 흐름을 따른다.

### 2.7 필터와 기간 선택

프로젝트 파트는 화면 내부 필터 상태를 유지하고, 기간 선택은 `CommonPeriodPicker`를 재사용한다.

인력 파트 적용 기준:

- 기준일, 기준주, 기준월은 화면별로 명확히 분리한다.
- 직접 입력 대신 가능한 경우 공통 기간/날짜 선택 컴포넌트를 재사용한다.
- 필터 적용 상태와 화면 표시 상태를 분리해 `조회`, `초기화` 동작을 명확히 한다.

### 2.8 표와 카드 디자인

완료된 프로젝트 화면의 디자인 밀도와 표 스타일을 인력 파트에서도 맞춘다.

- 운영 화면은 표 중심으로 구성한다.
- KPI 카드는 요약/필터 진입 역할을 겸할 수 있다.
- 표는 행 높이, 글자 크기, badge/chip 스타일을 프로젝트 화면과 맞춘다.
- 긴 텍스트는 줄바꿈/말줄임 기준을 명확히 한다.
- 카드 안에 카드를 중첩하지 않는다.
- 상세 화면은 상단 요약, 기본 정보, 관련 목록, 이력/메모 영역 순서로 구성한다.

### 2.9 모달과 검증

프로젝트 등록/수정은 `ProjectMasterEditModal.tsx` 패턴을 따른다.

인력 파트 모달도 아래 원칙을 따른다.

- 필수값은 저장 전에 프론트에서 1차 검증한다.
- 백엔드에서도 동일 검증을 수행한다.
- 필드 오류는 해당 입력 근처에 표시한다.
- 저장 성공 후 모달을 닫고 목록/상세를 재조회한다.
- 신규 등록과 수정 모달을 가능한 한 같은 컴포넌트에서 처리한다.

### 2.10 엑셀 다운로드

프로젝트 파트는 `projectWorkbookExport.ts`로 workbook 다운로드를 처리한다.

인력 파트도 단순 CSV보다 workbook 방식으로 맞춘다.

- 화면에 적용된 필터 결과를 다운로드한다.
- 파일명은 화면명과 일시를 포함한다.
- 컬럼 순서는 화면 표와 보고용 요구를 기준으로 별도 정의한다.
- `제안PRJ`, `이행PRJ` 별도 화면은 만들지 않고 업무수행현황 필터와 화면별 다운로드를 사용한다.

---

## 3. 프로젝트 파트 주요 참고 파일

### 3.1 Next.js 라우트

1. `apps/web/app/(protected)/projects/codes/page.tsx`
2. `apps/web/app/(protected)/projects/operations/page.tsx`
3. `apps/web/app/(protected)/projects/[projectId]/page.tsx`
4. `apps/web/app/(protected)/projects/logs/page.tsx`

### 3.2 프론트엔드 화면/공통 컴포넌트

1. `apps/web/design/pages/CodePage.tsx`
2. `apps/web/design/pages/ExecutionPage.tsx`
3. `apps/web/design/pages/ProjectDetailPage.tsx`
4. `apps/web/design/pages/HistoryPage.tsx`
5. `apps/web/design/pages/projectWorkbookExport.ts`
6. `apps/web/design/components/PmoShell.tsx`
7. `apps/web/design/components/CommonPeriodPicker.tsx`
8. `apps/web/design/components/ProjectMasterEditModal.tsx`
9. `apps/web/design/components/ProjectEditModal.tsx`
10. `apps/web/design/components/LightweightLoading.tsx`
11. `apps/web/design/constants/projectFormOptions.ts`
12. `apps/web/app/lib/api.ts`

### 3.3 백엔드 API/도메인/모델

1. `apps/api/app/api/common.py`
2. `apps/api/app/api/routes/p1_screens.py`
3. `apps/api/app/api/routes/projects.py`
4. `apps/api/app/api/routes/project_codes.py`
5. `apps/api/app/api/routes/project_logs.py`
6. `apps/api/app/models/core.py`
7. `apps/api/app/schemas/projects.py`
8. `apps/api/app/domain/projects.py`
9. `apps/api/app/domain/project_code_policy.py`
10. `apps/api/app/domain/personnel.py`
11. `apps/api/app/main.py`

### 3.4 라우트/메뉴 타입

1. `packages/shared-types/src/routes.ts`
2. `packages/shared-types/src/menu.ts`
3. `packages/shared-types/src/enums.ts`
4. `packages/shared-types/src/domain.ts`

---

## 4. 디자인 원본/참고 파일

프로젝트 파트 디자인 변환 과정을 확인할 때만 참고한다.  
실제 구현 기준은 `apps/web/design/pages`, `apps/web/design/components`, 완료 캡처본이다.

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

---

## 5. 디자인 완료 파일

브라우저 화면 캡처본은 인력 파트 UI 밀도, 여백, 표 스타일, 카드 크기, 버튼 톤을 맞추는 기준으로 사용한다.

1. `docs/design/complete/홈_260611_1654.png`
2. `docs/design/complete/프로젝트_관리_01_260611_1744.png`
3. `docs/design/complete/프로젝트_관리_02_260611_1744.png`
4. `docs/design/complete/업무수행현황_260611_1655.png`
5. `docs/design/complete/프로젝트_상세_260611_1740.png`
6. `docs/design/complete/진행이력_260611_1742.png`

---

## 6. 인력 파트 작업 전 체크리스트

1. DTL의 확정 라우트를 `routes.ts`, `menu.ts`에 먼저 반영한다.
2. 라우트 파일은 얇게 만들고 실제 화면은 `apps/web/design/pages`에 둔다.
3. 신규 API는 envelope, pagination, sort, search 공통 규칙을 따른다.
4. 화면용 조회 API와 CRUD API를 분리한다.
5. mock 데이터는 초기 레이아웃 확인에만 쓰고 완료 기준으로 삼지 않는다.
6. 저장/수정 후 재조회 흐름을 구현한다.
7. 엑셀 다운로드는 화면 필터 결과 기준으로 동작하게 한다.
8. 완료 후 프로젝트 파트 캡처본과 나란히 비교해 UI 밀도와 표 스타일을 확인한다.

