import os
import sqlite3
import json
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
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

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/generate', methods=['POST'])
def generate_plan():
    data = request.json or {}
    school_name = data.get('school_name', '').strip()
    student_name = data.get('student_name', '').strip()
    bmi_status = data.get('bmi_status', '').strip()
    optimization_strategy = data.get('optimization_strategy', 'standard').strip()
    teacher_name = data.get('teacher_name', '').strip()
    age_group = data.get('age_group', '9-12')
    preference = data.get('preference', 'Vegetarian')
    region = data.get('region', 'All')
    month = data.get('month', 'June')

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
        return jsonify(plan)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

@app.route('/api/nutrition', methods=['GET'])
def get_nutrition_library():
    search_query = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    veg_only = request.args.get('veg_only', 'false').lower() == 'true'

    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM foods WHERE 1=1"
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

# ─────────────────────────────────────────────
# NEW: Gemini AI Nutrition Advisor Route
# ─────────────────────────────────────────────
@app.route('/api/ai-advisor', methods=['POST'])
def ai_advisor():
    """
    Gemini-powered AI nutrition advisor.
    Accepts student details and returns personalised nutrition advice.
    """
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
            "reply": "AI Advisor is not configured yet. Please ask the teacher to contact school administration.",
            "reply_kn": "AI ಸಲಹೆಗಾರ ಅನ್ವಯಿಸಲಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಶಿಕ್ಷಕರನ್ನು ಸಂಪರ್ಕಿಸಿ."
        }), 200

    # Build context-aware prompt
    system_prompt = f"""You are NutriPrint AI, a friendly school nutrition advisor for Karnataka, India.
You help PT teachers and parents understand children's dietary needs based on BMI.
Always recommend locally available Karnataka foods like Ragi, Jowar, Millets, Coconut Rice, Sambar, Idli, Dosa.
Keep replies short, practical, and easy for parents to understand.
Always give serving sizes in simple terms like "1 cup", "2 rotis", "1 bowl".
Reply in simple English. Keep it under 150 words."""

    user_message = f"""Student: {student_name}, Age: {age}, Gender: {gender}
BMI Status: {bmi_status} (BMI: {bmi_value})
Diet Preference: {preference}
Region: {region}

Question: {question if question else f"What should {student_name} eat this week to improve health? Give a simple 3-day meal suggestion with serving sizes."}"""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": system_prompt + "\n\n" + user_message}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 300
            }
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
            reply = result['candidates'][0]['content']['parts'][0]['text']
            return jsonify({"reply": reply, "reply_kn": ""})

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"Gemini API HTTP Error: {e.code} - {error_body}")
        return jsonify({"reply": "AI Advisor is temporarily unavailable. Please try again later.", "error": str(e)}), 200
    except Exception as e:
        print(f"AI Advisor error: {e}")
        return jsonify({"reply": "AI Advisor encountered an error. Please try again.", "error": str(e)}), 200

@app.route('/app.js')
def serve_appjs():
    return send_from_directory('.', 'app.js')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

