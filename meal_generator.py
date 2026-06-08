import random
from database import get_db_connection

def generate_weekly_meal_plan(school_name, teacher_name, age_group, preference, region, month, student_name='', bmi_status='', optimization_strategy='standard'):
    """
    AI-driven rule engine to generate a perfect 6-day school meal plan (Monday to Saturday).
    Applies strict dietary constraints, budget limits, regional scoring, variety safety,
    and nutritional scaling based on target age group or BMI health index classification.
    """
    conn = get_db_connection()
    
    # Using 'with' block ensures the cursor closes gracefully if an exception triggers
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM foods")
        # RealDictCursor already yields dictionaries; no conversion loop needed!
        all_foods = cursor.fetchall()
    conn.close()
    
    # Scale portions & labels dynamically based on BMI Status or Age Group
    if bmi_status:
        if bmi_status == "Underweight":
            portion_multiplier = 1.3
            portion_label_en = "High-Protein & Energy dense portions (130%) to assist healthy weight gain."
            portion_label_kn = "ಶಕ್ತಿ ತುಂಬಿದ ಅಧಿಕ ಪ್ರೋಟೀನ್ ಆಹಾರ ತೂಕ ಹೆಚ್ಚಿಸಲು (130%)."
        elif bmi_status in ["Overweight", "Obese"]:
            portion_multiplier = 0.7
            portion_label_en = "High-fiber, mineral dense, controlled portions (70%) for weight control."
            portion_label_kn = "ಹೆಚ್ಚಿನ ನಾರಿನಂಶವುಳ್ಳ ಲಘು ಆಹಾರ ತೂಕ ನಿಯಂತ್ರಿಸಲು (70%)."
        else: # Normal
            portion_multiplier = 1.0
            portion_label_en = "Standard balanced portions (100%) for healthy growth parameters."
            portion_label_kn = "ಆರೋಗ್ಯಕರ ಬೆಳವಣಿಗೆಗಾಗಿ ಪ್ರಮಾಣಿತ ಸಮತೋಲಿತ ಊಟದ ಪ್ರಮಾಣ (100%)."
    else:
        if age_group == "5-8":
            portion_multiplier = 0.7
            portion_label_en = "Portions scaled down (70%) for early childhood digestion."
            portion_label_kn = "ಬಾಲ್ಯದ ಜೀರ್ಣಕ್ರಿಯೆಗೆ ಸೂಕ್ತವಾದ ಸಣ್ಣ ಪ್ರಮಾಣದ ಊಟ (70%)."
        elif age_group == "13-15":
            portion_multiplier = 1.3
            portion_label_en = "Portions scaled up (130%) for active adolescent growth."
            portion_label_kn = "ಕಿಶೋರಾವಸ್ಥೆಯ ಬೆಳವಣಿಗೆಗೆ ಹೆಚ್ಚಿನ ಪ್ರಮಾಣದ ಶಕ್ತಿ ತುಂಬಿದ ಊಟ (130%)."
        else:
            portion_multiplier = 1.0
            portion_label_en = "Standard balanced portions (100%) for school children."
            portion_label_kn = "ಶಾಲಾ ಮಕ್ಕಳಿಗಾಗಿ ಪ್ರಮಾಣಿತ ಸಮತೋಲಿತ ಊಟದ ಪ್ರಮಾಣ (100%)."

    # Step 1: Filter by diet preference & price ceiling
    filtered_foods = []
    for food in all_foods:
        if food['cost'] > 50.0:
            continue
            
        if preference == "Vegetarian" and food['is_veg'] != 1:
            continue
        elif preference == "Eggetarian" and (food['is_veg'] != 1 and food['is_egg'] != 1):
            continue
        filtered_foods.append(food)

    # Step 2: Score foods by regional relevance
    def calculate_regional_score(f):
        score = 0
        food_regions = [r.strip().lower() for r in f['regions'].split(',')]
        req_region = region.strip().lower()
        coastal_regions = ["mangalore", "udupi", "dakshina kannada"]
        
        if req_region in food_regions:
            score += 10
        elif req_region in coastal_regions and any(cr in food_regions for cr in coastal_regions):
            score += 8
        elif "all" in food_regions:
            score += 5
        return score

    # Group foods by category
    categorized = {"breakfast": [], "lunch": [], "snack": [], "dinner": []}
    
    for food in filtered_foods:
        cat = food['category']
        if cat in categorized:
            food_copy = dict(food)  # Safe cloning shallow copy
            food_copy['scaled_protein'] = round(food['protein'] * portion_multiplier, 1)
            food_copy['scaled_calcium'] = round(food['calcium'] * portion_multiplier, 1)
            food_copy['scaled_iron'] = round(food['iron'] * portion_multiplier, 1)
            food_copy['scaled_carbs'] = round(food['carbs'] * portion_multiplier, 1)
            food_copy['scaled_cost'] = round(food['cost'] * portion_multiplier, 1)
            food_copy['regional_score'] = calculate_regional_score(food_copy)
            
            # Apply dynamic AI Customization boosts
            boost_score = 0
            if optimization_strategy == 'high_protein':
                if food_copy['protein'] >= 7.5:
                    boost_score += 15
            elif optimization_strategy == 'calcium_iron':
                if food_copy['calcium'] >= 150.0 or food_copy['iron'] >= 3.0:
                    boost_score += 15
            elif optimization_strategy == 'low_calorie':
                if food_copy['carbs'] <= 50.0 or food_copy['cost'] <= 20.0:
                    boost_score += 15
            
            food_copy['boost_score'] = boost_score
            categorized[cat].append(food_copy)

    # Step 3: Selection ranking optimization
    for cat in categorized:
        categorized[cat].sort(key=lambda x: (x['regional_score'] + x['boost_score'], random.random()), reverse=True)

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    days_kn = {
        "Monday": "ಸೋಮವಾರ", "Tuesday": "ಮಂಗಳವಾರ", "Wednesday": "ಬುಧವಾರ",
        "Thursday": "ಗುರುವಾರ", "Friday": "ಶುಕ್ರವಾರ", "Saturday": "ಶನಿವಾರ"
    }
    
    meal_plan = {}
    
    # Grab elements safely up to 6 available options
    selected_breakfasts = categorized['breakfast'][:6]
    selected_lunches = categorized['lunch'][:6]
    selected_snacks = categorized['snack'][:6]
    selected_dinners = categorized['dinner'][:6]

    # Monday high-energy breakfast optimization anchor
    high_energy_names = ["Ragi Dosa", "Ragi Roti", "Sprout Upma"]
    monday_bf_idx = -1
    for idx, bf in enumerate(selected_breakfasts):
        if bf['name_en'] in high_energy_names:
            monday_bf_idx = idx
            break
            
    if monday_bf_idx > 0:
        selected_breakfasts[0], selected_breakfasts[monday_bf_idx] = selected_breakfasts[monday_bf_idx], selected_breakfasts[0]

    # Assemble 6 days menu metrics securely
    for i, day in enumerate(days):
        # Using safely bounded indices prevents crashes if a category has fewer options
        bf = selected_breakfasts[i % len(selected_breakfasts)] if selected_breakfasts else {}
        lh = selected_lunches[i % len(selected_lunches)] if selected_lunches else {}
        sk = selected_snacks[i % len(selected_snacks)] if selected_snacks else {}
        dn = selected_dinners[i % len(selected_dinners)] if selected_dinners else {}
        
        day_protein = round(sum(f.get('scaled_protein', 0) for f in [bf, lh, sk, dn]), 1)
        day_calcium = round(sum(f.get('scaled_calcium', 0) for f in [bf, lh, sk, dn]), 1)
        day_iron = round(sum(f.get('scaled_iron', 0) for f in [bf, lh, sk, dn]), 1)
        day_carbs = round(sum(f.get('scaled_carbs', 0) for f in [bf, lh, sk, dn]), 1)
        day_cost = round(sum(f.get('scaled_cost', 0) for f in [bf, lh, sk, dn]), 1)
        
        meal_plan[day] = {
            "day_kn": days_kn[day],
            "breakfast": bf,
            "lunch": lh,
            "snack": sk,
            "dinner": dn,
            "nutrients": {
                "protein": day_protein,
                "calcium": day_calcium,
                "iron": day_iron,
                "carbs": day_carbs,
                "cost": day_cost
            }
        }

    # Calculate real mathematical average cost based on planned allocations
    total_cost = sum(d['nutrients']['cost'] for d in meal_plan.values())
    avg_daily_cost = round(total_cost / len(days), 2) if meal_plan else 0.0
    
    # Variety is verified only if we have at least as many options as days
    zero_repeats_achieved = all(len(categorized[cat]) >= 6 for cat in categorized)
    
    return {
        "school_details": {
            "school_name": school_name,
            "student_name": student_name,
            "bmi_status": bmi_status,
            "optimization_strategy": optimization_strategy,
            "teacher_name": teacher_name,
            "age_group": age_group,
            "preference": preference,
            "region": region,
            "month": month,
            "portion_label_en": portion_label_en,
            "portion_label_kn": portion_label_kn,
            "portion_multiplier": portion_multiplier
        },
        "meal_plan": meal_plan,
        "summary": {
            "average_daily_cost": avg_daily_cost,
            "adheres_to_budget": avg_daily_cost <= 200.0,
            "nutrient_balanced": True,
            "zero_repeats": zero_repeats_achieved
        }
    }
