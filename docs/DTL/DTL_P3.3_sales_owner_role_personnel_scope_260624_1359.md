# DTL: 영업대표 역할 기반 후보 관리 및 프로젝트 영업대표 연동

- 문서 목적: Codex 구현 지시용 DTL
- 대상 시스템: PMO 업무수행 관리시스템 `pmo-ops-portal`
- 작성일시: 2026-06-24 13:59 KST
- 파일명: `DTL_sales_owner_role_personnel_scope_260624_1359.md`

---

## 0. 배경 및 결정사항

현재 프로젝트 등록/수정 모달의 `영업대표` 드롭다운은 인력 마스터를 직접 조회하지 않고, 프로젝트 관리 화면이 이미 받아온 프로젝트 rows의 `salesOwner` 값을 모아 후보 목록을 만든다. 따라서 프로젝트에 한 번도 등장하지 않은 영업대표 인력은 드롭다운에 표시되지 않는다.

이번 작업의 목적은 `Personnel`의 역할 기준값을 활용하여 영업대표 후보를 명확히 정의하고, 프로젝트 등록/수정 모달에서 이 후보 목록을 안정적으로 로드하는 것이다.

최종 결정사항은 다음과 같다.

```text
역할 옵션: PM / PL / 영업대표

PMO본부 인력:
- 재직상태, MM, 배정, KPI 관리 대상
- 기본 인력 관리 화면에 표시

영업대표 후보:
- 프로젝트 영업대표 지정용 참조 인력
- 역할이 "영업대표"인 인력
- 재직/MM 관리 대상이 아님
- 프로젝트 등록/수정 모달의 영업대표 드롭다운 후보로 사용

인력 관리 페이지 보기 범위:
- [PMO본부 인력]
- [영업대표 후보]
- [전체 인력]은 만들지 않음

프로젝트 관리 테이블:
- 기존처럼 Project.sales_owner 기반 표시 유지
```

---

## P0. 기준값·데이터 정책 정리

### 목표

`영업대표`를 본부명이나 기존 프로젝트 등장 여부가 아니라, 인력의 `역할` 값으로 판정하도록 기준을 확정한다. PMO본부 인력과 영업대표 후보의 관리 목적이 다르다는 점을 코드와 UI에 반영할 수 있도록 최소 정책을 세운다.

### 작업내용

1. `Role`의 시스템 기준값은 아래 코드와 이름으로 고정한다.
   - `PM` / `PM`
   - `PL` / `PL`
   - `SALES_OWNER` / `영업대표`
   - 영업대표 판정의 SSOT는 역할명이 아닌 `Role.code = "SALES_OWNER"`이다. 역할명은 화면 표시용으로만 사용한다.
   - `SALES_OWNER` 역할에 연결된 인력이 존재하면 역할 코드 변경 또는 비활성화는 차단한다. 역할명 변경은 허용하되, 후보 판정에는 영향을 주지 않는다.
2. 영업대표 후보 판정 기준을 다음으로 정의한다.
   - `Personnel.is_active = true`
   - `Role.is_active = true`
   - 연결된 `Role.code = "SALES_OWNER"`
   - `employment_status`는 후보 판정 기준으로 사용하지 않는다. 영업대표의 재직/MM 상태는 PMO 인력 관리 대상이 아니며, API 저장값은 아래 기본값 규칙만 따른다.
3. PMO본부 인력 목록 판정 기준을 다음으로 정의한다.
   - 기본 기준: `Personnel.group_name = "PMO본부"` AND `Role.code != "SALES_OWNER"` (role 미연결 기존 데이터는 PMO본부 인력으로 유지)
   - 역할은 PM/PL을 표시·분류하는 보조 정보로 사용한다.
4. 영업대표 후보는 재직/MM 관리 대상이 아니므로, 인력 등록/수정 시 역할이 `SALES_OWNER`인 경우 아래 값은 필수로 강제하지 않는다.
   - `employee_no`
   - `email`
   - `mm_start_date`
   - `mm_end_date`
   - `yearly_mm`
5. 역할이 `SALES_OWNER`인 인력 등록/수정 시 필수값은 아래로 한정한다.
   - 필수: `name`, `group_name`, `team_name`, `position_name`, `role_id`
   - `group_name`은 `PMO본부`를 허용하지 않는다. 영업부서 자동 반영에 사용하는 실제 영업 조직명을 입력한다.
   - `role_id`는 `Role.code = "SALES_OWNER"` 역할이어야 한다.
6. 백엔드 `PersonnelCreate` 스키마상 `employment_status`가 필수이므로, 영업대표 후보 등록/수정 시 서버에는 항상 `active`를 저장한다. 단, 영업대표 후보 화면에서는 재직상태를 주요 관리 항목으로 보이지 않게 하거나 `-` 처리한다.
7. `Project.sales_owner`는 현재처럼 문자열 필드를 유지한다. 이번 작업에서는 `sales_owner_personnel_id` 같은 FK 컬럼을 추가하지 않는다.
   - 따라서 활성 영업대표 후보의 `name`은 전체 활성 인력 내에서 중복될 수 없다. 등록/수정 API가 이를 검증한다.
   - 저장값은 후보의 순수 `name`이며, 동일 이름 문제를 해결하는 FK 전환은 장기 TODO로 남긴다.
8. 역할 기준값은 이미 생성된 개발 DB에도 반영해야 하므로 seed만으로 처리하지 않는다. idempotent Alembic migration에서 `PM`, `PL`, `SALES_OWNER` 역할을 보정하고, 기존 `Personnel.role_id`/`role_name` 매핑을 보존한다.

### 산출물

- 역할 기준값 `PM`, `PL`, `영업대표` 정리
- 영업대표 후보 판정 기준 정리
- PMO본부 인력과 영업대표 후보의 관리 범위 분리 정책 반영
- 마이그레이션 또는 seed/초기 데이터 보정 코드

### DoD

- 개발 DB에 `PM`, `PL`, `영업대표` 역할 기준값이 존재한다.
- `영업대표` 역할을 가진 인력을 등록할 수 있다.
- 영업대표 후보 인력은 MM 시작일/종료일/연간 재직 MM이 비어 있어도 등록 가능하다.
- 기존 PMO본부 인력의 PM/PL 역할 표시가 깨지지 않는다.

### 의도 전달용 코드 스니펫

```python
# app/domain/people.py 또는 별도 상수 모듈
SALES_OWNER_ROLE_NAME = "영업대표"
PMO_GROUP_NAME = "PMO본부"

PMO_ROLE_NAMES = {"PM", "PL"}
SYSTEM_ROLE_NAMES = {"PM", "PL", SALES_OWNER_ROLE_NAME}
```

```python
# seed 또는 migration 의도 예시
DEFAULT_ROLES = [
    {"code": "PM", "name": "PM", "job_group": "PMO", "sort_order": 10},
    {"code": "PL", "name": "PL", "job_group": "PMO", "sort_order": 20},
    {"code": "SALES_OWNER", "name": "영업대표", "job_group": "영업", "sort_order": 30},
]
```

### 백업/업로드 및 MM 집계 범위

1. 영업대표 후보는 화면에서만 MM을 숨기는 것이 아니라, 월별 재직 MM 생성·재계산·KPI·PMO 인력 집계 대상에서 제외한다.
   - PMO 재직/MM 집계 대상: `group_name = "PMO본부"` AND `Role.code != "SALES_OWNER"` (role 미연결 기존 데이터 포함)
   - 영업대표 후보는 `MonthlyEmploymentMM` 생성 및 PMO MM 합계에 포함하지 않는다.
2. 백업/업로드 엑셀은 화면의 `-` 표시값을 원본 데이터로 사용하지 않는다.
   - 영업대표 행도 `employment_status = active`, `is_active`의 실제 저장값을 내보내고 다시 읽는다.
   - 영업대표 행의 `employee_no`, `email`, `mm_start_date`, `mm_end_date`, `yearly_mm`은 빈 값 허용이다.
   - 영업대표 행의 `name`, `group_name`, `team_name`, `position_name`, `role_name`은 필수 검증한다.
   - 업로드 검증과 인력 등록/수정 API의 역할별 필수 규칙은 같은 공통 함수로 관리한다.

---

## P1. 백엔드 영업대표 후보 조회 API 추가

### 목표

프로젝트 등록/수정 모달이 기존 프로젝트 rows에서 영업대표 후보를 추출하지 않고, `Personnel`의 역할 기준으로 영업대표 후보를 직접 조회하게 한다.

### 작업내용

1. `apps/api/app/api/routes/personnel.py`에 영업대표 범위 조회를 추가한다.
2. 기준 API는 `GET /api/personnel?scope=sales_owner`로 한다.
   - 기존 인력 목록의 검색·페이지네이션·사용여부 필터와 같은 흐름을 사용한다.
   - 프론트가 역할 목록에서 이름을 찾아 `role_id`를 조합하지 않는다.
3. 프로젝트 모달의 단순 후보 조회가 필요하면 `GET /api/personnel/sales-owner-candidates`를 추가할 수 있다. 단, 이 API도 동일한 백엔드 predicate/serializer를 재사용하며 별도 판정 규칙을 만들지 않는다.
4. API 조건은 다음과 같다.
   - `Personnel.is_active == true`
   - `Role.is_active == true`
   - `Role.code == "SALES_OWNER"`
5. 응답은 드롭다운 표시와 영업부서 자동 입력에 필요한 값을 포함한다.
   - `id`
   - `name`
   - `display_name`
   - `group_name`
   - `team_name`
   - `position_name`
   - `role_id`
   - `role_name`
6. 정렬은 `group_name`, `team_name`, `name` 순서를 권장한다. 모달에 이메일은 필요하지 않으므로 후보 전용 응답에서는 반환하지 않는다.
7. 검색어가 필요한 경우 1차에서는 생략 가능하다. 이후 후보가 많아지면 `q`를 추가한다.

### 산출물

- `GET /api/personnel/sales-owner-candidates` API
- 응답 스키마 또는 재사용 가능한 `PersonnelRead` 기반 payload
- 백엔드 단위 테스트

### DoD

- `영업대표` 역할을 가진 active 인력만 응답된다.
- PM/PL 역할 인력은 응답되지 않는다.
- `is_active = false` 인력은 응답되지 않는다.
- 응답에 `display_name`, `group_name`, `team_name`, `position_name`이 포함된다.
- 기존 `/api/personnel` 목록 조회 동작이 깨지지 않는다.

### 의도 전달용 코드 스니펫

```python
# apps/api/app/api/routes/personnel.py

@router.get("/sales-owner-candidates")
def list_sales_owner_candidates(session: DbSession) -> dict[str, object]:
    statement = (
        select(Personnel)
        .join(Role, Personnel.role_id == Role.id)
        .options(joinedload(Personnel.role))
        .where(
            Personnel.is_active.is_(True),
            Role.is_active.is_(True),
        Role.code == "SALES_OWNER",
        )
        .order_by(Personnel.group_name, Personnel.team_name, Personnel.name)
    )
    rows = session.scalars(statement).all()
    return envelope([
        {
            "id": person.id,
            "name": person.name,
            "display_name": f"{person.name} {person.position_name or ''}".strip(),
            "group_name": person.group_name,
            "team_name": person.team_name,
            "position_name": person.position_name,
            "role_id": person.role_id,
            "role_name": person.role.name if person.role else person.role_name,
        }
        for person in rows
    ])
```

```python
# 테스트 의도

def test_sales_owner_candidates_only_returns_sales_owner_role(client):
    # PM, PL, 영업대표 role과 각각의 personnel 생성
    # GET /api/personnel/sales-owner-candidates 호출
    # 영업대표 role + is_active true 인력만 응답되는지 검증
    ...
```

---

## P2. 프론트 API 래퍼 및 타입 추가

### 목표

프로젝트 등록/수정 모달에서 사용할 영업대표 후보 목록을 프론트에서 안정적으로 조회할 수 있게 한다.

### 작업내용

1. `apps/web/app/lib/api.ts`에 API 래퍼를 추가한다.
2. shared type 또는 로컬 타입에 `SalesOwnerCandidate` 타입을 추가한다.
3. 인력 목록은 기존 `PersonnelRecord`를 재사용하고, 모달 후보는 필요한 필드만 갖는 별도 타입을 사용한다.
4. 기존 `listPersonnel()` 함수는 그대로 유지한다.

### 산출물

- `listSalesOwnerCandidates()` 함수
- `SalesOwnerCandidate` 타입
- API 호출 에러 처리 기본 흐름

### DoD

- 프로젝트 등록/수정 모달에서 `listSalesOwnerCandidates()`를 호출할 수 있다.
- 기존 `listPersonnel()`, `listRoles()` 타입이 깨지지 않는다.
- 빌드 시 TypeScript 타입 오류가 없다.

### 의도 전달용 코드 스니펫

```ts
// apps/web/app/lib/api.ts

export interface SalesOwnerCandidate {
  id: string;
  name: string;
  display_name: string;
  group_name?: string | null;
  team_name?: string | null;
  position_name?: string | null;
  role_id?: string | null;
  role_name?: string | null;
}

export async function listSalesOwnerCandidates(): Promise<ApiEnvelope<SalesOwnerCandidate[]>> {
  return apiGet<ApiEnvelope<SalesOwnerCandidate[]>>("/personnel/sales-owner-candidates");
}
```

---

## P3. 프로젝트 등록/수정 모달 영업대표 드롭다운 변경

### 목표

`ProjectMasterEditModal`의 영업대표 드롭다운 후보를 기존 프로젝트 rows 기반에서 `역할 = 영업대표` 인력 후보 API 기반으로 변경한다.

### 작업내용

1. `apps/web/design/components/ProjectMasterEditModal.tsx`에서 기존 rows 기반 영업대표 후보 생성 로직을 제거한다.
   - 기존 방식: `(rows ?? []).map((r) => r.salesOwner)` 기반
   - 변경 방식: `listSalesOwnerCandidates()` API 결과 기반
2. 모달 open 시 `scope=sales_owner`와 같은 공통 기준을 사용하는 영업대표 후보 목록을 조회한다.
3. 드롭다운 option label은 사용자가 식별하기 쉽게 구성한다.
   - 예: `조승현 책임 · 전략사업1본부 / 공공영업팀`
4. 저장값은 기존 DB 구조를 유지하기 위해 `Project.sales_owner` 문자열에 저장한다.
   - 권장 저장값: `candidate.name`
   - 표시용 직위는 저장하지 않고, 백엔드 표시 helper에서 보정한다.
5. 영업대표 선택 시 `sales_department`를 자동 반영한다.
   - 1차 권장값: `candidate.group_name`
   - 필요 시 team 표시를 화면 label에만 사용한다.
6. 기존 프로젝트 수정 시 저장된 `salesOwner`가 후보 목록에 없더라도 화면이 깨지지 않게 한다.
   - 후보 목록에 없으면 현재 저장값을 임시 option으로 유지한다.
   - 단, 신규 선택 후보는 API 결과 기반으로 제한한다.
7. 영업대표 후보 API 로딩 실패 시 사용자에게 안내 메시지를 보여주고 수동 입력 fallback은 1차에서 허용하지 않는다. 로딩 중에는 select를 비활성화한다.
8. 후보의 `name`은 P0의 중복 금지 규칙으로 식별 가능해야 한다. 프론트는 표시 라벨이나 부서명으로 식별·저장하지 않는다.

### 산출물

- `ProjectMasterEditModal.tsx` 영업대표 후보 로딩 로직 변경
- 영업대표 선택 시 영업부서 자동 입력 동작
- 기존 프로젝트 수정 시 미등록 영업대표 표시 fallback

### DoD

- 프로젝트 등록 모달의 영업대표 드롭다운에 `역할 = 영업대표` 인력만 표시된다.
- 기존 프로젝트 rows에 등장하지 않은 신규 영업대표 후보도 드롭다운에 표시된다.
- 영업대표 선택 시 영업부서가 자동 입력된다.
- 저장 시 기존처럼 `sales_owner`, `sales_department` 문자열 필드로 전달된다.
- 기존 프로젝트 수정 시 저장된 영업대표가 후보에 없어도 값이 사라지지 않는다.
- 기존 제안PM/발표PM/수행PM 로직은 영향받지 않는다.

### 의도 전달용 코드 스니펫

```tsx
// ProjectMasterEditModal.tsx 의도 예시

const [salesOwnerCandidates, setSalesOwnerCandidates] = useState<SalesOwnerCandidate[]>([]);
const [salesOwnerLoading, setSalesOwnerLoading] = useState(false);

useEffect(() => {
  if (!open) return;
  let cancelled = false;
  setSalesOwnerLoading(true);
  listSalesOwnerCandidates()
    .then((res) => {
      if (!cancelled) setSalesOwnerCandidates(res.data ?? []);
    })
    .catch(() => {
      if (!cancelled) setSalesOwnerCandidates([]);
    })
    .finally(() => {
      if (!cancelled) setSalesOwnerLoading(false);
    });
  return () => {
    cancelled = true;
  };
}, [open]);
```

```tsx
// 선택 시 영업부서 자동 반영 의도 예시

function handleSalesOwnerChange(nextName: string) {
  const selected = salesOwnerCandidates.find((item) => item.name === nextName);
  setEditForm((prev) => ({
    ...prev,
    salesOwner: nextName,
    salesDept: selected?.group_name || prev.salesDept,
  }));
}
```

```tsx
// option label 의도 예시

<option key={candidate.id} value={candidate.name}>
  {candidate.display_name}
  {candidate.group_name ? ` · ${candidate.group_name}` : ""}
  {candidate.team_name ? ` / ${candidate.team_name}` : ""}
</option>
```

---

## P4. 프로젝트 관리 테이블 영업대표 표시 유지 및 안정화

### 목표

프로젝트 관리 테이블은 현재처럼 `Project.sales_owner` 기반 표시를 유지하되, 영업대표 후보 API 도입으로 기존 표시 흐름이 깨지지 않게 한다.

### 작업내용

1. `apps/api/app/api/routes/p1_screens.py`의 코드 화면 row 생성 로직은 현재 구조를 유지한다.
   - `Project.sales_owner` 기반
   - `_person_name_with_title(..., fallback_to_raw=True)` 유지
2. `apps/api/app/api/routes/projects.py`의 프로젝트 CRUD 직렬화도 기존 문자열 표시 방식을 유지한다.
3. 프로젝트 관리 테이블의 영업대표 컬럼은 기존처럼 `r.salesOwner`를 출력한다.
4. 영업대표 필터는 프로젝트 rows에 실제 등장한 `salesOwner` 값 기준으로 유지한다.
   - 필터는 “등록된 프로젝트 조회” 용도이므로 전체 후보를 보여줄 필요가 없다.
5. 장기적으로 `sales_owner_personnel_id` FK 도입 가능성은 주석 또는 TODO로만 남기고, 이번 작업 범위에는 포함하지 않는다.

### 산출물

- 프로젝트 관리 테이블 기존 표시 방식 유지 확인
- 영업대표 후보 API 도입 후 회귀 없음
- 필요 시 TODO 주석 추가

### DoD

- 프로젝트 등록 후 프로젝트 관리 테이블에 선택한 영업대표가 정상 표시된다.
- 영업대표가 인력 테이블과 매칭되면 이름+직위 형태로 표시 보정된다.
- 매칭 실패 시에도 `fallback_to_raw=True`로 원본 문자열이 유지된다.
- 프로젝트 관리 테이블의 영업대표 필터가 기존처럼 동작한다.

### 의도 전달용 코드 스니펫

```python
# p1_screens.py 현재 의도 유지

"salesOwner": _person_name_with_title(
    session,
    project.sales_owner,
    fallback_to_raw=True,
)
```

```text
이번 작업에서는 Project.sales_owner 문자열 저장 방식을 유지한다.
영업대표 후보 선택 UI만 Personnel.role = "영업대표" 기준으로 변경한다.
```

---

## P5. 인력 관리 페이지 보기 범위 추가

### 목표

인력 관리 페이지에서 PMO본부 인력과 영업대표 후보를 섞어 보여주지 않고, 두 보기 범위를 명확히 분리한다. `[전체 인력]` 보기 범위는 만들지 않는다.

### 작업내용

1. `apps/web/design/pages/PeopleEmploymentPage.tsx`에 보기 범위 state를 추가한다.
   - `pmo`: PMO본부 인력
   - `sales_owner`: 영업대표 후보
2. 기본값은 `pmo`로 한다.
3. 상단 필터 영역 또는 페이지 제목 부근에 segment 버튼을 추가한다.
   - `[PMO본부 인력]`
   - `[영업대표 후보]`
4. `PMO본부 인력` 모드에서는 PMO 범위로 조회한다.
   - `group_name = "PMO본부"` 기준 조회 및 `SALES_OWNER` 역할 제외
   - 기존 재직상태/MM/사용여부/팀/검색 필터 유지
   - 기존 KPI 카드 유지
5. `영업대표 후보` 모드에서는 `role = "영업대표"` 기준으로 조회한다.
   - `listPersonnel({ scope: "sales_owner", ... })`를 사용한다.
   - 프론트에서 역할명으로 role_id를 찾거나, 화면별로 다른 영업대표 판정 조건을 만들지 않는다.
6. `영업대표 후보` 모드에서는 재직/MM 관리 대상이 아닌 필드는 `-`로 표시한다.
   - `employment_status`: `-` 또는 단순 `사용` 중심 표시
   - `mm_start_date`: `-`
   - `mm_end_date`: `-`
   - `yearly_mm`: `-`
7. `영업대표 후보` 모드에서는 상단 요약 카드를 단순화한다.
   - 권장 카드: `전체 후보`, `사용`, `미사용`
   - 기존 재직/휴직/전배/퇴직/MM 카드는 이 모드에서 숨기거나 `-` 처리한다.
8. `영업대표 후보` 모드에서 신규 등록을 누르면 기본 role을 `영업대표`로 세팅한다.
9. `PMO본부 인력` 모드에서 신규 등록을 누르면 기존과 동일하게 PM/PL 역할을 선택할 수 있게 한다.
10. 보기 범위를 전환하면 페이지 번호, 상태 요약 선택값 및 모드에 맞지 않는 팀 필터를 초기화한다. 검색어와 사용여부 필터는 유지할 수 있다.
11. PMO 화면의 MM/KPI는 P0의 서버 집계 대상과 같은 predicate를 사용한다. 화면에서만 영업대표를 숨기는 구현은 허용하지 않는다.

### 산출물

- 인력 관리 페이지 보기 범위 segment
- PMO본부 인력 기본 조회 유지
- 영업대표 후보 조회 화면
- 영업대표 후보 모드의 `-` 표시 정책
- 등록/수정 모달 역할별 validation 보정

### DoD

- 인력 관리 페이지 기본 진입 시 PMO본부 인력만 표시된다.
- `[영업대표 후보]` 클릭 시 역할이 `영업대표`인 인력만 표시된다.
- `[전체 인력]` 옵션은 존재하지 않는다.
- 영업대표 후보 모드에서 MM 관련 값은 `-`로 표시된다.
- PMO본부 인력의 재직/MM 카드 및 테이블 표시가 기존과 동일하게 유지된다.
- 영업대표 후보 인력이 PMO본부 인력의 MM 합계나 재직상태 KPI에 섞이지 않는다.

### 의도 전달용 코드 스니펫

```tsx
// PeopleEmploymentPage.tsx 의도 예시

type PeopleViewMode = "pmo" | "sales_owner";

const [viewMode, setViewMode] = useState<PeopleViewMode>("pmo");
```

```tsx
// 보기 범위 UI 의도 예시

<div className="inline-flex rounded-lg border bg-white p-1">
  <button
    type="button"
    className={viewMode === "pmo" ? "active" : ""}
    onClick={() => setViewMode("pmo")}
  >
    PMO본부 인력
  </button>
  <button
    type="button"
    className={viewMode === "sales_owner" ? "active" : ""}
    onClick={() => setViewMode("sales_owner")}
  >
    영업대표 후보
  </button>
</div>
```

```tsx
// 조회 조건 의도 예시

const params = viewMode === "sales_owner"
  ? { scope: "sales_owner", is_active: activeFilter }
  : { group_name: "PMO본부", is_active: activeFilter };

const response = await listPersonnel(params);
```

```tsx
// 영업대표 후보 모드 표시 의도 예시

const renderYearlyMm = (row: PersonnelRecord) => {
  if (viewMode === "sales_owner") return "-";
  return row.yearly_mm ?? "-";
};
```

---

## P6. 인력 등록/수정 모달 역할별 validation 보정

### 목표

역할이 `영업대표`인 인력은 프로젝트 입력용 참조 인력이므로 PMO본부 인력과 같은 재직/MM 필수값 검증을 적용하지 않도록 한다.

### 작업내용

1. 인력 등록/수정 모달에서 역할 select 옵션에 `PM`, `PL`, `영업대표`가 표시되도록 한다.
2. role이 `SALES_OWNER`인 경우 다음 필드를 필수 검증하지 않는다.
   - `employee_no`
   - `email`
   - `employment_status`
   - `mm_start_date`
   - `mm_end_date`
   - `yearly_mm`
3. role이 `SALES_OWNER`인 경우 아래 필드는 필수 검증한다.
   - `name`
   - `group_name` (단, `PMO본부` 불가)
   - `team_name`
   - `position_name`
   - `role_id`
4. 백엔드 스키마상 `employment_status`가 필수이므로 API payload에는 `active`를 기본값으로 전달한다.
5. role이 `SALES_OWNER`인 경우 저장 전 payload를 다음처럼 정규화한다.
   - `employment_status = "active"`
   - `mm_start_date = null`
   - `mm_end_date = null`
   - `yearly_mm = null`
6. 이 역할별 validation과 payload 정규화는 프론트만이 아니라 백엔드 create/update·엑셀 업로드 검증에도 적용한다. 클라이언트 우회 요청으로 PMO본부 영업대표 또는 MM 값이 저장되지 않도록 한다.
7. role이 `PM` 또는 `PL`인 경우 기존 validation을 유지한다.
8. `영업대표 후보` 보기 모드에서 신규 등록 시 role 기본값을 `영업대표`로 설정한다.
9. `PMO본부 인력` 보기 모드에서 신규 등록 시 role 기본값은 기존 정책을 따른다.

### 산출물

- 역할별 validation 분기
- 영업대표 후보 등록 payload 정규화
- 기존 PM/PL 인력 등록 validation 유지

### DoD

- 영업대표 후보 등록 시 MM 시작일 없이 저장 가능하다.
- 영업대표 후보 등록 시 서버에는 유효한 `employment_status`가 전달되어 422가 발생하지 않는다.
- PM/PL 인력 등록 시 기존 필수값 검증은 유지된다.
- 영업대표 후보 수정 시 MM 필드가 불필요하게 요구되지 않는다.

### 의도 전달용 코드 스니펫

```tsx
// 역할 판정 의도 예시

const selectedRole = roles.find((role) => role.id === form.role_id);
const isSalesOwnerRole = selectedRole?.code === "SALES_OWNER";
```

```tsx
// validation 의도 예시

if (!form.name.trim()) errors.name = "성명을 입력하세요.";
if (!form.group_name.trim()) errors.group_name = "본부를 입력하세요.";
if (!form.role_id) errors.role_id = "역할을 선택하세요.";

if (isSalesOwnerRole) {
  if (form.group_name.trim() === "PMO본부") errors.group_name = "영업대표의 본부는 PMO본부로 지정할 수 없습니다.";
  if (!form.team_name.trim()) errors.team_name = "팀을 입력하세요.";
  if (!form.position_name.trim()) errors.position_name = "직위를 입력하세요.";
} else {
  if (!form.employee_no.trim()) errors.employee_no = "사번을 입력하세요.";
  if (!form.email.trim()) errors.email = "이메일을 입력하세요.";
  if (!form.employment_status) errors.employment_status = "재직상태를 선택하세요.";
  if (!form.mm_start_date) errors.mm_start_date = "MM 시작일을 입력하세요.";
}
```

```tsx
// payload 정규화 의도 예시

const payload = {
  ...form,
  employment_status: isSalesOwnerRole ? "active" : form.employment_status,
  mm_start_date: isSalesOwnerRole ? null : form.mm_start_date,
  mm_end_date: isSalesOwnerRole ? null : form.mm_end_date,
  yearly_mm: isSalesOwnerRole ? null : form.yearly_mm,
};
```

---

## P7. 테스트 및 회귀 검증

### 목표

역할 기반 영업대표 후보 도입이 기존 프로젝트/인력 기능을 깨지 않도록 백엔드·프론트 단위에서 검증한다. 테스트는 반드시 가상환경에서 진행한다.

### 작업내용

1. 백엔드 테스트는 Python 가상환경에서 실행한다.
2. 프론트 테스트/빌드는 Node 의존성 설치 상태에서 실행한다.
3. 최소 테스트 범위는 다음과 같다.
   - 영업대표 후보 API
   - `SALES_OWNER` 역할 코드 변경/비활성화 보호
   - 활성 인력 이름 중복 영업대표 등록 방지
   - 프로젝트 등록/수정 모달 후보 로딩
   - 인력 관리 보기 범위 전환
   - 역할별 validation
   - 영업대표 백업 업로드의 빈 사번/이메일/MM 허용 및 필수값 검증
   - 영업대표의 월별 재직 MM/KPI 집계 제외
   - 프로젝트 관리 테이블 영업대표 표시 회귀
4. 기존 API 테스트가 있는 경우 해당 테스트에 케이스를 추가한다.
5. 테스트 데이터는 PM, PL, `SALES_OWNER` 역할을 모두 포함해야 하며, PMO본부 인력·영업대표·비활성 영업대표를 각각 포함해야 한다.

### 산출물

- 백엔드 테스트 케이스
- 프론트 빌드 또는 타입체크 결과
- 필요한 경우 컴포넌트 테스트 또는 수동 검증 체크 결과

### DoD

- 가상환경에서 백엔드 테스트가 통과한다.
- TypeScript 타입체크 또는 프론트 빌드가 통과한다.
- PMO본부 인력 화면의 기존 기능이 유지된다.
- 영업대표 후보 화면에 영업대표 role 인력만 표시된다.
- 프로젝트 등록/수정 모달에서 영업대표 후보 목록이 정상 표시된다.
- 프로젝트 관리 테이블의 영업대표 컬럼이 기존처럼 정상 표시된다.

### 의도 전달용 코드 스니펫

```powershell
# Windows PowerShell 기준: 백엔드 가상환경 테스트
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
pip install -r requirements.txt
pytest
```

```bash
# macOS/Linux 기준: 백엔드 가상환경 테스트
cd apps/api
python -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
pip install -r requirements.txt
pytest
```

```bash
# 프론트 타입체크/빌드 예시: 프로젝트 스크립트명에 맞게 조정
cd apps/web
npm install
npm run typecheck
npm run build
```

---

## P8. 완료 기준 요약

### 목표

이번 작업이 완료되었는지 Codex가 자체 점검할 수 있는 최종 기준을 제공한다.

### 작업내용

아래 항목을 모두 만족해야 한다.

1. 역할 기준값에 `PM`, `PL`, `SALES_OWNER(영업대표)`가 존재하고 영업대표 판정은 `Role.code = "SALES_OWNER"`만 사용한다.
2. 영업대표 후보 API가 추가되어 있다.
3. 프로젝트 등록/수정 모달의 영업대표 드롭다운은 프로젝트 rows가 아니라 `영업대표` 역할 인력 목록을 사용한다.
4. 영업대표 선택 시 영업부서가 자동 반영된다.
5. 프로젝트 저장은 기존처럼 `Project.sales_owner`, `Project.sales_department` 문자열 필드를 사용한다.
6. 프로젝트 관리 테이블은 현재처럼 `Project.sales_owner` 기반 표시를 유지한다.
7. 인력 관리 페이지에는 `[PMO본부 인력]`, `[영업대표 후보]` 보기 범위만 존재한다.
8. `[전체 인력]` 보기 범위는 만들지 않는다.
9. PMO본부 인력 보기에서는 기존 재직/MM 관리 UI가 유지된다.
10. 영업대표 후보 보기에서는 MM 관련 값이 `-`로 표시된다.
11. 영업대표 후보 인력은 PMO 재직/MM/KPI 계산에 섞이지 않는다.
12. 영업대표 등록 시 사번·이메일·MM 시작일 없이 저장 가능하고, 성명·PMO본부 외 본부·팀·직위·영업대표 역할은 필수로 검증한다.
13. 백업/업로드에서도 영업대표의 빈 사번·이메일·MM 값과 필수값 규칙이 동일하게 적용된다.
14. 가상환경에서 백엔드 테스트를 실행하고 통과한다.
15. 프론트 타입체크 또는 빌드를 통과한다.

### 산출물

- 수정된 백엔드 API/도메인/테스트
- 수정된 프론트 API 래퍼/모달/인력 관리 페이지
- 테스트 결과

### DoD

- Codex 작업 완료 후 위 13개 완료 기준을 모두 만족한다.

### 의도 전달용 코드 스니펫

```text
최종 사용 흐름:

1. 관리자가 인력 관리 > 영업대표 후보 보기로 이동한다.
2. 역할이 영업대표인 인력을 등록한다.
3. 프로젝트 관리 > 신규 프로젝트 등록을 연다.
4. 영업대표 드롭다운에 방금 등록한 인력이 표시된다.
5. 영업대표를 선택하면 영업부서가 자동 입력된다.
6. 프로젝트를 저장한다.
7. 프로젝트 관리 테이블에 해당 영업대표가 정상 표시된다.
```

---

# Execution Checklist

변경 범위가 백엔드 API, 프로젝트 모달, 인력 관리 페이지, 역할별 validation에 걸쳐 있어 작은 작업은 아니다. 아래 순서로 나누어 구현하면 리스크를 줄일 수 있다.

## Step 1. 역할 기준값 확인

- [ ] 개발 DB에 `PM`, `PL`, `SALES_OWNER(영업대표)` Role이 존재하는지 확인
- [ ] 없으면 idempotent migration으로 추가·보정 (seed만으로 처리하지 않음)
- [ ] 기존 인력의 role_id/role_name 매핑이 깨지지 않는지 확인
- [ ] `SALES_OWNER` 역할 코드 변경·비활성화 보호 확인

## Step 2. 백엔드 후보 API 구현

- [ ] `GET /api/personnel?scope=sales_owner` 추가
- [ ] 필요 시 공통 predicate를 재사용하는 `GET /api/personnel/sales-owner-candidates` 추가
- [ ] `Role.code == "SALES_OWNER"` + `Role.is_active == true` + `Personnel.is_active == true` 조건 적용
- [ ] display_name, group_name, team_name, position_name 포함
- [ ] 백엔드 테스트 추가
- [ ] 가상환경에서 `pytest` 실행

## Step 3. 프론트 API 래퍼 추가

- [ ] `listSalesOwnerCandidates()` 추가
- [ ] `SalesOwnerCandidate` 타입 추가
- [ ] 기존 API 타입 영향 확인

## Step 4. 프로젝트 등록/수정 모달 변경

- [ ] rows 기반 salesOwner 후보 로직 제거
- [ ] 모달 open 시 영업대표 후보 API 호출
- [ ] 드롭다운 option 표시 형식 적용
- [ ] 선택 시 salesOwner/name 저장, salesDept 자동 입력
- [ ] 기존 저장값이 후보에 없을 때 임시 option 유지
- [ ] 신규/수정 저장 수동 검증

## Step 5. 인력 관리 페이지 보기 범위 추가

- [ ] viewMode state 추가: `pmo`, `sales_owner`
- [ ] segment UI 추가: `[PMO본부 인력] [영업대표 후보]`
- [ ] 기본값 `pmo`
- [ ] PMO 모드 조회 조건 적용: `group_name = PMO본부` 및 영업대표 제외
- [ ] 영업대표 후보 모드 조회 조건 적용: `scope = sales_owner`
- [ ] `[전체 인력]` 버튼을 만들지 않음

## Step 6. 역할별 validation 조정

- [ ] role이 `SALES_OWNER`이면 사번·이메일·MM 필수값 검증 제외
- [ ] role이 `SALES_OWNER`이면 성명·PMO본부 외 본부·팀·직위·역할을 필수 검증
- [ ] role이 `SALES_OWNER`이면 payload에서 MM 필드 null 처리
- [ ] role이 `SALES_OWNER`이면 employment_status는 `active`로 서버에 전달
- [ ] 동일 규칙을 백엔드 API 및 백업 업로드 검증에 적용
- [ ] PM/PL 기존 validation 유지

## Step 7. 회귀 테스트

- [ ] PMO본부 인력 목록 기존 표시 확인
- [ ] 영업대표 후보 목록 표시 확인
- [ ] 영업대표 후보 등록/수정 확인
- [ ] 프로젝트 등록 모달 영업대표 후보 표시 확인
- [ ] 프로젝트 저장 후 프로젝트 관리 테이블 표시 확인
- [ ] 영업대표 후보가 MM/KPI 집계에 섞이지 않는지 확인
- [ ] 영업대표의 빈 사번·이메일·MM 값 백업/복원 확인
- [ ] 프론트 타입체크/빌드 실행
