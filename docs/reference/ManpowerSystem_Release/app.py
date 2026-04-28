import sqlite3
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import os
from db_utils import get_personnel_by_name

app = Flask(__name__)
app.secret_key = 'secret_key_for_session'
DB_FILE = 'database.db'

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS personnel (
            id INTEGER, team TEXT, dept TEXT, role TEXT, name TEXT, rank TEXT,
            employmentStatus TEXT, joinDate TEXT, leaveDate TEXT,
            leaveStartDate TEXT, leaveEndDate TEXT, transferDate TEXT
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER, team TEXT, dept TEXT, role TEXT, name TEXT, rank TEXT,
            projectType TEXT, projectName TEXT, projectCode TEXT,
            startDate TEXT, endDate TEXT, status TEXT
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS unconfirmed_activities (
            id INTEGER, team TEXT, dept TEXT, role TEXT, name TEXT, rank TEXT,
            projectType TEXT, projectName TEXT, projectCode TEXT,
            startDate TEXT, endDate TEXT
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS holidays (
            date TEXT PRIMARY KEY, name TEXT
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY, password TEXT, role TEXT
        )
    ''')
    
    # 초기 관리자 계정 생성 (없을 경우)
    if not c.execute("SELECT * FROM users WHERE username='admin'").fetchone():
        c.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ('admin', generate_password_hash('1234'), 'admin'))
    
    # [마이그레이션] 기존 personnel 테이블에 transferDate 컬럼이 없으면 추가
    try:
        c.execute("ALTER TABLE personnel ADD COLUMN transferDate TEXT")
    except sqlite3.OperationalError:
        pass # 이미 컬럼이 존재하면 무시
    
    # [마이그레이션] users 테이블에 managed_depts 컬럼 추가
    try:
        c.execute("ALTER TABLE users ADD COLUMN managed_depts TEXT")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()

@app.route('/', methods=['GET', 'POST'])
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    if not request.is_json:
        return "요청 형식이 올바르지 않습니다. (JSON 필요)", 400

    params = request.json
    username = params.get('username')
    password = params.get('password')

    if not username or not password:
        return "아이디와 비밀번호를 모두 입력해주세요.", 400
    
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    if user:
        # [수정] sqlite3.Row를 딕셔너리로 변환하여 안전하게 접근
        user_dict = dict(user)
        if user_dict.get('password') and check_password_hash(user_dict['password'], password):
            session['user'] = username
            session['role'] = user_dict.get('role', 'user')
            managed_depts = user_dict.get('managed_depts') or ''
            return jsonify({"result": "ok", "role": session['role'], "managedDepts": managed_depts})
        else:
            # 비밀번호가 틀린 경우
            return "비밀번호가 올바르지 않습니다.", 401
    else:
        # 사용자가 존재하지 않는 경우
        return f"'{username}' 사용자를 찾을 수 없습니다.", 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"result": "ok"})

@app.route('/api/personnel', methods=['GET', 'POST'])
def personnel():
    conn = get_db_connection()
    if request.method == 'GET':
        rows = conn.execute('SELECT * FROM personnel').fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])
    else:
        data = request.json
        conn.execute('DELETE FROM personnel')
        for item in data:
            conn.execute('''
                INSERT INTO personnel (id, team, dept, role, name, rank, employmentStatus, joinDate, leaveDate, leaveStartDate, leaveEndDate, transferDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (item.get('id'), item.get('team'), item.get('dept'), item.get('role'), item.get('name'), 
                  item.get('rank'), item.get('employmentStatus'), item.get('joinDate'), item.get('leaveDate'),
                  item.get('leaveStartDate'), item.get('leaveEndDate'), item.get('transferDate')))
        conn.commit()
        conn.close()
        return jsonify({"result": "ok"})

@app.route('/api/activities', methods=['GET', 'POST'])
def activities():
    conn = get_db_connection()
    if request.method == 'GET':
        rows = conn.execute('SELECT * FROM activities').fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])
    else:
        data = request.json
        conn.execute('DELETE FROM activities')
        for item in data:
            conn.execute('''
                INSERT INTO activities (id, team, dept, role, name, rank, projectType, projectName, projectCode, startDate, endDate, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (item.get('id'), item.get('team'), item.get('dept'), item.get('role'), item.get('name'), 
                  item.get('rank'), item.get('projectType'), item.get('projectName'), item.get('projectCode'), 
                  item.get('startDate'), item.get('endDate'), item.get('status')))
        conn.commit()
        conn.close()
        return jsonify({"result": "ok"})

@app.route('/api/unconfirmed_activities', methods=['GET', 'POST'])
def unconfirmed_activities():
    conn = get_db_connection()
    if request.method == 'GET':
        rows = conn.execute('SELECT * FROM unconfirmed_activities').fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])
    else: # POST
        data = request.json
        conn.execute('DELETE FROM unconfirmed_activities')
        for item in data:
            conn.execute('''
                INSERT INTO unconfirmed_activities (id, team, dept, role, name, rank, projectType, projectName, projectCode, startDate, endDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (item.get('id'), item.get('team'), item.get('dept'), item.get('role'), item.get('name'), 
                  item.get('rank'), item.get('projectType'), item.get('projectName'), item.get('projectCode'), 
                  item.get('startDate'), item.get('endDate')))
        conn.commit()
        conn.close()
        return jsonify({"result": "ok"})

@app.route('/api/confirm_activities', methods=['POST'])
def confirm_activities():
    ids_to_confirm = request.json.get('ids', [])
    if not ids_to_confirm:
        return jsonify({"result": "fail", "message": "No IDs provided"}), 400

    conn = get_db_connection()
    try:
        with conn:
            placeholders = ','.join('?' for _ in ids_to_confirm)
            to_confirm_rows = conn.execute(f'SELECT * FROM unconfirmed_activities WHERE id IN ({placeholders})', ids_to_confirm).fetchall()

            for row in to_confirm_rows:
                item = dict(row)
                conn.execute('''
                    INSERT INTO activities (id, team, dept, role, name, rank, projectType, projectName, projectCode, startDate, endDate, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (item.get('id'), item.get('team'), item.get('dept'), item.get('role'), item.get('name'), 
                      item.get('rank'), item.get('projectType'), item.get('projectName'), item.get('projectCode'), 
                      item.get('startDate'), item.get('endDate'), '예정'))
            conn.execute(f'DELETE FROM unconfirmed_activities WHERE id IN ({placeholders})', ids_to_confirm)
    except sqlite3.Error as e:
        return jsonify({"result": "fail", "message": str(e)}), 500
    finally:
        conn.close()
    return jsonify({"result": "ok"})

@app.route('/api/holidays', methods=['GET', 'POST'])
def holidays():
    conn = get_db_connection()
    if request.method == 'GET':
        rows = conn.execute('SELECT * FROM holidays').fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])
    else:
        data = request.json
        conn.execute('DELETE FROM holidays')
        for item in data:
            conn.execute('INSERT INTO holidays (date, name) VALUES (?, ?)', (item.get('date'), item.get('name')))
        conn.commit()
        conn.close()
        return jsonify({"result": "ok"})

@app.route('/api/users', methods=['GET', 'POST', 'DELETE', 'PUT'])
def users():
    conn = get_db_connection()
    if request.method == 'GET':
        if session.get('role') != 'admin':
            conn.close()
            return "권한이 없습니다.", 403
        # 비밀번호 해시는 제외하고 반환, managed_depts 추가
        rows = conn.execute('SELECT username, role, managed_depts FROM users').fetchall()
        conn.close()
        result = []
        for row in rows:
            d = dict(row)
            d['managedDepts'] = d.pop('managed_depts', '')
            result.append(d)
        return jsonify(result)
    elif request.method == 'POST':
        if session.get('role') != 'admin':
            conn.close()
            return "권한이 없습니다.", 403
        data = request.json
        hashed_pw = generate_password_hash(data.get('password'))
        
        # managedDepts 처리 (리스트 -> 문자열)
        managed_depts = data.get('managedDepts')
        if isinstance(managed_depts, list):
            managed_depts = ",".join(managed_depts)
            
        try:
            conn.execute('INSERT INTO users (username, password, role, managed_depts) VALUES (?, ?, ?, ?)', 
                         (data.get('username'), hashed_pw, data.get('role', 'user'), managed_depts))
            conn.commit()
        except sqlite3.IntegrityError:
            return "이미 존재하는 사용자입니다.", 400
        finally:
            conn.close()
        return jsonify({"result": "ok"})
    elif request.method == 'DELETE':
        if session.get('role') != 'admin':
            conn.close()
            return "권한이 없습니다.", 403
        username = request.args.get('username')
        if username == 'admin':
            return "관리자 계정은 삭제할 수 없습니다.", 400
        conn.execute('DELETE FROM users WHERE username = ?', (username,))
        conn.commit()
        conn.close()
        return jsonify({"result": "ok"})
    elif request.method == 'PUT':
        data = request.json
        target_username = data.get('username')
        
        current_user = session.get('user')
        current_role = session.get('role')
        
        if not current_user:
            return "로그인이 필요합니다.", 401
        
        # 1. 비밀번호 변경 요청인 경우
        if 'password' in data:
            new_password = data.get('password')
            # 본인이거나 관리자만 변경 가능
            if current_user != target_username and current_role != 'admin':
                return "권한이 없습니다.", 403
            hashed_pw = generate_password_hash(new_password)
            conn.execute('UPDATE users SET password = ? WHERE username = ?', (hashed_pw, target_username))
            
        # 2. 권한/부서 변경 요청인 경우 (관리자만 가능)
        elif 'role' in data or 'managedDepts' in data:
            if current_role != 'admin':
                return "권한이 없습니다.", 403
            role = data.get('role')
            managed_depts = data.get('managedDepts')
            if isinstance(managed_depts, list):
                managed_depts = ",".join(managed_depts)
            conn.execute('UPDATE users SET role = ?, managed_depts = ? WHERE username = ?', (role, managed_depts, target_username))
            
        conn.commit()
        conn.close()
        return jsonify({"result": "ok"})

@app.route('/api/get_personnel_info', methods=['GET'])
def get_personnel_info():
    name = request.args.get('name')
    if not name:
        return jsonify({"result": "fail", "message": "이름이 입력되지 않았습니다."}), 400
    
    data = get_personnel_by_name(name)
    if data:
        return jsonify({"result": "success", "data": data})
    else:
        return jsonify({"result": "fail", "message": "해당 이름의 인력을 찾을 수 없습니다."})

if __name__ == '__main__':
    init_db()
    print("서버가 시작되었습니다. http://localhost:5000 에 접속하세요.")
    app.run(host='0.0.0.0', port=5000, debug=True)