# 디자인/기능 구현 참고 가이드

이 문서는 인력 파트 개발 시 프로젝트 파트의 완료된 기능과 디자인을 참고하기 위한 파일 경로와 적용 기준을 정리한다.  
전체 개발 원칙, SSOT, 복잡도 제한, 공통 모듈화 기준은 `docs/harness/dev_guide.md`를 따른다.

---

## 1. 목적

인력 파트는 프로젝트 파트와 같은 제품 안에 있으므로 화면 밀도, 표 스타일, 필터/모달/다운로드 흐름이 일관되어야 한다.  
아래 파일과 캡처본을 기준으로 기능 배치와 디자인 톤을 맞춘다.

### 1.1 인력 파트 디자인 적용 기준

- 기존 시안을 그대로 복제하지 않는다.
- 프로젝트 파트 완료 화면의 밀도, 카드 크기, 표 스타일, 버튼 톤을 우선 따른다.
- 인력 화면은 차트보다 표 중심으로 구현한다.
- 대기/제안 현황은 운영판 성격이므로 과도한 시각화보다 상태 chip과 표 가독성을 우선한다.
- 인력별 투입 상세는 프로젝트 상세 페이지의 상단 요약 + 상세 표 구조를 따른다.
- 관리자 화면은 마케팅형 구성이나 큰 히어로 영역 없이, 필터/목록/편집 동선 중심으로 구성한다.

---

## 2. 프로젝트 파트에서 참고할 구현 패턴

### 2.1 라우트와 화면 연결

프로젝트 파트는 Next.js 라우트 파일을 얇게 두고 실제 화면은 `apps/web/design/pages`에 둔다.

참고 파일:

1. `apps/web/app/(protected)/projects/codes/page.tsx`
2. `apps/web/app/(protected)/projects/operations/page.tsx`
3. `apps/web/app/(protected)/projects/[projectId]/page.tsx`
4. `apps/web/app/(protected)/projects/logs/page.tsx`
5. `apps/web/design/pages/CodePage.tsx`
6. `apps/web/design/pages/ExecutionPage.tsx`
7. `apps/web/design/pages/ProjectDetailPage.tsx`
8. `apps/web/design/pages/HistoryPage.tsx`

인력 파트도 라우트 파일에 큰 UI를 직접 넣지 않고 같은 구조를 따른다.

### 2.2 Shell, 메뉴, 현재 화면

참고 파일:

1. `apps/web/design/components/PmoShell.tsx`
2. `packages/shared-types/src/routes.ts`
3. `packages/shared-types/src/menu.ts`

적용 기준:

- 모든 신규 인력 화면은 `PmoShell`을 사용한다.
- `currentId`는 `menu.ts`의 item id와 맞춘다.
- 상세 화면은 메뉴에 노출하지 않는다.
- 메뉴 그룹과 화면 제목은 완료된 프로젝트 화면의 톤을 따른다.
- `보고서 다운로드` 별도 메뉴나 `/reports/download` 화면은 만들지 않는다.

### 2.3 필터와 기간 선택

참고 파일:

1. `apps/web/design/components/CommonPeriodPicker.tsx`
2. `apps/web/design/pages/ExecutionPage.tsx`
3. `apps/web/design/pages/HistoryPage.tsx`

적용 기준:

- 기준일, 기준주, 기준월의 의미를 화면별로 명확히 표시한다.
- 기간 선택 UI가 필요한 경우 `CommonPeriodPicker` 패턴을 우선 사용한다.
- 조회 전 입력 상태와 조회 후 적용 상태를 구분한다.

### 2.4 로딩과 오류 표시

참고 파일:

1. `apps/web/design/components/LightweightLoading.tsx`
2. `apps/web/design/pages/ExecutionPage.tsx`
3. `apps/web/design/pages/CodePage.tsx`
4. `apps/web/design/pages/ProjectDetailPage.tsx`

적용 기준:

- 초기 로딩 중에는 `LightweightLoading`을 사용한다.
- API 실패는 화면 안에 사용자가 이해 가능한 메시지로 표시한다.
- 저장 중 버튼 상태와 오류 상태를 모달 내부에 표시한다.

### 2.5 등록/수정 모달

참고 파일:

1. `apps/web/design/components/ProjectMasterEditModal.tsx`
2. `apps/web/design/components/ProjectEditModal.tsx`
3. `apps/web/design/constants/projectFormOptions.ts`

적용 기준:

- 신규/수정이 같은 필드 구조라면 하나의 모달 컴포넌트에서 처리한다.
- 필수값 누락은 저장 전에 표시한다.
- 저장 성공 후 모달을 닫고 목록 또는 상세 데이터를 재조회한다.
- 선택 옵션은 화면 내부 하드코딩보다 constants 또는 API 응답으로 관리한다.

### 2.6 엑셀/workbook 다운로드

참고 파일:

1. `apps/web/design/pages/projectWorkbookExport.ts`
2. `apps/web/design/pages/ExecutionPage.tsx`
3. `apps/web/design/pages/CodePage.tsx`

적용 기준:

- 단순 CSV보다 workbook 다운로드 방식을 우선 검토한다.
- 현재 화면에 적용된 필터 결과를 다운로드한다.
- 파일명은 화면명과 다운로드 일시를 포함한다.
- 컬럼 순서는 화면 표와 보고용 요구를 기준으로 명시한다.
- 다운로드 기능은 각 화면 우측 상단 액션으로 제공한다.
- 별도 보고서 다운로드 화면을 만들지 않는다.

---

## 3. 프로젝트 파트 주요 백엔드 참고 파일

### 3.1 API 공통

1. `apps/api/app/api/common.py`
2. `apps/api/app/main.py`

### 3.2 화면용 조회 API

1. `apps/api/app/api/routes/p1_screens.py`

프로젝트 파트의 화면용 API는 한 화면에서 필요한 KPI, 필터 옵션, 행 데이터, 보조 패널 데이터를 조합해 반환한다.  
인력 파트 화면용 API도 이 구조를 참고한다.

### 3.3 CRUD API

1. `apps/api/app/api/routes/projects.py`
2. `apps/api/app/api/routes/project_codes.py`
3. `apps/api/app/api/routes/project_logs.py`
4. `apps/api/app/schemas/projects.py`
5. `apps/api/app/domain/projects.py`
6. `apps/api/app/domain/project_code_policy.py`
7. `apps/api/app/domain/personnel.py`

적용 기준:

- API route, schema, domain validation을 분리한다.
- 권한/상태 전환/필수값 검증은 백엔드에서 수행한다.
- 사람이름 표시처럼 여러 화면에서 반복되는 변환은 domain helper로 분리한다.

---

## 4. 디자인 원본/참고 파일

디자인 변환 과정을 확인할 때만 참고한다.  
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

## 6. 인력 파트 화면별 참고 우선순위

| 인력 화면 | 우선 참고 화면 | 참고 포인트 |
|---|---|---|
| 관리 > 인력 관리 | 프로젝트 관리 | 등록/수정 모달, 필수값 검증, 목록 필터, 관리자 메뉴 노출 |
| 인력 > 인력 투입 현황 | 업무수행현황 | KPI 카드, 필터, 표, 상세 진입, 다운로드 |
| 인력별 투입 상세 | 프로젝트 상세 | 상단 요약, 상세 정보, 관련 인력/이력 테이블, 목록 복귀 |
| 인력 > 대기/제안 현황 | 업무수행현황, 진행이력 | 운영 현황판, 필터, 표 중심 목록, 상태 chip |
| KPI/보고 연계 | 홈, 업무수행현황 | KPI 카드, 집계 표시, 기준일/기준월 표시 |

---

## 7. 인력 파트 화면별 디자인 제한

### 7.1 인력 투입 현황

- KPI 카드는 상태별 요약과 필터 진입 보조 역할로 사용한다.
- 주 화면은 현재 인원 스냅샷 표가 되어야 한다.
- 상태별 요약은 표 또는 간결한 chip/list로 표시하고 대형 차트 중심으로 만들지 않는다.

### 7.2 대기/제안 현황

- 전주/금주/차주 운영판의 가독성을 최우선으로 한다.
- 대기 인원, 제안/수행 인원, 차주 투입 예정은 표 또는 명확한 목록으로 분리한다.
- 장식성 그래프나 과한 카드 배열로 운영 판단을 방해하지 않는다.

### 7.3 인력별 투입 상세

- 프로젝트 상세 화면처럼 상단 요약, 기본 정보, 배정 이력, 월별 MM, 메모/이력 순서로 배치한다.
- 목록으로 버튼을 상단 액션 영역에 둔다.
- URL 직접 접근과 새로고침이 가능한 상세 화면으로 구성한다.

### 7.4 관리 > 인력 관리

- 프로젝트 관리 화면의 등록/수정 모달과 목록 필터 구조를 우선 참고한다.
- 인력 기본정보, 역할/직무, 월별 재직 MM은 탭 또는 명확한 섹션으로 구분한다.
- 관리자 화면이므로 일반 인력 메뉴처럼 운영 현황판 형태로 만들지 않는다.

---

## 8. 디자인/기능 작업 전 체크리스트

1. `docs/harness/dev_guide.md`의 공통 개발 원칙을 먼저 확인한다.
2. DTL의 확정 라우트를 `routes.ts`, `menu.ts`에 반영했는지 확인한다.
3. 실제 화면은 `apps/web/design/pages`에 구현했는지 확인한다.
4. 프로젝트 파트 완료 캡처본과 나란히 비교해 UI 밀도와 표 스타일을 확인한다.
5. mock 데이터는 레이아웃 확인에만 사용하고 완료 기준으로 삼지 않는다.
6. 저장/수정 후 재조회 흐름을 구현했는지 확인한다.
7. 화면 필터와 다운로드 결과가 같은 조건을 쓰는지 확인한다.
8. 화면 라벨과 DB/API enum value가 섞이지 않았는지 확인한다.
9. 별도 보고서 다운로드 화면을 추가하지 않았는지 확인한다.
