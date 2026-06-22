# PMO 업무수행 관리시스템

DTL 스캐폴딩 기준 초기 구조입니다.

## 실행

```powershell
# 환경변수: 최초 1회 루트 .env를 준비
Copy-Item .env.example .env
# WEB 의존성 설치: 최초 1회 또는 package.json / package-lock.json 변경 시
npm install
# WEB 서버 실행
npm run dev:web
# API 서버 실행
npm run dev:api
```

- 기본 개발 API 주소: `http://127.0.0.1:8001/api`
- 기본 개발 DB: `apps/api/pmo_ops_p1_schema.db`

## 환경변수

- 루트 `.env`를 WEB/API 공통 실행 SSOT로 사용합니다.
- `apps/api`는 `apps/api/app/core/config.py`에서 루트 `.env`를 직접 읽습니다.
- `apps/web`는 `apps/web/next.config.mjs`에서 루트 `.env`를 명시적으로 로드합니다.
- 샘플 키 집합은 루트 `.env.example`에 유지합니다.

## OS별 예외

- Windows: `npm run dev:api`가 `apps/api/.venv/Scripts/python.exe`를 우선 사용합니다.
- Mac: `npm run dev:api`가 `apps/api/.venv/bin/python`을 우선 사용합니다.
- 최초 1회 API 환경 준비가 필요하면 `apps/api`에서 `python -m venv .venv` 후 `pip install -e .`를 실행합니다.
- Mac에서 시스템 Python만 쓰는 경우에는 필요에 따라 `python3` 대신 `python`을 사용할 수 있습니다.

## 최초 1회 API 환경 준비

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
