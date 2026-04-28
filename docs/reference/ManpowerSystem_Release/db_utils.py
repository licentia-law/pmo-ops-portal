import sqlite3

def get_personnel_by_name(name):
    """
    이름을 입력받아 personnel 테이블에서 해당 인력의
    소속(team), 부서(dept), 직무(role), 직급(rank) 정보를 조회합니다.
    """
    # 데이터베이스 파일 경로 (init_data.py와 동일한 경로 가정)
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row  # 컬럼명으로 접근하기 위해 설정
    c = conn.cursor()

    # 이름으로 조회 (동명이인이 있을 경우 첫 번째 검색 결과 반환)
    sql = "SELECT team, dept, role, rank FROM personnel WHERE name = ?"
    c.execute(sql, (name,))
    row = c.fetchone()

    conn.close()

    if row:
        return dict(row)
    return None