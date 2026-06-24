# sales_pages 정리

이 폴더는 아래 3가지 주제와 직접 연결된 프론트/백엔드 스크립트를 한곳에서 보기 쉽게 복사해 둔 작업용 묶음이다.

1. 프로젝트 등록 모달의 영업대표 표시/선택 방식
2. 프로젝트 관리 테이블의 영업대표 표시 방식
3. 인력 관리 페이지의 인력 표시 방식

복사 파일 수는 총 12개다.

## 복사 파일 목록

- `apps__web__design__components__ProjectMasterEditModal.tsx`
- `apps__web__design__pages__CodePage.tsx`
- `apps__web__design__pages__PeopleEmploymentPage.tsx`
- `apps__web__app__lib__api.ts`
- `apps__api__app__api__routes__p1_screens.py`
- `apps__api__app__api__routes__personnel.py`
- `apps__api__app__api__routes__projects.py`
- `apps__api__app__domain__personnel.py`
- `apps__api__app__models__core.py`
- `apps__api__app__schemas__people.py`
- `apps__api__app__schemas__projects.py`
- `packages__shared-types__src__domain.ts`

## 1. 프로젝트 등록 모달에 영업대표 정보 출력 방식

핵심 결론:
현재 프로젝트 등록/수정 모달의 영업대표 드롭다운은 `인력 마스터 전체`를 직접 조회해서 만들지 않는다.
`프로젝트 관리 화면이 이미 받아온 프로젝트 rows`의 `salesOwner` 값을 모아서 중복 제거한 목록을 사용한다.

데이터 흐름:

- `CodePage.tsx`
  - `getP1Screen("code")`로 프로젝트 관리 화면 데이터를 조회한다.
  - 조회 결과의 `data.rows`를 `ProjectMasterEditModal`에 `rows={data.rows ?? []}`로 전달한다.
- `ProjectMasterEditModal.tsx`
  - `salesOwnersForEdit`를 `(rows ?? []).map((r) => r.salesOwner)` 기반으로 생성한다.
  - 빈 값과 `"-"`는 제거하고, 중복 제거 후 정렬한다.
  - 드롭다운 `<select>`의 옵션은 `salesOwnersForEdit.map(...)`으로 렌더링된다.
  - 즉 드롭다운 후보는 프로젝트 목록에 이미 등장한 영업대표만 나온다.
  - `ownerDeptBySalesOwner`도 같은 `rows`에서 `salesOwner -> salesDept` 매핑으로 만든다.
  - 영업대표 선택 시 영업부서를 자동 반영한다.

저장 방식:

- `ProjectMasterEditModal.tsx`
  - 저장 시 `sales_owner: editForm.salesOwner.trim() || null` 형태로 API에 전달한다.
- `projects.py`
  - 일반 프로젝트 API 직렬화 시 `payload["sales_owner"] = person_name_with_title(...)`를 적용한다.

화면에 내려오는 영업대표 값의 원천:

- `p1_screens.py`
  - 코드 화면용 row를 만들 때 `Project.sales_owner`를 사용한다.
  - `_person_name_with_title(session, project.sales_owner, fallback_to_raw=True)`로 표시용 문자열을 만든다.
  - `fallback_to_raw=True`이므로 인력 테이블에서 같은 이름을 못 찾아도 원본 문자열을 유지한다.

의미:

- 이 드롭다운은 인력 관리 페이지의 인력 목록과 자동 동기화되는 구조가 아니다.
- 프로젝트 데이터에 아직 한 번도 등장하지 않은 영업 인력은 이 드롭다운 후보에 자동 포함되지 않는다.

## 2. 프로젝트 관리 테이블에 영업대표 정보 출력 방식

핵심 결론:
프로젝트 관리 테이블도 인력 마스터를 직접 조회하지 않는다.
백엔드 `p1_screens.py`가 만들어 준 `row.salesOwner`를 그대로 출력한다.

데이터 흐름:

- `CodePage.tsx`
  - `getP1Screen("code")` 결과를 `data.rows`로 보관한다.
  - 테이블 영업대표 컬럼은 `r.salesOwner`를 그대로 렌더링한다.
  - 필터의 영업대표 선택지도 `data.rows`의 `salesOwner` 값 기반으로 중복 제거해 만든다.

백엔드 생성 방식:

- `p1_screens.py`
  - 코드 화면 row/header/detail 생성 시 공통적으로 `Project.sales_owner`를 기반으로 `salesOwner` 필드를 만든다.
  - 표시 문자열 생성 시 `_person_name_with_title(..., fallback_to_raw=True)`를 사용한다.
  - 이름만 저장된 경우, 인력 마스터의 최신 active 인력과 매칭되면 `이름 + 직위` 형태로 보정한다.
  - 매칭 실패 시에도 `fallback_to_raw=True` 때문에 원래 문자열을 유지한다.

관련 차이점:

- `projects.py`의 일반 CRUD API는 `app.domain.personnel.person_name_with_title()`를 사용한다.
- `p1_screens.py`는 화면 전용 helper `_person_name_with_title()`를 따로 가지고 있고, 여기서 `fallback_to_raw=True`를 쓴다.
- 그래서 프로젝트 관리 화면은 영업대표가 `"-"`로 죽는 경우를 줄이도록 별도 처리되어 있다.

## 3. 인력 관리 페이지에 인력 정보 출력 방식

핵심 결론:
인력 관리 페이지는 프로젝트 화면과 다르게 `인력 마스터(personnel)`를 직접 조회해서 표시한다.
즉 이 페이지가 인력 정보의 기준 화면이다.

데이터 흐름:

- `PeopleEmploymentPage.tsx`
  - `listPersonnel(...)`를 호출해 인력 목록을 가져온다.
  - 응답을 `allRows`에 저장한 뒤 필터/정렬/페이지네이션을 프론트에서 적용한다.
  - 팀, 그룹, 직위 선택지도 모두 `allRows`에서 파생한다.
  - 테이블에는 `row.name`, `row.team_name`, `row.position_name`, `row.role_name`, `row.employment_status` 등을 직접 출력한다.

백엔드 조회 방식:

- `api.ts`
  - `listPersonnel()`은 `/personnel` API를 호출한다.
- `personnel.py`
  - `list_personnel()`이 `Personnel` 테이블을 기준으로 조회한다.
  - `Role`을 outer join 하고 `joinedload(Personnel.role)`를 사용한다.
  - 검색/필터 조건은 이름, 사번, 이메일, 그룹, 팀, 직위, 역할, 재직상태, 사용여부 등을 기준으로 적용된다.
  - 응답은 `serialize_personnel()`로 직렬화한다.
  - role relation이 있으면 role code/name/job group을 응답에 포함한다.

모델 기준:

- `core.py`
  - `Personnel` 모델은 `name`, `group_name`, `team_name`, `position_name`, `role_id`, `role_name`, `employment_status`, `is_active` 등을 가진다.
- `api.ts`
  - 프론트의 `PersonnelRecord` 타입이 이 응답 구조를 사용한다.

## 4. 세 주제 사이의 관계

중요한 구조적 차이:

- 프로젝트 등록 모달 영업대표
  - 프로젝트 화면 응답(`data.rows[].salesOwner`) 재사용
- 프로젝트 관리 테이블 영업대표
  - 프로젝트 화면 응답(`data.rows[].salesOwner`) 직접 출력
- 인력 관리 페이지 인력 정보
  - 인력 마스터 API(`/personnel`) 직접 조회

따라서 현재 구조에서는 아래가 자동으로 보장되지 않는다.

- 인력 관리 페이지에 있는 모든 인력이 프로젝트 영업대표 드롭다운에 나온다.
- 인력 테이블의 변경이 프로젝트 영업대표 표시에 즉시 반영된다.

현재 구조상 프로젝트 쪽 영업대표는 `프로젝트 데이터 중심`, 인력 관리 페이지는 `인력 마스터 중심`으로 움직인다.

## 5. ChatGPT에 전달할 때 핵심만 요약하면

- 프로젝트 등록 모달의 영업대표 드롭다운은 인력 마스터 전체 조회가 아니라, 프로젝트 관리 화면 rows의 `salesOwner` 값 모음으로 생성된다.
- 프로젝트 관리 테이블의 영업대표 컬럼도 백엔드 화면 응답의 `salesOwner`를 그대로 쓴다.
- 인력 관리 페이지는 `/personnel` API로 `personnel` 테이블을 직접 조회해서 표시한다.
- 따라서 현재 구조는 `프로젝트 영업대표 목록`과 `인력 마스터 목록`이 같은 데이터 소스가 아니다.
