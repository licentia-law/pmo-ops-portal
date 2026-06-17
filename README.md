# PMO 업무수행 관리시스템

DTL 스캐폴딩 기준 초기 구조입니다.

## 실행

```powershell
npm install
npm run dev:web
```

```powershell
npm run dev:api
```

- 기본 개발 API 주소: `http://127.0.0.1:8001/api`
- 기본 개발 DB: `apps/api/pmo_ops_p1_schema.db`

최초 1회 API 환경 준비:

```powershell
cd apps/api
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -e .
```

## 범위

- `apps/web`: Next.js App Router 기반 정적 페이지
- `apps/api`: FastAPI, SQLAlchemy 2.0, Alembic 시작점
- `packages/shared-types`: enum/type/route/menu 공통 정의
- `packages/shared-ui`: 재사용 UI 컴포넌트
- `packages/shared-mocks`: enum code 기반 mock 데이터
