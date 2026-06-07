import os
import json
import uuid
import hashlib
import urllib.request
import urllib.error
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from groq import Groq
from database import init_db, get_db_connection
from meal_generator import generate_weekly_meal_plan

app = Flask(__name__, static_folder='static')
app.secret_key = os.environ.get('SECRET_KEY', 'nutriprint-secret-2026-yit')
CORS(app, supports_credentials=True)

with app.app_context():
    try:
        init_db()
        print("Database ready.")
    except Exception as e:
        print(f"DB init error: {e}")

groq_client = Groq(api_key=os.environ.get('GROQ_API_KEY'))

# ── Helpers ───────────────────────────────────────────────
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def db_fetchone(conn, query, params=()):
    """Execute query and fetch one row as dict."""
    cur = conn.cursor()
    cur.execute(query, params)
    row = cur.fetchone()
    if row is None:
        return None
    cols = [desc[0] for desc in cur.description]
    return dict(zip(cols, row))

def db_fetchall(conn, query, params=()):
    """Execute query and fetch all rows as list of dicts."""
    cur = conn.cursor()
    cur.execute(query, params)
    rows = cur.fetchall()
    if not rows:
        return []
    cols = [desc[0] for desc in cur.description]
    return [dict(zip(cols, row)) for row in rows]

def db_execute(conn, query, params=()):
    """Execute insert/update/delete query."""
    cur = conn.cursor()
    cur.execute(query, params)

def get_current_teacher():
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return None
    conn = get_db_connection()
    teacher = db_fetchone(conn, 'SELECT * FROM teachers WHERE id = %s', (teacher_id,))
    conn.close()
    return teacher

# ── Static files ──────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/app.js')
def serve_appjs():
    return send_from_directory('.', 'app.js')

@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory('.', 'manifest.json')

@app.route('/sw.js')
def serve_sw():
    return send_from_directory('.', 'sw.js')

# ── Init DB route (run once to seed) ─────────────────────
@app.route('/init-db')
def init_database():
    try:
        init_db()
        return "Database seeded successfully! All foods loaded."
    except Exception as e:
        return f"Error: {str(e)}", 500

# ═══════════════════════════════════════════════════════════
# PHASE 1 — AUTH
# ═══════════════════════════════════════════════════════════
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json or {}
    name        = data.get('name', '').strip()
    school_name = data.get('school_name', '').strip()
    district    = data.get('district', '').strip()
    phone       = data.get('phone', '').strip()
    password    = data.get('password', '').strip()

    if not all([name, school_name, district, phone, password]):
        return jsonify({'error': 'All fields are required.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    conn = get_db_connection()
    try:
        existing = db_fetchone(conn, 'SELECT id FROM teachers WHERE phone = %s', (phone,))
        if existing:
            return jsonify({'error': 'Phone number already registered. Please login.'}), 400

        pw_hash = hash_password(password)
        db_execute(conn,
            'INSERT INTO teachers (name, school_name, district, phone, password_hash) VALUES (%s, %s, %s, %s, %s)',
            (name, school_name, district, phone, pw_hash)
        )
        conn.commit()
        teacher = db_fetchone(conn, 'SELECT * FROM teachers WHERE phone = %s', (phone,))
    finally:
        conn.close()

    session['teacher_id'] = teacher['id']
    return jsonify({
        'success': True,
        'teacher': {
            'id': teacher['id'], 'name': teacher['name'],
            'school_name': teacher['school_name'],
            'district': teacher['district'], 'phone': teacher['phone'],
        }
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    data     = request.json or {}
    phone    = data.get('phone', '').strip()
    password = data.get('password', '').strip()

    if not phone or not password:
        return jsonify({'error': 'Phone and password are required.'}), 400

    conn = get_db_connection()
    try:
        teacher = db_fetchone(conn, 'SELECT * FROM teachers WHERE phone = %s', (phone,))
    finally:
        conn.close()

    if not teacher or teacher['password_hash'] != hash_password(password):
        return jsonify({'error': 'Invalid phone number or password.'}), 401

    session['teacher_id'] = teacher['id']
    return jsonify({
        'success': True,
        'teacher': {
            'id': teacher['id'], 'name': teacher['name'],
            'school_name': teacher['school_name'],
            'district': teacher['district'], 'phone': teacher['phone'],
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/auth/me', methods=['GET'])
def get_me():
    teacher = get_current_teacher()
    if not teacher:
        return jsonify({'logged_in': False}), 200
    return jsonify({
        'logged_in': True,
        'teacher': {
            'id': teacher['id'], 'name': teacher['name'],
            'school_name': teacher['school_name'],
            'district': teacher['district'], 'phone': teacher['phone'],
        }
    })

# ═══════════════════════════════════════════════════════════
# PHASE 2 — STUDENTS + BMI
# ═══════════════════════════════════════════════════════════
@app.route('/api/students', methods=['GET'])
def get_students():
    teacher = get_current_teacher()
    if not teacher:
        return jsonify({'error': 'Not logged in'}), 401

    conn = get_db_connection()
    try:
        students = db_fetchall(conn,
            'SELECT * FROM students WHERE teacher_id = %s ORDER BY name',
            (teacher['id'],)
        )
        result = []
        for s in students:
            bmi = db_fetchone(conn,
                'SELECT * FROM bmi_records WHERE student_id = %s ORDER BY recorded_at DESC LIMIT 1',
                (s['id'],)
            )
            s['latest_bmi'] = bmi

            history = db_fetchall(conn,
                'SELECT bmi, status, recorded_at FROM bmi_records WHERE student_id = %s ORDER BY recorded_at',
                (s['id'],)
            )
            s['bmi_history'] = history
            result.append(s)
    finally:
        conn.close()

    return jsonify(result)

@app.route('/api/students', methods=['POST'])
def add_student():
    teacher = get_current_teacher()
    if not teacher:
        return jsonify({'error': 'Not logged in'}), 401

    data   = request.json or {}
    name   = data.get('name', '').strip()
    age    = data.get('age', 10)
    gender = data.get('gender', 'Boy')

    if not name:
        return jsonify({'error': 'Student name is required'}), 400

    conn = get_db_connection()
    try:
        db_execute(conn,
            'INSERT INTO students (teacher_id, name, age, gender) VALUES (%s, %s, %s, %s)',
            (teacher['id'], name, age, gender)
        )
        conn.commit()
        student = db_fetchone(conn,
            'SELECT * FROM students WHERE teacher_id = %s AND name = %s ORDER BY id DESC LIMIT 1',
            (teacher['id'], name)
        )
    finally:
        conn.close()

    return jsonify(student)

@app.route('/api/students/<int:student_id>/bmi', methods=['POST'])
def save_bmi(student_id):
    teacher = get_current_teacher()
    if not teacher:
        return jsonify({'error': 'Not logged in'}), 401

    data = request.json or {}
    conn = get_db_connection()
    try:
        db_execute(conn,
            'INSERT INTO bmi_records (student_id, height, weight, bmi, status) VALUES (%s, %s, %s, %s, %s)',
            (student_id, data.get('height'), data.get('weight'), data.get('bmi'), data.get('status'))
        )
        conn.commit()
    finally:
        conn.close()

    return jsonify({'success': True})

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    teacher = get_current_teacher()
    if not teacher:
        return jsonify({'error': 'Not logged in'}), 401

    conn = get_db_connection()
    try:
        db_execute(conn, 'DELETE FROM bmi_records WHERE student_id = %s', (student_id,))
        db_execute(conn, 'DELETE FROM students WHERE id = %s AND teacher_id = %s',
                   (student_id, teacher['id']))
        conn.commit()
    finally:
        conn.close()

    return jsonify({'success': True})

# ═══════════════════════════════════════════════════════════
# PHASE 3 — MEAL PLAN + QR CODE
# ═══════════════════════════════════════════════════════════
@app.route('/api/generate', methods=['POST'])
def generate_plan():
    data = request.json or {}

    teacher = get_current_teacher()
    if teacher:
        school_name  = data.get('school_name')  or teacher['school_name']
        teacher_name = data.get('teacher_name') or teacher['name']
    else:
        school_name  = data.get('school_name', '').strip()
        teacher_name = data.get('teacher_name', '').strip()

    student_name          = data.get('student_name', '').strip()
    bmi_status            = data.get('bmi_status', '').strip()
    optimization_strategy = data.get('optimization_strategy', 'standard').strip()
    age_group             = data.get('age_group', '9-12')
    preference            = data.get('preference', 'Vegetarian')
    region                = data.get('region', 'All')
    month                 = data.get('month', 'June')
    student_id            = data.get('student_id')

    if not school_name:
        return jsonify({"error": "School name is required."}), 400
    if not teacher_name:
        return jsonify({"error": "Teacher name is required."}), 400

    try:
        plan = generate_weekly_meal_plan(
            school_name=school_name, teacher_name=teacher_name,
            age_group=age_group, preference=preference, region=region,
            month=month, student_name=student_name, bmi_status=bmi_status,
            optimization_strategy=optimization_strategy
        )

        qr_code = str(uuid.uuid4())[:8].upper()

        if teacher:
            conn = get_db_connection()
            try:
                db_execute(conn, '''
                    INSERT INTO saved_plans
                    (qr_code, teacher_id, student_id, plan_data, school_name, teacher_name,
                     student_name, bmi_status, age_group, preference, region, month)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (
                    qr_code, teacher['id'], student_id, json.dumps(plan),
                    school_name, teacher_name, student_name, bmi_status,
                    age_group, preference, region, month
                ))
                if student_id and bmi_status and data.get('bmi_value'):
                    db_execute(conn,
                        'INSERT INTO bmi_records (student_id, height, weight, bmi, status) VALUES (%s, %s, %s, %s, %s)',
                        (student_id, data.get('height', 0), data.get('weight', 0),
                         data.get('bmi_value', 0), bmi_status)
                    )
                conn.commit()
            finally:
                conn.close()

        plan['qr_code'] = qr_code
        plan['qr_url']  = f"/plan/{qr_code}"
        return jsonify(plan)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error: {str(e)}"}), 500

@app.route('/plan/<qr_code>')
def view_plan(qr_code):
    return send_from_directory(app.static_folder, 'plan.html')

@app.route('/api/plan/<qr_code>', methods=['GET'])
def get_plan(qr_code):
    conn = get_db_connection()
    try:
        plan_row = db_fetchone(conn,
            'SELECT * FROM saved_plans WHERE qr_code = %s', (qr_code,)
        )
        if not plan_row:
            return jsonify({'error': 'Plan not found'}), 404

        plan_data = json.loads(plan_row['plan_data'])
        foods_list = db_fetchall(conn, 'SELECT * FROM foods')
        foods = {row['name_en']: row for row in foods_list}
    finally:
        conn.close()

    for day, day_data in plan_data.get('meal_plan', {}).items():
        for slot in ['breakfast', 'lunch', 'snack', 'dinner']:
            food = day_data.get(slot)
            if food and food.get('name_en') in foods:
                full = foods[food['name_en']]
                food['ingredients']  = full.get('ingredients', '')
                food['recipe_steps'] = full.get('recipe_steps', '')
                food['serving_size'] = full.get('serving_size', '1 portion')

    return jsonify({
        'qr_code':      qr_code,
        'school_name':  plan_row['school_name'],
        'teacher_name': plan_row['teacher_name'],
        'student_name': plan_row['student_name'],
        'bmi_status':   plan_row['bmi_status'],
        'region':       plan_row['region'],
        'preference':   plan_row['preference'],
        'month':        plan_row['month'],
        'created_at':   str(plan_row['created_at']),
        'plan_data':    plan_data
    })

@app.route('/api/saved-plans', methods=['GET'])
def get_saved_plans():
    teacher = get_current_teacher()
    if not teacher:
        return jsonify([])

    conn = get_db_connection()
    try:
        plans = db_fetchall(conn,
            'SELECT id, qr_code, student_name, school_name, month, preference, region, created_at FROM saved_plans WHERE teacher_id = %s ORDER BY created_at DESC LIMIT 20',
            (teacher['id'],)
        )
    finally:
        conn.close()

    # Convert datetime to string for JSON
    for p in plans:
        if p.get('created_at'):
            p['created_at'] = str(p['created_at'])

    return jsonify(plans)

# ═══════════════════════════════════════════════════════════
# NUTRITION LIBRARY
# ═══════════════════════════════════════════════════════════
@app.route('/api/nutrition', methods=['GET'])
def get_nutrition_library():
    search_query = request.args.get('search', '').strip()
    category     = request.args.get('category', '').strip()
    veg_only     = request.args.get('veg_only', 'false').lower() == 'true'

    conn = get_db_connection()
    try:
        query  = "SELECT * FROM foods WHERE 1=1"
        params = []

        if search_query:
            query += " AND (name_en ILIKE %s OR name_kn ILIKE %s)"
            like = f"%{search_query}%"
            params.extend([like, like])
        if category:
            query += " AND category = %s"
            params.append(category)
        if veg_only:
            query += " AND is_veg = 1"

        foods = db_fetchall(conn, query, params)
        return jsonify(foods)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/recipe/<int:food_id>', methods=['GET'])
def get_recipe(food_id):
    conn = get_db_connection()
    try:
        food = db_fetchone(conn, 'SELECT * FROM foods WHERE id = %s', (food_id,))
    finally:
        conn.close()

    if not food:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(food)

# ═══════════════════════════════════════════════════════════
# PHASE 4 — AI ADVISOR (Groq)
# ═══════════════════════════════════════════════════════════
@app.route('/api/ai-advisor', methods=['POST'])
def ai_advisor():
    data         = request.json or {}
    student_name = data.get('student_name', 'the student')
    age          = data.get('age', 10)
    gender       = data.get('gender', 'Boy')
    bmi_status   = data.get('bmi_status', 'Normal')
    bmi_value    = data.get('bmi_value', '')
    preference   = data.get('preference', 'Vegetarian')
    region       = data.get('region', 'Karnataka')
    question     = data.get('question', '').strip()

    try:
        prompt = f"""You are NutriPrint AI, a friendly school nutrition advisor for Karnataka, India.
Help PT teachers and parents understand children's dietary needs based on BMI.
Always recommend locally available Karnataka foods: Ragi, Jowar, Millets, Coconut Rice, Sambar, Idli, Dosa.
Keep replies short, practical, under 150 words. Give serving sizes in simple terms like 1 cup, 2 rotis, 1 bowl.

Student: {student_name}, Age: {age}, Gender: {gender}
BMI: {bmi_status} ({bmi_value}), Diet: {preference}, Region: {region}
Question: {question if question else f'What should {student_name} eat this week? Give a 3-day meal suggestion with serving sizes.'}"""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300
        )
        reply = response.choices[0].message.content
        return jsonify({"reply": reply})

    except Exception as e:
        print("Groq Error:", str(e))
        return jsonify({"reply": "AI Advisor is temporarily unavailable. Please try again."}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
