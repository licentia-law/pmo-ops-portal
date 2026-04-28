import sqlite3
import csv
import os

def bulk_import():
    # DB 파일 경로 확인
    db_path = 'database.db'
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    print("🚀 데이터 일괄 입력을 시작합니다...")

    # 1. 기존 데이터 초기화 (선택사항: 원치 않으면 주석 처리)
    # print("   - 기존 데이터를 삭제합니다 (Clean Start)...")
    # c.execute("DELETE FROM personnel")
    # c.execute("DELETE FROM activities")
    
    # ---------------------------------------------------------
    # 2. 인력 데이터 (personnel.csv) 읽어서 넣기
    # ---------------------------------------------------------
    if os.path.exists('personnel.csv'):
        print("   - personnel.csv 파일을 읽는 중...")
        with open('personnel.csv', 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            next(reader) # 첫 번째 줄(헤더) 건너뛰기
            
            personnel_list = []
            # ID는 1부터 자동 부여하거나 기존 데이터 갯수에 이어붙임
            # 여기서는 안전하게 현재 시간 기반 등으로 유니크하게 만들기보다
            # 단순히 루프 돌면서 넣습니다. (기존 데이터 삭제 안 할 경우 ID 충돌 주의)
            
            # 기존 가장 큰 ID 찾기
            c.execute("SELECT MAX(id) FROM personnel")
            max_id = c.fetchone()[0]
            current_id = (max_id if max_id else 0) + 1

            for row in reader:
                if len(row) < 7: continue # 빈 줄 패스
                # CSV 컬럼 순서: 법인, 부서, 직무, 성명, 직급, 재직상태, 입사일, 퇴사일, 휴직시작, 휴직종료
                team, dept, role, name, rank, status, joinDate, leaveDate, l_start, l_end = row
                
                personnel_list.append((
                    current_id, team, dept, role, name, rank, status, joinDate, leaveDate, l_start, l_end
                ))
                current_id += 1
            
            c.executemany('''
                INSERT INTO personnel (id, team, dept, role, name, rank, employmentStatus, joinDate, leaveDate, leaveStartDate, leaveEndDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', personnel_list)
            print(f"   ✅ 인력 데이터 {len(personnel_list)}건 입력 완료!")
    else:
        print("   ⚠️ personnel.csv 파일이 없습니다. 건너뜁니다.")

    # ---------------------------------------------------------
    # 3. 활동 데이터 (activities.csv) 읽어서 넣기
    # ---------------------------------------------------------
    if os.path.exists('activities.csv'):
        print("   - activities.csv 파일을 읽는 중...")
        with open('activities.csv', 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            next(reader) # 헤더 건너뛰기
            
            activity_list = []
            
            c.execute("SELECT MAX(id) FROM activities")
            max_id = c.fetchone()[0]
            current_id = (max_id if max_id else 0) + 1

            for row in reader:
                if len(row) < 10: continue
                # CSV 컬럼: 법인, 부서, 직무, 성명, 직급, 구분, 프로젝트명, 코드, 시작일, 종료일, 상태
                team, dept, role, name, rank, p_type, p_name, p_code, start, end, status = row
                
                activity_list.append((
                    current_id, team, dept, role, name, rank, p_type, p_name, p_code, start, end, status
                ))
                current_id += 1

            c.executemany('''
                INSERT INTO activities (id, team, dept, role, name, rank, projectType, projectName, projectCode, startDate, endDate, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', activity_list)
            print(f"   ✅ 운영 현황 데이터 {len(activity_list)}건 입력 완료!")
    else:
        print("   ⚠️ activities.csv 파일이 없습니다. 건너뜁니다.")

    conn.commit()
    conn.close()
    print("🚀 모든 작업이 끝났습니다. 웹페이지를 새로고침하세요.")

if __name__ == "__main__":
    bulk_import()