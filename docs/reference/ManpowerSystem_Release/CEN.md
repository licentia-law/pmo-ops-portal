# Manpower System (이행인력 관리 시스템)

## 프로젝트 개요

**이행인력 관리 시스템**은 엔티스 (ET) 그룹의 인력 운영 현황을 체계적으로 관리하기 위한 웹 기반 시스템입니다.

- **주요 목적**: 인력 배치, 프로젝트 현황, 가동율/가득율 분석, 주간/월별 보고
- **기술 스택**: Python (Flask), SQLite, JavaScript (ES6 Modules), TailwindCSS, Chart.js
- **데이터 저장**: SQLite (`database.db`)
- **웹 서버**: Flask (port 5000)

## 주요 기능

### 1. 대시보드
- 조회일 기준 부서별 인력 현황 요약 (총원, 제안, 이행, 지원, 대기, 과제, 휴직)
- 누적 가득율 (이행) 및 가동율 (이행 + 제안) KPI 표시
- 월별 가득 현황 및 가동 현황 차트 (Chart.js)
- 부서별/인원별 상세 필터링

### 2. 주간 현황
- 인력운영 주간현황 (전주 대비 증감, 가동/비가동 현황)
- 주간 인력 가동 예상 (요일별 스케줄링)
- 법인/부서/성명 정렬 기능

### 3. 가동대상인력 (Personnel)
- 인력 목록 조회 (월별 가동 M/M)
- 인력 등록/수정/삭제
- 부서/직급/직무별 필터링
- 휴직/퇴사/전적 상태 관리

### 4. 인력운영현황 (Activities)
- 프로젝트별 인력 배정 현황
- 프로젝트 구분 (이행, 제안, 지원, 과제, 대기)
- 진행 상태 (예정, 완료, 진행) 관리
- 월별/man-month 계산 기능

### 5. Activity 월마감
- 미확정 활동 (unconfirmed_activities) 관리
- 활동 확정 기능
- 월별 마감 처리

### 6. 대기인력현황
- 프로젝트 미배정 인력 관리

### 7. 배정인력현황
- 현재 배정된 인력 현황 조회

### 8. 사용자 관리 (Admin Only)
- 사용자 추가/수정/삭제
- 역할 관리 (admin, viewer, user)
- 부서 권한 설정 (managed_depts)
- 비밀번호 변경

## 디렉토리 구조

```
D:\Manpower System\
├── app.py                 # Flask 애플리케이션 메인 파일
├── db_utils.py            # 데이터베이스 유틸리티 함수
├── init_data.py           # 초기 데이터 입력 스크립트
├── bulk_import.py         # CSV 일괄 import 스크립트
├── update_holidays.py     # 공휴일 데이터 업데이트 스크립트
├── reset_admin_password.py # 관리자 비밀번호 초기화 스크립트
├── database.db            # SQLite 데이터베이스
├── personnel.csv          # 인력 데이터 CSV
├── activities.csv         # 활동 (프로젝트) 데이터 CSV
├── CEN.md                 # 이 문서 (프로젝트 컨텍스트 가이드)
├── static/
│   ├── js/
│   │   ├── main.js        # 메인 진입점
│   │   ├── events.js      # 이벤트 핸들러
│   │   ├── state.js       # 전역 상태 관리
│   │   ├── api.js         # API 통신 모듈
│   │   ├── utils.js       # 유틸리티 함수
│   │   └── ui.js          # UI 렌더링 함수
│   └── css/
│       └── style.css      # 커스텀 스타일 (참고: HTML 에서 CDN Tailwind 사용)
└── templates/
    ├── index.html         # 메인 HTML 템플릿
    └── style.css          # 추가 스타일
```

## 데이터베이스 스키마

### personnel (인력)
| 컬럼 | 설명 |
|------|------|
| id | 고유 식별자 |
| team | 법인 (ET, GBL, PNS 등) |
| dept | 부서 |
| role | 직무 |
| name | 성명 |
| rank | 직급 |
| employmentStatus | 재직상태 (재직, 휴직, 퇴사 등) |
| joinDate | 입사일 |
| leaveDate | 퇴사일 |
| leaveStartDate | 휴직 시작일 |
| leaveEndDate | 휴직 종료일 |
| transferDate | 전적일 |

### activities (프로젝트 활동)
| 컬럼 | 설명 |
|------|------|
| id | 고유 식별자 |
| team | 법인 |
| dept | 부서 |
| role | 직무 |
| name | 성명 |
| rank | 직급 |
| projectType | 구분 (이행, 제안, 지원, 과제, 대기) |
| projectName | 프로젝트명 |
| projectCode | 프로젝트 코드 |
| startDate | 시작일 |
| endDate | 종료일 |
| status | 상태 (예정, 진행, 완료) |
| manMonths | 월별 man-month 계산값 (클라이언트에서 계산) |

### unconfirmed_activities (미확정 활동)
- 월마감 전 임시 활동 저장용

### holidays (공휴일)
| 컬럼 | 설명 |
|------|------|
| date | 날짜 (YYYY-MM-DD) |
| name | 공휴일명 |

### users (사용자)
| 컬럼 | 설명 |
|------|------|
| username | 사용자 이름 |
| password | 해시된 비밀번호 |
| role | 역할 (admin, viewer, user) |
| managed_depts | 관리 부서 (쉼표 구분) |

## 설치 및 실행

### prerequisite
- Python 3.7 이상
- Flask
- Werkzeug

### 실행 방법

```bash
# 1. 데이터베이스 초기화 (필요시)
python init_data.py

# 2. CSV 데이터 일괄 import (필요시)
python bulk_import.py

# 3. 공휴일 데이터 업데이트 (필요시)
python update_holidays.py

# 4. 서버 시작
python app.py
```

서버가 시작되면 `http://localhost:5000` 에서 접속합니다.

### 기본 계정
- **아이디**: `admin`
- **비밀번호**: `1234`

비밀번호를 분실한 경우:
```bash
python reset_admin_password.py
```

### 초기 데이터
- `init_data.py`: 샘플 인력 5 명, 프로젝트 4 건, 3 개년치 공휴일 (2024~2026)
- `personnel.csv`: 실제 인력 데이터 (80 명 이상)
- `activities.csv`: 실제 프로젝트 데이터 (280 건 이상)

## API 엔드포인트

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/login` | 로그인 |
| POST | `/api/logout` | 로그아웃 |
| GET, POST | `/api/personnel` | 인력 목록 조회/저장 |
| GET, POST | `/api/activities` | 활동 목록 조회/저장 |
| GET, POST | `/api/unconfirmed_activities` | 미확정 활동 관리 |
| POST | `/api/confirm_activities` | 활동 확정 |
| GET, POST | `/api/holidays` | 공휴일 관리 |
| GET, POST, DELETE, PUT | `/api/users` | 사용자 관리 (Admin Only) |
| GET | `/api/get_personnel_info` | 인력 정보 조회 (이름 기준) |

## 주요 계산 로직

### Man-Month 계산 (`utils.js`의 `calculateManMonths`)
- 시작일 ~ 종료일 동안의 **근로 가능 일수** 비율로 산출
- 주말 및 공휴일 제외
- 월별 근무 가능 일수 대비 실제 근무 일수 비율

### 가동율 (Operating Rate)
```
가동율 = (이행인원 + 제안인원) / (현재인원 - 휴직인원 - 과제인원) × 100
```

### 가득율 (Filled Rate)
```
가득율 = 이행인원 / (현재인원 - 휴직인원 - 과제인원) × 100
```

### 권한 제어 (`canView`, `canEdit`)
- **admin**: 전체 조회/수정 가능
- **viewer**: 전체 조회 가능 (수정 불가)
- **user**: `managed_depts` 로 제한된 부서만 조회/수정 가능

## 개발 컨벤션

### JavaScript
- ES6 Modules (`import`/`export`) 사용
- 상태는 `appState` 객체에서 전역 관리
- UI 렌더링은 `ui.js` 에서 처리
- API 통신은 `api.js` 에서 처리

### Python
- Flask 앱 구조
- SQLite 데이터베이스
- werkzeug 의 `generate_password_hash` 로 비밀번호 해시
- `sqlite3.Row` 로 컬럼명 기반 데이터 접근

### CSS
- TailwindCSS (CDN) 사용
- 커스텀 스타일은 `style.css` 추가

## 데이터 입력 형식

### personnel.csv
```
법인,부서,직무,성명,직급,재직상태,입사일,퇴사일,휴직시작일,휴직종료일
```

### activities.csv
```
법인,부서,직무,성명,직급,구분,프로젝트명,프로젝트코드,시작일,종료일,상태
```

## 주의사항

1. **브라우저 호환성**: ES6 Modules 사용 → 현대 브라우저 필요
2. **데이터 보존**: `/api/personnel`, `/api/activities` POST 는 기존 데이터 **전체 교체**
3. **관리자 권한**: 사용자 관리 기능은 `admin` 역할만 접근 가능
4. **부서 필터링**: `ENTEC담당` 부서는 전역 관리자만 전체 조회 가능 (다른 부서는 권한 기반 필터링)

## 업데이트 이력

- 초기 프로젝트 구성 (Flask + SQLite + vanilla JS)
- ES6 Modules 구조로 리팩토링
- 권한 기반 부서 필터링 추가
- 3 개년치 공휴일 데이터 (2024~2026) 포함
- 관리자 비밀번호 리셋 스크립트 추가
