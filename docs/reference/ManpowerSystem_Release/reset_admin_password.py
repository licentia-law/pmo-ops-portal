import sqlite3
from werkzeug.security import generate_password_hash

def reset_admin_password():
    db_path = 'database.db'
    new_password = '1234'
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    print("🔑 관리자(admin) 계정의 비밀번호를 초기화합니다...")

    # admin 사용자가 있는지 확인
    c.execute("SELECT * FROM users WHERE username='admin'")
    user = c.fetchone()

    hashed_password = generate_password_hash(new_password)

    if user:
        # 기존 admin 계정의 비밀번호를 업데이트
        c.execute("UPDATE users SET password = ? WHERE username = 'admin'", (hashed_password,))
        print(f"   - 기존 'admin' 계정의 비밀번호를 '{new_password}' (으)로 업데이트했습니다.")
    else:
        # admin 계정이 없으면 새로 생성
        c.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ('admin', hashed_password, 'admin'))
        print(f"   - 'admin' 계정이 존재하지 않아 새로 생성하고, 비밀번호를 '{new_password}' (으)로 설정했습니다.")

    conn.commit()
    conn.close()
    print("\n✅ 완료되었습니다. 이제 'admin' 계정과 새 비밀번호로 로그인을 시도해 보세요.")

if __name__ == "__main__":
    reset_admin_password()