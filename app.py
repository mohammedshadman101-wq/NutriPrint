import os
import sqlite3
import json
import uuid
import hashlib
import urllib.request
import urllib.error
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
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

# ── Helpers ───────────────────────────────────────────────
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def get_current_teacher():
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return None
    conn = get_db_connection()
    teacher = conn.execute('SELECT * FROM teachers WHERE id = ?', (teacher_id,)).fetchone()
    conn.close()
    return dict(teacher) if teacher else None

# ═══════════════════════════════════════════════════════════
# PHASE 1 — AUTH: Login / Signup
# ═══════════════════════════════════════════════════════════
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json or {}
    name = data.get('name', '').strip()
    school_name = data.get('school_name', '').strip()
    district = data.get('district', '').strip()
    phone = data.get('phone', '').strip()
    password = data.get('password', '').strip()

    if not all([name, school_name, district, phone, password]):
        return jsonify({'error': 'All fields are required.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    conn = get_db_connection()
    existing = conn.execute('SELECT id FROM teachers WHERE phone = ?', (phone,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'error': 'Phone number already registered. Please login.'}), 400

    pw_hash = hash_password(password)
    conn.execute(
        'INSERT INTO teachers (name, school_name, district, phone, password_hash) VALUES (?, ?, ?, ?, ?)',
        (name, school_name, district, phone, pw_hash)
    )
    conn.commit()
    teacher = conn.execute('SELECT * FROM teachers WHERE phone = ?', (phone,)).fetchone()
    conn.close()

    session['teacher_id'] = teacher['id']
    return jsonify({
        'success': True,
        'teacher': {
            'id': teacher['id'],
            'name': teacher['name'],
            'school_name': teacher['school_name'],
            'district': teacher['district'],
            'phone': teacher['phone'],
        }
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    phone = data.get('phone', '').strip()
    password = data.get('password', '').strip()

    if not phone or not password:
        return jsonify({'error': 'Phone and password are required.'}), 400

    conn = get_db_connection()
    teacher = conn.execute('SELECT * FROM teachers WHERE phone = ?', (phone,)).fetchone()
    conn.close()

    if not teacher or teacher['password_hash'] != hash_password(password):
        return jsonify({'error': 'Invalid phone number or password.'}), 401

    session['teacher_id'] = teacher['id']
    return jsonify({
        'success': True,
        'teacher': {
            'id': teacher['id'],
            'name': teacher['name'],
            'school_name': teacher['school_name'],
            'district': teacher['district'],
            'phone': teacher['phone'],
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
            'id': teacher['id'],
            'name': teacher['name'],
            'school_name': teacher['school_name'],
            'district': teacher['district'],
            'phone': teacher['phone'],
        }
    })

# ═══════════════════════════════════════════════════════════
# PHASE 2 — CLASS DASHBOARD: Students + BMI Records
# ═══════════════════════════════════════════════════════════
@app.route('/api/students', methods=['GET'])
def get_students():
    teacher = get_current_teacher()
    if not teacher:
        return jsonify({'error': 'Not logged in'}), 401

    conn = get_db_connection()
    students = conn.execute(
        'SELECT * FROM students WHERE teacher_id = ? ORDER BY name',
        (teacher['id'],)
    ).fetchall()

    result = []
    for s in students:
        s = dict(s)
        # Get latest BMI record
        bmi = conn.execute(
            'SELECT * FROM bmi_records WHERE student_id = ? ORDER BY recorded_at DESC LIMIT 1',
            (s['id'],)
        ).fetchone()
        s['latest_bmi'] = dict(bmi) if bmi else None

        # Get BMI history for chart
        history = conn.execute(
            'SELECT bmi, status, recorded_at FROM bmi_records WHERE student_id = ? ORDER BY recorded_at',
            (s['id'],)
        ).fetchall()
        s['bmi_history'] = [dict(h) for h in history]
        result.append(s)

    conn.close()
    return jsonify(result)

@app.route('/api/students', methods=['POST'])
def add_student():
    teacher = get_current_teacher()
    if not teacher:
        return jsonify({'error': 'Not logged in'}), 401

    data = request.json or {}
    name = data.get('name', '').strip()
    age = data.get('age', 10)
    gender = data.get('gender', 'Boy')

    if not name:
        return jsonify({'error': 'Student name is required'}), 400

    conn = get_db_connection()
    conn.execute(
        'INSERT INTO students (teacher_id, name, age, gender) VALUES (?, ?, ?, ?)',
        (teacher['id'], name, age, gender)
    )
    conn.commit()
    student = conn.execute(
        'SELECT * FROM students WHERE teacher_id = ? AND name = ? ORDER BY id DESC LIMIT 1',
        (teacher['id'], name)
    ).fetchone()
    conn.close()
    return jsonify(dict(student))

@app.route('/api/students/<int:student_id>/bmi', methods=['POST'])
def save_bmi(student_id):
    teacher = get_current_teacher()
    if not teacher:
        return jsonify({'error': 'Not logged in'}), 401

    data = request.json or {}
    height = data.get('height')
    weight = data.get('weight')
    bmi = data.get('bmi')
    status = data.get('status')

    conn = get_db_connection()
    conn.execute(
        'INSERT INTO bmi_records (student_id, height, weight, bmi, status) VALUES (?, ?, ?, ?, ?)',
        (student_id, height, weight, bmi, status)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    teacher = get_current_teacher()
    if not teacher:
        return jsonify({'error': 'Not logged in'}), 401

    conn = get_db_connection()
    conn.execute('DELETE FROM bmi_records WHERE student_id = ?', (student_id,))
    conn.execute('DELETE FROM students WHERE id = ? AND teacher_id = ?', (student_id, teacher['id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ═══════════════════════════════════════════════════════════
# PHASE 3 — MEAL PLAN GENERATOR + QR CODE + RECIPES
# ═══════════════════════════════════════════════════════════
@app.route('/api/generate', methods=['POST'])
def generate_plan():
    data = request.json or {}

    # If logged in, auto-fill school and teacher name
    teacher = get_current_teacher()
    if teacher:
        school_name = data.get('school_name') or teacher['school_name']
        teacher_name = data.get('teacher_name') or teacher['name']
    else:
        school_name = data.get('school_name', '').strip()
        teacher_name = data.get('teacher_name', '').strip()

    student_name = data.get('student_name', '').strip()
    bmi_status = data.get('bmi_status', '').strip()
    optimization_strategy = data.get('optimization_strategy', 'standard').strip()
    age_group = data.get('age_group', '9-12')
    preference = data.get('preference', 'Vegetarian')
    region = data.get('region', 'All')
    month = data.get('month', 'June')
    student_id = data.get('student_id')

    if not school_name:
        return jsonify({"error": "School name is required."}), 400
    if not teacher_name:
        return jsonify({"error": "Teacher name is required."}), 400

    try:
        plan = generate_weekly_meal_plan(
            school_name=school_name,
            teacher_name=teacher_name,
            age_group=age_group,
            preference=preference,
            region=region,
            month=month,
            student_name=student_name,
            bmi_status=bmi_status,
            optimization_strategy=optimization_strategy
        )

        # Generate unique QR code ID and save plan
        qr_code = str(uuid.uuid4())[:8].upper()
        if teacher:
            conn = get_db_connection()
            conn.execute('''
                INSERT INTO saved_plans
                (qr_code, teacher_id, student_id, plan_data, school_name, teacher_name,
                 student_name, bmi_status, age_group, preference, region, month)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                qr_code, teacher['id'], student_id, json.dumps(plan),
                school_name, teacher_name, student_name, bmi_status,
                age_group, preference, region, month
            ))

            # Save BMI record if student_id provided
            if student_id and bmi_status and data.get('bmi_value'):
                conn.execute(
                    'INSERT INTO bmi_records (student_id, height, weight, bmi, status) VALUES (?, ?, ?, ?, ?)',
                    (student_id, data.get('height', 0), data.get('weight', 0),
                     data.get('bmi_value', 0), bmi_status)
                )
            conn.commit()
            conn.close()

        plan['qr_code'] = qr_code
        plan['qr_url'] = f"/plan/{qr_code}"
        return jsonify(plan)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error: {str(e)}"}), 500

# Public plan page (QR scan opens this)
@app.route('/plan/<qr_code>')
def view_plan(qr_code):
    return send_from_directory(app.static_folder, 'plan.html')

@app.route('/api/plan/<qr_code>', methods=['GET'])
def get_plan(qr_code):
    conn = get_db_connection()
    plan_row = conn.execute(
        'SELECT * FROM saved_plans WHERE qr_code = ?', (qr_code,)
    ).fetchone()
    conn.close()

    if not plan_row:
        return jsonify({'error': 'Plan not found'}), 404

    plan_row = dict(plan_row)
    plan_data = json.loads(plan_row['plan_data'])

    # Enhance with full recipe data
    conn = get_db_connection()
    foods = {row['name_en']: dict(row) for row in conn.execute('SELECT * FROM foods').fetchall()}
    conn.close()

    for day, day_data in plan_data.get('meal_plan', {}).items():
        for slot in ['breakfast', 'lunch', 'snack', 'dinner']:
            food = day_data.get(slot)
            if food and food.get('name_en') in foods:
                full_food = foods[food['name_en']]
                food['ingredients'] = full_food.get('ingredients', '')
                food['recipe_steps'] = full_food.get('recipe_steps', '')
                food['serving_size'] = full_food.get('serving_size', '1 portion')

    return jsonify({
        'qr_code': qr_code,
        'school_name': plan_row['school_name'],
        'teacher_name': plan_row['teacher_name'],
        'student_name': plan_row['student_name'],
        'bmi_status': plan_row['bmi_status'],
        'region': plan_row['region'],
        'preference': plan_row['preference'],
        'month': plan_row['month'],
        'created_at': plan_row['created_at'],
        'plan_data': plan_data
    })

@app.route('/api/saved-plans', methods=['GET'])
def get_saved_plans():
    teacher = get_current_teacher()
    if not teacher:
        return jsonify([])

    conn = get_db_connection()
    plans = conn.execute(
        'SELECT id, qr_code, student_name, school_name, month, preference, region, created_at FROM saved_plans WHERE teacher_id = ? ORDER BY created_at DESC LIMIT 20',
        (teacher['id'],)
    ).fetchall()
    conn.close()
    return jsonify([dict(p) for p in plans])

# ═══════════════════════════════════════════════════════════
# NUTRITION LIBRARY
# ═══════════════════════════════════════════════════════════
@app.route('/api/nutrition', methods=['GET'])
def get_nutrition_library():
    search_query = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    veg_only = request.args.get('veg_only', 'false').lower() == 'true'

    conn = get_db_connection()
    query = "SELECT * FROM foods WHERE 1=1"
    params = []

    if search_query:
        query += " AND (name_en LIKE ? OR name_kn LIKE ?)"
        like = f"%{search_query}%"
        params.extend([like, like])
    if category:
        query += " AND category = ?"
        params.append(category)
    if veg_only:
        query += " AND is_veg = 1"

    try:
        foods = [dict(row) for row in conn.execute(query, params).fetchall()]
        return jsonify(foods)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# Recipe detail
@app.route('/api/recipe/<int:food_id>', methods=['GET'])
def get_recipe(food_id):
    conn = get_db_connection()
    food = conn.execute('SELECT * FROM foods WHERE id = ?', (food_id,)).fetchone()
    conn.close()
    if not food:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(dict(food))

# ═══════════════════════════════════════════════════════════
# PHASE 4 — GEMINI AI ADVISOR
# ═══════════════════════════════════════════════════════════
@app.route('/api/ai-advisor', methods=['POST'])
def ai_advisor():
    data = request.json or {}
    student_name = data.get('student_name', 'the student')
    age = data.get('age', 10)
    gender = data.get('gender', 'Boy')
    bmi_status = data.get('bmi_status', 'Normal')
    bmi_value = data.get('bmi_value', '')
    preference = data.get('preference', 'Vegetarian')
    region = data.get('region', 'Karnataka')
    question = data.get('question', '').strip()

    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

    if not GEMINI_API_KEY:
        return jsonify({
            "reply": "AI Advisor is not configured yet. Add GEMINI_API_KEY to Render environment variables.",
        }), 200

    system_prompt = """You are NutriPrint AI, a friendly school nutrition advisor for Karnataka, India.
Help PT teachers and parents understand children dietary needs based on BMI.
Always recommend locally available Karnataka foods: Ragi, Jowar, Millets, Coconut Rice, Sambar, Idli, Dosa.
Keep replies short, practical, under 150 words. Give serving sizes in simple terms like 1 cup, 2 rotis, 1 bowl."""

    user_message = f"""Student: {student_name}, Age: {age}, Gender: {gender}
BMI: {bmi_status} ({bmi_value}), Diet: {preference}, Region: {region}
Question: {question if question else f'What should {student_name} eat this week? Give a 3-day meal suggestion with serving sizes.'}"""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": system_prompt + "\n\n" + user_message}]}],
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 300}
        }
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}, method='POST'
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
            reply = result['candidates'][0]['content']['parts'][0]['text']
            return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"reply": "AI Advisor is temporarily unavailable. Please try again."}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
