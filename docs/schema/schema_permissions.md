# 사용자 기능 권한 스키마

기준: 2026-10-12, P3.2 0.5·16절·22.1의 3번, 공통 DTL 6.2, PRD 4.4.

## 1. 모델과 SSOT

- 기본 권한 레벨은 기존 `users.permission`을 유지한다.
- `users.is_developer`: Boolean NOT NULL DEFAULT false. 일반 admin과 구분하며 개발자만 모든 기능 권한을 갖는다.
- 사용자별 부여 권한은 `user_capabilities`에 저장한다. 기존 admin·본부장·팀장에게 자동 부여하지 않는다.

| 컬럼 | 제약/의미 |
|---|---|
| user_id | `users.id` FK, ON DELETE CASCADE, 복합 PK |
| capability | 6종 enum CHECK, NOT NULL, 복합 PK |
| granted_by_user_id | 부여한 `users.id` FK, ON DELETE SET NULL |
| created_at / updated_at | 기존 TimestampMixin 규칙 |

복합 PK `(user_id, capability)`로 중복 부여를 방지한다. 반복 PATCH는 유지되는 행의 시각/부여자를 바꾸지 않고 추가·삭제 차이만 반영한다.

## 2. 코드값과 판정

`Capability`와 shared `CAPABILITIES`의 값:

- project_excel_manage
- personnel_excel_manage
- assignment_manage
- backup_restore
- data_reset
- permissions_manage

`app/domain/capabilities.py`가 DB 사용자와 부여 행을 조회한다. 요청 객체의 permission/is_developer 값으로 기능 권한을 만들지 않는다. 실제 개발자는 6종을 유효 권한으로 반환하며 일반 사용자는 부여된 행만 반환한다.

- 관리자 임명은 개발자만 가능하다. 임명 시 기본 레벨 admin과 permissions_manage를 부여하며 나머지 기능은 자동으로 주지 않는다.
- 일반 권한 관리자는 DB 기본 레벨 admin과 permissions_manage를 모두 만족해야 한다.
- 일반 관리자는 4개 업무 권한을 부여·회수할 수 있다. 관리자 임명과 permissions_manage/data_reset의 부여·회수는 개발자에게 한정한다. 이는 개발자가 관리자 임명과 고위험 권한 위임을 통제한다는 정책을 적용한 경계다.
- 개발자 계정은 권한 PATCH/관리자 임명 API의 변경 대상에서 제외한다.
- data_reset은 admin 또는 개발자에게만 지정하며 backup_restore가 함께 필요하다. 공통 인가 함수도 두 권한과 기본 관리자 조건을 검증한다. 2026-10-13 초기화 preview/실행 API와 기본 false인 `DATA_RESET_ENABLED`를 구현했다. [감사 모델](schema_data_reset.md)과 [9번 검증 기록](../harness/data_reset_rollout_261013.md)을 따른다. 실제 개발 DB 초기화와 신규 감사 migration 적용은 미실행이다.

## 3. API와 사용자 식별

| API | 조건 |
|---|---|
| GET /api/users/me/capabilities | 등록된 사용자 본인 |
| GET /api/users/{id}/capabilities | 본인 또는 기능 권한 관리자 |
| PATCH /api/users/{id}/capabilities | 기능 권한 관리자; 개발자 전용 권한 변경 별도 제한 |
| POST /api/users/{id}/appoint-admin | 개발자 |

PATCH body는 `{"capabilities": ["backup_restore"]}`이며 전체 원하는 목록을 전달한다. 미지원 코드 또는 is_developer/permission 같은 추가 필드는 422다. 사용자 정보 응답에는 password_hash가 포함되지 않는다.

- 기능 권한 API의 개발용 식별자는 `x-user-email`이다. DB의 정확한 이메일로 사용자를 찾는다. 미등록/누락은 401, 권한 부족은 403이다.
- x-user-permission, x-user-is-developer, x-user-capabilities는 기능 권한 확대에 사용하지 않는다.
- 아직 로그인/JWT는 없다. 개발 환경에서는 이메일 헤더 자체를 바꿔 다른 사용자로 가장할 수 있으므로 운영 인증으로 취급하지 않는다.
- `APP_ENVIRONMENT=production`에서는 개발용 식별 어댑터를 403으로 차단한다. 신뢰할 수 있는 로그인/세션 연동이 마련될 때 기존 `get_capability_user`를 해당 어댑터로 교체해야 한다.
- 기존 일반 CRUD의 개발용 CurrentUser/기본 권한 판정은 이번에 일괄 변경하지 않았다.

## 4. 기존 기능 연결과 보존

- 기존 백업 overview·상세·생성·삭제·복원 API는 backup_restore를 요구한다.
- 제거 전 통합 엑셀 검증/반영은 backup_restore + project_excel_manage + personnel_excel_manage를 모두 요구한다. 서비스의 반영/복원 함수도 재검증한다.
- 미인가 요청은 원본 삭제, 백업 파일 생성/삭제, 잠금, 파생 계산 이전에 차단한다.
- 사용자와 user_capabilities는 통합 업무 JSON 백업·복원·전체 초기화 대상에 포함하지 않는다. 과거 업무 백업 복원으로 현재 권한이 되돌아가지 않는다.
- 사용자까지 초기화하는 개발용 seed truncate는 user_capabilities를 먼저 비운다. 같은 seed UUID가 재사용돼도 과거 권한을 되살리지 않는다. 일반 seed 적재에는 개발자 자동 지정이 없다.

## 5. Migration과 개발자 최초 지정

- Alembic `261012_0021` (이전 `261012_0020`)은 모든 기존 사용자의 is_developer를 false로 두고 빈 권한 테이블을 만든다. 계정/업무 UUID나 기존 권한 레벨은 바꾸지 않는다.
- 최초 개발자 지정은 로컬 명시적 bootstrap 도구를 사용한다. 기존 사용자 ID·성명이 정확히 맞아야 하고 이메일 중복·다른 개발자 지정이 있으면 차단한다. 일반 API에서 is_developer를 지정할 수 없다.

```powershell
# 백업과 사본 검증을 완료한 뒤 apps/api에서 실행하는 최초 지정 예시
.\.venv\Scripts\python.exe -m app.tools.bootstrap_developer --user-id <확인된UUID> --name <성명> --email <확정이메일>
```

실제 지정 결과와 백업·검증은 [기능 권한 구현 기록](../harness/capability_rollout_261012.md)을 참고한다. downgrade는 권한 테이블/개발자 컬럼을 제거하므로 적용 후 부여 이력을 보존해야 하면 전체 DB 백업을 사용한다.
