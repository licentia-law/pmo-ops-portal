# API 구현 가이드

API envelope, 목록 API, CRUD/화면 API 분리, 계산 위치를 정리한다.  
Codex는 API나 백엔드 작업이 있을 때만 이 문서를 참고한다.

---

## 1. SSOT

- API 응답 envelope: `apps/api/app/api/common.py`
- enum/코드값: `apps/api/app/enums/__init__.py`와 `packages/shared-types/src/enums.ts`
- API route 등록: `apps/api/app/main.py`
- API 호출: `apps/web/app/lib/api.ts`
- 공통 검색/정렬/페이지네이션 helper는 기존 backend helper를 재사용한다.

## 2. 응답 Envelope

모든 신규 API는 아래 형식을 따른다.

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

- 정상 응답은 `envelope()` 기준을 따른다.
- 오류 응답도 `error_envelope()` 형식을 따른다.
- 프론트가 화면별로 임의 응답 shape을 추정하지 않도록 API 응답 구조를 명확히 유지한다.

## 3. 목록 API

목록 API는 가능한 한 아래 query를 지원한다.

- `page`
- `page_size`
- `sort`
- `q`
- 상태/유형 등 화면별 필터

응답 `meta`에는 가능한 한 아래 값을 포함한다.

- `page`
- `page_size`
- `total`

## 4. CRUD API와 화면용 API

- CRUD API는 단일 리소스 조회/등록/수정 책임을 가진다.
- 화면용 API는 KPI, 필터 옵션, 대표 행, 보조 패널 데이터를 한 화면에서 쓰기 좋게 조합한다.
- 화면용 API에서 계산한 값이 저장 대상이 아니라면 별도 테이블을 만들지 않는다.
- 저장해야 하는 스냅샷/마감 데이터만 별도 집계 테이블을 둔다.

화면용 API 응답은 아래 형태를 권장한다.

```json
{
  "data": {
    "summary": {},
    "filters": {},
    "rows": [],
    "sidePanels": {},
    "downloadMeta": {}
  },
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0
  },
  "error": null
}
```

## 5. 계산 위치

- KPI, MM, 가동률/가득률, 중복 배정 판단은 백엔드에서 계산한다.
- 프론트는 백엔드 결과를 표시하고 필터/정렬 UI를 제공한다.
- 프론트에서 임시 계산이 필요하면 화면 표시용으로만 제한한다.
- 프론트 임시 계산을 저장/보고 기준으로 사용하지 않는다.

## 6. 코드값과 라벨

DB/API에는 내부 enum value만 저장하고, 화면에는 공통 label helper로 한글 라벨을 표시한다.

| 구분 | 내부값 | 화면 라벨 |
|---|---|---|
| 재직 상태 | active | 재직 |
| 재직 상태 | leave | 휴직 |
| 재직 상태 | transferred | 전배 |
| 재직 상태 | retired | 퇴직 |
| 배정 유형 | delivery | 수행 |
| 배정 유형 | proposal | 제안 |
| 배정 유형 | support | 지원 |
| 배정 유형 | unassigned | 대기 |

## 7. 기준 시점 용어

| 이름 | 의미 | 주요 사용 화면 |
|---|---|---|
| basis_date | 기준일. 현재 스냅샷 산정 기준 | 인력 투입 현황, 인력별 투입 상세 |
| basis_week | 기준주. 주간 운영판과 주간 KPI 산정 기준 | 주간현황 |
| basis_month | 기준월. 월별 MM과 월별 KPI 산정 기준 | 월별가동현황, 월별 MM |
| basis_year | 기준연도. 연간 재직 MM과 월별 추이 산정 기준 | 인력 관리, 월별가동현황 |

화면 라벨은 `기준일`, `기준주`, `기준월`, `기준연도`로 표시하되 API query와 내부 변수명은 위 이름을 우선 사용한다.

## 8. 참고 파일

1. `apps/api/app/api/common.py`
2. `apps/api/app/main.py`
3. `apps/api/app/api/routes/p1_screens.py`
4. `apps/api/app/api/routes/projects.py`
5. `apps/api/app/api/routes/project_codes.py`
6. `apps/api/app/api/routes/project_logs.py`
7. `apps/api/app/schemas/projects.py`
8. `apps/api/app/domain/projects.py`
9. `apps/api/app/domain/project_code_policy.py`
10. `apps/api/app/domain/personnel.py`

## 9. 인력/API 메모

- `/people/employment`의 라우트 접근과 수정 API는 admin 권한 기준으로 제한한다.
- `roles`는 신규 테이블/API로 구현한다.
- `AssignmentStatus.cancelled`, `WorkLocationType` enum은 백엔드/프론트 타입을 함께 맞춘다.
- `weekly-kpi-summaries`는 API는 제공하되 MVP에서는 스냅샷 기반 파생 응답으로 구현한다.
