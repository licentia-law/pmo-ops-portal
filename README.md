# PMO 업무수행 관리시스템

DTL 스캐폴딩 기준 초기 구조입니다.

## 실행

```powershell
npm install
npm run dev:web
```

```powershell
cd apps/api
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -e .
uvicorn app.main:app --reload
```

## 범위

- `apps/web`: Next.js App Router 기반 정적 페이지
- `apps/api`: FastAPI, SQLAlchemy 2.0, Alembic 시작점
- `packages/shared-types`: enum/type/route/menu 공통 정의
- `packages/shared-ui`: 재사용 UI 컴포넌트
- `packages/shared-mocks`: enum code 기반 mock 데이터
