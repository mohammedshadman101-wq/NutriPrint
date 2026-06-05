import sqlite3
import os

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'nutriprint.db')

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # ── NEW: Teachers table (Login/Signup) ──────────────────
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        school_name TEXT NOT NULL,
        district TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # ── NEW: Students table (Class Dashboard) ───────────────
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    )
    ''')

    # ── NEW: BMI Records table (Progress Tracker) ───────────
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS bmi_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        height REAL NOT NULL,
        weight REAL NOT NULL,
        bmi REAL NOT NULL,
        status TEXT NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
    )
    ''')

    # ── NEW: Saved Plans table (QR Code + Recipes) ──────────
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS saved_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        qr_code TEXT UNIQUE NOT NULL,
        teacher_id INTEGER NOT NULL,
        student_id INTEGER,
        plan_data TEXT NOT NULL,
        school_name TEXT NOT NULL,
        teacher_name TEXT NOT NULL,
        student_name TEXT,
        bmi_status TEXT,
        age_group TEXT,
        preference TEXT,
        region TEXT,
        month TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    )
    ''')

    # ── Foods table ─────────────────────────────────────────
    cursor.execute("DROP TABLE IF EXISTS foods")
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_en TEXT NOT NULL,
        name_kn TEXT NOT NULL,
        category TEXT NOT NULL,
        is_veg INTEGER NOT NULL,
        is_egg INTEGER NOT NULL,
        protein REAL NOT NULL,
        calcium REAL NOT NULL,
        iron REAL NOT NULL,
        carbs REAL NOT NULL,
        vitamins TEXT NOT NULL,
        cost REAL NOT NULL,
        recipe_tip_en TEXT NOT NULL,
        recipe_tip_kn TEXT NOT NULL,
        age_recommendation TEXT NOT NULL,
        image_url TEXT NOT NULL,
        regions TEXT NOT NULL,
        serving_size TEXT DEFAULT '1 portion',
        ingredients TEXT DEFAULT '',
        recipe_steps TEXT DEFAULT ''
    )
    ''')

    local_foods = [
        # BREAKFASTS
        (
            "Ragi Dosa", "ರಾಗಿ ದೋಸೆ", "breakfast", 1, 0, 5.8, 310.0, 3.5, 65.0, "B1, B3, C", 20.0,
            "Ferment the batter overnight for soft, fluffy, and digestively light dosas.",
            "ಮೃದುವಾದ ಮತ್ತು ಸುಲಭವಾಗಿ ಜೀರ್ಣವಾಗುವ ದೋಸೆಗಾಗಿ ಹಿಟ್ಟನ್ನು ಇಡೀ ರಾತ್ರಿ ಹುದುಗಿಸಿ.",
            "5-15 years", "/static/images/ragi_dosa.jpg", "All",
            "2 dosas (100g)",
            "Ragi flour 1 cup, Urad dal 1/4 cup, Salt, Water",
            "1. Soak urad dal 4 hours. 2. Grind to smooth paste. 3. Mix with ragi flour and salt. 4. Ferment overnight. 5. Pour on hot tawa, cook both sides. 6. Serve with coconut chutney."
        ),
        (
            "Sprout Upma", "ಮೊಳಕೆ ಉಪ್ಮಾ", "breakfast", 1, 0, 9.2, 55.0, 3.6, 50.0, "C, K, B9", 24.0,
            "Sauté sprouted green gram with mustard seeds, green chillies, and a squeeze of fresh lemon.",
            "ಮೊಳಕೆ ಬರಿಸಿದ ಹೆಸರುಕಾಳನ್ನು ಸಾಸಿವೆ, ಹಸಿಮೆಣಸಿನಕಾಯಿ ಮತ್ತು ನಿಂಬೆ ರಸದೊಂದಿಗೆ ಒಗ್ಗರಣೆ ಹಾಕಿ.",
            "5-15 years", "/static/images/sprout_upma.jpg", "All",
            "1 bowl (150g)",
            "Sprouted green gram 1 cup, Semolina 1/2 cup, Mustard seeds, Green chilli, Lemon, Oil, Salt",
            "1. Sprout green gram for 2 days. 2. Heat oil, add mustard seeds. 3. Add onion, green chilli. 4. Add semolina, roast. 5. Add water and sprouted gram. 6. Cook until thick. 7. Squeeze lemon and serve."
        ),
        (
            "Egg Dosa", "ಮೊಟ್ಟೆ ದೋಸೆ", "breakfast", 0, 1, 11.5, 85.0, 3.9, 55.0, "A, B12, D, E", 32.0,
            "Crack a fresh farm egg directly onto the dosa while cooking on the tawa and sprinkle black pepper.",
            "ದೋಸೆಯನ್ನು ಹಂಚಿನ ಮೇಲೆ ಬೇಯಿಸುವಾಗ ಒಂದು ಮೊಟ್ಟೆಯನ್ನು ಒಡೆದು ಹಾಕಿ, ಮೆಣಸಿನ ಪುಡಿ ಉದುರಿಸಿ.",
            "5-15 years", "/static/images/egg_dosa.jpg", "Mangalore, Udupi, Dakshina Kannada, Bengaluru Rural",
            "1 dosa + 1 egg (150g)",
            "Dosa batter 1 cup, Egg 1, Black pepper, Salt, Oil",
            "1. Heat tawa, pour dosa batter. 2. When half cooked, crack egg on top. 3. Spread gently. 4. Sprinkle pepper and salt. 5. Fold and serve hot."
        ),
        (
            "Idli Sambar", "ಇಡ್ಲಿ ಸಾಂಬಾರ್", "breakfast", 1, 0, 7.1, 48.0, 2.1, 52.0, "B1, B2, B9", 18.0,
            "Steam the fermented batter for exactly 10 minutes to maintain maximum fluffiness.",
            "ಇಡ್ಲಿಯನ್ನು ಕೇವಲ 10 ನಿಮಿಷ ಹಬೆಯಲ್ಲಿ ಬೇಯಿಸಿ ಮೃದುವಾಗಿಸಿ.",
            "5-15 years", "/static/images/idli_sambar.jpg", "All",
            "3 idlis + sambar (200g)",
            "Idli batter 2 cups, Toor dal 1/2 cup, Tomato 2, Onion 1, Tamarind, Sambar powder, Salt",
            "1. Steam idli batter in moulds for 10 minutes. 2. Boil toor dal. 3. Add tomato, onion, tamarind, sambar powder. 4. Cook sambar 15 minutes. 5. Serve hot idlis with sambar and coconut chutney."
        ),
        (
            "Poha with Peanuts", "ಅವಲಕ್ಕಿ ಒಗ್ಗರಣೆ", "breakfast", 1, 0, 6.2, 30.0, 4.5, 46.0, "B1, B3, C", 15.0,
            "Sprinkle freshly grated coconut and chopped coriander leaves immediately after steaming.",
            "ಅವಲಕ್ಕಿ ಬೆಂದ ತಕ್ಷಣ ತಾಜಾ ತೆಂಗಿನತುರಿ ಮತ್ತು ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪನ್ನು ಉದುರಿಸಿ.",
            "5-15 years", "/static/images/poha.jpg", "All",
            "1 bowl (150g)",
            "Flattened rice 1.5 cups, Peanuts 3 tbsp, Mustard seeds, Turmeric, Lemon, Green chilli, Coriander",
            "1. Rinse poha, drain. 2. Heat oil, add mustard seeds, peanuts. 3. Add onion, green chilli, turmeric. 4. Add poha, mix gently. 5. Cover and cook 3 minutes. 6. Add lemon juice, coriander. Serve."
        ),
        (
            "Ragi Roti", "ರಾಗಿ ರೊಟ್ಟಿ", "breakfast", 1, 0, 6.1, 320.0, 3.7, 68.0, "B1, B2, A", 22.0,
            "Add finely chopped onions, dill leaves, and green chillies to the dough.",
            "ಹಿಟ್ಟಿಗೆ ಸಣ್ಣಗೆ ಹೆಚ್ಚಿದ ಈರುಳ್ಳಿ, ಸಬ್ಬಸ್ಸಿಗೆ ಸೊಪ್ಪು ಮತ್ತು ಹಸಿಮೆಣಸಿನಕಾಯಿ ಸೇರಿಸಿ.",
            "5-15 years", "/static/images/ragi_roti.jpg", "Bengaluru Rural, Shivamogga",
            "2 rotis (80g)",
            "Ragi flour 1 cup, Onion 1 small, Dill leaves handful, Green chilli 1, Salt, Water",
            "1. Mix ragi flour with chopped onion, dill, chilli, salt. 2. Add hot water gradually and knead. 3. Pat into round rotis on a wet cloth. 4. Cook on hot tawa both sides. 5. Serve with chutney."
        ),
        (
            "Jowar Dosa", "ಜೋಳದ ದೋಸೆ", "breakfast", 1, 0, 6.5, 25.0, 3.2, 63.0, "B3, B5, E", 21.0,
            "Serve crisp with fresh tomato-onion chutney or groundnut chutney.",
            "ಟೊಮೆಟೊ ಈರುಳ್ಳಿ ಚಟ್ನಿ ಅಥವಾ ಶೇಂಗಾ ಚಟ್ನಿಯೊಂದಿಗೆ ಗರಿಗರಿಯಾಗಿ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/jowar_dosa.jpg", "Shivamogga, Bengaluru Rural",
            "2 dosas (100g)",
            "Jowar flour 1 cup, Rice flour 1/4 cup, Onion 1, Green chilli 1, Cumin, Salt, Water",
            "1. Mix jowar flour, rice flour, salt. 2. Add water to make thin batter. 3. Add chopped onion, chilli, cumin. 4. Pour on hot tawa, spread thin. 5. Drizzle oil, cook crisp. 6. Serve with peanut chutney."
        ),
        (
            "Semolina Rava Idli", "ರವೆ ಇಡ್ಲಿ", "breakfast", 1, 0, 5.5, 38.0, 1.8, 54.0, "B1, B3, B6", 19.0,
            "Add a pinch of grated ginger and cashew nuts tempered in ghee to the batter before steaming.",
            "ಹಬೆಯಲ್ಲಿ ಬೇಯಿಸುವ ಮುನ್ನ ಶುಂಠಿ ತುರಿ ಮತ್ತು ತುಪ್ಪದಲ್ಲಿ ಹುರಿದ ಗೋಡಂಬಿಯನ್ನು ಹಿಟ್ಟಿಗೆ ಸೇರಿಸಿ.",
            "5-15 years", "/static/images/rava_idli.jpg", "All",
            "3 idlis (150g)",
            "Semolina 1 cup, Curd 1 cup, Cashews, Mustard seeds, Ginger, Baking soda, Salt",
            "1. Roast semolina. 2. Mix with curd, salt, baking soda. 3. Rest 20 minutes. 4. Temper cashews in ghee. 5. Add to batter. 6. Pour in greased idli moulds. 7. Steam 12 minutes. Serve with sambar."
        ),
        (
            "Wheat Upma", "ಗೋಧಿ ರವೆ ಉಪ್ಮಾ", "breakfast", 1, 0, 7.0, 42.0, 2.5, 58.0, "B3, E, Iron", 17.0,
            "Cook broken wheat with loaded local vegetables like carrots, beans, and fresh peas.",
            "ನುಚ್ಚು ಗೋಧಿಯನ್ನು ಕ್ಯಾರೆಟ್, ಬೀನ್ಸ್ ಮತ್ತು ಬಟಾಣಿಯೊಂದಿಗೆ ಬೇಯಿಸಿ.",
            "5-15 years", "/static/images/wheat_upma.jpg", "All",
            "1 bowl (150g)",
            "Broken wheat 1 cup, Carrot 1, Beans 10, Peas 1/4 cup, Onion 1, Mustard seeds, Oil, Salt",
            "1. Roast broken wheat. 2. Heat oil, add mustard seeds. 3. Add onion, vegetables. 4. Add water (2:1 ratio). 5. Add roasted wheat, salt. 6. Cover and cook 10 minutes. 7. Serve hot."
        ),
        # LUNCHES
        (
            "Ragi Mudde with Sambar", "ರಾಗಿ ಮುದ್ದೆ ಮತ್ತು ಸಾಂಬಾರ್", "lunch", 1, 0, 5.2, 344.0, 3.9, 72.0, "B1, B2, B6", 25.0,
            "Serve piping hot with a spoonful of pure ghee and steaming hot vegetable sambar.",
            "ಬಿಸಿಬಿಸಿ ಮುದ್ದೆಯನ್ನು ಒಂದು ಚಮಚ ತುಪ್ಪ ಮತ್ತು ಬಿಸಿ ತರಕಾರಿ ಸಾಂಬಾರ್ ಜೊತೆಗೆ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/ragi_mudde.jpg", "Bengaluru Rural, Shivamogga",
            "2 mudde + sambar (250g)",
            "Ragi flour 2 cups, Water 2 cups, Salt, Toor dal, Vegetables, Sambar powder",
            "1. Boil water with salt. 2. Add ragi flour gradually, stirring. 3. Cook on low flame 5 minutes. 4. Shape into balls (mudde). 5. Prepare sambar with dal and vegetables. 6. Serve hot mudde with sambar and ghee."
        ),
        (
            "Jowar Roti with Veggies", "ಜೋಳದ ರೊಟ್ಟಿ ಮತ್ತು ಪಲ್ಯ", "lunch", 1, 0, 8.4, 28.0, 4.1, 72.0, "B3, B5, E", 18.0,
            "Best served hot with traditional roasted eggplant curry or spicy peanut chutney powder.",
            "ಎಣ್ಣೆಗಾಯಿ ಬದನೆಕಾಯಿ ಪಲ್ಯ ಅಥವಾ ಶೇಂಗಾ ಚಟ್ನಿ ಪುಡಿಯೊಂದಿಗೆ ಬಿಸಿಬಿಸಿಯಾಗಿ ಸವಿಯಿರಿ.",
            "9-15 years", "/static/images/jowar_roti.jpg", "Shivamogga",
            "2 rotis + palya (180g)",
            "Jowar flour 2 cups, Hot water, Salt, Eggplant 2, Onion 1, Peanuts, Spices",
            "1. Mix jowar flour with hot water and salt, knead. 2. Pat into thick rotis. 3. Cook on dry tawa. 4. For palya: roast eggplant, mash. 5. Add peanut powder, spices, onion. 6. Serve roti with palya."
        ),
        (
            "Coconut Rice", "ತೆಂಗಿನಕಾಯಿ ಅನ್ನ", "lunch", 1, 0, 4.5, 12.0, 1.8, 60.0, "C, E, B6", 28.0,
            "Garnish with freshly grated coconut, crispy roasted cashews, curry leaves, and a dash of lemon juice.",
            "ತಾಜಾ ತೆಂಗಿನತುರಿ, ಗರಿಗರಿ ಗೋಡಂಬಿ, ಕರಿಬೇವು ಮತ್ತು ನಿಂಬೆ ರಸದಿಂದ ಅಲಂಕರಿಸಿ.",
            "5-15 years", "/static/images/coconut_rice.jpg", "Mangalore, Udupi, Dakshina Kannada",
            "1 cup (200g)",
            "Cooked rice 2 cups, Grated coconut 1/2 cup, Mustard seeds, Cashews, Curry leaves, Urad dal, Oil",
            "1. Cook rice and let cool. 2. Heat oil, add mustard seeds, urad dal, cashews. 3. Add curry leaves, grated coconut. 4. Stir 2 minutes. 5. Add rice, mix gently. 6. Add salt, lemon juice. 7. Serve with papad."
        ),
        (
            "Dal Khichdi", "ಬೇಳೆ ಖಿಚಡಿ", "lunch", 1, 0, 8.5, 45.0, 3.2, 58.0, "A, B1, C", 22.0,
            "Drizzle with a teaspoon of pure ghee before serving to aid absorption of fat-soluble vitamins.",
            "ಕೊಬ್ಬಿನಲ್ಲಿ ಕರಗುವ ಜೀವಸತ್ವಗಳ ಹೀರಿಕೊಳ್ಳುವಿಕೆಗೆ ಬಡಿಸುವ ಮುನ್ನ ಒಂದು ಚಮಚ ತುಪ್ಪ ಹಾಕಿ.",
            "5-15 years", "/static/images/dal_khichdi.jpg", "All",
            "1 bowl (200g)",
            "Rice 1 cup, Moong dal 1/2 cup, Ghee 1 tsp, Cumin, Turmeric, Ginger, Salt",
            "1. Wash rice and dal together. 2. Heat ghee, add cumin seeds. 3. Add ginger, turmeric. 4. Add rice and dal. 5. Add water (3:1 ratio). 6. Pressure cook 3 whistles. 7. Serve hot with pickle."
        ),
        (
            "Sambar Rice", "ಸಾಂಬಾರ್ ಅನ್ನ", "lunch", 1, 0, 6.8, 52.0, 2.5, 62.0, "A, C, B9", 26.0,
            "Add local seasonal vegetables like drumsticks, carrots, and yellow pumpkin.",
            "ನಾರಿನಂಶ ಮತ್ತು ಜೀವಸತ್ವಗಳಿಗಾಗಿ ನುಗ್ಗೆಕಾಯಿ, ಕ್ಯಾರೆಟ್ ಮತ್ತು ಕುಂಬಳಕಾಯಿ ಸೇರಿಸಿ.",
            "5-15 years", "/static/images/sambar_rice.jpg", "All",
            "1 plate (250g)",
            "Rice 1 cup, Toor dal 1/2 cup, Drumstick 2, Carrot 1, Pumpkin, Tamarind, Sambar powder, Mustard",
            "1. Cook rice separately. 2. Boil dal until soft. 3. Add drumstick, carrot, pumpkin. 4. Add tamarind extract, sambar powder. 5. Temper with mustard, curry leaves. 6. Mix rice with sambar. 7. Serve hot."
        ),
        (
            "Egg Curry with Rice", "ಮೊಟ್ಟೆ ಸಾರು ಮತ್ತು ಅನ್ನ", "lunch", 0, 1, 12.0, 60.0, 2.8, 54.0, "A, B12, D", 30.0,
            "Simmer hard-boiled eggs in a mildly spiced onion, tomato, and fresh coconut gravy.",
            "ಬೇಯಿಸಿದ ಮೊಟ್ಟೆಗಳನ್ನು ಈರುಳ್ಳಿ, ಟೊಮೆಟೊ ಮತ್ತು ತೆಂಗಿನಕಾಯಿ ಮಸಾಲೆಯೊಂದಿಗೆ ಬೇಯಿಸಿ.",
            "5-15 years", "/static/images/egg_curry.jpg", "All",
            "2 eggs + gravy + rice (300g)",
            "Eggs 2, Onion 2, Tomato 2, Coconut 1/4, Ginger-garlic paste, Red chilli powder, Coriander powder, Oil",
            "1. Hard boil eggs, peel. 2. Fry onion until golden. 3. Add ginger-garlic paste, cook. 4. Add tomato, spices. 5. Add coconut paste. 6. Add eggs, simmer 10 minutes. 7. Serve with steamed rice."
        ),
        (
            "Coastal Fish Curry with Rice", "ಮೀನು ಸಾರು ಮತ್ತು ಅನ್ನ", "lunch", 0, 0, 14.5, 110.0, 2.2, 58.0, "Omega-3, D, B2", 42.0,
            "Use fresh local coastal fish cooked in a tangy tamarind-coconut gravy.",
            "ತಾಜಾ ಕರಾವಳಿ ಮೀನನ್ನು ಹುಣಸೆಹಣ್ಣು ಮತ್ತು ತೆಂಗಿನಕಾಯಿ ಸಾರಿನಲ್ಲಿ ಬೇಯಿಸಿ.",
            "5-15 years", "/static/images/fish_curry.jpg", "Mangalore, Udupi, Dakshina Kannada",
            "1 piece fish + curry + rice (300g)",
            "Fish 200g, Coconut 1/2, Tamarind small ball, Red chillies 4, Coriander seeds, Garlic, Turmeric",
            "1. Grind coconut, tamarind, red chillies, coriander to paste. 2. Heat oil, add garlic. 3. Add ground paste with water. 4. Bring to boil. 5. Add fish pieces. 6. Cook 8-10 minutes. 7. Serve with steamed rice."
        ),
        (
            "Bisi Bele Bath", "ಬಿಸಿ ಬೇಳೆ ಬಾತ್", "lunch", 1, 0, 7.8, 55.0, 3.1, 59.0, "A, B3, C, K", 29.0,
            "Cook rice, lentils and mixed vegetables with freshly ground local spices and tamarind.",
            "ತಾಜಾ ರುಬ್ಬಿದ ಮಸಾಲೆ, ಹುಣಸೆಹಣ್ಣು ಮತ್ತು ತರಕಾರಿಗಳೊಂದಿಗೆ ಬಿಸಿ ಬೇಳೆ ಬಾತ್ ಮಾಡಿ.",
            "5-15 years", "/static/images/bisi_bele_bath.jpg", "All",
            "1 bowl (250g)",
            "Rice 1 cup, Toor dal 1/2 cup, Mixed vegetables, Tamarind, Bisibelebath powder, Ghee, Cashews",
            "1. Pressure cook rice and dal together. 2. Cook vegetables separately. 3. Add tamarind extract, bisibelebath powder. 4. Mix everything together. 5. Simmer 10 minutes. 6. Temper with ghee, cashews. 7. Serve hot."
        ),
        # SNACKS
        (
            "Groundnut Chikki", "ಶೇಂಗಾ ಚಿಕ್ಕಿ", "snack", 1, 0, 8.0, 62.0, 2.9, 34.0, "E, B3, B9", 10.0,
            "Combine roasted split peanuts with thick jaggery syrup for an instant iron and protein boost.",
            "ತತ್‌ಕ್ಷಣದ ಶಕ್ತಿ ಮತ್ತು ಕಬ್ಬಿಣಾಂಶಕ್ಕಾಗಿ ಹುರಿದ ಶೇಂಗಾ ಮತ್ತು ಬೆಲ್ಲದ ಪಾಕದಿಂದ ಸಿದ್ಧಪಡಿಸಿ.",
            "5-15 years", "/static/images/chikki.jpg", "All",
            "2 pieces (30g)",
            "Roasted peanuts 1 cup, Jaggery 1/2 cup, Water 2 tbsp, Ghee",
            "1. Roast peanuts, remove skin. 2. Melt jaggery with water. 3. Cook to hard-ball stage. 4. Add peanuts quickly. 5. Pour on greased plate. 6. Flatten with roller. 7. Cut into pieces before it cools."
        ),
        (
            "Banana Sheera", "ಬಾಳೆಹಣ್ಣಿನ ಶೀರಾ", "snack", 1, 0, 3.2, 20.0, 1.2, 48.0, "A, B6, C", 20.0,
            "Use sweet, ripe local Elaichi bananas and organic jaggery to avoid refined white sugar.",
            "ಬಿಳಿ ಸಕ್ಕರೆಯ ಬದಲು ಸಿಹಿ ಏಲಕ್ಕಿ ಬಾಳೆಹಣ್ಣು ಮತ್ತು ಸಾವಯವ ಬೆಲ್ಲವನ್ನು ಬಳಸಿ.",
            "5-15 years", "/static/images/banana_sheera.jpg", "All",
            "1 bowl (150g)",
            "Banana 2, Semolina 1/2 cup, Jaggery 3 tbsp, Ghee 1 tbsp, Cardamom, Cashews",
            "1. Mash bananas. 2. Roast semolina in ghee. 3. Add water, cook semolina. 4. Add mashed banana. 5. Add jaggery, cardamom. 6. Stir until thick. 7. Garnish with cashews and serve warm."
        ),
        (
            "Spiced Bengal Gram Usli", "ಕಡಲೆಕಾಳು ಉಸ್ಲಿ", "snack", 1, 0, 8.5, 65.0, 3.4, 30.0, "Protein, Iron, Fiber", 15.0,
            "Boil black chickpeas and temper with mustard seeds, curry leaves, and freshly grated coconut.",
            "ಬೇಯಿಸಿದ ಕಡಲೆಕಾಳಿಗೆ ಸಾಸಿವೆ, ಕರಿಬೇವು ಮತ್ತು ಹಸಿ ತೆಂಗಿನತುರಿ ಸೇರಿಸಿ.",
            "5-15 years", "/static/images/kadalekalu_usli.jpg", "All",
            "1/2 cup (80g)",
            "Black chickpeas 1 cup, Mustard seeds, Curry leaves, Coconut, Green chilli, Oil, Salt, Lemon",
            "1. Soak chickpeas overnight. 2. Pressure cook until soft. 3. Heat oil, add mustard seeds. 4. Add curry leaves, green chilli. 5. Add cooked chickpeas. 6. Add grated coconut, salt. 7. Squeeze lemon. Serve."
        ),
        (
            "Ragi Malt", "ರಾಗಿ ಗಂಜಿ", "snack", 1, 0, 4.0, 280.0, 2.8, 38.0, "Calcium, Iron, B1", 12.0,
            "Whisk ragi flour in water or milk, boil thoroughly, and sweeten lightly with organic jaggery.",
            "ರಾಗಿ ಹಿಟ್ಟನ್ನು ಹಾಲು ಅಥವಾ ನೀರಿನಲ್ಲಿ ಬೇಯಿಸಿ, ಸ್ವಲ್ಪ ಬೆಲ್ಲ ಸೇರಿಸಿ ಕುಡಿಸಿ.",
            "5-15 years", "/static/images/ragi_malt.jpg", "All",
            "1 glass (200ml)",
            "Ragi flour 2 tbsp, Milk or water 1 cup, Jaggery 1 tbsp, Cardamom pinch",
            "1. Mix ragi flour in cold water to smooth paste. 2. Heat milk. 3. Add ragi paste to hot milk. 4. Stir continuously to avoid lumps. 5. Cook 5 minutes on low flame. 6. Add jaggery and cardamom. 7. Serve warm."
        ),
        (
            "Steamed Sweet Potato", "ಬೇಯಿಸಿದ ಸಿಹಿ ಗೆಣಸು", "snack", 1, 0, 2.0, 30.0, 0.8, 27.0, "A, C, B6", 12.0,
            "Steam sweet potatoes until soft and sprinkle a tiny pinch of cardamom powder.",
            "ಸಿಹಿ ಗೆಣಸನ್ನು ಹಬೆಯಲ್ಲಿ ಬೇಯಿಸಿ, ಸಿಪ್ಪೆ ಸುಲಿದು ಸ್ವಲ್ಪ ಏಲಕ್ಕಿ ಪುಡಿ ಉದುರಿಸಿ.",
            "5-15 years", "/static/images/sweet_potato.jpg", "Mangalore, Udupi, Dakshina Kannada, Shivamogga",
            "1 medium (130g)",
            "Sweet potato 2 medium, Cardamom pinch, Salt optional",
            "1. Wash sweet potatoes. 2. Steam for 20 minutes until soft. 3. Peel skin. 4. Sprinkle cardamom. 5. Serve warm as evening snack."
        ),
        # DINNERS
        (
            "Curd Rice", "ಮೊಸರನ್ನ", "dinner", 1, 0, 5.5, 180.0, 0.8, 42.0, "B2, B12, D", 18.0,
            "Temper with mustard seeds, grated ginger, and a few pomegranate pearls for digestive health.",
            "ಒಗ್ಗರಣೆ ಕೊಟ್ಟು ದ್ರಾಕ್ಷಿ ಅಥವಾ ದಾಳಿಂಬೆ ಕಾಳುಗಳನ್ನು ಸೇರಿಸಿ.",
            "5-15 years", "/static/images/curd_rice.jpg", "All",
            "1 bowl (200g)",
            "Cooked rice 1 cup, Curd 1 cup, Milk 2 tbsp, Mustard seeds, Curry leaves, Ginger, Green chilli, Salt",
            "1. Mash cooked rice. 2. Mix with curd and milk. 3. Add salt. 4. Temper mustard seeds, curry leaves. 5. Add ginger, green chilli. 6. Pour over curd rice. 7. Mix gently. 8. Serve cool or at room temperature."
        ),
        (
            "Vegetable Pulav", "ತರಕಾರಿ ಪಲಾವ್", "dinner", 1, 0, 6.2, 45.0, 2.0, 68.0, "A, C, E, K", 27.0,
            "Use regional sona masuri rice with mint, coriander, and green peas.",
            "ಸೋನಾ ಮಸೂರಿ ಅಕ್ಕಿಯೊಂದಿಗೆ ಪುದೀನಾ, ಕೊತ್ತಂಬರಿ ಮತ್ತು ಹಸಿರು ತರಕಾರಿಗಳನ್ನು ಸೇರಿಸಿ.",
            "5-15 years", "/static/images/veg_pulav.jpg", "All",
            "1 cup (180g)",
            "Basmati rice 1 cup, Mixed vegetables, Mint, Coriander, Whole spices, Ghee, Salt",
            "1. Soak rice 30 minutes. 2. Heat ghee, add whole spices. 3. Add onion, cook until golden. 4. Add vegetables, mint, coriander. 5. Add rice. 6. Add water (1.5:1 ratio). 7. Cover and cook 15 minutes. Serve hot."
        ),
        (
            "Wheat Chapati with Dal", "ಚಪಾತಿ ಮತ್ತು ಬೇಳೆ ಸಾರು", "dinner", 1, 0, 8.0, 40.0, 3.1, 55.0, "B-complex, Protein", 22.0,
            "Knead the wheat flour with lukewarm water and a drop of oil to ensure chapatis remain soft.",
            "ಮೆದುವಾದ ಚಪಾತಿಗಳಿಗಾಗಿ ಗೋಧಿ ಹಿಟ್ಟನ್ನು ಉಗುರುಬೆಚ್ಚಗಿನ ನೀರು ಮತ್ತು ಎಣ್ಣೆಯಿಂದ ಕಲಸಿ.",
            "5-15 years", "/static/images/chapati_dal.jpg", "All",
            "2 chapatis + dal (200g)",
            "Wheat flour 1 cup, Oil 1 tsp, Salt, Warm water, Toor dal 1/2 cup, Tomato, Spices",
            "1. Knead flour with water, oil, salt. Rest 20 minutes. 2. Roll into thin circles. 3. Cook on hot tawa both sides. 4. For dal: cook toor dal. 5. Add fried tomato, onion, spices. 6. Boil 5 minutes. 7. Serve chapati with dal."
        ),
        (
            "Egg Bhurji with Chapati", "ಮೊಟ್ಟೆ ಬುರ್ಜಿ ಮತ್ತು ಚಪಾತಿ", "dinner", 0, 1, 13.0, 75.0, 3.2, 48.0, "A, B12, D, E", 32.0,
            "Sauté scrambled eggs with onions, green chillies, coriander, and serve with wheat chapati.",
            "ಈರುಳ್ಳಿ, ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು ಹಾಕಿ ಮಾಡಿದ ಮೊಟ್ಟೆ ಬುರ್ಜಿಯನ್ನು ಬಿಸಿ ಗೋಧಿ ಚಪಾತಿಯೊಂದಿಗೆ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/egg_bhurji.jpg", "All",
            "2 eggs + 2 chapatis (250g)",
            "Eggs 2, Onion 1, Tomato 1, Green chilli, Coriander, Turmeric, Salt, Oil, Wheat flour for chapati",
            "1. Beat eggs. 2. Heat oil, add onion, green chilli. 3. Add tomato, turmeric. 4. Add beaten eggs. 5. Scramble on medium heat. 6. Add coriander. 7. Make soft chapatis. 8. Serve bhurji with hot chapati."
        ),
        (
            "Moong Dal Khichdi", "ಹೆಸರುಬೇಳೆ ಖಿಚಡಿ", "dinner", 1, 0, 8.2, 48.0, 3.0, 56.0, "A, B, C", 21.0,
            "Prepare this light comforting dinner especially on cold or rainy nights with cumin.",
            "ಜೀರಿಗೆ ಒಗ್ಗರಣೆಯೊಂದಿಗೆ ಜೀರ್ಣಿಸಿಕೊಳ್ಳಲು ಹಗುರವಾದ ಹೆಸರುಬೇಳೆ ಖಿಚಡಿ ಮಾಡಿ.",
            "5-15 years", "/static/images/moong_dal_khichdi.jpg", "All",
            "1 bowl (200g)",
            "Rice 1 cup, Moong dal 1/2 cup, Ghee, Cumin, Turmeric, Ginger, Salt",
            "1. Wash rice and dal. 2. Heat ghee in pressure cooker. 3. Add cumin, ginger. 4. Add rice and dal. 5. Add water (3:1), turmeric, salt. 6. Pressure cook 3 whistles. 7. Serve hot with pickle and papad."
        ),
        (
            "Chicken Saaru with Rice", "ಕೋಳಿ ಸಾರು ಮತ್ತು ಅನ್ನ", "dinner", 0, 0, 15.0, 22.0, 2.5, 56.0, "B6, B12, Zinc", 45.0,
            "Cook tender chicken in aromatic home-ground spices and thick coconut milk broth.",
            "ನಾಟಿ ಕೋಳಿ ಮಾಂಸವನ್ನು ತಾಜಾ ರುಬ್ಬಿದ ಮಸಾಲೆ ಮತ್ತು ತೆಂಗಿನ ಹಾಲಿನಲ್ಲಿ ಬೇಯಿಸಿ.",
            "5-15 years", "/static/images/chicken_saaru.jpg", "All",
            "1 piece + curry + rice (300g)",
            "Chicken 250g, Coconut 1/2, Onion 2, Tomato 2, Ginger-garlic, Red chilli, Coriander, Cumin, Oil",
            "1. Grind coconut with spices. 2. Fry onion golden. 3. Add ginger-garlic paste. 4. Add tomato, cook. 5. Add ground coconut paste. 6. Add chicken pieces. 7. Add water, cook 25 minutes. 8. Serve with steamed rice."
        ),
    ]

    cursor.executemany('''
    INSERT INTO foods (
        name_en, name_kn, category, is_veg, is_egg,
        protein, calcium, iron, carbs, vitamins, cost,
        recipe_tip_en, recipe_tip_kn, age_recommendation, image_url, regions,
        serving_size, ingredients, recipe_steps
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', local_foods)

    conn.commit()
    print("Database seeded successfully with recipes!")
    conn.close()

if __name__ == "__main__":
    init_db()
