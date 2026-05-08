# DTL - Scaffolding / Initial Architecture
- 문서명: PMO 업무수행 관리시스템 스캐폴딩 DTL
- 기준 문서:
  - `PRD_260506_1415.md`
  - `analysis_pmo_excel_260429_1749.md`
  - 확정된 페이지 시안 세트
- 목적:
  - 기능 개발 전에 프로젝트 초기 구조를 흔들리지 않게 고정한다.
  - 공통 레이아웃, 라우팅, 컴포넌트, 타입, API contract, 상태값/코드값 위치를 먼저 정한다.
  - 로컬 Codex / 개발자가 바로 구현 착수 가능한 형태로 스캐폴딩 기준을 제공한다.
- 범위:
  - 프론트엔드 / 백엔드 / DB / 공통 타입 / mock / 개발 규칙
  - 실제 비즈니스 로직 전체 구현은 포함하지 않음
  - “초기 골격 + 공통 규칙 + 첫 구현 단위 진입점”까지 포함

---

## 1. 스캐폴딩 목표

### 1.1 왜 먼저 필요한가
이 프로젝트는 단순 CRUD가 아니라 아래 3축으로 구성된다.

1. 운영 원장
2. 인력 운영 / 배정 / 스냅샷
3. KPI / 보고 / 다운로드

따라서 초기에 아래가 흔들리면 이후 수정 비용이 급격히 커진다.

- 좌측 메뉴 구조
- 페이지 폴더 구조
- 공통 필터/테이블/상세패널 패턴
- 상태값 / 사업유형 / 권한 enum
- 사람 / 프로젝트 / 배정 / 공휴일 중심 스키마
- 리포트 출력 흐름

### 1.2 스캐폴딩 완료 기준
아래가 준비되면 스캐폴딩 완료로 본다.

- 앱 기본 폴더 구조 생성
- 공통 레이아웃 적용
- 좌측 메뉴/상단 헤더 동작
- 1차 대상 페이지 라우팅 연결
- 공통 enum / type 분리
- API client 골격 생성
- mock 데이터 위치 고정
- DB migration 시작점 생성
- 공통 테이블 / 필터 / 페이지네이션 / 카드 컴포넌트 생성
- 상태 배지 / 권한 가드 / 다운로드 버튼 공통화
- 첫 페이지(업무수행현황) 정적 렌더 + 타입 연결 가능

---

## 2. 권장 기술 스택 기준

### 2.1 프론트엔드
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui 또는 유사 공통 UI 패턴
- React Query 또는 SWR 중 1개 선택
- Zod (폼/응답 검증)
- Zustand 또는 Context 최소 사용

### 2.2 백엔드
- FastAPI
- SQLAlchemy 2.0
- Pydantic
- Alembic
- PostgreSQL

### 2.3 파일 출력
- 엑셀(.xlsx) 우선
- PDF/인쇄는 후속

### 2.4 인증/권한
- MVP는 로컬 계정
- 세션 또는 JWT 중 하나로 단순화
- 복잡한 SSO/OIDC는 후속

---

## 3. 최상위 폴더 구조

아래 구조를 기준으로 시작한다.

```text
pmo-work-management-system/
├─ apps/
│  ├─ web/
│  └─ api/
├─ packages/
│  ├─ shared-types/
│  ├─ shared-ui/
│  ├─ shared-config/
│  └─ shared-mocks/
├─ docs/
│  ├─ prd/
│  ├─ dtl/
│  ├─ references/
│  └─ checklists/
├─ infra/
│  ├─ docker/
│  └─ scripts/
├─ .env.example
├─ README.md
└─ package.json / pyproject.toml
```

### 3.1 사용 의도
- `apps/web`: 실제 화면
- `apps/api`: API 서버
- `packages/shared-types`: enum / dto / schema
- `packages/shared-ui`: 공통 UI 컴포넌트
- `packages/shared-config`: 메뉴 정의, route 상수, 기본 설정
- `packages/shared-mocks`: 초기 mock 데이터

---

## 4. 프론트엔드 스캐폴딩 상세

## 4.1 `apps/web` 권장 구조

```text
apps/web/
├─ app/
│  ├─ (auth)/
│  │  └─ login/
│  ├─ (protected)/
│  │  ├─ dashboard/
│  │  ├─ projects/
│  │  │  ├─ operations/
│  │  │  ├─ codes/
│  │  │  ├─ [projectId]/
│  │  │  └─ logs/
│  │  ├─ people/
│  │  │  ├─ employment/
│  │  │  ├─ assignments/
│  │  │  ├─ current/
│  │  │  └─ waiting/
│  │  ├─ reports/
│  │  │  ├─ weekly/
│  │  │  ├─ monthly/
│  │  │  ├─ waiting-proposal/
│  │  │  ├─ proposal-projects/
│  │  │  ├─ delivery-projects/
│  │  │  └─ downloads/
│  │  └─ admin/
│  │     ├─ users/
│  │     ├─ master-data/
│  │     ├─ holidays/
│  │     └─ monthly-closing/
│  ├─ layout.tsx
│  └─ globals.css
├─ components/
│  ├─ layout/
│  ├─ filters/
│  ├─ tables/
│  ├─ cards/
│  ├─ forms/
│  ├─ badges/
│  ├─ charts/
│  ├─ panels/
│  └─ guards/
├─ features/
│  ├─ auth/
│  ├─ dashboard/
│  ├─ projects/
│  ├─ people/
│  ├─ reports/
│  └─ admin/
├─ lib/
│  ├─ api/
│  ├─ constants/
│  ├─ formatters/
│  ├─ utils/
│  ├─ permissions/
│  └─ validators/
├─ hooks/
├─ store/
└─ tests/
```

### 4.2 핵심 원칙
- `app/`: 라우트와 페이지 조립만 담당
- `features/`: 페이지별 비즈니스 UI/logic 묶음
- `components/`: 순수 재사용 UI
- `lib/constants`: enum / route / 메뉴 / 상태값
- `lib/api`: fetch client / endpoint wrapper
- `store/`: 전역 상태 최소화
- 페이지별 임시 컴포넌트를 `app/` 아래에 직접 두지 않는다

---

## 5. 백엔드 스캐폴딩 상세

## 5.1 `apps/api` 권장 구조

```text
apps/api/
├─ app/
│  ├─ main.py
│  ├─ core/
│  │  ├─ config.py
│  │  ├─ database.py
│  │  ├─ security.py
│  │  └─ exceptions.py
│  ├─ api/
│  │  ├─ deps.py
│  │  ├─ routes/
│  │  │  ├─ auth.py
│  │  │  ├─ dashboard.py
│  │  │  ├─ projects.py
│  │  │  ├─ project_codes.py
│  │  │  ├─ project_logs.py
│  │  │  ├─ personnel.py
│  │  │  ├─ assignments.py
│  │  │  ├─ snapshots.py
│  │  │  ├─ reports.py
│  │  │  ├─ users.py
│  │  │  ├─ master_data.py
│  │  │  ├─ holidays.py
│  │  │  └─ monthly_closing.py
│  ├─ models/
│  ├─ schemas/
│  ├─ repositories/
│  ├─ services/
│  ├─ enums/
│  └─ jobs/
├─ alembic/
├─ tests/
└─ pyproject.toml
```

### 5.2 핵심 원칙
- `routes`: HTTP 입구
- `schemas`: 입출력 DTO
- `models`: ORM 모델
- `repositories`: DB 접근
- `services`: 비즈니스 로직
- `jobs`: 월집계 / 스냅샷 / 다운로드 생성 배치성 로직
- 라우트 함수에서 직접 복잡한 계산을 하지 않는다

---

## 6. 공통 enum / 코드값 위치

공통 enum은 프론트와 백엔드가 같은 의미를 공유해야 한다.

### 6.1 우선 고정할 enum
- 프로젝트 상태
- 사업유형
- 배정구분
- 재직상태
- 사용자 권한
- 조직역할
- 데이터범위
- 공휴일 구분
- 월마감 상태
- 보고서 타입

### 6.2 예시 정의

```text
ProjectStatus:
- 제안중
- 발표완료
- WIN
- LOSS
- DROP
- 수행중
- 업무지원
- 완료

ProjectType:
- 주사업
- 부사업
- 하도
- 협력

AssignmentType:
- 제안
- 수행
- 지원
- 미투입

EmploymentStatus:
- 재직
- 휴직
- 전배
- 퇴직
- 대기

UserPermission:
- 조회 전용
- 일반 수정 가능
- 프로젝트 담당 수정 가능
- 관리자

OrganizationRole:
- 본부장
- 팀장
- 팀원

DataScope:
- 전체
- 소속 본부
- 소속 팀
- 본인 프로젝트
```

### 6.3 구현 규칙
- 화면 label과 내부 code를 분리
- 내부 code는 영문 snake_case 또는 lowerCamelCase로 고정
- 프론트/백엔드가 동일 code를 공유
- 다운로드 시트명/필터값과도 매핑 테이블 유지

---

## 7. DB 우선 스캐폴딩 대상

## 7.1 우선 생성 테이블
1. organizations
2. teams
3. users
4. personnel
5. project_codes
6. projects
7. project_assignments
8. project_logs
9. holidays

### 7.2 2차 생성 테이블
10. monthly_employment_mm
11. monthly_assignment_mm
12. current_assignment_snapshots
13. weekly_load_snapshots
14. monthly_kpi_summaries
15. report_generation_histories
16. monthly_closing_histories
17. monthly_snapshot_histories

### 7.3 우선 이유
- 화면 대부분이 위 테이블을 직접/간접 참조
- KPI/보고는 파생 테이블이지만 원천은 사람/프로젝트/배정/공휴일
- 스냅샷/월마감은 후속이나 구조는 미리 자리 필요

---

## 8. 공통 컴포넌트 스캐폴딩

## 8.1 꼭 먼저 만들 공통 컴포넌트
- AppShell
- SidebarNav
- TopHeader
- PageTitleBar
- FilterBar
- SearchInput
- SummaryCard
- StatusBadge
- BaseTable
- Pagination
- DetailPanel
- EmptyState
- DownloadButton
- DateRangeField
- MonthSelector
- ConfirmActionBar

### 8.2 공통 컴포넌트 기준
- 모든 테이블은 같은 헤더/row spacing 규칙 사용
- 상태 배지는 동일 색상 체계 사용
- 페이지네이션 UI 동일
- 상세 패널 너비/헤더/버튼 배치 동일
- 필터 바 높이/간격 동일

### 8.3 공통 상태 배지 예시
- 제안중: blue
- 발표완료: indigo
- WIN: green
- LOSS: red
- DROP: gray
- 수행중: teal/navy
- 업무지원: orange
- 완료: slate

---

## 9. 라우팅 규칙

### 9.1 URL 구조
```text
/dashboard
/projects/operations
/projects/codes
/projects/:projectId
/projects/logs
/people/employment
/people/assignments
/people/current
/people/waiting
/reports/weekly
/reports/monthly
/reports/waiting-proposal
/reports/proposal-projects
/reports/delivery-projects
/reports/downloads
/admin/users
/admin/master-data
/admin/holidays
/admin/monthly-closing
```

### 9.2 규칙
- 메뉴명과 URL 의미가 최대한 직관적으로 연결
- 상세 페이지는 id path 사용
- 보고 페이지는 `/reports/*` 하위에 통일
- 관리자 페이지는 `/admin/*` 하위에 통일

---

## 10. API client 스캐폴딩

## 10.1 프론트 API 구조 예시
```text
lib/api/
├─ client.ts
├─ auth.ts
├─ dashboard.ts
├─ projects.ts
├─ projectCodes.ts
├─ projectLogs.ts
├─ personnel.ts
├─ assignments.ts
├─ snapshots.ts
├─ reports.ts
├─ users.ts
├─ masterData.ts
├─ holidays.ts
└─ monthlyClosing.ts
```

## 10.2 공통 규칙
- endpoint string 하드코딩 금지
- query params builder 공통화
- date string formatter 공통화
- API 응답 envelope 표준화
- `data / meta / error` 구조 권장

## 10.3 예시 응답 구조
```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 216
  },
  "error": null
}
```

---

## 11. Mock 데이터 규칙

## 11.1 목적
- 페이지 정적 구현 및 스캐폴딩 검증
- API 미구현 상태에서 UI 조립
- Codex가 병렬 작업 가능하게 하기 위함

## 11.2 위치
```text
packages/shared-mocks/
├─ dashboard.mock.ts
├─ projects.mock.ts
├─ projectCodes.mock.ts
├─ projectLogs.mock.ts
├─ personnel.mock.ts
├─ assignments.mock.ts
├─ snapshots.mock.ts
├─ reports.mock.ts
├─ users.mock.ts
├─ masterData.mock.ts
├─ holidays.mock.ts
└─ monthlyClosing.mock.ts
```

## 11.3 규칙
- mock도 enum code 사용
- 시안 숫자와 크게 어긋나지 않게 작성
- 테이블 컬럼 수, 필터 항목 수는 시안과 맞춰 작성

---

## 12. 권한 가드 스캐폴딩

## 12.1 공통 규칙
- 페이지 접근 권한
- 버튼 표시 권한
- 저장 가능 여부
- 다운로드 가능 여부
- 관리자 전용 동작 분리

## 12.2 최소 가드 규칙
- 로그인 안 됨 → `/login`
- 관리자 전용 페이지 → 관리자만 접근
- 사용자/권한 관리, 기준정보 관리, 공휴일 관리 → 관리자 중심
- 월마감/스냅샷 실행 → 관리자 및 본부장만
- 발표완료 이후 프로젝트 상세/투입기간 수정 → 해당 PM/제안팀 또는 관리자

## 12.3 프론트 구현 형태
- `PermissionGuard`
- `RoleGuard`
- `canEditProject(project, user)`
- `canManageMasterData(user)`
- `canRunMonthlyClosing(user)`

---

## 13. 페이지 생성 우선순위와 스캐폴딩 연결

## 13.1 1차 생성 대상 페이지
- 홈
- 대시보드
- 업무수행현황
- 프로젝트코드
- 프로젝트상세
- 진행이력
- 인력재직현황
- 인력배치/투입현황
- 인원별 투입(현재)

### 이유
- 원장/마스터/핵심 fact 구조 검증 가능
- 공통 필터, 카드, 테이블, 상세패널 컴포넌트 재사용도 검증 가능

## 13.2 2차 생성 대상
- 대기현황
- 주간현황
- 월별가동현황
- 대기/제안인원

## 13.3 3차 생성 대상
- 제안PRJ
- 이행PRJ
- 보고서 다운로드
- 사용자/권한 관리
- 기준정보 관리
- 공휴일 관리
- 월마감/스냅샷

---

## 14. 공통 페이지 패턴

## 14.1 원장형 패턴
대상:
- 업무수행현황
- 프로젝트코드
- 인력재직현황

구조:
- 상단 필터
- KPI 요약
- 메인 테이블
- 페이지네이션
- 상세 또는 더보기 액션

## 14.2 상세형 패턴
대상:
- 프로젝트상세
- 사용자/권한 관리(우측 상세)
- 기준정보 관리(우측 상세)

구조:
- 상단 요약
- 좌측 메인 정보
- 우측 상세/액션
- 하단 이력 또는 보조 정보

## 14.3 보고형 패턴
대상:
- 주간현황
- 월별가동현황
- 대기/제안인원
- 제안PRJ
- 이행PRJ

구조:
- 기준일/기준월 필터
- KPI 카드
- 표 또는 리스트 중심
- 차트는 꼭 필요한 곳만

---

## 15. 개발 규칙

## 15.1 반드시 지킬 것
- 추정 금지
- PRD/엑셀 해부 문서와 충돌 시 TODO 표기
- enum/code는 임시 문자열 남발 금지
- 공통 컴포넌트 먼저 추출
- 페이지 내부에 중복 테이블/필터 구현 금지
- 색상/간격은 시안 기준, 세부 미감은 후속 보정

## 15.2 임시 허용
- API 미완성 시 mock 사용
- 계산 로직 미완성 시 placeholder label 사용
- 다운로드 미완성 시 disabled 버튼 허용

## 15.3 금지
- 시안에 없는 복잡한 위젯 추가
- enum 신규 생성
- 권한 체계 임의 변경
- KPI 수식 임의 추정

---

## 16. 스캐폴딩 구현 순서

### P0. 프로젝트 초기화
- monorepo 또는 단일 repo 구조 생성
- web / api 앱 생성
- lint / format / env example 설정
- README 초안 작성

### P1. 공통 구조
- AppShell
- SidebarNav
- TopHeader
- route constants
- menu config
- auth placeholder
- PermissionGuard placeholder

### P2. 공통 UI
- SummaryCard
- FilterBar
- BaseTable
- StatusBadge
- Pagination
- DetailPanel
- EmptyState

### P3. 공통 타입/enum
- 상태값
- 사업유형
- 권한
- 데이터 범위
- 배정구분
- 재직상태

### P4. DB/Alembic 시작
- users
- personnel
- project_codes
- projects
- project_assignments
- project_logs
- holidays

### P5. 1차 페이지 정적 구현
- dashboard
- projects/operations
- projects/codes
- projects/[projectId]
- projects/logs
- people/employment
- people/assignments
- people/current

### P6. API contract 연결
- 목록 조회
- 상세 조회
- 등록/수정 계약
- 다운로드 endpoint placeholder

---

## 17. Codex 작업 지시용 문안

```text
첨부한 스캐폴딩 DTL 기준으로 PMO 업무수행 관리시스템의 초기 구조를 구현해줘.

우선순위:
1) apps/web, apps/api, packages/shared-types, packages/shared-ui, packages/shared-mocks 구조 생성
2) 공통 enum / route / menu config 생성
3) AppShell, SidebarNav, TopHeader, FilterBar, SummaryCard, BaseTable, StatusBadge, Pagination, DetailPanel 공통 컴포넌트 구현
4) users, personnel, project_codes, projects, project_assignments, project_logs, holidays 기준으로 backend model/alembic 초기 구조 생성
5) 홈, 대시보드, 업무수행현황, 프로젝트코드, 프로젝트상세, 진행이력, 인력재직현황, 인력배치/투입현황, 인원별 투입(현재) 페이지를 mock 데이터 기반으로 정적 구현
6) PRD/엑셀 해부 문서에서 확정되지 않은 값은 새로 추정하지 말고 TODO로 남겨줘
```

---

## 18. DoD

아래를 만족하면 이 문서 기준 스캐폴딩 완료다.

- 프로젝트 폴더 구조가 생성됐다
- 공통 컴포넌트가 최소 8종 이상 재사용 가능 상태다
- 공통 enum/type이 한 위치에서 관리된다
- 주요 라우트가 연결된다
- 핵심 DB 테이블 migration 시작점이 준비됐다
- 1차 대상 페이지가 mock 데이터로 렌더된다
- PRD와 시안 기준의 메뉴 구조가 일치한다
- 권한/상태값/사업유형/데이터범위의 임의 문자열 사용이 제거된다

---

## 19. 후속 문서 연결

이 문서 다음 작업 순서:

1. 공통 DTL 반영
2. P1 핵심 운영 DTL 반영
3. P2 인력 운영 DTL 반영
4. API contract 상세화
5. DB 컬럼 우선순위표 작성
6. P1 실행 체크리스트 작성
