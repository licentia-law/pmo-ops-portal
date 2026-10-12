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

## 9. 인력/API 적용 기준

- 인력 유형·역할 API·권한·주간 KPI API의 현재 구현과 목표 차이는 [정책/구현 비교표](policy_implementation_status.md)를 참고한다. 정책 우선순위는 [핵심 가이드](dev_guide.md)의 2절을 따른다.
- DTL 대상 `AssignmentStatus.cancelled`, `WorkLocationType` 변경은 실제 enum·사용 타입을 먼저 확인하고 백엔드/프론트를 함께 맞춘다.

## 10. 권한·DB 변경 원칙

- 권한은 인증된 사용자 기준으로 백엔드에서 검증하고 기존 공통 권한 함수를 우선 재사용한다. 메뉴/버튼 숨김만으로 처리하지 않으며, 허용된 데이터 범위도 조회·수정 API에 적용한다.
- 기능별 허용 범위는 [공통 DTL](../DTL/DTL_common_PMO_work_management_system_260508_0702.md)의 6절과 적용 기능 DTL을 참조한다. 개발용 헤더 권한 흐름과 운영 인증·인가를 구분하고, 미확정 예외는 [정책/구현 비교표](policy_implementation_status.md)의 충돌 기록을 확인한다.
- DB 변경 전 `apps/api/app/models/core.py`, API 스키마, `docs/schema`의 관련 문서, `apps/api/alembic/versions`의 변경 이력을 함께 확인한다. 코드와 문서가 충돌하면 먼저 알린다.
- 기존 DB에 필요한 스키마·데이터 변경은 Alembic migration으로 반영한다. 모델 수정이나 seed 재생성만으로 기존 DB가 갱신되었다고 판단하지 않는다.
- 컬럼·enum·기준값 변경 시 기존 값의 변환/기본값, 필수값·유일성, UUID/FK 참조 보존, 연결된 MM·스냅샷·KPI 영향과 실패 시 복구 방법을 확인한다. 재실행 가능한 데이터 보정은 중복 생성되지 않게 한다.
- 데이터 반영은 기존 트랜잭션·롤백 패턴을 따른다. 업로드·복원·초기화의 백업/잠금/감사 이력 등 상세 조건은 [P3.2 DTL](../DTL/DTL_P3.2_data_backup_upload_restore_260622.md)의 우선 적용 정책과 해당 절을 따른다.
