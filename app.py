import os
import json
import uuid
import io
import qrcode
from flask import Flask, request, jsonify, session, send_file
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS

from database import init_db, get_db_connection
from meal_generator import generate_weekly_meal_plan

# Tells Flask to serve frontend assets directly out of the static directory
app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.getenv("FLASK_SECRET_KEY", "super-secret-dev-key")

# Enable tracking session cookies across deployment environments
CORS(app, supports_credentials=True)

# Run schema setups
init_db()

# ── FRONTEND PAGE ROUTING ─────────────────────────────────────

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/plan')
def serve_plan_page():
    return app.send_static_file('plan.html')

@app.route('/plan1')
def serve_plan1_page():
    return app.send_static_file('plan1.html')

# ── AUTHENTICATION ENDPOINTS ──────────────────────────────────

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    name = data.get('name')
    school_name = data.get('school_name')
    district = data.get('district')
    phone = data.get('phone')
    password = data.get('password')

    if not all([name, school_name, district, phone, password]):
        return jsonify({"error": "All fields are required"}), 400

    password_hash = generate_password_hash(password)
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO teachers (name, school_name, district, phone, password_hash)
                VALUES (%s, %s, %s, %s, %s) RETURNING id, name
            ''', (name, school_name, district, phone, password_hash))
            teacher = cursor.fetchone()
            conn.commit()
            session['teacher_id'] = teacher['id']
            session['teacher_name'] = teacher['name']
            return jsonify({"message": "Registration successful", "teacher": teacher}), 201
    except Exception as e:
        conn.rollback()
        if "teachers_phone_key" in str(e):
            return jsonify({"error": "Phone number already registered"}), 400
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    phone = data.get('phone')
    password = data.get('password')

    if not phone or not password:
        return jsonify({"error": "Phone and password are required"}), 400

    conn = get_db_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM teachers WHERE phone = %s", (phone,))
        teacher = cursor.fetchone()
    conn.close()

    if not teacher or not check_password_hash(teacher['password_hash'], password):
        return jsonify({"error": "Invalid phone number or password"}), 401

    session['teacher_id'] = teacher['id']
    session['teacher_name'] = teacher['name']
    session['school_name'] = teacher['school_name']
    session['district'] = teacher['district']

    return jsonify({
        "message": "Login successful",
        "teacher": {
            "id": teacher['id'],
            "name": teacher['name'],
            "school_name": teacher['school_name'],
            "district": teacher['district']
        }
    }), 200

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

# ── HEALTH PROFILE LOGS ──────────────────────────────────────

@app.route('/api/students', methods=['POST'])
def add_student_and_bmi():
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return jsonify({"error": "Unauthorized. Please log in."}), 401

    data = request.get_json() or {}
    name = data.get('name')
    age = data.get('age')
    gender = data.get('gender')
    height = data.get('height')
    weight = data.get('weight')

    if not all([name, age, gender, height, weight]):
        return jsonify({"error": "Missing student metrics"}), 400

    height_m = float(height) / 100.0
    bmi_val = round(float(weight) / (height_m ** 2), 1)

    if bmi_val < 18.5: status = "Underweight"
    elif 18.5 <= bmi_val < 25.0: status = "Normal"
    elif 25.0 <= bmi_val < 30.0: status = "Overweight"
    else: status = "Obese"

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO students (teacher_id, name, age, gender)
                VALUES (%s, %s, %s, %s) RETURNING id
            ''', (teacher_id, name, int(age), gender))
            student_id = cursor.fetchone()['id']

            cursor.execute('''
                INSERT INTO bmi_records (student_id, height, weight, bmi, status)
                VALUES (%s, %s, %s, %s, %s)
            ''', (student_id, float(height), float(weight), bmi_val, status))
            conn.commit()
            return jsonify({"message": "Student saved", "student_id": student_id, "bmi": bmi_val, "status": status}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ── MEAL GENERATION ENGINE ────────────────────────────────────

@app.route('/api/meals/generate', methods=['POST'])
def generate_plan():
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json() or {}
    school_name = session.get('school_name', data.get('school_name', 'Government School'))
    teacher_name = session.get('teacher_name', data.get('teacher_name', 'Teacher'))
    age_group = data.get('age_group', '9-12')
    preference = data.get('preference', 'Vegetarian')
    region = session.get('district', data.get('region', 'All'))
    month = data.get('month', 'January')
    student_name = data.get('student_name', '')
    bmi_status = data.get('bmi_status', '')
    optimization_strategy = data.get('optimization_strategy', 'standard')

    try:
        plan = generate_weekly_meal_plan(
            school_name=school_name, teacher_name=teacher_name, age_group=age_group,
            preference=preference, region=region, month=month,
            student_name=student_name, bmi_status=bmi_status, optimization_strategy=optimization_strategy
        )
        return jsonify(plan), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── PERSISTENCE & QR CODE STORAGE ─────────────────────────────

@app.route('/api/plans/save', methods=['POST'])
def save_plan():
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json() or {}
    meal_plan_data = data.get('meal_plan')
    school_details = data.get('school_details', {})

    if not meal_plan_data:
        return jsonify({"error": "No meal plan matrix data sent"}), 400

    qr_token = f"MEAL-{uuid.uuid4().hex[:8].upper()}"
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO saved_plans (
                    qr_code, teacher_id, plan_data, school_name, teacher_name,
                    student_name, bmi_status, age_group, preference, region, month
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                qr_token, teacher_id, json.dumps(meal_plan_data),
                school_details.get('school_name'), school_details.get('teacher_name'),
                school_details.get('student_name'), school_details.get('bmi_status'),
                school_details.get('age_group'), school_details.get('preference'),
                school_details.get('region'), school_details.get('month')
            ))
            conn.commit()
            return jsonify({"message": "Plan saved", "qr_code": qr_token}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/plans/qr/<qr_code_string>', methods=['GET'])
def get_qr_image(qr_code_string):
    try:
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_code_string)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        img_buffer = io.BytesIO()
        img.save(img_buffer, format="PNG")
        img_buffer.seek(0)
        return send_file(img_buffer, mimetype='image/png')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv("PORT", 5000)), debug=True)
