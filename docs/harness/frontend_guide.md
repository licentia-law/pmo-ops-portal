# 프론트엔드 구현 가이드

화면 구조, 상태 관리, 메뉴 기준, UI 컴포넌트 재사용 규칙을 정리한다.  
Codex는 프론트엔드 작업이 있을 때만 이 문서를 참고한다.

---

## 1. 화면 구조

- Next.js 라우트 파일은 얇게 유지한다.
- 실제 화면 구현은 `apps/web/design/pages`에 둔다.
- 공통 UI는 `apps/web/design/components`에 둔다.
- 모든 주요 화면은 `apps/web/design/components/PmoShell.tsx`를 사용한다.
- 라우트 파일에는 metadata, search param 전달, 화면 컴포넌트 연결 정도만 둔다.
- 숨김 상세 라우트는 메뉴에 노출하지 않지만 직접 URL 접근과 새로고침은 가능해야 한다.

## 2. 메뉴와 현재 화면

- 라우트 경로는 `packages/shared-types/src/routes.ts`를 기준으로 한다.
- 사이드바 메뉴는 `packages/shared-types/src/menu.ts`를 기준으로 한다.
- 메뉴 변경 시 `routes.ts`, `menu.ts`, `PmoShell currentId`를 함께 확인한다.
- 관리자 화면은 일반 업무 메뉴에 중복 노출하지 않는다.
- URL이 업무 도메인 경로이더라도 메뉴 노출과 권한 기준이 관리자 화면이면 관리자 화면으로 취급한다.
- `보고서 다운로드` 별도 메뉴나 `/reports/download` 화면은 만들지 않는다.

## 3. MVP 메뉴 기준

```text
홈
프로젝트: 업무수행현황, 진행이력
인력: 인력 투입 현황
KPI/보고: 주간현황, 월별가동현황
관리: 사용자/권한 관리, 기준정보 관리, 프로젝트 관리, 인력 관리, 공휴일 관리, 월마감/스냅샷
```

- 이 범위를 벗어나는 보고서/상세/원장성 페이지는 DTL에서 명시하지 않는 한 메뉴에 추가하지 않는다.
- 다운로드는 각 화면 우측 상단 액션으로 제공한다.

## 4. 디자인 적용 기준

- 프로젝트 파트 완료 화면의 밀도, 카드 크기, 표 스타일, 버튼 톤을 우선 따른다.
- 기존 시안을 그대로 복제하지 않는다.
- 업무/관리 화면은 표, 필터, 모달, 반복 작업 동선을 중심으로 구성한다.
- 마케팅형 히어로, 과도한 카드 배열, 장식성 그래프는 피한다.
- 인력 화면은 차트보다 표와 상태 chip 중심으로 구현한다.
- 인력별 상세는 프로젝트 상세 페이지의 상단 요약 + 상세 표 구조를 따른다.

## 5. 상태 관리

- 화면 내부 상태는 필터 입력값과 실제 적용값을 분리한다.
- `조회` 버튼은 적용값을 갱신하고 데이터를 재조회한다.
- `초기화` 버튼은 필터 기본값으로 되돌린다.
- 저장/수정 성공 후에는 관련 목록 또는 화면용 API를 재조회한다.
- API 실패는 화면 안에 사용자가 이해 가능한 메시지로 표시한다.
- 저장 중 버튼 상태와 오류 상태는 모달 내부에 표시한다.

## 6. 공통 컴포넌트

- Shell/사이드바/헤더: `apps/web/design/components/PmoShell.tsx`
- 기간/날짜 선택: `apps/web/design/components/CommonPeriodPicker.tsx`
- 로딩 표시: `apps/web/design/components/LightweightLoading.tsx`
- 프로젝트 등록/수정 모달 참고: `apps/web/design/components/ProjectMasterEditModal.tsx`
- 프로젝트 편집 모달 참고: `apps/web/design/components/ProjectEditModal.tsx`
- workbook 다운로드 참고: `apps/web/design/pages/projectWorkbookExport.ts`

## 7. 참고 구현 파일

라우트와 화면 연결:

1. `apps/web/app/(protected)/projects/codes/page.tsx`
2. `apps/web/app/(protected)/projects/operations/page.tsx`
3. `apps/web/app/(protected)/projects/[projectId]/page.tsx`
4. `apps/web/app/(protected)/projects/logs/page.tsx`
5. `apps/web/design/pages/CodePage.tsx`
6. `apps/web/design/pages/ExecutionPage.tsx`
7. `apps/web/design/pages/ProjectDetailPage.tsx`
8. `apps/web/design/pages/HistoryPage.tsx`

완료 캡처본:

1. `docs/design/complete/홈_260611_1654.png`
2. `docs/design/complete/프로젝트_관리_01_260611_1744.png`
3. `docs/design/complete/프로젝트_관리_02_260611_1744.png`
4. `docs/design/complete/업무수행현황_260611_1655.png`
5. `docs/design/complete/프로젝트_상세_260611_1740.png`
6. `docs/design/complete/진행이력_260611_1742.png`

## 8. 화면별 참고 우선순위

| 화면 | 우선 참고 화면 | 참고 포인트 |
|---|---|---|
| 관리 > 인력 관리 | 프로젝트 관리 | 등록/수정 모달, 필수값 검증, 목록 필터, 관리자 메뉴 노출 |
| 인력 > 인력 투입 현황 | 업무수행현황 | KPI 카드, 필터, 표, 상세 진입, 다운로드 |
| 인력별 투입 상세 | 프로젝트 상세 | 상단 요약, 상세 정보, 관련 인력/이력 테이블, 목록 복귀 |
| KPI/보고 연계 | 홈, 업무수행현황 | KPI 카드, 집계 표시, 기준일/기준월 표시 |

## 9. 인력 파트 메모

- `관리 > 인력 관리`는 `/people/employment` 라우트를 유지하되 관리 메뉴에만 노출한다.
- `/people/employment`는 URL은 people 하위이지만 관리자 화면으로 취급한다.
- `인력별 투입 상세`는 숨김 라우트로 구현하고 메뉴에는 노출하지 않는다.
- 상세 화면에는 목록으로 버튼을 둔다.
- 가능하면 목록 복귀 시 기존 필터 조건을 유지한다.
