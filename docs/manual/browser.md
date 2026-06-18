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

### Windows
```powershell
# API 서버 실행 (터미널 2, repo root 기준)
cd "C:\Users\mycho\Downloads\_Licentia\Coding\pmo-ops-portal"
npm run dev:api

# WEB 서버 실행 (터미널 3, repo root에서 실행)
npm install
npm run dev -w @pmo/web -- --hostname 127.0.0.1 --port 3000

# 브라우저 접속 (홈)
http://127.0.0.1:3000/

# 화면 목록
# docs/manual/screens.md 참고 (대시보드는 홈에 통합됨)

# 기본 개발 API 주소: http://127.0.0.1:8001/api
# 기본 개발 DB: apps/api/pmo_ops_p1_schema.db
```

### Mac
```bash
# API 서버 실행 (터미널 2, macOS / repo root 기준)
# 최초 1회만 Python 가상환경 및 의존성 설치
cd /Users/law/Downloads/Dev/pmo-ops-portal/apps/api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip setuptools wheel
python -m pip install -e .

# 이후 실행 (repo root 기준)
cd /Users/law/Downloads/Dev/pmo-ops-portal
source apps/api/.venv/bin/activate
npm run dev:api
```

## (선택) Seed 데이터 재적재

```powershell
cd "C:\Users\mycho\Downloads\_Licentia\Coding\pmo-ops-portal\apps\api"
.\.venv\Scripts\python -m app.tools.import_seed_bundle --seed-dir ../../docs/schema/chatGPT --truncate
```
