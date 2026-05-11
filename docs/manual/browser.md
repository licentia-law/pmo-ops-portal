# 브라우저 실행 매뉴얼

## claude design 원본 시안

```powershell
# 서버 실행 (터미널 1)
cd "C:\Users\mycho\Downloads\_Licentia\Coding\pmo-ops-portal\docs\design\claude design"
python -m http.server 5500

# 브라우저 접속 (홈)
http://127.0.0.1:5500/01_%ED%99%88/PMO%20Home.html

## 신규 페이지

```powershell
# API 서버 실행 (터미널 2)
cd "C:\Users\mycho\Downloads\_Licentia\Coding\pmo-ops-portal\apps\api"
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8001

# WEB 서버 실행 (터미널 3)
cd "C:\Users\mycho\Downloads\_Licentia\Coding\pmo-ops-portal\apps\web"
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8001/api"
npm run dev -- --hostname 127.0.0.1 --port 3000

# 브라우저 접속
http://127.0.0.1:3000/
```
