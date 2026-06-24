# PRD/DTL 통합 문서: 데이터 백업/업로드/복원

- 문서 목적: Codex 작업 지시용 PRD/DTL 통합 문서
- 대상 시스템: PMO 업무수행 관리시스템 `pmo-ops-portal`
- 작성일: 2026-06-22
- 적용 메뉴: `관리 > 데이터 백업/업로드/복원`
- 적용 화면: 신규 독립 관리자 페이지
- 기존 화면 정책:
  - `관리 > 프로젝트 관리`(`/projects/codes`) 화면은 현 구현 상태를 유지한다.
  - `관리 > 인력 관리`(`/people/employment`) 화면은 현 구현 상태를 유지한다.
  - 프로젝트/인력 목록 화면에 개별 `엑셀 업로드`, `업로드 이력/복원` 버튼을 추가하지 않는다.
  - 기존 `엑셀 다운로드` 기능은 조회·편의 기능으로 유지한다.

---

## 1. 배경 및 목적

현재 로컬 개발 환경에서는 테스트용 랜덤 더미데이터가 사용되고 있다. 프로젝트, 인력, 배정, MM, 스냅샷, KPI 기능이 서로 연결되기 시작한 상태이므로, 앞으로는 부서에서 실제 운용 중인 엑셀 기반 데이터를 활용하여 기능을 검증해야 한다.

기존 방식처럼 매번 Codex에게 엑셀 데이터를 DB에 반영하도록 요청하면 다음 문제가 발생한다.

1. 데이터 반영 절차가 매번 수동이고 반복적이다.
2. 실제 데이터 기반 검증 주기가 느리다.
3. 잘못된 엑셀 반영 후 이전 상태로 되돌리기 어렵다.
4. 프로젝트·인력·배정·MM·스냅샷 간 참조 관계를 일관되게 관리하기 어렵다.
5. 프로젝트/인력 개별 화면에 업로드 버튼을 두면 사용자가 영향 범위를 오해할 수 있다.

따라서 본 기능은 `프로젝트 데이터를 올린다` 또는 `인력 데이터를 올린다`가 아니라, **개발/테스트용 업무 데이터 세트를 통합 단위로 백업·검증·교체·복원하는 관리자용 데이터 운영 기능**으로 정의한다.

---

## 2. 핵심 방향

본 기능은 별도 페이지에서만 제공한다.

```text
관리 > 데이터 백업/업로드/복원
```

핵심 흐름은 다음과 같다.

```text
통합 엑셀 업로드
→ 엑셀 파일 사전 검증
→ 검증 결과 미리보기
→ 검증한 동일 파일인지 확인
→ 현재 데이터 통합 백업 생성
→ 기존 개발 데이터 세트 초기화
→ 엑셀 데이터로 전체 재적재
→ 작업 이력 저장
→ 관련 화면 데이터 재조회/갱신
```

복원 흐름은 다음과 같다.

```text
백업 이력 조회
→ 백업 세트 선택
→ 백업 상세/포함 테이블 미리보기
→ 현재 데이터 통합 백업 생성
→ 기존 개발 데이터 세트 초기화
→ 선택한 백업 세트 전체 복원
→ 복원 이력 저장
→ 관련 화면 데이터 재조회/갱신
```

중요 원칙은 다음과 같다.

1. 프로젝트/인력 개별 목록 화면에는 업로드/복원 버튼을 추가하지 않는다.
2. 엑셀 파일 선택 즉시 DB에 반영하지 않는다.
3. 반드시 사전 검증 결과를 먼저 보여준다.
4. 검증 오류가 있으면 DB에 반영하지 않는다.
5. `검증한 동일 파일`에 한해서만 전체 교체를 허용한다.
6. 전체 교체 전 현재 데이터 세트를 자동 백업한다.
7. 복원 전에도 현재 데이터 세트를 자동 백업한다.
8. 교체/복원 작업은 하나의 작업 ID와 하나의 백업 세트 단위로 관리한다.
9. 저장/초기화/복원은 DB 트랜잭션으로 처리한다.
10. 실패 시 기존 데이터가 깨지지 않도록 롤백한다.
11. 본 기능은 개발/테스트 데이터 운영용이며 운영 데이터 마이그레이션 기능으로 사용하지 않는다.
12. 모든 기능은 `admin` 권한 전용이다.

---

## 3. 왜 별도 페이지로 분리하는가

`월마감/스냅샷`은 특정 시점의 업무 현황을 확정·조회하는 정상 업무 기능이다. 반면 `데이터 백업/업로드/복원`은 프로젝트·인력·배정·MM·스냅샷·집계 데이터를 통째로 교체하거나 이전 백업으로 되돌리는 관리자용 데이터 운영 기능이다.

두 기능은 다음처럼 성격이 다르다.

| 구분 | 월마감/스냅샷 | 데이터 백업/업로드/복원 |
| --- | --- | --- |
| 목적 | 업무 기준시점 확정/조회 | 개발 데이터 세트 교체/복원 |
| 사용자 인식 | 업무 데이터 확정 | 테스트 데이터 전체 운영 |
| 위험도 | 중간 | 매우 높음 |
| 영향 범위 | 스냅샷/보고 기준 | 프로젝트·인력·배정·MM·스냅샷·KPI 전체 |
| 권한 | 운영 정책에 따라 제한 | admin 전용 |
| 복원 의미 | 업무 기준시점 조회/확정 취소 가능성 | DB 데이터 세트 전체 복원 |

따라서 `월마감/스냅샷` 페이지에 본 기능을 추가하지 않는다. 또한 `프로젝트 관리`, `인력 관리` 페이지에 개별 업로드 버튼을 붙이지 않는다. 이 기능은 사용자가 명확히 `데이터 세트 전체 교체/복원`임을 인지할 수 있도록 별도 메뉴에서 제공한다.

---

## 4. 1차 구현 범위

### 4.1 포함 범위

신규 페이지를 구현한다.

| 항목 | 내용 |
| --- | --- |
| 메뉴명 | `관리 > 데이터 백업/업로드/복원` |
| 권장 URL | `/admin/data-backup` |
| 권장 라우트 | `apps/web/app/(protected)/admin/data-backup/page.tsx` |
| 권장 화면 컴포넌트 | `apps/web/design/pages/DataBackupRestorePage.tsx` |
| 권한 | admin 전용 |

1차 기능은 다음을 포함한다.

1. 현재 데이터 통합 백업 생성
2. 통합 백업 목록 조회
3. 통합 엑셀 템플릿 다운로드
4. 통합 엑셀 파일 사전 검증
5. 검증 결과 미리보기
6. 검증한 동일 파일에 한해 전체 교체 반영
7. 반영 전 현재 데이터 자동 백업
8. 특정 통합 백업 세트 전체 복원
9. 복원 전 현재 데이터 자동 백업
10. 업로드/복원 작업 이력 저장
11. 동시 실행 잠금
12. admin 권한 검증

### 4.2 데이터 세트 대상 테이블

본 기능은 `dataset` 단위로 동작한다. 1차 대상 테이블은 다음과 같다.

| 구분 | 테이블 | 포함 여부 | 비고 |
| --- | --- | --- | --- |
| 역할 기준값 | `roles` | 제외 | 시스템 기준값으로 유지. 엑셀 업로드·전체 교체·백업 복원 대상이 아님 |
| 인력 | `personnel` | 포함 | 인력 마스터 |
| 프로젝트 코드 | `project_codes` | 포함 | 프로젝트 코드/마스터 |
| 프로젝트 | `projects` | 포함 | 프로젝트 본문 |
| 배정 | `project_assignments` | 포함 | 프로젝트-인력 연결 |
| 진행이력 | `project_logs` | 포함 | 백업/복원 및 삭제 대상. 업로드 입력에는 포함하지 않으며 전체 교체 후 빈 상태에서 새로 기록 |
| 월별 재직 MM | `monthly_employment_mm` | 포함 | 업로드 입력 제외. 프로젝트·인력·배정 원본을 기준으로 서버가 생성 |
| 월별 투입 MM | `monthly_assignment_mm` | 포함 | 업로드 입력 제외. 프로젝트 배정 원본을 기준으로 서버가 생성 |
| 현재 스냅샷 | `current_assignment_snapshots` | 포함 | 업로드 입력 제외. 서버가 생성 |
| 주간 스냅샷 | `weekly_load_snapshots` | 포함 | 업로드 입력 제외. 서버가 생성 |
| 월간 KPI | `monthly_kpi_summaries` | 포함 | 업로드 입력 제외. 서버가 집계 |

### 4.3 제외 범위

1차 구현에서는 다음을 제외한다.

| 제외 대상 | 제외 사유 |
| --- | --- |
| `users` | 사용자/권한 데이터는 테스트 데이터 세트 교체 대상이 아님 |
| `roles` | 역할 기준값은 시스템 설정으로 유지하며, 통합 업로드·삭제·복원 대상이 아님 |
| `holidays` | 공휴일 관리는 별도 관리자 기능이며 MM 계산 기준값이므로 분리 |
| `job_locks` | 시스템 동시 실행 잠금 테이블이므로 제외 |
| `import_batches` 또는 데이터 관리 이력 테이블 | 백업/업로드/복원 이력 자체는 삭제/복원 대상이 아님 |
| 운영 서버 배포용 데이터 마이그레이션 정책 | 본 기능은 개발/테스트용 |
| 파일 암호화 저장 | 1차 제외. 단, 실제 데이터이므로 Git 제외는 필수 |
| 장기 보관 정책 UI | 1차 제외. 최근 N개 보관 정책은 추후 적용 가능 |
| 사용자별 세밀한 데이터 권한 | 1차는 admin 전용 |

---

## 5. 기존 화면 변경 정책

### 5.1 프로젝트 관리 화면

대상 화면:

```text
관리 > 프로젝트 관리
/projects/codes
```

정책:

- 현 구현 상태를 유지한다.
- 목록 우측 상단에 `엑셀 업로드` 버튼을 추가하지 않는다.
- 목록 우측 상단에 `업로드 이력/복원` 버튼을 추가하지 않는다.
- 기존 `엑셀 다운로드` 기능은 유지한다.
- 프로젝트 등록/수정/필터/다운로드 기능은 현재 동작을 유지한다.

### 5.2 인력 관리 화면

대상 화면:

```text
관리 > 인력 관리
/people/employment
```

정책:

- 현 구현 상태를 유지한다.
- 목록 우측 상단에 `엑셀 업로드` 버튼을 추가하지 않는다.
- 목록 우측 상단에 `업로드 이력/복원` 버튼을 추가하지 않는다.
- 기존 `엑셀 다운로드` 기능은 유지한다.
- 인력 등록/수정/필터/다운로드 기능은 현재 동작을 유지한다.

---

## 6. 신규 화면 요구사항

## 6.1 화면 개요

신규 화면명:

```text
데이터 백업/업로드/복원
```

권장 메뉴 위치:

```text
관리
  - 사용자/권한 관리
  - 기준정보 관리
  - 프로젝트 관리
  - 인력 관리
  - 공휴일 관리
  - 월마감/스냅샷
  - 데이터 백업/업로드/복원
```

권장 페이지 구성:

1. 상단 안내/경고 영역
2. 현재 데이터 요약 카드
3. 주요 작업 카드
4. 엑셀 검증/업로드 영역
5. 백업/작업 이력 테이블
6. 백업 상세/복원 모달

## 6.2 상단 안내/경고 영역

페이지 상단에는 다음 성격의 안내를 표시한다.

```text
이 화면은 개발/테스트용 업무 데이터 세트를 통합 백업, 엑셀 업로드, 전체 교체, 복원하는 관리자 전용 기능입니다.
전체 교체 또는 복원 시 프로젝트, 인력, 배정, MM, 스냅샷, KPI 데이터가 함께 변경될 수 있습니다.
운영 데이터 마이그레이션 용도로 사용하지 마세요.
```

경고 스타일:

- 노란색 또는 붉은색 계열의 주의 배너
- `admin 전용`, `전체 데이터 교체`, `복원 전 자동 백업` 문구 강조

## 6.3 현재 데이터 요약 카드

화면 상단 또는 작업 카드 위에 현재 데이터 상태를 요약한다.

| 카드 | 표시값 |
| --- | --- |
| 프로젝트 | `projects` 건수 |
| 인력 | `personnel` 건수 |
| 배정 | `project_assignments` 건수 |
| 월별 MM | `monthly_employment_mm + monthly_assignment_mm` 건수 |
| 스냅샷 | `current_assignment_snapshots + weekly_load_snapshots` 건수 |
| 최근 백업 | 마지막 성공 백업 시각 |

## 6.4 주요 작업 카드

주요 작업은 4개 카드 또는 버튼 그룹으로 구성한다.

| 기능 | 버튼명 | 설명 |
| --- | --- | --- |
| 통합 백업 | `현재 데이터 백업` | 현재 데이터 세트를 백업 파일로 저장 |
| 템플릿 다운로드 | `통합 엑셀 템플릿 다운로드` | 기존 프로젝트/인력 다운로드 양식 기반의 다중 시트 엑셀 다운로드 |
| 엑셀 검증/업로드 | `엑셀 검증/업로드` | 파일 선택, 검증, 전체 교체 반영 |
| 복원 | `백업 이력/복원` | 백업 목록에서 특정 버전 복원 |

## 6.5 엑셀 검증/업로드 영역

`엑셀 검증/업로드` 버튼 클릭 시 모달 또는 페이지 내 패널을 연다.

구성:

1. 파일 선택 영역
2. 선택 파일 정보
3. 검증 실행 버튼
4. 검증 결과 요약
5. 오류/경고 목록
6. 반영 메모 입력
7. `전체 교체 반영` 버튼
8. 취소 버튼

안내 문구 예시:

```text
통합 엑셀 파일을 업로드하면 먼저 시트/컬럼/값/참조관계를 검증합니다.
검증 오류가 없고, 검증한 파일과 동일한 파일일 때만 전체 교체 반영이 가능합니다.
반영 전 현재 데이터 세트는 자동 백업됩니다.
```

### 6.5.1 검증 결과 표시

검증 결과는 다음 정보를 표시한다.

| 항목 | 설명 |
| --- | --- |
| 전체 시트 수 | 인식한 시트 수 |
| 전체 행 수 | 전체 데이터 행 수 |
| 정상 행 수 | 검증 통과 행 수 |
| 오류 행 수 | 반영을 막는 오류 행 수 |
| 경고 행 수 | 반영 가능하지만 확인이 필요한 행 수 |
| 예상 반영 건수 | 테이블별 insert 예상 건수 |
| 파일 지문 | `file_sha256` 일부 표시 |
| 검증 ID | `validation_id` 표시 또는 내부 보관 |

오류/경고 목록 컬럼:

| 컬럼 | 설명 |
| --- | --- |
| 시트 | 오류가 발생한 시트명 |
| 행 번호 | 엑셀 행 번호 |
| 컬럼 | 오류가 발생한 컬럼명 |
| 입력값 | 입력된 값 |
| 구분 | 오류/경고 |
| 메시지 | 수정 가능한 오류 설명 |

### 6.5.2 전체 교체 반영 버튼 활성화 조건

`전체 교체 반영` 버튼은 다음 조건을 모두 만족할 때만 활성화한다.

1. 파일이 선택되어 있음
2. 검증을 한 번 이상 실행함
3. 오류 행 수가 0임
4. 마지막 검증 이후 파일이 변경되지 않음
5. 서버에서 발급한 `validation_id`가 있음
6. 현재 사용자가 admin 권한임
7. 같은 데이터 세트에 대해 진행 중인 업로드/복원 작업이 없음

버튼 클릭 시 확인 모달을 표시한다.

확인 문구 예시:

```text
현재 프로젝트·인력·배정·MM·스냅샷·KPI 데이터가 자동 백업된 후 삭제되며,
업로드한 엑셀 데이터로 전체 재적재됩니다.
계속하시겠습니까?
```

가능하면 확인 모달에 `전체 교체` 또는 `데이터 교체` 문구 입력 확인을 추가한다.

## 6.6 백업 이력/복원 영역

백업/작업 이력 테이블은 페이지 하단에 기본 표시하거나 `백업 이력/복원` 버튼 클릭 시 모달로 표시한다.

권장: 페이지 하단 테이블 기본 표시 + 행 클릭 시 상세 모달.

이력 테이블 컬럼:

| 컬럼 | 설명 |
| --- | --- |
| 생성일시 | 백업/업로드/복원 작업 시각 |
| 작업 ID | `operation_group_id` 축약 표시 |
| 백업 ID | 복원 가능한 백업 세트 ID |
| 작업 유형 | 수동 백업, 업로드 전 백업, 업로드 완료, 복원 전 백업, 복원 완료 |
| 대상 | `통합 데이터 세트` |
| 원본 파일명 | 업로드 파일명. 수동/복원 전 백업은 `-` 가능 |
| 건수 | 전체 또는 테이블별 건수 요약 |
| 작업자 | 실행 사용자 |
| 상태 | 성공/실패/진행중 |
| 메모 | 사용자가 입력한 메모 |
| 작업 | 미리보기, 복원 |

복원 버튼 노출 기준:

- 실제 백업 파일과 `backup_id`가 있는 이력에만 노출한다.
- `upload_replace`, `restore_apply`, `failed`, `running` 이력에는 복원 버튼을 노출하지 않는다.

## 6.7 백업 상세/복원 모달

백업 행의 `미리보기` 또는 `복원` 클릭 시 상세 모달을 표시한다.

상세 모달 정보:

| 항목 | 설명 |
| --- | --- |
| 백업 ID | 복원 가능한 백업 세트 ID |
| 생성일시 | 백업 생성 시각 |
| 작업자 | 생성 사용자 |
| 생성 사유 | 수동 백업/업로드 전 백업/복원 전 백업 |
| 메모 | 입력 메모 |
| 포함 테이블 | 백업에 포함된 테이블 목록 |
| 테이블별 건수 | 백업 파일에 들어 있는 행 수 |
| 파일 경로 | 관리자 참고용. 전체 경로 노출은 선택 |
| 파일 해시 | 백업 파일 무결성 확인용 |

복원 확인 문구 예시:

```text
선택한 백업 세트로 개발 데이터 전체를 복원합니다.
현재 데이터 세트는 복원 전 자동 백업됩니다.
프로젝트, 인력, 배정, MM, 스냅샷, KPI 데이터가 백업 시점으로 되돌아갑니다.
계속하시겠습니까?
```

복원 버튼 클릭 후 처리 흐름:

```text
1. admin 권한 확인
2. 선택한 backup_id 확인
3. 백업 파일 존재 여부 확인
4. 백업 파일 무결성/스키마 검증
5. 현재 데이터 세트 자동 백업 생성
6. 트랜잭션 시작
7. 현재 데이터 세트 대상 테이블 삭제
8. 백업 파일 기준으로 데이터 복원
9. 복원 완료 이력 저장
10. commit
11. 화면 데이터 재조회
```

---

## 7. 통합 엑셀 템플릿 설계

## 7.1 템플릿 원칙

통합 엑셀 템플릿은 기존 목록 화면에서 다운로드하는 프로젝트·인력 엑셀 양식을 기반으로 제공한다. 두 시트의 그룹 헤더, 컬럼명, 컬럼 순서, 값 표기는 기존 다운로드 파일과 동일해야 한다.

핵심 원칙:

1. DB UUID를 사용자가 직접 입력하지 않는다.
2. 시트 간 연결은 자연키 또는 업로드용 키로 처리한다.
3. 서버는 엑셀의 자연키를 기준으로 신규 UUID를 생성하고 매핑한다.
4. 복원은 백업 JSON 기준으로 수행하며, 복원 시에는 백업에 저장된 UUID를 유지한다.
5. 기존 프로젝트/인력 목록에서 다운로드한 파일을 수정해 업로드할 수 있어야 한다.
6. 엑셀의 `-` 값은 업로드 시 빈값으로 정규화한다.
7. 그룹 헤더 행이 있으면 파서는 실제 컬럼 헤더 행을 기준으로 읽는다.
8. `프로젝트관리`, `인력관리` 시트는 필수이며, `프로젝트배정` 시트는 선택이다.
9. MM·스냅샷·KPI는 업로드 템플릿에 포함하지 않고 서버가 계산·생성한다.
10. `roles`는 시스템 기준값이므로 업로드 파일에서 받거나 전체 교체로 삭제하지 않는다. 인력의 역할명은 기존 활성 역할 기준값과 매칭한다.

## 7.2 시트 구성

권장 시트 구성:

| 시트명 | 필수 여부 | 대상 테이블 | 설명 |
| --- | --- | --- | --- |
| `프로젝트관리` | 필수 | `project_codes`, `projects` | 기존 프로젝트 관리 다운로드 파일과 동일한 형식 |
| `인력관리` | 필수 | `personnel` | 기존 인력 관리 다운로드 파일과 동일한 형식 |
| `프로젝트배정` | 선택 | `project_assignments` | MM·스냅샷 계산에 필요한 원본 배정 정보 |

`프로젝트배정` 시트가 없으면 배정은 빈 상태로 적재한다. 이 경우 월별 MM·스냅샷·KPI도 계산 가능한 원본이 없으므로 빈 상태가 될 수 있다. 기존의 프로젝트 로그는 자동 백업 후 삭제하며, 업로드 파일로 이력을 복원하지 않는다.

## 7.3 업로드용 키 정책

시트 간 참조는 다음 키를 사용한다.

| 키 | 용도 |
| --- | --- |
| `employee_no` | 인력 참조. 사번이 없는 경우 1차에서는 오류 권장 |
| `project_code` | 프로젝트 참조. `ProjectCode.code`, `Project.code`와 동일 |
| `assignment_key` | `프로젝트배정` 시트의 배정 식별키. 엑셀 내에서 유일해야 함 |

서버는 import 시 다음 매핑을 내부적으로 생성한다.

```text
employee_no -> Personnel.id
project_code -> ProjectCode.id / Project.id
assignment_key -> ProjectAssignment.id
```

`project_code` 유일성 규칙:

- `프로젝트관리` 시트 내 `코드`는 중복될 수 없다.
- 하나의 `프로젝트코드`는 하나의 `ProjectCode`와 하나의 `Project`를 생성한다. 즉 통합 업로드 데이터 세트에서는 `ProjectCode.code`와 `Project.code`를 1:1로 관리한다.
- `프로젝트배정` 시트의 프로젝트 참조는 반드시 이 유일한 `프로젝트코드`를 사용한다.
- 서버는 적재 전 시트 내 중복과 참조 대상의 유일성을 검증하며, 하나의 코드가 둘 이상의 프로젝트로 해석되는 경우 반영을 거부한다.

## 7.4 `인력관리` 시트 컬럼

| 컬럼 | DB 필드 | 필수 | 비고 |
| --- | --- | --- | --- |
| 사번 | `Personnel.employee_no` | 필수 | 중복 불가. `employee_no` 참조 기준 |
| 성명 | `Personnel.name` | 필수 |  |
| 이메일 | `Personnel.email` | 선택 | 값이 있으면 중복 불가 |
| 본부 | `Personnel.group_name` | 필수 |  |
| 팀 | `Personnel.team_name` | 선택 |  |
| 직위 | `Personnel.position_name` | 선택 |  |
| 역할 | `Personnel.role_id`, `Personnel.role_name` 매핑 | 선택 | 기존 `roles.name`과 일치해야 함. 일치 역할이 없거나 중복이면 오류 |
| 재직상태 | `Personnel.employment_status` | 필수 | 재직/휴직/전배/퇴직/대기 |
| MM 시작일 | `Personnel.mm_start_date` | 선택 | YYYY-MM-DD |
| MM 종료일 | `Personnel.mm_end_date` | 선택 | YYYY-MM-DD |
| 연간 재직 MM | `Personnel.yearly_mm` | 선택 | 숫자 |
| 사용여부 | `Personnel.is_active` | 필수 | 사용/미사용 |

## 7.5 `프로젝트관리` 시트 컬럼

`프로젝트관리` 시트는 `project_codes`와 `projects`를 함께 생성한다.

| 컬럼 | DB 필드 | 필수 | 비고 |
| --- | --- | --- | --- |
| 코드 | `ProjectCode.code`, `Project.code` | 필수 | 기존 다운로드 컬럼명. 중복 불가 |
| 사업명 | `ProjectCode.name`, `Project.name` | 필수 |  |
| 고객사 | `Project.client_name` | 선택 |  |
| 사업유형 | `ProjectCode.project_type`, `Project.project_type` | 필수 | 주사업/부사업/하도/협력 |
| 상태 | `ProjectCode.status`, `Project.status` | 필수 | 제안중/발표완료/WIN/LOSS/DROP/수행중/업무지원/완료 |
| 확도 | `ProjectCode.certainty`, `Project.certainty` | 선택 | 우세/경쟁/확보 등 |
| 사업금액 | `Project.total_amount`, `Project.company_amount` | 선택 | 기존 다운로드 표기인 `총액/당사금액` 형식(예: `9.0억/7.2억`)을 파싱 |
| 영업부서 | `Project.sales_department` | 선택 |  |
| 영업대표 | `Project.sales_owner` | 선택 | 이름 또는 이름+직위 |
| 제안PM | `Project.proposal_pm_name` | 선택 | 이름 또는 이름+직위 |
| 발표PM | `Project.presentation_pm_name` | 선택 | 이름 또는 이름+직위 |
| 수행PM | `Project.delivery_pm_name` | 선택 | 이름 또는 이름+직위 |
| 제안/수행팀 | 화면 표시용 문자열 | 선택 | 배정 생성의 근거로 사용하지 않음. 실제 배정은 `프로젝트배정` 시트 사용 |
| 사업 시작일 | `Project.start_date` | 선택 | YYYY-MM-DD |
| 사업 종료일 | `Project.end_date` | 선택 | YYYY-MM-DD |
| 공고번호 | `Project.bid_notice_no` | 선택 |  |
| 공고일 | `Project.bid_notice_date` | 선택 | YYYY-MM-DD |
| 제안서 제출일 | `Project.submission_at` | 선택 | YYYY-MM-DD 또는 YYYY-MM-DD HH:mm |
| 제출 형식 | `Project.submission_format` | 선택 | 온라인/이메일/방문 등 |
| 제출 유의사항 | `Project.submission_note` | 선택 |  |
| 제안 발표일 | `Project.presentation_at` | 선택 | YYYY-MM-DD 또는 YYYY-MM-DD HH:mm |
| 발표 형식 | `Project.presentation_format` | 선택 |  |
| 발표 유의사항 | `Project.presentation_note` | 선택 |  |
| 최근 활동일 | `Project.recent_activity_at` | 선택 | YYYY-MM-DD 또는 YYYY-MM-DD HH:mm |
| 사용여부 | `ProjectCode.is_active` | 필수 | 사용/미사용 |

`Project.amount_text` 정책:

- `amount_text`는 기존 다운로드의 `사업금액` 컬럼으로 제공되는 화면 표시용 값이다.
- 업로드 시 서버는 `사업금액` 문자열을 파싱하여 `total_amount`, `company_amount`에 분리 저장한다.
- 두 금액 파싱에 성공하면 서버가 표준 표시값 `amount_text`를 다시 생성한다. 빈값은 빈값으로 저장한다.
- `총액/당사금액` 형식이 아니거나 단위가 해석되지 않으면 검증 오류로 처리한다.
- 기존 프로젝트 목록 화면은 지금과 같이 `amount_text`를 사업금액 표시값으로 사용한다.

## 7.6 `프로젝트배정` 시트 컬럼

| 컬럼 | DB 필드 | 필수 | 비고 |
| --- | --- | --- | --- |
| 배정키 | 업로드용 `assignment_key` | 필수 | 엑셀 내 유일 |
| 프로젝트코드 | `ProjectAssignment.project_id` 매핑 | 필수 | `프로젝트관리.코드` 참조 |
| 사번 | `ProjectAssignment.personnel_id` 매핑 | 필수 | `인력관리.사번` 참조 |
| 배정유형 | `assignment_type` | 필수 | 수행/제안/지원/대기 |
| 프로젝트 역할 | `assignment_role` | 선택 | 제안PM/발표PM/수행PM/제안팀/수행팀/지원팀 |
| 배정상태 | `assignment_status` | 선택 | 예정/투입/종료/취소 |
| WIN/LOSS | `win_loss` | 선택 |  |
| 상주유형 | `onsite_type` | 선택 | 상주/비상주/혼합 |
| 대표여부 | `is_primary` | 선택 | Y/N |
| 순서 | `sequence_no` | 선택 | 숫자 |
| 시작일 | `start_date` | 선택 | YYYY-MM-DD |
| 종료일 | `end_date` | 선택 | YYYY-MM-DD |
| MM | `mm` | 선택 | 숫자 |
| 총 MM | `total_mm` | 선택 | 숫자 |
| 현재 MM | `current_mm` | 선택 | 숫자 |
| 확도율 | `certainty_rate` | 선택 | 숫자 |
| 단가 | `unit_price` | 선택 | 숫자 |
| 비고 | `note` | 선택 |  |

## 7.7 서버 계산·초기화 데이터

다음 데이터는 엑셀 입력 대상이 아니다. 전체 교체 시 기존 값을 자동 백업한 뒤 삭제하고, 프로젝트·인력·프로젝트배정 원본을 기준으로 서버가 다시 생성한다.

| 테이블 | 생성 기준 | 업로드 후 처리 |
| --- | --- | --- |
| `monthly_employment_mm` | 인력의 재직상태, MM 시작·종료일 및 공휴일 기준 | 서버 계산 |
| `monthly_assignment_mm` | 프로젝트배정의 기간, MM, 확도, 배정유형 | 서버 계산 |
| `current_assignment_snapshots` | 현재 기준일의 프로젝트·인력·배정 상태 | 서버 생성 |
| `weekly_load_snapshots` | 현재 기준일의 프로젝트·인력·배정 상태 | 서버 생성 |
| `monthly_kpi_summaries` | 재생성된 월별 MM 및 스냅샷 | 서버 집계 |
| `project_logs` | 계산 불가한 사용자 활동 이력 | 자동 백업 후 삭제. 업로드 후에는 빈 상태에서 새 활동부터 기록 |

서버 계산은 전체 교체 DB 트랜잭션 안에서 원본 데이터 적재 뒤 실행한다. 계산에 실패하면 전체 교체를 롤백한다.

---

## 8. 값 매핑 규칙

## 8.1 프로젝트 상태

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

## 8.2 사업유형

| 엑셀 값 | DB 값 |
| --- | --- |
| 주사업 | `main` |
| 부사업 | `sub` |
| 하도 | `subcontract` |
| 협력 | `partner` |

## 8.3 재직상태

| 엑셀 값 | DB 값 |
| --- | --- |
| 재직 | `active` |
| 휴직 | `leave` |
| 전배 | `transferred` |
| 퇴직 | `retired` |
| 대기 | `waiting` |

## 8.4 배정유형

| 엑셀 값 | DB 값 |
| --- | --- |
| 수행 | `delivery` |
| 제안 | `proposal` |
| 지원 | `support` |
| 대기 | `unassigned` |

## 8.5 배정상태

| 엑셀 값 | DB 값 |
| --- | --- |
| 예정 | `planned` |
| 투입 | `assigned` |
| 종료 | `ended` |
| 취소 | `cancelled` |

## 8.6 프로젝트 배정 역할

| 엑셀 값 | DB 값 |
| --- | --- |
| 제안PM | `proposal_pm` |
| 발표PM | `presentation_pm` |
| 수행PM | `delivery_pm` |
| 제안팀 | `proposal_team` |
| 수행팀 | `delivery_team` |
| 지원팀 | `support_team` |

## 8.7 사용여부/Boolean

| 엑셀 값 | DB 값 |
| --- | --- |
| 사용 | `true` |
| 미사용 | `false` |
| Y | `true` |
| N | `false` |
| true | `true` |
| false | `false` |
| 1 | `true` |
| 0 | `false` |

---

## 9. 검증 규칙

## 9.1 파일/템플릿 검증

| 규칙 | 오류/경고 |
| --- | --- |
| `.xlsx`가 아닌 파일 | 오류 |
| 파일 크기 제한 초과 | 오류 |
| 필수 시트 누락 | 오류 |
| 필수 컬럼 누락 | 오류 |
| 헤더명 불일치 | 오류 |
| 빈 데이터 파일 | 오류 |
| 지원하지 않는 추가 시트 | 경고 또는 무시. 1차는 경고 권장 |
| 지원하지 않는 추가 컬럼 | 경고 또는 무시. 1차는 경고 권장 |

## 9.2 인력/역할 기준값 검증

| 규칙 | 오류/경고 |
| --- | --- |
| 사번 중복 | 오류 |
| 이메일 중복 | 오류 |
| 성명 필수값 누락 | 오류 |
| 본부 필수값 누락 | 오류 |
| 재직상태 미지원 값 | 오류 |
| 사용여부 미지원 값 | 오류 |
| 역할 값이 기존 활성 roles 기준값에 없음 | 오류 |
| 동일 역할명이 둘 이상의 기존 role에 매칭됨 | 오류 |
| MM 종료일이 MM 시작일보다 빠름 | 오류 |
| 연간 재직 MM이 숫자가 아님 | 오류 |
| 연간 재직 MM이 음수 | 오류 |
| 이메일 형식 오류 | 경고 또는 오류. 기존 정책에 맞춤 |

## 9.3 프로젝트 검증

| 규칙 | 오류/경고 |
| --- | --- |
| 프로젝트코드 중복 | 오류 |
| 사업명 필수값 누락 | 오류 |
| 사업유형 미지원 값 | 오류 |
| 상태 미지원 값 | 오류 |
| 사용여부 미지원 값 | 오류 |
| 종료일이 시작일보다 빠름 | 오류 |
| 제출/발표 일시 형식 오류 | 오류 |
| 사업금액이 `총액/당사금액` 형식으로 파싱되지 않음 | 오류 |
| 파싱된 금액이 음수 | 오류 |
| 당사 사업금액이 총 사업금액보다 큼 | 오류 |
| PM/영업대표가 인력관리 시트에 없음 | 경고. 1차에서는 문자열 저장 허용 |

## 9.4 참조관계 검증

| 규칙 | 오류/경고 |
| --- | --- |
| 배정의 프로젝트코드가 프로젝트관리 시트에 없음 | 오류 |
| 배정의 사번이 인력관리 시트에 없음 | 오류 |
| 배정키 중복 | 오류 |
| 프로젝트배정 시트가 없으면 배정·MM·스냅샷·KPI가 빈 상태가 될 수 있음 | 경고 및 확인 필요 |

## 9.5 서버 계산 전제 검증

| 규칙 | 오류/경고 |
| --- | --- |
| 프로젝트배정의 MM 값이 음수 | 오류 |
| 프로젝트배정의 종료일이 시작일보다 빠름 | 오류 |
| 프로젝트배정의 필수 계산 입력값이 누락됨 | 오류 또는 경고. 계산 불가 시 오류 |
| 인력의 MM 종료일이 MM 시작일보다 빠름 | 오류 |
| 서버 MM·스냅샷·KPI 재계산 실패 | 전체 교체 오류 및 rollback |

---

## 10. 데이터 교체/복원 상세 규칙

## 10.1 전체 교체 처리 순서

통합 엑셀 전체 교체 처리 순서:

```text
1. admin 권한 확인
2. 동시 실행 lock 획득
3. 업로드 파일 수신
4. file_sha256 계산
5. validation_id와 file_sha256 일치 여부 확인
6. 파일 재파싱
7. 서버 재검증
8. 현재 데이터 세트 백업 생성
9. DB 트랜잭션 시작
10. 기존 대상 테이블 삭제
11. 엑셀 rows를 DB 모델로 변환
12. personnel 삽입 및 기존 roles 기준값과 역할명 매핑
13. project_codes 삽입
14. projects 삽입
15. project_assignments 삽입(프로젝트배정 시트가 있는 경우)
16. monthly_employment_mm, monthly_assignment_mm 계산
17. current_assignment_snapshots, weekly_load_snapshots 생성
18. monthly_kpi_summaries 집계
19. project_logs는 빈 상태 유지
20. upload_replace 이력 저장
21. commit
22. lock 해제
23. 결과 반환
```

## 10.2 삭제 순서

기존 데이터 삭제는 참조 무결성을 고려하여 종속 테이블부터 수행한다.

권장 삭제 순서:

1. `monthly_assignment_mm`
2. `monthly_employment_mm`
3. `current_assignment_snapshots`
4. `weekly_load_snapshots`
5. `project_logs`
6. `project_assignments`
7. `monthly_kpi_summaries`
8. `projects`
9. `project_codes`
10. `personnel`

주의:

- `users`, `roles`, `holidays`, `job_locks`, `import_batches`는 삭제하지 않는다.
- FK 제약으로 삭제 순서가 실제 모델과 다르면 구현 시 DB 관계 기준으로 조정한다.
- 전체 교체 도중 오류가 발생하면 트랜잭션을 롤백한다.
- 백업 파일 생성은 DB 교체 전에 완료되어야 한다.

## 10.3 삽입 순서

삽입은 부모 테이블부터 수행한다.

권장 삽입 순서:

1. `personnel` (기존 `roles` 기준값과 역할명 매핑)
2. `project_codes`
3. `projects`
4. `project_assignments`
5. `monthly_employment_mm` 계산 결과
6. `monthly_assignment_mm` 계산 결과
7. `current_assignment_snapshots` 생성 결과
8. `weekly_load_snapshots` 생성 결과
9. `monthly_kpi_summaries` 집계 결과

## 10.4 식별자 정책

전체 교체와 복원은 식별자 정책이 다르다.

| 작업 | UUID 정책 |
| --- | --- |
| 엑셀 전체 교체 | 새 UUID 생성 |
| JSON 백업 생성 | 현재 DB의 UUID 보존 |
| 백업 복원 | 백업 JSON에 저장된 UUID 그대로 복원 |

이유:

- 엑셀은 사람이 관리하는 외부 데이터이므로 DB 내부 UUID를 요구하지 않는다.
- 전체 교체는 테스트용 재적재이므로 자연키를 기준으로 새 ID를 생성한다.
- 복원은 특정 시점의 DB 상태를 되돌리는 기능이므로 백업 시점의 UUID를 유지해야 참조관계가 정확히 복원된다.

## 10.5 복원 처리 순서

```text
1. admin 권한 확인
2. 동시 실행 lock 획득
3. backup_id 확인
4. 백업 파일 존재 여부 확인
5. 백업 파일 해시/스키마 검증
6. 백업의 personnel.role_id가 현재 유지 중인 roles 기준값에 모두 존재하는지 검증
7. 현재 데이터 세트 백업 생성
8. DB 트랜잭션 시작
9. 기존 대상 테이블 삭제
10. 백업 JSON 기준으로 데이터 복원
11. restore_apply 이력 저장
12. commit
13. lock 해제
14. 결과 반환
```

복원 제한:

| 상황 | 처리 |
| --- | --- |
| admin 권한이 아님 | 403 |
| 백업 파일 없음 | 404 또는 409 |
| 백업 파일 손상 | 409 |
| 백업의 역할 기준값이 현재 시스템에 없음 | 409 |
| target_type이 `dataset`이 아님 | 400 또는 409 |
| 진행 중 작업 존재 | 409 |
| 복원 중 오류 | rollback 후 실패 이력 기록 |

---

## 11. 백엔드 API 설계

## 11.1 신규 라우트

신규 파일:

```text
apps/api/app/api/routes/data_management.py
```

또는 기존 라우팅 네이밍을 맞춘다면:

```text
apps/api/app/api/routes/data_backup.py
```

권장 API prefix:

```text
/api/data-management
```

## 11.2 API 목록

```text
GET  /api/data-management/summary
GET  /api/data-management/template
GET  /api/data-management/backups
POST /api/data-management/backups
GET  /api/data-management/backups/{backup_id}
POST /api/data-management/import/validate
POST /api/data-management/import/replace
POST /api/data-management/restore
```

## 11.3 API 상세

### GET `/api/data-management/summary`

목적:

- 현재 데이터 세트의 테이블별 건수와 최근 작업 상태를 반환한다.

응답 예시:

```json
{
  "data": {
    "counts": {
      "personnel": 17,
      "project_codes": 134,
      "projects": 134,
      "project_assignments": 220,
      "monthly_employment_mm": 204,
      "monthly_assignment_mm": 980,
      "current_assignment_snapshots": 17,
      "weekly_load_snapshots": 85,
      "monthly_kpi_summaries": 6,
      "project_logs": 300
    },
    "last_backup_at": "2026-06-22T15:40:00",
    "last_operation": {
      "operation_group_id": "...",
      "action_type": "upload_replace",
      "status": "success",
      "created_at": "2026-06-22T16:00:00"
    },
    "locked": false
  }
}
```

### GET `/api/data-management/template`

목적:

- 통합 엑셀 템플릿 파일을 다운로드한다.

응답:

- Content-Type: `.xlsx`
- 파일명 예시: `pmo_dataset_template_YYYYMMDD.xlsx`

### POST `/api/data-management/backups`

목적:

- 현재 데이터 세트를 수동 백업한다.

요청:

```json
{
  "memo": "실제 데이터 업로드 전 수동 백업"
}
```

응답 예시:

```json
{
  "data": {
    "target_type": "dataset",
    "action_type": "manual_backup",
    "status": "success",
    "backup_id": "...",
    "operation_group_id": "...",
    "backup_path": "storage/import_backups/dataset/20260622_154000_....json",
    "table_counts": {
      "projects": 134,
      "personnel": 17
    }
  }
}
```

### GET `/api/data-management/backups`

목적:

- 백업/업로드/복원 이력을 조회한다.

쿼리:

- `page`
- `page_size`
- `q`
- `action_type`
- `status`
- `date_from`
- `date_to`

응답 예시:

```json
{
  "data": [
    {
      "id": "...",
      "operation_group_id": "...",
      "target_type": "dataset",
      "action_type": "manual_backup",
      "status": "success",
      "backup_id": "...",
      "backup_path": "storage/import_backups/dataset/20260622_154000_abc.json",
      "original_filename": null,
      "file_sha256": null,
      "backup_sha256": "...",
      "row_count": 1200,
      "table_counts": {
        "projects": 134,
        "personnel": 17
      },
      "created_by": "관리자",
      "created_at": "2026-06-22T15:40:00",
      "memo": "실제 데이터 업로드 전 수동 백업"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 1
  }
}
```

### GET `/api/data-management/backups/{backup_id}`

목적:

- 백업 세트 상세와 테이블별 건수, 복원 가능 여부를 반환한다.

응답 예시:

```json
{
  "data": {
    "backup_id": "...",
    "target_type": "dataset",
    "created_at": "2026-06-22T15:40:00",
    "created_by": "관리자",
    "backup_sha256": "...",
    "restorable": true,
    "table_counts": {
      "personnel": 17,
      "projects": 134
    },
    "memo": "업로드 전 백업"
  }
}
```

### POST `/api/data-management/import/validate`

목적:

- 통합 엑셀 파일을 파싱하고 검증한다.
- DB에는 반영하지 않는다.
- 검증 성공 시 `validation_id`와 `file_sha256`을 반환한다.

요청:

- `multipart/form-data`
- field: `file`

응답 예시:

```json
{
  "data": {
    "valid": false,
    "target_type": "dataset",
    "validation_id": "...",
    "file_sha256": "8f5a...",
    "summary": {
      "sheet_count": 3,
      "total_rows": 360,
      "valid_rows": 357,
      "error_rows": 3,
      "warning_rows": 2
    },
    "expected_counts": {
      "personnel": 17,
      "projects": 134,
      "project_assignments": 220
    },
    "errors": [
      {
        "sheet": "프로젝트관리",
        "row": 12,
        "field": "상태",
        "value": "진행",
        "message": "지원하지 않는 상태값입니다."
      }
    ],
    "warnings": []
  }
}
```

### POST `/api/data-management/import/replace`

목적:

- 검증한 동일 엑셀 파일에 한해 현재 데이터 세트를 백업한 뒤 전체 교체한다.

요청:

- `multipart/form-data`
- field: `file`
- field: `validation_id`
- field: `file_sha256`
- optional field: `memo`

규칙:

- `validation_id`는 최근 검증 성공 이력이어야 한다.
- `file_sha256`는 validate 응답의 값과 일치해야 한다.
- 서버는 replace 요청에서도 파일을 다시 파싱하고 다시 검증한다.
- 재검증 결과 오류가 있으면 반영하지 않는다.

응답 예시:

```json
{
  "data": {
    "target_type": "dataset",
    "status": "success",
    "backup_id": "...",
    "import_id": "...",
    "operation_group_id": "...",
    "inserted": {
      "personnel": 17,
      "project_codes": 134,
      "projects": 134,
      "project_assignments": 220
    }
  }
}
```

### POST `/api/data-management/restore`

목적:

- 선택한 백업 세트로 개발 데이터 전체를 복원한다.
- 복원 전 현재 데이터 세트를 자동 백업한다.

요청:

```json
{
  "backup_id": "...",
  "memo": "업로드 오류로 이전 버전 복원"
}
```

응답 예시:

```json
{
  "data": {
    "target_type": "dataset",
    "status": "success",
    "pre_restore_backup_id": "...",
    "restore_id": "...",
    "operation_group_id": "...",
    "restored": {
      "personnel": 17,
      "projects": 134
    }
  }
}
```

---

## 12. 신규 DB 모델 설계

## 12.1 ImportBatch 모델

신규 테이블을 추가한다.

```python
class ImportBatch(Base, TimestampMixin):
    __tablename__ = "import_batches"

    id: Mapped[str] = uuid_pk()
    target_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    operation_group_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    backup_id: Mapped[str | None] = mapped_column(String(36), index=True)
    source_backup_id: Mapped[str | None] = mapped_column(String(36), index=True)
    backup_path: Mapped[str | None] = mapped_column(String(500))
    backup_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    original_filename: Mapped[str | None] = mapped_column(String(255))
    file_sha256: Mapped[str | None] = mapped_column(String(64), index=True)
    validation_id: Mapped[str | None] = mapped_column(String(36), index=True)
    row_count: Mapped[int | None] = mapped_column(Integer)
    table_counts: Mapped[dict | None] = mapped_column(JSON)
    created_by: Mapped[str | None] = mapped_column(String(100))
    memo: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
```

필드 정의:

| 필드 | 의미 |
| --- | --- |
| `id` | 개별 작업 이력 레코드 ID |
| `target_type` | 1차는 `dataset` 고정 |
| `action_type` | 작업 유형 |
| `status` | success/failed/running |
| `operation_group_id` | 한 번의 백업/업로드/복원 작업 묶음 ID |
| `backup_id` | 복원 가능한 백업 세트 ID |
| `source_backup_id` | 복원 작업이 사용한 원본 백업 ID |
| `backup_path` | 백업 JSON 파일 경로 |
| `backup_sha256` | 백업 파일 무결성 확인용 해시 |
| `original_filename` | 업로드 원본 파일명 |
| `file_sha256` | 업로드 엑셀 파일 지문 |
| `validation_id` | 검증 결과 식별자 |
| `row_count` | 전체 행 수 |
| `table_counts` | 테이블별 행 수 JSON |
| `created_by` | 작업자 |
| `memo` | 사용자 입력 메모 |
| `error_message` | 실패 사유 |

## 12.2 target_type 값

| 값 | 의미 |
| --- | --- |
| `dataset` | 개발/테스트용 업무 데이터 세트 전체 |

향후 필요 시 `projects`, `personnel` 등 개별 target을 추가할 수 있지만, 1차에서는 사용하지 않는다.

## 12.3 action_type 값

| 값 | 의미 | 복원 가능 여부 |
| --- | --- | --- |
| `upload_validate` | 엑셀 사전 검증 | 불가 |
| `manual_backup` | 수동 통합 백업 | 가능 |
| `upload_backup` | 업로드 전 자동 백업 | 가능 |
| `upload_replace` | 엑셀 전체 교체 완료 | 불가 |
| `restore_backup` | 복원 전 자동 백업 | 가능 |
| `restore_apply` | 백업 복원 완료 | 불가 |

## 12.4 status 값

| 값 | 의미 |
| --- | --- |
| `success` | 성공 |
| `failed` | 실패 |
| `running` | 진행중 |

---

## 13. 백업 파일 저장 방식

## 13.1 저장 위치

로컬 개발 기준 백업 파일 저장 위치:

```text
storage/import_backups/dataset/{yyyyMMdd_HHmmss}_{backup_id}.json
```

예시:

```text
storage/import_backups/dataset/20260622_154000_abc123.json
```

## 13.2 백업 파일 포맷

1차 구현은 JSON을 권장한다.

백업 JSON 예시:

```json
{
  "schema_version": 1,
  "target_type": "dataset",
  "created_at": "2026-06-22T15:40:00",
  "created_by": "관리자",
  "table_counts": {
    "personnel": 17,
    "projects": 134
  },
  "tables": {
    "personnel": [
      { "id": "...", "employee_no": "2026001", "name": "..." }
    ],
    "project_codes": [
      { "id": "...", "code": "P2026001", "name": "..." }
    ],
    "projects": [
      { "id": "...", "project_code_id": "...", "code": "P2026001", "name": "..." }
    ]
  }
}
```

## 13.3 Git 제외

실제 데이터 백업 파일과 로컬 개발 DB는 Git에 포함되면 안 된다.

`.gitignore`에 아래 항목을 추가한다.

```text
storage/import_backups/
storage/import_uploads/
apps/api/pmo_ops_p1_schema.db
*.sqlite
*.db
```

## 13.4 백업 파일 접근 및 보관 기준

백업 파일에는 사번, 이메일, 소속 등 인력 정보가 포함될 수 있으므로 다음 기준을 적용한다.

- 백업 디렉터리는 애플리케이션 서비스 계정만 읽기/쓰기가 가능하도록 운영 환경의 파일 권한을 설정한다.
- 1차 구현에서는 백업 JSON 파일을 브라우저로 직접 다운로드하는 API를 제공하지 않는다. 화면에서는 백업 메타정보와 테이블별 건수만 조회한다.
- 백업 생성·복원·상세 조회 API는 admin 권한으로 제한한다.
- 기본 보관 정책은 최근 30개 백업 세트 또는 90일 중 먼저 도래하는 기준으로 정리한다. 자동 정리는 별도 스케줄러 구현 전까지 수동 관리 대상으로 표시한다.
- 운영 환경에서는 백업 경로를 애플리케이션 소스·정적 파일 경로와 분리하고, Git 및 웹 서버 공개 경로에 포함하지 않는다.

---

## 14. 백엔드 구현 상세

## 14.1 권장 파일 구조

```text
apps/api/app/api/routes/data_management.py
apps/api/app/services/data_management_excel.py
apps/api/app/services/data_management_backups.py
apps/api/app/services/data_management_restore.py
apps/api/app/schemas/data_management.py
```

## 14.2 주요 서비스 함수 예시

```python
def build_dataset_template() -> bytes:
    ...

def parse_dataset_workbook(file: UploadFile) -> DatasetWorkbook:
    ...

def validate_dataset_workbook(workbook: DatasetWorkbook, session: Session) -> DatasetValidationResult:
    ...

def create_dataset_backup(session: Session, user: User, action_type: str, memo: str | None = None) -> ImportBatch:
    ...

def replace_dataset_from_workbook(workbook: DatasetWorkbook, session: Session, user: User, memo: str | None) -> DatasetImportResult:
    ...

def restore_dataset_backup(session: Session, backup_id: str, user: User, memo: str | None) -> DatasetRestoreResult:
    ...
```

## 14.3 엑셀 처리

- Python 패키지는 `openpyxl` 사용을 권장한다.
- `python-multipart` 의존성이 필요하다.
- `.xlsx`만 허용한다.
- `.xls`, `.csv`는 1차에서 거부한다.
- 최대 파일 크기는 20MB로 제한한다.
- 서버는 파일명 대신 서버가 생성한 안전한 경로/이름만 사용한다.
- 템플릿 생성도 `openpyxl`로 구현한다.

## 14.4 검증/반영 일관성

검증과 반영은 반드시 같은 파일이어야 한다.

권장 구현:

1. validate 요청에서 `file_sha256` 계산
2. validate 성공/실패 이력을 `upload_validate`로 저장
3. validate 응답에 `validation_id`, `file_sha256` 반환
4. replace 요청에서 파일을 다시 수신
5. replace 요청 파일의 sha256 재계산
6. 요청의 `validation_id`, `file_sha256`와 비교
7. DB에 저장된 validate 이력과 비교
8. 불일치 시 409 반환
9. 일치하더라도 서버에서 재파싱/재검증
10. 오류가 있으면 반영 거부

검증 결과 유효시간은 30분으로 한다. 30분이 지나면 동일 파일이라도 다시 검증해야 하며, 만료된 검증 이력은 전체 교체에 사용할 수 없다.

## 14.5 트랜잭션 처리

- 검증 단계에서는 DB 교체 commit을 하지 않는다.
- 백업 파일 생성은 DB 교체 전에 완료한다.
- DB 교체와 완료 이력 기록은 하나의 DB 트랜잭션 안에서 처리한다.
- DB 교체 중 오류가 발생하면 rollback한다.
- 실패 이력은 rollback 이후 별도 세션 또는 별도 트랜잭션으로 기록한다.
- 파일 백업과 DB 반영은 물리적으로 완전한 원자 트랜잭션이 아니므로, 실패 시점별 보정 규칙을 코드에 명확히 남긴다.

## 14.6 동시 실행 잠금

`JobLock`을 활용하여 동시 실행을 제한한다.

규칙:

- lock key: `data-management:dataset`
- 동시에 두 개 이상의 백업/업로드/복원 작업을 실행할 수 없다.
- lock 획득 실패 시 409 반환
- 작업 시작 시 lock 획득
- 작업 종료 또는 실패 시 lock 해제
- 비정상 종료 대비를 위해 `expires_at`을 사용한다.

---

## 15. 프론트엔드 구현 상세

## 15.1 신규 라우트/페이지

신규 라우트:

```text
apps/web/app/(protected)/admin/data-backup/page.tsx
```

신규 화면 컴포넌트:

```text
apps/web/design/pages/DataBackupRestorePage.tsx
```

`PmoShell` 좌측 메뉴의 관리 섹션에 `데이터 백업/업로드/복원` 항목을 추가한다.

기존 프로젝트/인력 페이지에는 업로드/복원 관련 버튼이나 모달을 추가하지 않는다.

## 15.2 API 래퍼 추가

`apps/web/app/lib/api.ts`에 다음 함수를 추가한다.

```ts
export async function getDataManagementSummary(): Promise<ApiEnvelope<DataManagementSummary>>
export async function downloadDatasetTemplate(): Promise<void>
export async function createDatasetBackup(memo?: string): Promise<ApiEnvelope<DatasetBackupResult>>
export async function listDatasetBackups(params?: ListParams): Promise<ApiEnvelope<ImportBatch[]>>
export async function getDatasetBackupDetail(backupId: string): Promise<ApiEnvelope<DatasetBackupDetail>>
export async function validateDatasetImport(file: File): Promise<ApiEnvelope<DatasetImportValidationResult>>
export async function replaceDatasetImport(file: File, validationId: string, fileSha256: string, memo?: string): Promise<ApiEnvelope<DatasetImportResult>>
export async function restoreDatasetBackup(backupId: string, memo?: string): Promise<ApiEnvelope<DatasetRestoreResult>>
```

## 15.3 권장 컴포넌트

```text
apps/web/design/components/DatasetImportModal.tsx
apps/web/design/components/DatasetBackupRestoreModal.tsx
apps/web/design/components/DatasetBackupHistoryTable.tsx
```

필요하면 초기 구현은 `DataBackupRestorePage.tsx` 내부에 작성한 뒤 추후 컴포넌트 분리해도 된다.

## 15.4 화면 갱신

업로드/복원 성공 후:

- `getDataManagementSummary()` 재조회
- `listDatasetBackups()` 재조회
- 토스트 메시지 표시
- 사용자가 프로젝트/인력/홈/보고 화면으로 이동하면 각 화면의 기존 API가 새 데이터를 조회하도록 한다.

기존 프로젝트/인력 화면에 직접 상태를 밀어 넣지 않는다.

---

## 16. 권한 요구사항

모든 데이터 백업/업로드/복원 기능은 admin 전용이다.

| 사용자 | 페이지 접근 | 백업 생성 | 엑셀 검증 | 전체 교체 | 백업 복원 |
| --- | --- | --- | --- | --- | --- |
| admin | 가능 | 가능 | 가능 | 가능 | 가능 |
| general_editor | 불가 또는 읽기 불가 | 불가 | 불가 | 불가 | 불가 |
| project_editor | 불가 또는 읽기 불가 | 불가 | 불가 | 불가 | 불가 |
| read_only | 불가 또는 읽기 불가 | 불가 | 불가 | 불가 | 불가 |
| head | 불가 또는 읽기 불가 | 불가 | 불가 | 불가 | 불가 |

프론트엔드:

- admin이 아니면 메뉴를 숨기거나 접근 시 권한 없음 화면을 표시한다.

백엔드:

- 모든 API에서 `CurrentUser`를 기준으로 admin 권한을 재검증한다.
- 프론트 권한 제어만 믿지 않는다.
- 본 기능은 개발 환경에서 실제 데이터로 검증한 뒤 운영 환경에도 동일한 기능 정책으로 적용한다.
- 단, 운영 적용 전에는 현재 사용자 식별 방식이 신뢰할 수 있는 인증 주체에 의해 제공되는지 확인한다. 클라이언트가 임의로 설정 가능한 개발용 헤더 또는 기본 admin 값에 의존하는 상태라면 운영에서 이 기능을 활성화하지 않는다.
- 운영 환경의 권한 판정은 인증된 사용자 정보에서 서버가 산출한 `admin` 권한만 사용한다.

---

## 17. 에러 메시지 정책

사용자에게는 수정 가능한 메시지를 제공한다.

| 상황 | 메시지 |
| --- | --- |
| 파일 없음 | 업로드할 엑셀 파일을 선택하세요. |
| 확장자 오류 | `.xlsx` 파일만 업로드할 수 있습니다. |
| 파일 크기 초과 | 업로드 가능한 파일 크기를 초과했습니다. |
| 필수 시트 없음 | 필수 시트가 없습니다: 프로젝트관리 |
| 필수 컬럼 없음 | `프로젝트관리` 시트에 `코드` 컬럼이 없습니다. |
| 필수값 없음 | `프로젝트관리` 시트 12행의 `사업명` 값이 비어 있습니다. |
| 상태값 오류 | `프로젝트관리` 시트 15행의 `상태` 값이 올바르지 않습니다: 진행 |
| 참조 오류 | `프로젝트배정` 시트 8행의 프로젝트코드가 프로젝트관리 시트에 없습니다: P2026999 |
| 역할 매칭 실패 | `인력관리` 시트 7행의 역할 값이 시스템 역할 기준값에 없습니다: DEV |
| 검증 결과 만료 | 파일이 변경되어 다시 검증해야 합니다. |
| 동시 실행 제한 | 다른 백업/업로드/복원 작업이 진행 중입니다. 잠시 후 다시 시도하세요. |
| 권한 없음 | 데이터 백업/업로드/복원은 관리자만 수행할 수 있습니다. |
| 백업 파일 없음 | 백업 파일을 찾을 수 없습니다. |
| 백업 파일 손상 | 백업 파일을 읽을 수 없거나 형식이 올바르지 않습니다. |
| 서버 오류 | 처리 중 오류가 발생했습니다. 기존 데이터는 변경되지 않았습니다. |

---

## 18. 테스트 시나리오

## 18.1 화면/권한 테스트

| No | 시나리오 | 기대 결과 |
| --- | --- | --- |
| UI-01 | admin으로 접속 | 관리 메뉴에 데이터 백업/업로드/복원 표시 |
| UI-02 | admin 외 사용자 접속 | 메뉴 숨김 또는 권한 없음 |
| UI-03 | 프로젝트 관리 화면 확인 | 엑셀 업로드/업로드 이력 버튼 없음 |
| UI-04 | 인력 관리 화면 확인 | 엑셀 업로드/업로드 이력 버튼 없음 |
| UI-05 | 데이터 관리 페이지 로드 | 현재 데이터 요약 및 백업 이력 표시 |

## 18.2 템플릿/검증 테스트

| No | 시나리오 | 기대 결과 |
| --- | --- | --- |
| V-01 | 통합 템플릿 다운로드 | `.xlsx` 다운로드 성공 |
| V-02 | 정상 통합 엑셀 검증 | valid true |
| V-03 | 필수 시트 누락 | 오류 반환, DB 변경 없음 |
| V-04 | 필수 컬럼 누락 | 오류 반환, DB 변경 없음 |
| V-05 | 프로젝트코드 중복 | 오류 반환, DB 변경 없음 |
| V-06 | 사번 중복 | 오류 반환, DB 변경 없음 |
| V-07 | 참조 프로젝트 없음 | 오류 반환, DB 변경 없음 |
| V-08 | 참조 인력 없음 | 오류 반환, DB 변경 없음 |
| V-09 | 날짜 형식 오류 | 오류 반환, DB 변경 없음 |
| V-10 | enum 값 오류 | 오류 반환, DB 변경 없음 |
| V-11 | 검증 후 파일 변경 | 전체 교체 차단, 재검증 요구 |

## 18.3 전체 교체 테스트

| No | 시나리오 | 기대 결과 |
| --- | --- | --- |
| R-01 | 정상 통합 엑셀 전체 교체 | 자동 백업 후 전체 데이터 재적재 |
| R-02 | 전체 교체 전 백업 생성 실패 | 교체 중단, 기존 데이터 유지 |
| R-03 | 전체 교체 중 insert 오류 | rollback, 기존 데이터 유지 |
| R-04 | 교체 후 요약 카드 재조회 | 신규 건수 표시 |
| R-05 | 교체 후 백업 이력 조회 | upload_backup, upload_replace 이력 표시 |
| R-06 | admin 외 전체 교체 요청 | 403 |
| R-07 | 작업 중 중복 전체 교체 요청 | 409 |

## 18.4 복원 테스트

| No | 시나리오 | 기대 결과 |
| --- | --- | --- |
| B-01 | 수동 백업 생성 | 백업 JSON 생성 및 이력 표시 |
| B-02 | 백업 상세 조회 | 테이블별 건수 표시 |
| B-03 | 정상 백업 복원 | 복원 전 자동 백업 후 선택 백업으로 복원 |
| B-04 | 복원 중 오류 | rollback, 기존 데이터 유지 |
| B-05 | 백업 파일 없음 | 복원 차단 |
| B-06 | 백업 파일 손상 | 복원 차단 |
| B-07 | admin 외 복원 요청 | 403 |
| B-08 | 작업 중 중복 복원 요청 | 409 |

## 18.5 데이터 정합성 테스트

| No | 시나리오 | 기대 결과 |
| --- | --- | --- |
| D-01 | 프로젝트와 코드 연결 확인 | 모든 Project가 ProjectCode와 연결 |
| D-02 | 배정의 프로젝트/인력 연결 확인 | 고아 ProjectAssignment 없음 |
| D-03 | 월별 MM의 인력/배정 연결 확인 | 고아 MM 없음 |
| D-04 | 스냅샷의 인력/프로젝트 연결 확인 | 고아 스냅샷 없음 |
| D-05 | 복원 후 UUID 참조 유지 | 백업 시점 관계 그대로 복원 |
| D-06 | import_batches는 복원 대상 제외 | 이력 유지 |

---

## 19. 구현 우선순위

권장 구현 순서:

1. 기존 문서 방향 정리: 프로젝트/인력 개별 버튼 요구 제거
2. `ImportBatch` 모델 및 마이그레이션 추가
3. 백업 저장 디렉터리 및 `.gitignore` 설정
4. 데이터 세트 백업 생성 서비스 구현
5. 데이터 세트 복원 서비스 구현
6. 통합 엑셀 템플릿 생성 서비스 구현
7. 통합 엑셀 파서 구현
8. 통합 검증 서비스 구현
9. `/api/data-management/summary` 구현
10. `/api/data-management/template` 구현
11. `/api/data-management/backups` GET/POST 구현
12. `/api/data-management/import/validate` 구현
13. `/api/data-management/import/replace` 구현
14. `/api/data-management/restore` 구현
15. `DataBackupRestorePage.tsx` 신규 구현
16. `PmoShell` 관리 메뉴에 `데이터 백업/업로드/복원` 추가
17. API 래퍼 추가
18. 프론트 검증/업로드/복원 UI 연결
19. 권한/잠금/오류 처리 테스트 추가
20. 실제 샘플 통합 엑셀로 검증

---

## 20. Codex 작업 지시 요약

아래 요구사항을 기준으로 구현한다.

```text
기존 프로젝트 관리(/projects/codes), 인력 관리(/people/employment) 화면에는
엑셀 업로드 또는 업로드 이력/복원 버튼을 추가하지 않는다.
두 화면은 현 구현 상태를 유지한다.
기존 엑셀 다운로드 기능은 유지한다.

신규 관리 페이지 `관리 > 데이터 백업/업로드/복원`을 구현한다.
권장 URL은 `/admin/data-backup`이다.
이 페이지는 개발/테스트용 업무 데이터 세트를 통합 단위로 백업, 엑셀 검증, 전체 교체, 복원하는 admin 전용 기능이다.

통합 데이터 세트 대상은 personnel, project_codes, projects, project_assignments,
project_logs, monthly_employment_mm, monthly_assignment_mm,
current_assignment_snapshots, weekly_load_snapshots, monthly_kpi_summaries이다.
roles, users, holidays, job_locks, import_batches는 대상에서 제외한다.

통합 엑셀 템플릿은 기존 다운로드 파일과 동일한 `프로젝트관리`, `인력관리` 시트를 필수로 제공하고,
MM 계산에 필요한 원본 배정 정보를 입력하는 `프로젝트배정` 시트를 선택으로 제공한다.
MM·스냅샷·KPI는 업로드 대상이 아니라 서버 계산·집계 대상이다.
프로젝트 로그는 자동 백업 후 삭제하며, 업로드 후에는 빈 상태에서 새 활동부터 기록한다.
업로드 시 파일 선택 즉시 DB에 반영하지 않고,
검증 → 검증 결과 표시 → 검증한 동일 파일 확인 → 전체 교체 확인 → 현재 데이터 자동 백업 → 기존 데이터 삭제 → 원본 엑셀 데이터 재적재 → MM·스냅샷·KPI 서버 계산 → 이력 저장 흐름으로 구현한다.

복원은 백업 세트 단위로 수행한다.
복원 전에도 현재 데이터 세트를 자동 백업한다.
복원은 선택한 백업 JSON의 UUID와 참조관계를 그대로 되살린다.

모든 백업/업로드/복원 API는 admin 전용으로 구현하고 백엔드에서 반드시 권한을 검증한다.
작업 중 오류가 발생하면 기존 데이터가 깨지지 않도록 트랜잭션 처리한다.
동시에 두 작업이 실행되지 않도록 JobLock을 사용한다.
백업 파일은 storage/import_backups/dataset 하위에 저장하고 Git에 포함되지 않도록 한다.
```

---

## 21. 완료 기준

다음 조건을 만족하면 완료로 본다.

1. `관리 > 데이터 백업/업로드/복원` 메뉴가 추가된다.
2. 신규 데이터 백업/업로드/복원 페이지가 표시된다.
3. 프로젝트 관리 화면에는 개별 `엑셀 업로드`, `업로드 이력/복원` 버튼이 없다.
4. 인력 관리 화면에는 개별 `엑셀 업로드`, `업로드 이력/복원` 버튼이 없다.
5. 기존 프로젝트/인력 엑셀 다운로드 기능은 유지된다.
6. admin 권한에서만 신규 페이지의 주요 기능을 사용할 수 있다.
7. 현재 데이터 요약 카드가 표시된다.
8. 기존 프로젝트/인력 다운로드와 동일한 컬럼·표기의 통합 엑셀 템플릿을 다운로드할 수 있다.
9. 통합 엑셀 검증 API가 정상 동작한다.
10. 검증 오류가 있으면 DB에 반영되지 않는다.
11. 검증한 동일 파일이 아니면 전체 교체가 차단된다.
12. 정상 통합 엑셀 업로드 시 현재 데이터가 자동 백업되고 전체 교체되며 MM·스냅샷·KPI가 서버에서 재생성된다.
13. 전체 교체 후 요약 카드와 이력 목록이 갱신된다.
14. 백업 이력 목록을 조회할 수 있다.
15. 백업 상세에서 테이블별 건수를 확인할 수 있다.
16. 선택한 백업 세트로 전체 복원할 수 있다.
17. 복원 전 현재 데이터가 자동 백업된다.
18. 복원 후 데이터 참조관계가 깨지지 않는다.
19. 동시 작업 요청 시 409가 반환된다.
20. 백업 파일이 Git에 포함되지 않는다.
21. 관련 백엔드 API 테스트가 추가된다.
22. 실제 프로젝트관리·인력관리 다운로드 파일 및 프로젝트배정 샘플로 검증이 완료된다.
