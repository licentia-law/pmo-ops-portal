# 브라우저 실행 매뉴얼

## claude design 원본 시안

```powershell
# 서버 실행 (터미널 1, repo root 기준)
cd "C:\Users\mycho\Downloads\_Licentia\Coding\pmo-ops-portal\docs\design\claude design"
python -m http.server 5500

# 브라우저 접속 (홈)
http://127.0.0.1:5500/01_%ED%99%88/PMO%20Home.html
```

## 신규 페이지

### 공통 실행
```bash
# API 서버 실행 (repo root 기준)
npm run dev:api

# WEB 서버 실행
# 최초 1회 또는 의존성 변경 시에만 실행
npm install
# 평소 실행
npm run dev:web

# 브라우저 접속 (홈)
http://127.0.0.1:3000/

# 화면 목록
# docs/manual/screens.md 참고 (대시보드는 홈에 통합됨)

# 기본 개발 API 주소: http://127.0.0.1:8001/api
# 기본 개발 DB: apps/api/pmo_ops_p1_schema.db
```

### OS별 예외

- Windows: `npm run dev:api`가 `apps/api/.venv/Scripts/python.exe`를 우선 사용합니다.
- Mac: `npm run dev:api`가 `apps/api/.venv/bin/python`을 우선 사용합니다.
- 최초 1회 API 환경 준비가 필요하면 `apps/api`에서 `python -m venv .venv` 후 `pip install -e .`를 실행합니다.
- Mac에서 시스템 Python만 쓰는 경우에는 필요에 따라 `python3` 대신 `python`을 사용할 수 있습니다.

## (선택) Seed 데이터 재적재

```powershell
cd "C:\Users\mycho\Downloads\_Licentia\Coding\pmo-ops-portal\apps\api"
.\.venv\Scripts\python -m app.tools.import_seed_bundle --seed-dir ../../docs/schema/chatGPT --truncate
```
