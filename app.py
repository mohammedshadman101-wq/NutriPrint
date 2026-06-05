import os
import io
import json
import uuid
import base64
import sqlite3
import qrcode
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from database import init_db, get_db_connection
from meal_generator import generate_weekly_meal_plan

app = Flask(__name__, static_folder='static')
CORS(app)

with app.app_context():
    try:
        init_db()
        print("Database checked and prepared on Flask startup.")
    except Exception as e:
        print(f"Error seeding database on startup: {e}")


# ── Static pages ────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/plan/<qr_code>')
def plan_page(qr_code):
    """Public page parents open when they scan the QR code."""
    return send_from_directory(app.static_folder, 'plan.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/app.js')
def serve_appjs():
    return send_from_directory('.', 'app.js')


# ── Auth: Register ───────────────────────────────────────────────────────────

@app.route('/api/register', methods=['POST'])
def register():
    """
    POST /api/register
    Body: { name, school_name, district, phone, password }
    """
    data = request.json or {}
    name        = data.get('name', '').strip()
    school_name = data.get('school_name', '').strip()
    district    = data.get('district', '').strip()
    phone       = data.get('phone', '').strip()
    password    = data.get('password', '').strip()

    if not all([name, school_name, district, phone, password]):
        return jsonify({"error": "All fields are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    password_hash = generate_password_hash(password)

    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO teachers (name, school_name, district, phone, password_hash) VALUES (?, ?, ?, ?, ?)",
            (name, school_name, district, phone, password_hash)
        )
        conn.commit()
        # Fetch the new teacher
        teacher = conn.execute(
            "SELECT id, name, school_name, district, phone FROM teachers WHERE phone = ?",
            (phone,)
        ).fetchone()
        return jsonify({
            "message": "Registration successful!",
            "teacher": dict(teacher)
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Phone number already registered."}), 409
    finally:
        conn.close()


# ── Auth: Login ──────────────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def login():
    """
    POST /api/login
    Body: { phone, password }
    Returns teacher info if credentials are correct.
    """
    data     = request.json or {}
    phone    = data.get('phone', '').strip()
    password = data.get('password', '').strip()

    if not phone or not password:
        return jsonify({"error": "Phone and password are required."}), 400

    conn = get_db_connection()
    try:
        teacher = conn.execute(
            "SELECT * FROM teachers WHERE phone = ?", (phone,)
        ).fetchone()

        if not teacher or not check_password_hash(teacher['password_hash'], password):
            return jsonify({"error": "Invalid phone number or password."}), 401

        return jsonify({
            "message": "Login successful!",
            "teacher": {
                "id":          teacher['id'],
                "name":        teacher['name'],
                "school_name": teacher['school_name'],
                "district":    teacher['district'],
                "phone":       teacher['phone']
            }
        })
    finally:
        conn.close()


# ── Generate Meal Plan ────────────────────────────────────────────────────────

@app.route('/api/generate', methods=['POST'])
def generate_plan():
    """
    POST /api/generate
    Body: { school_name, teacher_name, age_group, preference, region, month,
            student_name (opt), bmi_status (opt), optimization_strategy (opt) }
    """
    data = request.json or {}

    school_name           = data.get('school_name', '').strip()
    student_name          = data.get('student_name', '').strip()
    bmi_status            = data.get('bmi_status', '').strip()
    optimization_strategy = data.get('optimization_strategy', 'standard').strip()
    teacher_name          = data.get('teacher_name', '').strip()
    age_group             = data.get('age_group', '9-12')
    preference            = data.get('preference', 'Vegetarian')
    region                = data.get('region', 'All')
    month                 = data.get('month', 'June')

    if not school_name:
        return jsonify({"error": "School name is required.", "error_kn": "ಶಾಲೆಯ ಹೆಸರು ಕಡ್ಡಾಯವಾಗಿದೆ."}), 400
    if not teacher_name:
        return jsonify({"error": "Class teacher name is required.", "error_kn": "ತರಗತಿ ಶಿಕ್ಷಕರ ಹೆಸರು ಕಡ್ಡಾಯವಾಗಿದೆ."}), 400

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

    # Save generated plan
    conn = get_db_connection()

    try:
        conn.execute("""
            INSERT INTO saved_plans
            (
                teacher_id,
                student_name,
                bmi_status,
                created_at
            )
            VALUES (?, ?, ?, datetime('now'))
        """, (
            1,
            student_name if student_name else "Unknown Student",
            bmi_status if bmi_status else "Normal"
        ))

        conn.commit()

    except Exception as db_error:
        print("Dashboard save error:", db_error)

    finally:
        conn.close()

    return jsonify(plan)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500


# ── Save Plan + Generate QR Code ─────────────────────────────────────────────

@app.route('/api/save-plan', methods=['POST'])
def save_plan():
    """
    POST /api/save-plan
    Body: { teacher_id, plan_data, school_name, teacher_name,
            student_name (opt), bmi_status (opt), age_group, preference, region, month }
    Returns: { qr_code, qr_image_base64, plan_url }
    """
    data = request.json or {}

    teacher_id   = data.get('teacher_id')
    plan_data    = data.get('plan_data')
    school_name  = data.get('school_name', '').strip()
    teacher_name = data.get('teacher_name', '').strip()
    student_name = data.get('student_name', '').strip()
    bmi_status   = data.get('bmi_status', '').strip()
    age_group    = data.get('age_group', '')
    preference   = data.get('preference', '')
    region       = data.get('region', '')
    month        = data.get('month', '')

    if not plan_data or not school_name or not teacher_name:
        return jsonify({"error": "Missing required fields."}), 400

    # Generate a unique QR code token
    qr_token = str(uuid.uuid4()).replace('-', '')[:16]

    # Build the public URL parents will see
    base_url = request.host_url.rstrip('/')
    plan_url = f"{base_url}/plan/{qr_token}"

    # Generate QR code image as base64
    qr_img = qrcode.make(plan_url)
    buffer = io.BytesIO()
    qr_img.save(buffer, format='PNG')
    qr_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

    conn = get_db_connection()
    try:
        conn.execute(
            """INSERT INTO saved_plans
               (qr_code, teacher_id, plan_data, school_name, teacher_name,
                student_name, bmi_status, age_group, preference, region, month)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (qr_token, teacher_id, json.dumps(plan_data), school_name, teacher_name,
             student_name, bmi_status, age_group, preference, region, month)
        )
        conn.commit()
        return jsonify({
            "qr_code":          qr_token,
            "qr_image_base64":  qr_b64,
            "plan_url":         plan_url
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ── Public Plan Page (QR scan target) ────────────────────────────────────────

@app.route('/api/plan/<qr_code>', methods=['GET'])
def get_plan(qr_code):
    """
    GET /api/plan/<qr_code>
    Returns saved meal plan + recipe details for each meal.
    Called by plan.html when a parent scans the QR code.
    """
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM saved_plans WHERE qr_code = ?", (qr_code,)
        ).fetchone()

        if not row:
            return jsonify({"error": "Plan not found."}), 404

        plan_data = json.loads(row['plan_data'])

        return jsonify({
            "school_name":  row['school_name'],
            "teacher_name": row['teacher_name'],
            "student_name": row['student_name'],
            "bmi_status":   row['bmi_status'],
            "age_group":    row['age_group'],
            "preference":   row['preference'],
            "region":       row['region'],
            "month":        row['month'],
            "created_at":   row['created_at'],
            "plan":         plan_data
        })
    finally:
        conn.close()


# ── Nutrition Library ─────────────────────────────────────────────────────────

@app.route('/api/nutrition', methods=['GET'])
def get_nutrition_library():
    search_query = request.args.get('search', '').strip()
    category     = request.args.get('category', '').strip()
    veg_only     = request.args.get('veg_only', 'false').lower() == 'true'

    conn = get_db_connection()
    cursor = conn.cursor()

    query  = "SELECT * FROM foods WHERE 1=1"
    params = []

    if search_query:
        query += " AND (name_en LIKE ? OR name_kn LIKE ? OR recipe_tip_en LIKE ?)"
        like_param = f"%{search_query}%"
        params.extend([like_param, like_param, like_param])

    if category:
        query += " AND category = ?"
        params.append(category)

    if veg_only:
        query += " AND is_veg = 1"

    try:
        cursor.execute(query, params)
        foods = [dict(row) for row in cursor.fetchall()]
        return jsonify(foods)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
        
# ── Teacher Dashboard ───────────────────────────────────────────────────────

@app.route('/api/dashboard/<int:teacher_id>', methods=['GET'])
def dashboard(teacher_id):
    conn = get_db_connection()

    try:
        students = conn.execute(
            "SELECT * FROM students WHERE teacher_id = ?",
            (teacher_id,)
        ).fetchall()

        plans = conn.execute(
            """
            SELECT
                student_name,
                bmi_status,
                created_at
            FROM saved_plans
            WHERE teacher_id = ?
            ORDER BY created_at DESC
            """,
            (teacher_id,)
        ).fetchall()

        return jsonify({
            "students": [dict(x) for x in students],
            "plans": [dict(x) for x in plans]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
