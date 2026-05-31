import os
import sqlite3
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import init_db, get_db_connection
from meal_generator import generate_weekly_meal_plan

app = Flask(__name__, static_folder='static')
CORS(app)

# Ensure database is initialized on startup
with app.app_context():
    try:
        init_db()
        print("Database checked and prepared on Flask startup.")
    except Exception as e:
        print(f"Error seeding database on startup: {e}")

@app.route('/')
def index():
    """Serves the main frontend page."""
    return send_from_directory('.', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    """Serves static files like CSS and JS."""
    return send_from_directory(app.static_folder, path)

@app.route('/api/generate', methods=['POST'])
def generate_plan():
    """
    POST API to generate weekly meal plans based on:
    - school_name (string)
    - student_name (string, optional)
    - bmi_status (string, optional)
    - optimization_strategy (string, optional)
    - teacher_name (string)
    - age_group ('5-8' | '9-12' | '13-15')
    - preference ('Vegetarian' | 'Eggetarian' | 'Non-vegetarian')
    - region ('Dakshina Kannada' | 'Mangalore' | 'Udupi' | 'Shivamogga' | 'Bengaluru Rural')
    - month (string)
    """
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
    
    # Simple serverside validations
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
    """
    GET API to retrieve food nutritional catalog with filtering.
    - search: Text query matching English or Kannada names
    - category: 'breakfast' | 'lunch' | 'snack' | 'dinner'
    - veg_only: 'true' | 'false'
    """
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

if __name__ == '__main__':
    # Running Flask app on local dev server (port 5001 to avoid macOS conflict)
    app.run(host='0.0.0.0', port=5001, debug=True)
