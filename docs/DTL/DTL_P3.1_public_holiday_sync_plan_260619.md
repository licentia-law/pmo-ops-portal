# DTL P3 — 외부 공휴일 자동 동기화 계획

- 작성일시: 2026-06-19
- 기준 문서:
  - `PRD_260612_1051.md`
  - `docs/DTL/DTL_P3_admin_support_260508_0702.md`
  - `docs/schema/chatGPT/holidays_seed.csv`
- 문서 목적:
  - 공휴일 정보를 수동 관리만 하지 않고, 외부 공휴일 API를 이용해 야간 1회 자동 동기화하는 기준을 정한다.
  - 현재 코드베이스의 SSOT 구조를 해치지 않는 방식으로 구현 범위와 순서를 고정한다.
  - 구현 전 결정 완료된 정책을 고정하고, 구현용 세부 작업 목록까지 명확히 분해한다.

---

## 0. 결론

현재 공휴일 데이터는 `holidays` 테이블을 SSOT로 사용하고 있으며, 화면과 API는 이 테이블만 읽는다.

이 구조를 유지한 채 외부 공휴일 API를 붙이려면, 다음 원칙이 필요하다.

1. 외부 API는 `법정공휴일` 동기화 소스로만 사용한다.
2. `회사휴무`는 외부 API로 덮어쓰지 않고, 계속 수동 관리한다.
3. 자동 동기화는 애플리케이션 내부 상시 실행이 아니라, 별도 CLI 배치로 만든다.
4. 동기화된 데이터와 수동 입력 데이터를 구분할 수 있도록 `source` 메타데이터를 저장한다.

---

## 1. 현재 코드 진단

### 1.1 실제 공휴일 데이터 흐름

- 프론트는 `GET /api/holidays`를 호출한다.
- 백엔드는 [`apps/api/app/api/routes/holidays.py`](../../apps/api/app/api/routes/holidays.py) 에서 `Holiday` 모델을 읽는다.
- 실제 저장소는 [`apps/api/pmo_ops_p1_schema.db`](../../apps/api/pmo_ops_p1_schema.db) 의 `holidays` 테이블이다.
- 현재 초기 데이터는 [`docs/schema/chatGPT/holidays_seed.csv`](../schema/chatGPT/holidays_seed.csv) 를 [`apps/api/app/tools/seed_bundle.py`](../../apps/api/app/tools/seed_bundle.py) 로 적재하는 구조다.

### 1.2 현재 구조의 한계

- [`apps/api/app/models/core.py`](../../apps/api/app/models/core.py) 의 `Holiday` 모델에는 외부 API 출처를 저장하는 컬럼이 없다.
- [`apps/api/app/domain/holidays.py`](../../apps/api/app/domain/holidays.py) 의 검증 로직은 날짜/반복 여부/구분만 기준으로 동작한다.
- [`apps/api/app/main.py`](../../apps/api/app/main.py) 에는 scheduler, lifespan, background task가 없다.
- [`apps/api/pyproject.toml`](../../apps/api/pyproject.toml) 런타임 의존성에는 HTTP 클라이언트가 없다.

### 1.3 의미

현재 구조는 “한 번 넣은 공휴일을 DB에서 읽는 방식”에는 적합하지만, “외부 공휴일 API를 매일 동기화하는 방식”에는 부족하다.

이유는 외부에서 가져온 row와 사람이 직접 넣은 row를 코드가 구분할 수 없기 때문이다.

---

## 2. 권장 아키텍처

### 2.1 SSOT 원칙

- `holidays` 테이블을 최종 SSOT로 유지한다.
- 외부 API는 SSOT가 아니라 입력 소스다.
- 동기화 결과는 DB에 저장된 뒤에만 화면과 계산 로직에 반영된다.

### 2.2 데이터 분리 원칙

- `public`: 외부 API 기반 자동 동기화 대상
- 외부 API가 제공하는 대체공휴일 날짜도 자동 동기화 대상에 포함한다.
- 외부 동기화 저장 타입은 모두 `public`으로 통일하고, 대체공휴일 여부는 별도 타입 없이 명칭/날짜 기준으로만 표현한다.
- `company`: 수동 입력 전용
- `manual`과 `external_api`를 구분 가능한 메타데이터 저장

### 2.3 확정 정책

- `법정공휴일`: 자동 동기화
- `회사휴무`: 수동 관리
- 자동 동기화는 외부 API가 제공하는 법정공휴일 concrete date를 대상으로 한다.
- 외부 동기화로 저장되는 row의 `holiday_type`은 `public`으로 통일한다.
- 수동 입력 화면에서는 계속 `company`를 등록/수정/비활성화할 수 있어야 한다.

### 2.4 실행 방식

- FastAPI 내부에 상시 루프를 넣지 않는다.
- 별도 CLI 스크립트를 만든다.
- 운영 환경의 작업 스케줄러가 밤 시간대에 하루 1회 실행한다.

---

## 3. 구현 계획

### 3.1 데이터 모델 확장

- `Holiday` 모델에 source 메타데이터를 추가한다.
- 권장 필드:
  - `source_kind`: `manual`, `seed`, `external_api`
  - `source_provider`: 외부 API 공급자 이름
  - `source_external_id`: 외부 API가 주는 고유 키
  - `source_year`: 동기화 기준 연도
  - `last_synced_at`: 마지막 동기화 시각
- 필요 시 중복 방지를 위한 unique/index를 추가한다.

세부 작업:

1. [`apps/api/app/enums/__init__.py`](../../apps/api/app/enums/__init__.py)에 `HolidaySourceKind` enum 추가
2. [`apps/api/app/models/core.py`](../../apps/api/app/models/core.py)의 `Holiday` 모델에 source 필드 추가
3. Alembic 신규 revision 추가
4. 기존 row backfill 정책 정의
   - 기존 seed 적재 row는 `seed`
   - 화면에서 신규 등록하는 row는 `manual`

### 3.2 외부 API 어댑터 분리

- 외부 API 호출과 응답 파싱을 별도 모듈로 분리한다.
- 어댑터는 외부 응답을 내부 표준 레코드로만 변환한다.
- 서비스 계층은 공급자 응답 구조를 직접 알지 않도록 한다.

세부 작업:

1. [`apps/api/app/integrations/`](../../apps/api/app) 또는 동등한 위치에 provider adapter 추가
2. provider 응답을 내부 canonical holiday payload로 변환
3. 외부 API 에러를 서비스 예외와 분리
4. 테스트용 mock provider 인터페이스 정의

### 3.3 동기화 서비스 추가

- 연도 범위별로 외부 공휴일을 조회한다.
- 조회 결과를 내부 `Holiday` row로 upsert 한다.
- 이번 동기화에서 사라진 외부 row는 즉시 삭제하지 말고 비활성화 또는 sync 상태 변경으로 처리한다.
- 수동 입력 row는 어떤 경우에도 자동 동기화의 삭제/비활성화 대상에서 제외한다.

세부 작업:

1. [`apps/api/app/domain/holidays.py`](../../apps/api/app/domain/holidays.py)에서 동기화 전용 함수 분리 여부 결정
2. 별도 `services/holiday_sync.py` 또는 동등 파일 생성
3. 동기화 기준 연도 범위 정책 구현
4. 외부 제공 법정공휴일 concrete date upsert 정책 구현
5. 동기화 누락 row 처리 정책 구현
   - 외부 row만 대상
   - `manual`/`company` row 제외
6. 결과 요약 객체 정의
   - 생성 건수
   - 갱신 건수
   - 비활성화 건수
   - 스킵 건수
   - 에러 건수

### 3.4 API/검증 보강

- 공휴일 생성/수정 API에서 `company`는 수동 전용으로 제한한다.
- 외부 동기화 row와 수동 row의 충돌 규칙을 명시한다.
- 반복 여부와 연도별 concrete 저장 규칙을 source 기준으로 구분한다.

세부 작업:

1. [`apps/api/app/schemas/holidays.py`](../../apps/api/app/schemas/holidays.py) read model에 source 노출 여부 결정
2. [`apps/api/app/api/routes/holidays.py`](../../apps/api/app/api/routes/holidays.py)에서 수동 생성 시 `source_kind=manual` 강제
3. update/delete 시 외부 row 수정 허용 범위 정책 반영
4. [`apps/api/app/domain/holidays.py`](../../apps/api/app/domain/holidays.py) validation을 source-aware 방식으로 확장
5. `is_counted_as_workday`와 `is_active` 연동 규칙이 동기화 row에도 일관되게 적용되도록 정리

### 3.5 CLI 배치 추가

- `apps/api/app/tools/` 아래에 동기화 CLI를 추가한다.
- 실행 예:
  - `python -m app.tools.sync_public_holidays --year 2026`
  - 또는 `--from-year`, `--to-year`
- CLI는 성공/실패 로그를 표준 출력에 남긴다.

세부 작업:

1. [`apps/api/app/tools/`](../../apps/api/app/tools) 아래 신규 CLI 추가
2. 인자 설계
   - `--year`
   - `--from-year`
   - `--to-year`
   - `--dry-run`
3. DB session 진입점 연결
4. exit code 정책 정의
5. 운영 로그 포맷 고정

### 3.6 운영 스케줄 연결

- 작업 스케줄러에서 밤 시간대 1회 실행한다.
- 동일 작업이 중복 실행되지 않도록 잠금 또는 단일 실행 조건을 둔다.

세부 작업:

1. 운영 명령 예시 정리
2. 일일 실행 시간 고정
3. 중복 실행 방지 방식 확정
4. 실패시 재실행 절차 문서화

### 3.7 프론트/관리 화면 영향 범위 점검

- 현재 공휴일 관리 화면은 기존 CRUD 흐름을 유지한다.
- 외부 동기화 정보는 초기 구현에서는 필수 노출 대상이 아니다.
- 다만 향후 운영자가 구분할 수 있도록 source 표시가 필요한지 검토한다.

세부 작업:

1. [`apps/web/design/pages/AdminHolidaysPage.tsx`](../../apps/web/design/pages/AdminHolidaysPage.tsx) 영향 범위 확인
2. 필요 시 읽기 전용 source badge 또는 note 정책 검토
3. 자동 동기화 row의 수정/삭제 UX 정책 검토

---

## 4. 결정 완료 항목

### 4.1 확정된 운영 경계

- `법정공휴일`은 자동 동기화 대상이다.
- `회사휴무`는 수동 관리 대상이다.

### 4.2 더 쉽게 말하면

자동으로 가져올 것과 사람이 관리할 것을 이미 나눴다.

예를 들면:

- `법정공휴일`은 외부 API로 자동 업데이트
- `회사휴무`는 사람이 직접 등록

즉, 자동 동기화는 법정공휴일만 건드리고 회사휴무는 절대 건드리면 안 된다.

### 4.3 이 결정이 필요한 이유

- 외부 공휴일 API는 법정공휴일 중심일 가능성이 높다.
- 회사휴무까지 자동화하면 운영자가 넣은 내부 일정이 사라질 수 있다.
- 반복 공휴일, 대체공휴일, 연도별 예외를 어떤 규칙으로 저장할지도 이 경계에 따라 달라진다.
- 현재 구현은 대체공휴일 날짜를 별도 하위 타입 없이 `public`으로 통합 저장한다.

---

## 5. 단계별 작업 순서

### 5.1 1단계

- 외부 동기화용 source 메타데이터 컬럼 추가
- `Holiday` 모델과 스키마 확장
- 기존 row source backfill

### 5.2 2단계

- 외부 API adapter 추가
- 내부 표준 레코드로 변환하는 서비스 추가

### 5.3 3단계

- upsert 서비스와 source-aware validation 추가
- 수동 입력 API 제약 강화
- 외부 row와 회사휴무 row 충돌 정책 반영

### 5.4 4단계

- 동기화 CLI 추가
- 테스트 추가
- dry-run 결과 형식 확정

### 5.5 5단계

- 운영 스케줄러 연결
- 로그/실패 재처리 절차 정의

### 5.6 6단계

- 관리자 화면 노출 정책 점검
- 운영 문서/체크포인트 문서 최종화

---

## 6. 검증 기준

- 외부 API 동기화 후 `holidays` 테이블에 중복 없이 반영된다.
- 수동 입력 `company` row는 동기화가 건드리지 않는다.
- `public` row는 연도별 projection 및 workday 계산에 정상 반영된다.
- 동기화 실패 시 기존 데이터는 유지된다.
- CLI는 단독 실행으로도 재현 가능해야 한다.
- `dry-run`에서는 DB가 변경되지 않아야 한다.
- 기존 공휴일 관리 CRUD 테스트가 유지되어야 한다.
- migration from current head가 깨지지 않아야 한다.

---

## 7. 제외 범위

- FastAPI 내부 상시 스케줄러 구현은 제외한다.
- 외부 API 응답을 실시간 조회하는 방식은 제외한다.
- 회사휴무의 외부 자동화는 제외한다.
- 보고/통계 화면의 공휴일 집계 구조는 별도 개편하지 않는다.

---

## 8. 구현용 파일 단위 작업 목록

### 8.1 백엔드

1. [`apps/api/app/enums/__init__.py`](../../apps/api/app/enums/__init__.py)
   - `HolidaySourceKind` 추가
2. [`apps/api/app/models/core.py`](../../apps/api/app/models/core.py)
   - `Holiday` source 메타데이터 필드 추가
3. [`apps/api/app/schemas/holidays.py`](../../apps/api/app/schemas/holidays.py)
   - read/create/update schema 정리
4. [`apps/api/app/domain/holidays.py`](../../apps/api/app/domain/holidays.py)
   - source-aware validation 추가
5. [`apps/api/app/api/routes/holidays.py`](../../apps/api/app/api/routes/holidays.py)
   - 수동 CRUD 규칙 강화
6. `apps/api/app/services/holiday_sync.py` 또는 동등 신규 파일
   - 외부 동기화 orchestration
7. `apps/api/app/integrations/...` 신규 파일
   - 외부 API adapter
8. `apps/api/app/tools/sync_public_holidays.py` 신규 파일
   - CLI entrypoint
9. `apps/api/alembic/versions/...` 신규 revision
   - source 메타데이터 migration

### 8.2 테스트

1. [`apps/api/tests/test_p1_api.py`](../../apps/api/tests/test_p1_api.py)
   - 기존 holiday CRUD 회귀 검증 유지
2. `apps/api/tests/test_holiday_sync.py` 신규 파일
   - 동기화 service 검증
3. `apps/api/tests/test_holiday_sync_cli.py` 신규 파일
   - CLI smoke test
4. [`apps/api/tests/test_alembic_migrations.py`](../../apps/api/tests/test_alembic_migrations.py)
   - migration head 검증 확장

### 8.3 프론트

1. [`apps/web/design/pages/AdminHolidaysPage.tsx`](../../apps/web/design/pages/AdminHolidaysPage.tsx)
   - source 표시 여부 검토
2. [`apps/web/app/lib/api.ts`](../../apps/web/app/lib/api.ts)
   - read model 변경 시 타입 반영
