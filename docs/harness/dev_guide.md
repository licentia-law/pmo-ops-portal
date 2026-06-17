# Codex 작업 하네스

Codex가 PMO 업무수행 관리시스템을 수정할 때 매번 먼저 확인할 핵심 규칙이다.  
작업 성격별 상세 기준은 아래 문서를 필요한 경우에만 참고한다.

- 화면/프론트: `docs/harness/frontend_guide.md`
- API/백엔드: `docs/harness/api_guide.md`
- 검증 체크리스트: `docs/harness/verification_guide.md`

---

## 1. 작업 원칙

- 가정/추측하지 말고 코드레벨에서 현황/맥락을 정확하게 파악 및 기획 후 작업 진행한다.
- MVP 범위에서는 가장 단순한 구조로 해결한다.
- 기존 패턴, 컴포넌트, helper를 먼저 찾고 재사용한다.
- 새 추상화는 실제 중복이나 책임 분리가 확인될 때만 추가한다.
- DTL에서 제외한 기능은 구현하지 않는다.
- 사용자 변경분은 되돌리지 않는다. 관련 없는 dirty file은 그대로 둔다.

## 2. SSOT

- 라우트 경로: `packages/shared-types/src/routes.ts`
- 사이드바 메뉴: `packages/shared-types/src/menu.ts`
- enum/코드값: `apps/api/app/enums/__init__.py`와 `packages/shared-types/src/enums.ts`
- API envelope: `apps/api/app/api/common.py`
- Shell/사이드바/헤더: `apps/web/design/components/PmoShell.tsx`
- API 호출: `apps/web/app/lib/api.ts`
- 기간/날짜 선택: `apps/web/design/components/CommonPeriodPicker.tsx`
- 로딩 표시: `apps/web/design/components/LightweightLoading.tsx`

## 3. 프론트 구조

- Next.js 라우트 파일은 얇게 유지한다.
- 실제 화면 구현은 `apps/web/design/pages`에 둔다.
- 공통 UI는 `apps/web/design/components`에 둔다.
- 메뉴 변경 시 `routes.ts`, `menu.ts`, `PmoShell currentId`를 함께 확인한다.
- 숨김 상세 라우트는 메뉴에 노출하지 않는다.
- 관리자 화면은 일반 업무 메뉴에 중복 노출하지 않는다.

## 4. 메뉴 기준

현재 MVP 사이드바 기준:

```text
홈
프로젝트: 업무수행현황, 진행이력
인력: 인력 투입 현황
KPI/보고: 주간현황, 월별가동현황
관리: 사용자/권한 관리, 기준정보 관리, 프로젝트 관리, 인력 관리, 공휴일 관리, 월마감/스냅샷
```

- 이 범위를 벗어나는 보고서/상세/원장성 페이지는 DTL에서 명시하지 않는 한 메뉴에 추가하지 않는다.
- `보고서 다운로드` 별도 페이지와 `/reports/download` 화면은 만들지 않는다.
- 다운로드는 각 화면 우측 상단 액션으로 제공한다.

## 5. 구현 체크

- 코드 변경 전 기존 파일과 참조를 `rg`로 먼저 확인한다.
- 라우트/메뉴/enum 삭제 시 관련 페이지, legacy 파일, mock, 디자인 소스, 참조 문자열까지 확인한다.
- 필터는 입력값과 적용값을 분리한다.
- 저장/수정 성공 후 관련 목록 또는 상세 데이터를 재조회한다.
- 프론트 계산은 화면 표시용으로 제한하고, KPI/MM/가동률 계산 기준은 백엔드에 둔다.

## 6. 검증

- Codex는 코드 변경 후 필요한 최소 검증만 수행한다.
- 브라우저에서의 화면 확인은 개발자가 직접 수행한다. Codex는 브라우저를 열어 직접 화면을 검증하지 않는다.
- 작업 진행 시 `typecheck`는 기본 검증에 포함하지 않는다.
- 필요 시 명시적으로 요청받은 경우에만 추가 검증 명령을 실행한다.
- 문서 변경만 한 경우에는 명령 실행 없이 변경 위치 확인으로 마무리해도 된다.
- 검증 실패 시 실패 원인과 미실행 항목을 최종 응답에 명확히 남긴다.

## 7. 완료 보고

- 변경 파일과 핵심 변경 내용을 짧게 요약한다.
- 실행한 검증 명령과 결과를 적는다.
- 브라우저 확인은 개발자가 수행한다. Codex 완료 보고에서는 검증 범위에 포함하지 않았다는 사실만 필요 시 말한다.
