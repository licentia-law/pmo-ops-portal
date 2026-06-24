# PRD/DTL 통합 문서: 프로젝트/인력 엑셀 업로드 및 업로드 이력/복원 기능

- 문서 목적: Codex 작업 지시용 PRD/DTL 통합 문서
- 대상 시스템: PMO 업무수행 관리시스템 `pmo-ops-portal`
- 작성일: 2026-06-22
- 적용 대상 화면:
  - 관리 > 프로젝트 관리: `/projects/codes`
  - 관리 > 인력 관리: `/people/employment`
- 신규 버튼명:
  - `엑셀 업로드`
  - `업로드 이력/복원`

---

## 1. 배경 및 목적

현재 로컬 개발 환경에서는 개발 테스트용 랜덤 더미데이터가 사용되고 있다. 프로젝트/인력 관련 주요 기능이 어느 정도 구현된 상태이므로, 앞으로는 부서에서 실제 운용 중인 엑셀 기반 데이터를 입력하여 기능을 검증하는 것이 필요하다.

기존 방식처럼 매번 Codex에게 엑셀 데이터를 DB에 반영하도록 요청하면 다음 문제가 발생한다.

1. 데이터 반영 절차가 매번 수동이고 반복적이다.
2. 실제 데이터 기반 검증 주기가 느리다.
3. 업로드 전/후 데이터 상태를 사용자가 직접 통제하기 어렵다.
4. 잘못된 엑셀 반영 후 이전 상태로 되돌리기 어렵다.
5. 프로젝트/인력 기능의 실제 운영 적합성을 확인하기 어렵다.

따라서 관리자 화면에서 직접 엑셀을 업로드하고, 업로드 이력을 확인하며, 필요 시 이전 백업 버전으로 복원할 수 있는 기능을 구현한다.

---

## 2. 핵심 방향

본 기능의 핵심 방향은 다음과 같다.

```text
엑셀 업로드
→ 템플릿 다운로드 또는 파일 선택
→ 양식/스키마 검증
→ 검증 결과 미리보기
→ 반영 직전 자동 백업
→ 대상 데이터 전체 초기화
→ 엑셀 데이터 DB 저장
→ 화면 데이터 재조회/갱신
→ 업로드 이력 저장
```

복원 기능의 핵심 방향은 다음과 같다.

```text
업로드 이력/복원
→ 백업 목록 조회
→ 복원 대상 선택
→ 현재 상태 자동 백업
→ 선택한 백업으로 대상 데이터 복원
→ 화면 데이터 재조회/갱신
→ 복원 이력 저장
```

중요한 원칙은 다음과 같다.

1. 엑셀 파일 선택 즉시 DB에 반영하지 않는다.
2. 반드시 검증 결과를 먼저 보여준다.
3. 검증 오류가 있으면 DB에 저장하지 않는다.
4. 반영 전 자동 백업을 생성한다.
5. 복원 전에도 현재 상태를 자동 백업한다.
6. 저장/초기화/복원은 DB 트랜잭션으로 처리한다.
7. 실패 시 기존 상태를 유지하거나 롤백한다.
8. 첫 버전은 프로젝트 마스터와 인력 마스터 중심으로 제한한다.
9. 본 기능은 개발/테스트용 전체 교체 기능이며, 기존 데이터는 백업 후 삭제하는 것을 기본 정책으로 한다.

---

## 3. 1차 구현 범위

### 3.1 포함 범위

#### 프로젝트 관리 화면

- 위치: `/projects/codes`
- 대상 테이블:
  - `project_codes`
  - `projects`
- 신규 UI:
  - 프로젝트 목록 우측 상단에 `엑셀 업로드` 버튼 추가
  - `엑셀 업로드` 버튼 우측에 `업로드 이력/복원` 버튼 추가
- 기능:
  - 프로젝트 엑셀 템플릿 다운로드
  - 프로젝트 엑셀 업로드
  - 업로드 전 검증
  - 업로드 전 자동 백업
  - 기존 프로젝트 마스터 데이터 전체 교체
  - 업로드 이력 저장
  - 백업 목록 조회
  - 백업 버전 선택 복원
  - 복원 전 자동 백업

#### 인력 관리 화면

- 위치: `/people/employment`
- 대상 테이블:
  - `personnel`
- 1차에서는 `roles`는 초기화하지 않는다.
- 신규 UI:
  - 인력 목록 우측 상단에 `엑셀 업로드` 버튼 추가
  - `엑셀 업로드` 버튼 우측에 `업로드 이력/복원` 버튼 추가
- 기능:
  - 인력 엑셀 템플릿 다운로드
  - 인력 엑셀 업로드
  - 업로드 전 검증
  - 업로드 전 자동 백업
  - 기존 인력 마스터 데이터 전체 교체
  - 업로드 이력 저장
  - 백업 목록 조회
  - 백업 버전 선택 복원
  - 복원 전 자동 백업

### 3.2 제외 범위

1차 구현에서는 아래 항목은 "엑셀 입력 원본"으로는 제외한다.

- 프로젝트 투입/배정 데이터 업로드
  - `project_assignments`
  - `monthly_assignment_mm`
- 월별 재직 MM 엑셀 업로드
  - `monthly_employment_mm`
- 현재/주간 스냅샷 업로드
  - `current_assignment_snapshots`
  - `weekly_load_snapshots`
- KPI 요약 업로드
  - `monthly_kpi_summaries`
- 운영 서버 배포용 데이터 마이그레이션 정책
- 다중 사용자의 동시 업로드 충돌 처리 고도화
- 파일 암호화 저장
- 장기 보관 정책 UI

단, 위 항목들은 엑셀에서 직접 받아 새로 적재하지 않는다는 의미다. 전체 교체 시에는 FK 정합성을 위해 기존 종속 데이터가 백업 후 함께 삭제될 수 있다. 이 기능은 개발/테스트 데이터 재적재 목적이며, 운영 이관용 마이그레이션 기능으로 사용하지 않는다.

단, 향후 확장을 고려하여 API/DB 설계는 `target_type` 기반으로 확장 가능하게 만든다.

---

## 4. 현재 구현 기준 참고

### 4.1 프로젝트 관련 기존 구조

프로젝트 기능은 다음 파일/구조를 기준으로 구현되어 있다.

- 화면:
  - `apps/web/app/(protected)/projects/codes/page.tsx`
  - `apps/web/design/pages/CodePage.tsx`
- API 래퍼:
  - `apps/web/app/lib/api.ts`
- 백엔드:
  - `apps/api/app/api/routes/projects.py`
  - `apps/api/app/api/routes/project_codes.py`
  - `apps/api/app/api/routes/project_logs.py`
  - `apps/api/app/api/routes/p1_screens.py`
- 모델:
  - `ProjectCode`
  - `Project`
  - `ProjectAssignment`
  - `ProjectLog`

현재 프로젝트 관리 화면은 `ProjectCode`와 `Project`가 강하게 연결되어 있는 구조다. 따라서 프로젝트 엑셀 업로드 시 `project_codes`와 `projects`를 함께 생성해야 한다.

### 4.2 인력 관련 기존 구조

인력 기능은 다음 파일/구조를 기준으로 구현되어 있다.

- 화면:
  - `apps/web/app/(protected)/people/employment/page.tsx`
  - `apps/web/design/pages/PeopleEmploymentPage.tsx`
- API 래퍼:
  - `apps/web/app/lib/api.ts`
- 백엔드:
  - `apps/api/app/api/routes/personnel.py`
  - `apps/api/app/api/routes/roles.py`
  - `apps/api/app/api/routes/monthly_employment_mm.py`
  - `apps/api/app/api/routes/p1_screens.py`
- 모델:
  - `Personnel`
  - `Role`
  - `MonthlyEmploymentMM`

현재 인력 관리 화면은 `Personnel`과 `Role`을 중심으로 구성되어 있다. 1차 업로드에서는 `roles`를 업로드로 초기화하지 않고, 엑셀의 역할 값이 기존 활성 Role과 매칭되는지 검증한다.

---

## 5. 화면 요구사항

## 5.1 프로젝트 관리 화면 버튼 추가

### 현재 위치

프로젝트 목록 카드 우측 상단에는 현재 다음 요소가 있다.

```text
검색결과 N건 | 엑셀 다운로드
```

### 변경 후

```text
검색결과 N건 | 엑셀 다운로드 | 엑셀 업로드 | 업로드 이력/복원
```

### 버튼 규칙

| 버튼 | 동작 |
| --- | --- |
| 엑셀 다운로드 | 기존 기능 유지 |
| 엑셀 업로드 | 프로젝트 엑셀 업로드 모달 열기 |
| 업로드 이력/복원 | 프로젝트 업로드 이력/백업 복원 모달 열기 |

## 5.2 인력 관리 화면 버튼 추가

### 현재 위치

인력 목록 카드 우측 상단에는 현재 다음 요소가 있다.

```text
총 N건 | 엑셀 다운로드
```

### 변경 후

```text
총 N건 | 엑셀 다운로드 | 엑셀 업로드 | 업로드 이력/복원
```

### 버튼 규칙

| 버튼 | 동작 |
| --- | --- |
| 엑셀 다운로드 | 기존 기능 유지 |
| 엑셀 업로드 | 인력 엑셀 업로드 모달 열기 |
| 업로드 이력/복원 | 인력 업로드 이력/백업 복원 모달 열기 |

---

## 6. 엑셀 업로드 모달 요구사항

## 6.1 공통 UI 구성

`엑셀 업로드` 버튼 클릭 시 모달을 표시한다.

모달 제목:

- 프로젝트 화면: `프로젝트 엑셀 업로드`
- 인력 화면: `인력 엑셀 업로드`

모달 구성:

1. 안내 문구
2. 양식 다운로드 버튼
3. 파일 선택 영역
4. 검증 실행 버튼
5. 검증 결과 영역
6. 반영하기 버튼
7. 닫기/취소 버튼

## 6.2 안내 문구

프로젝트 업로드 안내 문구 예시:

```text
프로젝트 엑셀 파일을 업로드하면 검증 후 기존 프로젝트 관련 데이터가 백업되고,
기존 데이터는 삭제된 뒤 업로드한 엑셀 데이터로 전체 재생성됩니다.
검증 오류가 있는 경우 DB에는 반영되지 않습니다.
```

인력 업로드 안내 문구 예시:

```text
인력 엑셀 파일을 업로드하면 검증 후 기존 인력 관련 데이터가 백업되고,
기존 데이터는 삭제된 뒤 업로드한 엑셀 데이터로 전체 재생성됩니다.
역할/직무는 기존 활성 Role 기준값과 매칭되어야 합니다.
검증 오류가 있는 경우 DB에는 반영되지 않습니다.
```

## 6.3 템플릿 다운로드 및 업로드 흐름

`엑셀 업로드` 버튼 클릭 시 아래 두 가지 행동을 제공한다.

| 항목 | 설명 |
| --- | --- |
| 템플릿 다운로드 | 업로드 전용 표준 템플릿 파일을 다운로드한다. 인력은 기존 다운로드와 동일하고, 프로젝트는 금액 컬럼만 업로드 가능 형식에 맞게 분리한다. |
| 엑셀 업로드 | 작성 완료한 템플릿 파일을 선택하고 검증 후 반영한다. |

권장 UX는 다음과 같다.

```text
엑셀 업로드 클릭
→ [템플릿 다운로드] 또는 [엑셀 업로드]
→ 템플릿이 없으면 다운로드
→ 템플릿 작성
→ 업로드 파일 선택
→ 검증 실행
→ 검증 결과 확인
→ 반영하기
```

템플릿 기준은 다음과 같다.

- 인력: 기존 다운로드 양식과 동일하다. 사용자는 현재 시스템이 내보내는 파일을 그대로 수정한 뒤 다시 업로드할 수 있어야 한다.
- 프로젝트: 기존 다운로드 양식을 기본으로 하되, 브라우저 테이블의 `사업금액` 표시 문자열은 엑셀 업로드/다운로드에서 사용하지 않고 `총 사업금액`, `당사 사업금액` 두 컬럼으로 분리한다.
- 즉, 브라우저 테이블 표시 형식과 프로젝트 엑셀 입출력 형식은 의도적으로 다를 수 있다.

## 6.4 검증 결과 표시

검증 결과는 다음 정보를 표시한다.

| 항목 | 설명 |
| --- | --- |
| 전체 행 수 | 엑셀에서 인식한 데이터 행 수 |
| 정상 행 수 | 검증을 통과한 행 수 |
| 오류 행 수 | 검증 오류가 있는 행 수 |
| 경고 행 수 | 저장 가능하지만 확인이 필요한 행 수 |
| 예상 반영 건수 | 실제 DB에 저장될 건수 |

검증 결과는 "지금 선택된 파일을 이 기준으로 반영하면 어떻게 되는지"를 보여주는 미리보기다. 실제 반영 시 서버는 업로드 파일을 다시 파싱하고 다시 검증한 뒤, 검증 결과가 여전히 유효할 때만 반영한다.

일관성 규칙:

- `validate` 응답에는 업로드 파일 기준의 `file_sha256` 또는 이에 준하는 파일 지문값을 포함한다.
- 프론트엔드는 마지막 검증 결과와 현재 선택 파일의 지문이 다르면 `반영하기`를 비활성화한다.
- `replace` 요청 시 서버는 파일을 다시 읽고 다시 검증한다.
- `replace` 요청에 전달된 파일 지문이 마지막 검증 결과와 다르면 서버는 반영하지 않고 `409 Conflict` 또는 검증 만료 오류를 반환한다.
- 즉, "검증한 파일"과 "반영하는 파일"은 반드시 동일해야 한다.

검증 오류 테이블 컬럼:

| 컬럼 | 설명 |
| --- | --- |
| 행 번호 | 엑셀 행 번호 |
| 컬럼 | 오류가 발생한 컬럼명 |
| 입력값 | 엑셀에 입력된 값 |
| 오류 메시지 | 사용자에게 보여줄 오류 내용 |

## 6.5 반영하기 버튼 활성화 조건

`반영하기` 버튼은 다음 조건을 모두 만족할 때만 활성화한다.

1. 파일이 선택되어 있음
2. 검증을 한 번 이상 실행함
3. 오류 행 수가 0임
4. 마지막 검증 이후 파일이 변경되지 않음
5. 현재 사용자가 admin 권한임

버튼 클릭 시 확인 모달을 한 번 더 표시한다.

확인 문구 예시:

```text
기존 프로젝트 관련 데이터가 자동 백업된 후 삭제되며,
업로드한 엑셀 데이터로 전체 재생성됩니다.
계속하시겠습니까?
```

또는

```text
기존 인력 관련 데이터가 자동 백업된 후 삭제되며,
업로드한 엑셀 데이터로 전체 재생성됩니다.
계속하시겠습니까?
```

---

## 7. 업로드 이력/복원 모달 요구사항

## 7.1 공통 UI 구성

`업로드 이력/복원` 버튼 클릭 시 모달을 표시한다.

모달 제목:

- 프로젝트 화면: `프로젝트 업로드 이력/복원`
- 인력 화면: `인력 업로드 이력/복원`

모달 구성:

1. 백업/업로드 이력 목록
2. 이력 검색/필터
3. 이력 상세 미리보기
4. 복원 버튼
5. 닫기 버튼

## 7.2 이력 목록 컬럼

| 컬럼 | 설명 |
| --- | --- |
| 생성일시 | 백업 또는 업로드 이력이 생성된 시각 |
| 대상 | `프로젝트` 또는 `인력` |
| 작업 유형 | `업로드 전 백업`, `복원 전 백업`, `수동 백업`, `업로드 완료`, `복원 완료` |
| 원본 파일명 | 업로드한 엑셀 파일명. 복원 전 백업이면 `-` 가능 |
| 백업 파일명 | 서버에 저장된 백업 파일명 |
| 건수 | 백업/업로드 대상 행 수 |
| 작업자 | 실행 사용자 |
| 상태 | `성공`, `실패`, `진행중` |
| 메모 | 선택 입력 |
| 작업 | `미리보기`, `복원(복원 가능한 백업에만 표시)` |

## 7.3 복원 동작

복원 버튼 클릭 시 확인 모달을 표시한다.

확인 문구 예시:

```text
선택한 백업 버전으로 프로젝트 데이터를 복원합니다.
현재 프로젝트 데이터는 복원 전 자동 백업됩니다.
계속하시겠습니까?
```

또는

```text
선택한 백업 버전으로 인력 데이터를 복원합니다.
현재 인력 데이터는 복원 전 자동 백업됩니다.
계속하시겠습니까?
```

확인 후 다음 흐름으로 처리한다.

```text
1. admin 권한 확인
2. 선택한 백업의 target_type 확인
3. 현재 대상 데이터 자동 백업 생성
4. 트랜잭션 시작
5. 현재 대상 데이터 초기화
6. 선택한 백업 데이터로 복원
7. 복원 완료 이력 저장
8. commit
9. 화면 데이터 재조회
```

## 7.4 복원 제한

다음 경우 복원을 막는다.

| 상황 | 처리 |
| --- | --- |
| 현재 화면과 백업 target_type이 다름 | 복원 불가 |
| 백업 파일이 존재하지 않음 | 복원 불가 |
| 백업 파일 파싱 실패 | 복원 불가 |
| 백업 데이터 검증 실패 | 복원 불가 |
| admin 권한이 아님 | 복원 불가 |
| 이미 진행 중인 업로드/복원이 있음 | 복원 불가, 409 반환 |

복원 버튼은 `upload_backup`, `restore_backup`, `manual_backup`처럼 실제 백업 스냅샷이 있는 이력에만 노출한다. `upload_replace`, `restore_apply`, `failed` 이력에는 복원 버튼을 노출하지 않는다.

---

## 8. 백엔드 API 설계

## 8.1 신규 라우트 파일

신규 파일을 추가한다.

```text
apps/api/app/api/routes/imports.py
```

또는 기능별로 나눌 경우:

```text
apps/api/app/api/routes/imports_projects.py
apps/api/app/api/routes/imports_personnel.py
```

초기 구현은 `imports.py` 단일 파일을 권장한다.

## 8.2 API 목록

### 프로젝트 Import API

```text
POST /api/imports/projects/validate
POST /api/imports/projects/replace
GET  /api/imports/projects/backups
POST /api/imports/projects/restore
```

### 인력 Import API

```text
POST /api/imports/personnel/validate
POST /api/imports/personnel/replace
GET  /api/imports/personnel/backups
POST /api/imports/personnel/restore
```

## 8.3 API 상세

### POST `/api/imports/projects/validate`

목적:

- 프로젝트 엑셀 파일을 파싱하고 검증한다.
- DB에는 반영하지 않는다.

요청:

- `multipart/form-data`
- field: `file`

응답 예시:

```json
{
  "data": {
    "valid": false,
    "target_type": "projects",
    "file_sha256": "8f5a...",
    "summary": {
      "total_rows": 134,
      "valid_rows": 131,
      "error_rows": 3,
      "warning_rows": 0
    },
    "errors": [
      {
        "row": 12,
        "field": "상태",
        "value": "진행",
        "message": "지원하지 않는 상태값입니다. 허용값: 제안중, 발표완료, WIN, LOSS, DROP, 수행중, 업무지원, 완료"
      }
    ],
    "warnings": []
  }
}
```

### POST `/api/imports/projects/replace`

목적:

- 프로젝트 엑셀 파일을 검증한다.
- 기존 `project_codes`, `projects` 데이터를 자동 백업한다.
- 기존 데이터를 초기화한다.
- 엑셀 데이터로 전체 교체한다.

요청:

- `multipart/form-data`
- field: `file`
- field: `file_sha256`
- optional field: `memo`

규칙:

- `file_sha256`는 직전 `validate` 응답의 값과 일치해야 한다.
- 서버는 `replace`에서도 업로드 파일을 다시 파싱/검증한다.
- `file_sha256`가 불일치하거나 재검증 결과가 달라지면 반영하지 않는다.

응답 예시:

```json
{
  "data": {
    "target_type": "projects",
    "status": "success",
    "backup_id": "...",
    "import_id": "...",
    "operation_group_id": "...",
    "inserted": {
      "project_codes": 134,
      "projects": 134
    }
  }
}
```

### GET `/api/imports/projects/backups`

목적:

- 프로젝트 관련 업로드/백업/복원 이력을 조회한다.

쿼리:

- `page`
- `page_size`
- `q`
- `action_type`
- `status`

응답:

```json
{
  "data": [
    {
      "id": "...",
      "operation_group_id": "...",
      "target_type": "projects",
      "action_type": "upload_backup",
      "status": "success",
      "backup_id": "...",
      "backup_path": "storage/import_backups/projects/20260622_154000.json",
      "original_filename": "projects_202606.xlsx",
      "file_sha256": "8f5a...",
      "row_count": 134,
      "created_by": "관리자",
      "created_at": "2026-06-22T15:40:00",
      "memo": "실제 데이터 1차 반영 전 백업"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 1
  }
}
```

### POST `/api/imports/projects/restore`

목적:

- 선택한 프로젝트 백업 버전으로 복원한다.
- 복원 전 현재 프로젝트 데이터를 자동 백업한다.

요청:

```json
{
  "backup_id": "...",
  "memo": "업로드 오류로 이전 버전 복원"
}
```

응답:

```json
{
  "data": {
    "target_type": "projects",
    "status": "success",
    "pre_restore_backup_id": "...",
    "restore_id": "...",
    "operation_group_id": "...",
    "restored": {
      "project_codes": 134,
      "projects": 134
    }
  }
}
```

### 인력 API

인력 API도 동일한 구조로 구현한다.

```text
POST /api/imports/personnel/validate
POST /api/imports/personnel/replace
GET  /api/imports/personnel/backups
POST /api/imports/personnel/restore
```

단, target_type은 `personnel`로 한다.

---

## 9. 신규 DB 모델 설계

## 9.1 ImportBatch 모델 추가

신규 테이블을 추가한다.

```python
class ImportBatch(Base, TimestampMixin):
    __tablename__ = "import_batches"

    id: Mapped[str] = uuid_pk()
    target_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    operation_group_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    backup_path: Mapped[str | None] = mapped_column(String(500))
    backup_id: Mapped[str | None] = mapped_column(String(36), index=True)
    source_backup_id: Mapped[str | None] = mapped_column(String(36), index=True)
    original_filename: Mapped[str | None] = mapped_column(String(255))
    file_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    row_count: Mapped[int | None] = mapped_column(Integer)
    created_by: Mapped[str | None] = mapped_column(String(100))
    memo: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
```

식별자 정의:

| 필드 | 의미 |
| --- | --- |
| `id` | 개별 이력 레코드 ID |
| `operation_group_id` | 한 번의 업로드/복원 작업 전체를 묶는 공통 ID |
| `backup_id` | 실제 백업 스냅샷 자체의 식별자. 복원 가능한 백업에만 부여 |
| `source_backup_id` | 복원 작업이 어떤 백업을 원본으로 삼았는지 가리키는 참조값 |
| `file_sha256` | 검증/반영 대상 업로드 파일의 동일성 확인용 지문값 |

관리 원칙:

- 업로드 한 번에는 최소 `upload_backup`, `upload_replace` 두 개의 이력이 생길 수 있으며 둘은 같은 `operation_group_id`를 가진다.
- 복원 한 번에는 최소 `restore_backup`, `restore_apply` 두 개의 이력이 생길 수 있으며 둘은 같은 `operation_group_id`를 가진다.
- 실제 복원 가능한 스냅샷에는 `backup_id`를 부여한다.
- `restore_apply.source_backup_id`에는 사용자가 선택한 복원 원본의 `backup_id`를 저장한다.
- 검증과 반영 일관성 확인이 필요한 경우 `file_sha256`을 사용한다.

## 9.2 target_type 값

| 값 | 의미 |
| --- | --- |
| `projects` | 프로젝트 마스터 |
| `personnel` | 인력 마스터 |

향후 확장 후보:

| 값 | 의미 |
| --- | --- |
| `assignments` | 프로젝트 투입/배정 |
| `monthly_employment_mm` | 월별 재직 MM |
| `monthly_assignment_mm` | 월별 투입 MM |
| `snapshots` | 운영 스냅샷 |

## 9.3 action_type 값

| 값 | 의미 |
| --- | --- |
| `upload_validate` | 검증 실행 이력. 필요 시 저장 |
| `upload_backup` | 업로드 전 자동 백업 |
| `upload_replace` | 엑셀 업로드 전체 교체 완료 |
| `restore_backup` | 복원 전 자동 백업 |
| `restore_apply` | 백업 복원 완료 |
| `manual_backup` | 수동 백업. 1차 제외 가능 |

## 9.4 status 값

| 값 | 의미 |
| --- | --- |
| `success` | 성공 |
| `failed` | 실패 |
| `running` | 진행중 |

---

## 10. 백업 파일 저장 방식

## 10.1 저장 위치

로컬 개발 기준 백업 파일 저장 위치:

```text
storage/import_backups/{target_type}/{yyyyMMdd_HHmmss}_{batch_id}.json
```

예시:

```text
storage/import_backups/projects/20260622_154000_abc123.json
storage/import_backups/personnel/20260622_155000_def456.json
```

파일명 규칙:

- `batch_id` 대신 실제로는 복원 가능한 스냅샷의 `backup_id`를 포함해도 된다.
- 권장 형식: `storage/import_backups/{target_type}/{yyyyMMdd_HHmmss}_{backup_id}.json`
- 파일 경로는 사람이 입력하지 않고 서버가 생성한다.

## 10.2 백업 파일 포맷

1차 구현은 JSON을 권장한다.

프로젝트 백업 예시:

```json
{
  "target_type": "projects",
  "created_at": "2026-06-22T15:40:00",
  "tables": {
    "project_codes": [
      { "id": "...", "code": "P2026001", "name": "..." }
    ],
    "projects": [
      { "id": "...", "project_code_id": "...", "code": "P2026001", "name": "..." }
    ]
  }
}
```

인력 백업 예시:

```json
{
  "target_type": "personnel",
  "created_at": "2026-06-22T15:50:00",
  "tables": {
    "personnel": [
      { "id": "...", "employee_no": "2026001", "name": "..." }
    ]
  }
}
```

## 10.3 Git 제외

실제 데이터 백업 파일과 로컬 개발 DB는 Git에 포함되면 안 된다.

`.gitignore`에 아래 항목을 추가한다.

```text
storage/import_backups/
apps/api/pmo_ops_p1_schema.db
```

---

## 11. 엑셀 양식 설계

## 11.1 템플릿 기준

1차 구현의 템플릿 기준은 다음과 같다.

적용 원칙:

- 인력은 기존 다운로드 파일을 내려받아 값을 수정한 뒤 그대로 다시 업로드할 수 있어야 한다.
- 프로젝트는 기존 다운로드 구조를 최대한 유지하되, 현재 브라우저 표시용 `사업금액` 문자열 한 칸 대신 업로드 가능 형식인 `총 사업금액`, `당사 사업금액` 두 칸으로 분리한 엑셀 표준 양식을 사용한다.
- 프로젝트와 인력 모두 업로드 템플릿과 다운로드 파일은 각 대상별 표준 양식을 동일하게 유지한다.
- 업로드 파서는 다운로드 파일의 그룹 헤더 행이 있으면 이를 건너뛰고 실제 헤더 행을 기준으로 읽는다.
- 현재 다운로드 파일에서 빈값을 `-`로 표현하는 경우, 업로드 시 `-`는 빈값으로 정규화한다.
- 장기적으로 다운로드 양식이 바뀌면 업로드 템플릿도 같은 시점에 같이 바뀌어야 한다.

## 11.2 프로젝트 엑셀 필수 컬럼

프로젝트 업로드는 1차에서 `project_codes`와 `projects`를 함께 생성한다.

필수 컬럼:

| 엑셀 컬럼명 | DB 필드 | 설명 |
| --- | --- | --- |
| 코드 | `ProjectCode.code`, `Project.code` | 예: `P2026001` |
| 사업명 | `ProjectCode.name`, `Project.name` | 프로젝트명 |
| 고객사 | `Project.client_name` | 고객사명 |
| 사업유형 | `ProjectCode.project_type`, `Project.project_type` | 주사업/부사업/하도/협력 |
| 확도 | `ProjectCode.certainty`, `Project.certainty` | 우세/경쟁/확보 등 |
| 총 사업금액 | `Project.total_amount` | 숫자형 필수. 브라우저의 `사업금액` 표시값 계산 기준 |
| 당사 사업금액 | `Project.company_amount` | 숫자형 필수. 브라우저의 `사업금액` 표시값 계산 기준 |
| 공고번호 | `Project.bid_notice_no` | 선택값 가능 |
| 공고일 | `Project.bid_notice_date` | 선택값 가능 |
| 상태 | `ProjectCode.status`, `Project.status` | 제안중/발표완료/WIN/LOSS/DROP/수행중/업무지원/완료 |
| 영업부서 | `Project.sales_department` | 영업부서명 |
| 영업대표 | `Project.sales_owner` | 이름 또는 이름+직위 |
| 제안PM | `Project.proposal_pm_name` | 이름 또는 이름+직위 |
| 발표PM | `Project.presentation_pm_name` | 이름 또는 이름+직위 |
| 수행PM | `Project.delivery_pm_name` | 이름 또는 이름+직위 |
| 제안/수행팀 | 화면 표시용 값 | 1차 업로드에서는 무시 또는 경고 처리 가능 |
| 사업 시작일 | `Project.start_date` | YYYY-MM-DD |
| 사업 종료일 | `Project.end_date` | YYYY-MM-DD |
| 제안서 제출일 | `Project.submission_at` | YYYY-MM-DD 또는 YYYY-MM-DD HH:mm |
| 제출 형식 | `Project.submission_format` | 온라인/이메일/방문 등 |
| 제출 유의사항 | `Project.submission_note` | 선택값 가능 |
| 제안 발표일 | `Project.presentation_at` | 선택값 가능 |
| 발표 형식 | `Project.presentation_format` | 선택값 가능 |
| 발표 유의사항 | `Project.presentation_note` | 선택값 가능 |
| 최근 활동일 | `Project.recent_activity_at` | 선택값 가능 |
| 사용여부 | `ProjectCode.is_active` | 사용/미사용 |

비고:

- 프로젝트 브라우저 테이블은 기존과 동일하게 `사업금액` 표시 컬럼을 유지한다.
- 프로젝트 엑셀 다운로드/업로드 양식은 `총 사업금액`, `당사 사업금액`을 별도 컬럼으로 사용한다.
- 서버/프론트는 엑셀의 두 금액 컬럼으로부터 브라우저 표시값 `사업금액`을 계산하거나 기존 표시 규칙에 맞게 구성한다.
- `제안/수행팀`은 현재 DB의 저장 대상이 아니므로 1차에서는 무시하거나 "저장되지 않는 컬럼" 경고를 보여준다.

## 11.3 인력 엑셀 필수 컬럼

필수 컬럼:

| 엑셀 컬럼명 | DB 필드 | 설명 |
| --- | --- | --- |
| 사번 | `Personnel.employee_no` | 중복 불가. 비어 있으면 오류 권장 |
| 성명 | `Personnel.name` | 필수 |
| 이메일 | `Personnel.email` | 중복 불가. 비어 있으면 허용 여부는 기존 정책에 맞춤 |
| 본부 | `Personnel.group_name` | 필수 |
| 팀 | `Personnel.team_name` | 필수 권장 |
| 직위 | `Personnel.position_name` | 필수 권장 |
| 역할 | `Personnel.role_id` 매핑 | 기존 활성 Role의 name 또는 code와 매칭 |
| 재직상태 | `Personnel.employment_status` | 재직/휴직/전배/퇴직/대기 |
| MM 시작일 | `Personnel.mm_start_date` | YYYY-MM-DD |
| 사용여부 | `Personnel.is_active` | 사용/미사용 |

선택 컬럼:

| 엑셀 컬럼명 | DB 필드 |
| --- | --- |
| MM 종료일 | `Personnel.mm_end_date` |
| 연간 재직 MM | `Personnel.yearly_mm` |
| 비고 | `Personnel.note` |

## 11.4 값 매핑 규칙

### 프로젝트 상태 매핑

| 엑셀 값 | DB 값 |
| --- | --- |
| 제안중 | `proposing` |
| 발표완료 | `presented` |
| WIN | `win` |
| LOSS | `loss` |
| DROP | `drop` |
| 수행중 | `running` |
| 업무지원 | `support` |
| 완료 | `done` |

### 사업유형 매핑

| 엑셀 값 | DB 값 |
| --- | --- |
| 주사업 | `main` |
| 부사업 | `sub` |
| 하도 | `subcontract` |
| 협력 | `partner` |

### 재직상태 매핑

| 엑셀 값 | DB 값 |
| --- | --- |
| 재직 | `active` |
| 휴직 | `leave` |
| 전배 | `transferred` |
| 퇴직 | `retired` |
| 대기 | `waiting` |

### 사용여부 매핑

| 엑셀 값 | DB 값 |
| --- | --- |
| 사용 | `true` |
| 미사용 | `false` |
| Y | `true` |
| N | `false` |
| true | `true` |
| false | `false` |

---

## 12. 검증 규칙

## 12.1 프로젝트 검증 규칙

| 규칙 | 오류/경고 |
| --- | --- |
| 템플릿 헤더 불일치 | 오류 |
| 필수 컬럼 누락 | 오류 |
| 필수값 누락 | 오류 |
| 코드 중복 | 오류 |
| 사업명 중복은 허용 | 경고 없음 |
| 사업유형 미지원 값 | 오류 |
| 상태 미지원 값 | 오류 |
| 사용여부 미지원 값 | 오류 |
| 날짜 형식 오류 | 오류 |
| 종료일이 시작일보다 빠름 | 오류 |
| 제출일시 형식 오류 | 오류 |
| 총 사업금액이 숫자가 아님 | 오류 |
| 당사 사업금액이 숫자가 아님 | 오류 |
| 총 사업금액이 음수 | 오류 |
| 당사 사업금액이 음수 | 오류 |
| 당사 사업금액이 총 사업금액보다 큼 | 오류 |
| `제안/수행팀` 값 존재 | 경고. 1차에서는 저장하지 않음 |
| 제안PM/발표PM/수행PM이 인력 DB에 없음 | 경고. 1차에서는 저장 허용 |
| 영업대표가 인력 DB에 없음 | 경고. 1차에서는 저장 허용 |

## 12.2 인력 검증 규칙

| 규칙 | 오류/경고 |
| --- | --- |
| 템플릿 헤더 불일치 | 오류 |
| 필수 컬럼 누락 | 오류 |
| 필수값 누락 | 오류 |
| 사번 중복 | 오류 |
| 이메일 중복 | 오류 |
| 이메일 형식 오류 | 경고 또는 오류. 기존 정책에 맞춤 |
| 재직상태 미지원 값 | 오류 |
| 사용여부 미지원 값 | 오류 |
| MM 시작일 형식 오류 | 오류 |
| MM 종료일 형식 오류 | 오류 |
| MM 종료일이 MM 시작일보다 빠름 | 오류 |
| 역할이 기존 활성 Role과 매칭되지 않음 | 오류 |
| 연간 재직 MM이 숫자가 아님 | 오류 |
| 연간 재직 MM이 음수 | 오류 |

---

## 13. 데이터 교체 상세 규칙

## 13.1 프로젝트 교체

프로젝트 업로드 전체 교체 시 대상:

- `project_codes`
- `projects`
- `project_assignments`
- `monthly_assignment_mm`
- `current_assignment_snapshots`
- `weekly_load_snapshots`
- `project_logs`

삭제 목표:

- 업로드 완료 후 기존 프로젝트 마스터를 참조하는 고아 데이터가 남지 않아야 한다.
- 따라서 프로젝트 교체는 `projects`만 삭제하는 기능이 아니라, 참조 무결성을 깨지 않도록 종속 데이터까지 포함한 "프로젝트 관련 개발 데이터 초기화"로 정의한다.

기본 처리 순서:

```text
1. 엑셀 파싱
2. 검증
3. 현재 프로젝트 관련 전체 대상 백업
4. 트랜잭션 시작
5. 종속 테이블부터 삭제
6. 기존 projects 삭제
7. 기존 project_codes 삭제
8. 엑셀 행 기준 project_codes 생성
9. 엑셀 행 기준 projects 생성
10. project.project_code_id 연결
11. commit
12. 화면 데이터 재조회
```

권장 삭제 순서:

1. `monthly_assignment_mm`
2. `current_assignment_snapshots`
3. `weekly_load_snapshots`
4. `project_assignments`
5. `project_logs`
6. `projects`
7. `project_codes`

주의:

- `ProjectCode.code`와 `Project.code`는 같은 값을 사용한다.
- `Project.project_code_id`는 생성된 `ProjectCode.id`를 연결한다.
- 본 기능은 테스트용 전체 교체이므로, FK로 연결된 프로젝트 종속 데이터도 함께 삭제한다.
- 관련 테이블의 FK를 null 처리하며 보존하는 정책은 1차에서 사용하지 않는다.
- 고아 데이터가 남을 수 있는 부분 삭제는 허용하지 않는다.
- 운영 데이터 보존 목적이 아니라 "백업 후 삭제, 새 데이터 재적재"가 목적이므로 복잡한 ID 유지 정책은 두지 않는다.

복원 범위를 쉽게 설명하면 다음과 같다.

- 프로젝트만 따로 되돌리는 것이 아니라, 프로젝트가 참조하고 있던 개발 데이터 묶음을 함께 되돌린다.
- 이유는 `project_assignments`, 스냅샷, MM 데이터가 프로젝트와 인력을 동시에 참조하기 때문이다.
- 예를 들어 어떤 시점의 프로젝트 백업 안에 `A 인력`에게 배정된 데이터가 있는데, 현재 인력 데이터는 이미 다른 엑셀로 갈아끼워져 `A 인력`이 없어졌다면 프로젝트만 복원해도 연결이 깨진다.
- 따라서 "프로젝트 화면에서 복원 버튼을 눌렀다"는 것은 UI 진입 위치일 뿐이고, 실제로는 프로젝트와 직접 연결된 개발 데이터 묶음을 함께 복원하는 작업으로 정의한다.

## 13.2 인력 교체

인력 업로드 전체 교체 시 대상:

- `personnel`
- `project_assignments`
- `monthly_employment_mm`
- `monthly_assignment_mm`
- `current_assignment_snapshots`
- `weekly_load_snapshots`

삭제 목표:

- 업로드 완료 후 기존 인력 마스터를 참조하는 고아 데이터가 남지 않아야 한다.
- 따라서 인력 교체는 `personnel`만 삭제하는 기능이 아니라, 참조 무결성을 깨지 않도록 종속 데이터까지 포함한 "인력 관련 개발 데이터 초기화"로 정의한다.

기본 처리 순서:

```text
1. 엑셀 파싱
2. 검증
3. 현재 인력 관련 전체 대상 백업
4. 트랜잭션 시작
5. 종속 테이블부터 삭제
6. 기존 personnel 삭제
7. 엑셀 행 기준 personnel 생성
8. role 값은 기존 roles 테이블에서 active Role 기준으로 매칭
9. commit
10. 화면 데이터 재조회
```

권장 삭제 순서:

1. `monthly_assignment_mm`
2. `current_assignment_snapshots`
3. `weekly_load_snapshots`
4. `project_assignments`
5. `monthly_employment_mm`
6. `personnel`

주의:

- `roles`는 삭제하지 않는다.
- 엑셀의 역할 값이 기존 Role과 매칭되지 않으면 오류로 처리한다.
- 기존 `ProjectAssignment.personnel_id`, `MonthlyEmploymentMM.personnel_id`, `CurrentAssignmentSnapshot.personnel_id` 등 FK 종속 데이터는 함께 삭제한다.
- 고아 데이터가 남을 수 있는 부분 삭제는 허용하지 않는다.
- 운영 데이터 보존 목적이 아니라 "백업 후 삭제, 새 데이터 재적재"가 목적이므로 복잡한 ID 유지 정책은 두지 않는다.

복원 범위를 쉽게 설명하면 다음과 같다.

- 인력만 따로 되돌리는 것이 아니라, 인력이 참조하고 있던 개발 데이터 묶음을 함께 되돌린다.
- 이유는 배정, MM, 스냅샷 데이터가 인력 ID를 직접 참조하기 때문이다.
- 예를 들어 인력 복원으로 예전 사람 목록을 되살렸는데 현재 프로젝트 배정 데이터는 다른 시점 기준으로 남아 있으면, 어떤 배정은 존재하지 않는 사람을 가리키거나 반대로 새 사람에게 연결되지 못할 수 있다.
- 따라서 "인력 화면에서 복원 버튼을 눌렀다"는 것은 UI 진입 위치일 뿐이고, 실제로는 인력과 직접 연결된 개발 데이터 묶음을 함께 복원하는 작업으로 정의한다.

## 13.3 식별자 정책

1차 구현은 "기존 데이터 보존형 동기화"가 아니라 "테스트용 전체 교체"다. 따라서 업로드 시 기존 레코드의 ID를 유지하거나 자연키 기준으로 병합하는 정책은 사용하지 않는다.

적용 원칙:

- 업로드 전 현재 상태를 JSON 백업으로 저장한다.
- 반영 시 대상 범위 데이터를 삭제한다.
- 새 레코드는 새 ID로 다시 생성한다.
- 이전 ID 참조가 필요한 경우에는 복원 기능으로 백업 시점 전체 상태를 되돌린다.
- 데이터 레코드 ID는 재사용하지 않지만, 작업 추적용 식별자는 반드시 남긴다.
- 복원은 `backup_id` 기준으로 수행하며, UI에는 사람이 읽을 수 있는 생성시각/작업유형/메모와 함께 노출한다.

---

## 14. 권한 요구사항

엑셀 업로드, 전체 교체, 백업 복원 기능은 모두 admin 전용이다.

| 사용자 | 엑셀 업로드 | 전체 교체 | 백업 복원 |
| --- | --- | --- | --- |
| admin | 가능 | 가능 | 가능 |
| general_editor | 불가 | 불가 | 불가 |
| project_editor | 불가 | 불가 | 불가 |
| read_only | 불가 | 불가 | 불가 |
| head | 불가 | 불가 | 불가 |

프론트엔드에서는 admin이 아닌 경우 버튼을 숨기거나 비활성화한다.

백엔드에서는 반드시 권한을 재검증한다.

---

## 15. 프론트엔드 구현 상세

## 15.1 API 래퍼 추가

`apps/web/app/lib/api.ts`에 다음 함수를 추가한다.

```ts
export async function validateProjectImport(file: File): Promise<ApiEnvelope<ProjectImportValidationResult>>
export async function replaceProjectImport(file: File, memo?: string): Promise<ApiEnvelope<ProjectImportResult>>
export async function listProjectImportBackups(params?: ListParams): Promise<ApiEnvelope<ImportBatch[]>>
export async function restoreProjectImportBackup(backupId: string, memo?: string): Promise<ApiEnvelope<ProjectRestoreResult>>

export async function validatePersonnelImport(file: File): Promise<ApiEnvelope<PersonnelImportValidationResult>>
export async function replacePersonnelImport(file: File, memo?: string): Promise<ApiEnvelope<PersonnelImportResult>>
export async function listPersonnelImportBackups(params?: ListParams): Promise<ApiEnvelope<ImportBatch[]>>
export async function restorePersonnelImportBackup(backupId: string, memo?: string): Promise<ApiEnvelope<PersonnelRestoreResult>>
```

## 15.2 공통 모달 컴포넌트 권장

공통 컴포넌트를 추가한다.

```text
apps/web/design/components/ExcelImportModal.tsx
apps/web/design/components/ImportHistoryRestoreModal.tsx
```

또는 페이지별로 먼저 구현 후 공통화해도 된다.

권장 props:

```ts
type ImportTargetType = "projects" | "personnel";

interface ExcelImportModalProps {
  open: boolean;
  targetType: ImportTargetType;
  onClose: () => void;
  onImported: () => void;
}

interface ImportHistoryRestoreModalProps {
  open: boolean;
  targetType: ImportTargetType;
  onClose: () => void;
  onRestored: () => void;
}
```

## 15.3 프로젝트 관리 화면 적용

`CodePage.tsx`에서 다음을 적용한다.

1. 목록 상단 우측 버튼 영역에 `엑셀 업로드` 추가
2. 그 우측에 `업로드 이력/복원` 추가
3. 업로드 성공 시 기존 `getP1Screen("code")` 재조회
4. 복원 성공 시 기존 `getP1Screen("code")` 재조회
5. 필요 시 `getP1Screen("execution")`은 해당 화면에서 재조회되므로 여기서는 code 화면 데이터만 갱신

## 15.4 인력 관리 화면 적용

`PeopleEmploymentPage.tsx`에서 다음을 적용한다.

1. 목록 상단 우측 버튼 영역에 `엑셀 업로드` 추가
2. 그 우측에 `업로드 이력/복원` 추가
3. 업로드 성공 시 `listPersonnel()` 재조회
4. 복원 성공 시 `listPersonnel()` 재조회
5. 필요 시 `listRoles()`도 재조회하되, 1차에서는 roles를 교체하지 않으므로 필수는 아님

---

## 16. 백엔드 구현 상세

## 16.1 엑셀 파서

Python 패키지는 `openpyxl` 사용을 권장한다.

신규 서비스 파일 예시:

```text
apps/api/app/services/excel_imports.py
```

주요 함수 예시:

```python
def parse_project_workbook(file: UploadFile) -> list[dict[str, object]]:
    ...

def validate_project_rows(rows: list[dict[str, object]], session: Session) -> ImportValidationResult:
    ...

def replace_projects_from_rows(rows: list[dict[str, object]], session: Session, user: User, memo: str | None) -> ImportResult:
    ...

def parse_personnel_workbook(file: UploadFile) -> list[dict[str, object]]:
    ...

def validate_personnel_rows(rows: list[dict[str, object]], session: Session) -> ImportValidationResult:
    ...

def replace_personnel_from_rows(rows: list[dict[str, object]], session: Session, user: User, memo: str | None) -> ImportResult:
    ...
```

## 16.2 백업 서비스

신규 서비스 파일 예시:

```text
apps/api/app/services/import_backups.py
```

주요 함수 예시:

```python
def create_backup(session: Session, target_type: str, action_type: str, user: User, memo: str | None = None) -> ImportBatch:
    ...

def list_backups(session: Session, target_type: str, params: ListParams) -> tuple[list[ImportBatch], int]:
    ...

def restore_backup(session: Session, backup_id: str, user: User, memo: str | None = None) -> RestoreResult:
    ...
```

## 16.3 트랜잭션 처리

업로드/복원은 반드시 트랜잭션으로 처리한다.

주의:

- 검증 단계에서는 commit하지 않는다.
- 백업 파일 생성은 DB 트랜잭션 밖에서 먼저 완료한다.
- DB 교체와 완료 이력 기록은 하나의 DB 트랜잭션 안에서 처리한다.
- DB 교체 중 오류가 발생하면 롤백한다.
- 실패 이력은 가능하면 별도 세션 또는 rollback 이후 기록한다.
- 파일 백업과 DB 반영은 하나의 물리적 원자 트랜잭션이 아니므로, 실패 시점별 보정 규칙을 명확히 구현한다.

## 16.4 파일 크기 제한

1차 구현 기준:

- 허용 확장자: `.xlsx`
- 거부 확장자: `.xls`, `.csv`, 기타
- 최대 파일 크기: 10MB 권장
- `python-multipart`, `openpyxl` 의존성을 추가한다.
- 파일명 대신 서버가 생성한 안전한 경로에 저장한다.

프론트와 백엔드에서 모두 검증한다.

## 16.5 동시 실행 제한

업로드/복원 작업은 `JobLock`과 연결해 상호 배타적으로 처리한다.

적용 원칙:

- 같은 `target_type`에 대해 동시에 두 개 이상의 업로드/복원 작업을 실행할 수 없다.
- lock 획득 실패 시 API는 `409 Conflict`를 반환한다.
- lock key는 최소 `imports:projects`, `imports:personnel` 단위로 분리한다.
- 작업 시작 시 lock 획득, 작업 종료 또는 실패 시 lock 해제한다.
- 비정상 종료 대비를 위해 만료 시각(`expires_at`)을 관리한다.

---

## 17. 에러 메시지 정책

사용자에게는 행 번호와 컬럼명을 기준으로 수정 가능한 메시지를 제공한다.

예시:

| 상황 | 메시지 |
| --- | --- |
| 파일 없음 | 업로드할 엑셀 파일을 선택하세요. |
| 확장자 오류 | `.xlsx` 파일만 업로드할 수 있습니다. |
| 필수 컬럼 없음 | 필수 컬럼이 없습니다: 프로젝트코드, 사업명 |
| 필수값 없음 | 12행의 `사업명` 값이 비어 있습니다. |
| 상태값 오류 | 15행의 `상태` 값이 올바르지 않습니다: 진행 |
| 역할 매칭 실패 | 7행의 `역할` 값과 일치하는 활성 Role이 없습니다: 컨설턴트 |
| 검증 결과 만료 | 파일이 변경되어 다시 검증해야 합니다. |
| 동시 실행 제한 | 다른 업로드 또는 복원 작업이 진행 중입니다. 잠시 후 다시 시도하세요. |
| 권한 없음 | 엑셀 업로드/복원은 관리자만 수행할 수 있습니다. |
| 복원 대상 오류 | 현재 화면과 다른 유형의 백업은 복원할 수 없습니다. |
| 백업 파일 없음 | 백업 파일을 찾을 수 없습니다. |
| 서버 오류 | 처리 중 오류가 발생했습니다. 기존 데이터는 변경되지 않았습니다. |

---

## 18. 테스트 시나리오

## 18.1 프로젝트 업로드 테스트

| No | 시나리오 | 기대 결과 |
| --- | --- | --- |
| P-01 | 정상 프로젝트 엑셀 검증 | valid true |
| P-02 | 필수 컬럼 누락 | 오류 반환, DB 변경 없음 |
| P-03 | 프로젝트코드 중복 | 오류 반환, DB 변경 없음 |
| P-04 | 상태값 오류 | 오류 반환, DB 변경 없음 |
| P-05 | 날짜 형식 오류 | 오류 반환, DB 변경 없음 |
| P-06 | 정상 프로젝트 엑셀 전체 교체 | 백업 생성 후 project_codes/projects 교체 |
| P-07 | 전체 교체 중 오류 발생 | 롤백, 기존 데이터 유지 |
| P-08 | 업로드 후 CodePage 재조회 | 신규 데이터 표시 |
| P-09 | 백업 목록 조회 | 업로드 전 백업 이력 표시 |
| P-10 | 백업 복원 | 복원 전 백업 생성 후 선택 버전 복원 |
| P-11 | 프로젝트 종속 데이터가 있는 상태에서 전체 교체 | 백업 후 종속 데이터 포함 삭제 및 재적재 |
| P-12 | 검증 후 파일 변경 | 반영 차단, 재검증 요구 |

## 18.2 인력 업로드 테스트

| No | 시나리오 | 기대 결과 |
| --- | --- | --- |
| H-01 | 정상 인력 엑셀 검증 | valid true |
| H-02 | 필수 컬럼 누락 | 오류 반환, DB 변경 없음 |
| H-03 | 사번 중복 | 오류 반환, DB 변경 없음 |
| H-04 | 이메일 중복 | 오류 반환, DB 변경 없음 |
| H-05 | 재직상태 오류 | 오류 반환, DB 변경 없음 |
| H-06 | 역할 매칭 실패 | 오류 반환, DB 변경 없음 |
| H-07 | 정상 인력 엑셀 전체 교체 | 백업 생성 후 personnel 교체 |
| H-08 | 전체 교체 중 오류 발생 | 롤백, 기존 데이터 유지 |
| H-09 | 업로드 후 PeopleEmploymentPage 재조회 | 신규 데이터 표시 |
| H-10 | 백업 복원 | 복원 전 백업 생성 후 선택 버전 복원 |
| H-11 | 인력 종속 데이터가 있는 상태에서 전체 교체 | 백업 후 종속 데이터 포함 삭제 및 재적재 |
| H-12 | 검증 후 파일 변경 | 반영 차단, 재검증 요구 |

## 18.3 권한 테스트

| No | 시나리오 | 기대 결과 |
| --- | --- | --- |
| A-01 | admin 업로드 | 가능 |
| A-02 | general_editor 업로드 | 403 |
| A-03 | project_editor 업로드 | 403 |
| A-04 | read_only 업로드 | 403 |
| A-05 | head 업로드 | 403 |
| A-06 | admin 복원 | 가능 |
| A-07 | admin 외 복원 | 403 |
| A-08 | 작업 중 중복 업로드 요청 | 409 |

---

## 19. 구현 우선순위

권장 구현 순서:

1. `ImportBatch` 모델 및 마이그레이션 추가
2. 백업 저장 디렉터리 및 `.gitignore` 설정
3. 공통 백업 생성/복원 서비스 구현
4. 프로젝트 엑셀 validate API 구현
5. 프로젝트 엑셀 replace API 구현
6. 프로젝트 백업 목록/복원 API 구현
7. 프로젝트 관리 화면 버튼/모달 연결
8. 인력 엑셀 validate API 구현
9. 인력 엑셀 replace API 구현
10. 인력 백업 목록/복원 API 구현
11. 인력 관리 화면 버튼/모달 연결
12. 테스트 추가
13. 실제 샘플 엑셀로 검증

---

## 20. Codex 작업 지시 요약

아래 요구사항을 기준으로 구현한다.

```text
프로젝트 관리(/projects/codes)와 인력 관리(/people/employment) 화면에
기존 엑셀 다운로드 버튼 우측으로 `엑셀 업로드`, `업로드 이력/복원` 버튼을 추가한다.

엑셀 업로드는 파일 선택 즉시 DB에 반영하지 않고,
검증 → 검증 결과 표시 → 반영 확인 → 자동 백업 → 기존 데이터 초기화 → 엑셀 데이터 저장 → 화면 갱신 흐름으로 구현한다.

검증 결과는 미리보기이며, 반영 시 서버가 같은 파일을 다시 검증해 일관성을 확인한 뒤 진행한다.

업로드 이력/복원은 백업 목록을 보여주고,
선택한 백업 버전으로 복원할 수 있게 한다.
복원 전에도 현재 상태를 자동 백업해야 한다.

1차 구현 대상은 다음으로 제한한다.
- 프로젝트 마스터 재적재: project_codes, projects 및 직접 종속된 프로젝트 관련 개발 데이터
- 인력 마스터 재적재: personnel 및 직접 종속된 인력 관련 개발 데이터

roles는 초기화하지 않고 기존 활성 Role을 참조한다.
투입/배정, 월별 MM, 스냅샷, KPI 데이터 업로드/복원은 1차 범위에서 제외한다.

모든 업로드/복원 기능은 admin 전용으로 구현한다.
백엔드에서도 반드시 권한을 검증한다.

업로드/복원 중 오류가 발생하면 기존 데이터가 깨지지 않도록 트랜잭션 처리한다.
백업 파일은 storage/import_backups 하위에 저장하고 Git에 포함되지 않도록 한다.
```

---

## 21. 완료 기준

다음 조건을 만족하면 완료로 본다.

1. 프로젝트 관리 화면에 `엑셀 업로드`, `업로드 이력/복원` 버튼이 보인다.
2. 인력 관리 화면에 `엑셀 업로드`, `업로드 이력/복원` 버튼이 보인다.
3. admin 권한에서만 업로드/복원이 가능하다.
4. 프로젝트 엑셀 검증 API가 정상 동작한다.
5. 인력 엑셀 검증 API가 정상 동작한다.
6. 검증 오류가 있으면 DB에 반영되지 않는다.
7. 정상 프로젝트 엑셀 업로드 시 기존 프로젝트 데이터가 백업되고 전체 교체된다.
8. 정상 인력 엑셀 업로드 시 기존 인력 데이터가 백업되고 전체 교체된다.
9. 업로드 후 브라우저 목록이 새 데이터로 갱신된다.
10. 업로드 이력/복원 모달에서 백업 목록을 확인할 수 있다.
11. 선택한 백업으로 복원할 수 있다.
12. 복원 전 현재 상태가 자동 백업된다.
13. 복원 후 브라우저 목록이 복원 데이터로 갱신된다.
14. 백업 파일이 Git에 포함되지 않는다.
15. 관련 API 테스트가 추가된다.
