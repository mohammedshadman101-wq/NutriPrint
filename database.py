import os
import psycopg2
from psycopg2.extras import RealDictCursor

# ── Connection ────────────────────────────────────────────────
# Set DATABASE_URL in Render environment variables
# Format: postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

def init_db():
    conn = get_db_connection()
    
    try:
        with conn.cursor() as cursor:
            # ── Teachers ─────────────────────────────────────────────
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS teachers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                school_name TEXT NOT NULL,
                district TEXT NOT NULL,
                phone TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')

            # ── Students ─────────────────────────────────────────────
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL
            )
            ''')

            # ── BMI Records ───────────────────────────────────────────
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS bmi_records (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                height REAL NOT NULL,
                weight REAL NOT NULL,
                bmi REAL NOT NULL,
                status TEXT NOT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')

            # ── Saved Plans ───────────────────────────────────────────
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS saved_plans (
                id SERIAL PRIMARY KEY,
                qr_code TEXT UNIQUE NOT NULL,
                teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')

            # ── Foods ─────────────────────────────────────────────────
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS foods (
                id SERIAL PRIMARY KEY,
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
            
            # Safely commit schema modifications before checking row count
            conn.commit()

            # Seed foods only if table is empty
            cursor.execute("SELECT COUNT(*) as count FROM foods")
            result = cursor.fetchone()
            count = result['count'] if result else 0

            if count == 0:
                local_foods = [
                    ("Ragi Dosa", "ರಾಗಿ ದೋಸೆ", "breakfast", 1, 0, 5.8, 310.0, 3.5, 65.0, "B1, B3, C", 20.0,
                     "Ferment the batter overnight for soft, fluffy, and digestively light dosas.",
                     "ಮೃದುವಾದ ಮತ್ತು ಸುಲಭವಾಗಿ ಜೀರ್ಣವಾಗುವ ದೋಸೆಗಾಗಿ ಹಿಟ್ಟನ್ನು ಇಡೀ ರಾತ್ರಿ ಹುದುಗಿಸಿ.",
                     "5-15 years", "/static/images/ragi_dosa.jpg", "All", "2 dosas (100g)",
                     "Ragi flour 1 cup, Urad dal 1/4 cup, Salt, Water",
                     "1. Soak urad dal 4 hours. 2. Grind to smooth paste. 3. Mix with ragi flour and salt. 4. Ferment overnight. 5. Pour on hot tawa, cook both sides. 6. Serve with coconut chutney."),
                    ("Sprout Upma", "ಮೊಳಕೆ ಉಪ್ಮಾ", "breakfast", 1, 0, 9.2, 55.0, 3.6, 50.0, "C, K, B9", 24.0,
                     "Sauté sprouted green gram with mustard seeds, green chillies, and a squeeze of fresh lemon.",
                     "ಮೊಳಕೆ ಬರಿಸಿದ ಹೆಸರುಕಾಳನ್ನು ಸಾಸಿವೆ, ಹಸಿಮೆಣಸಿನಕಾಯಿ ಮತ್ತು ನಿಂಬೆ ರಸದೊಂದಿಗೆ ಒಗ್ಗರಣೆ ಹಾಕಿ.",
                     "5-15 years", "/static/images/sprout_upma.jpg", "All", "1 bowl (150g)",
                     "Sprouted green gram 1 cup, Semolina 1/2 cup, Mustard seeds, Green chilli, Lemon, Oil, Salt",
                     "1. Sprout green gram for 2 days. 2. Heat oil, add mustard seeds. 3. Add onion, green chilli. 4. Add semolina, roast. 5. Add water and sprouted gram. 6. Cook until thick. 7. Squeeze lemon and serve."),
                    ("Egg Dosa", "ಮೊಟ್ಟೆ ದೋಸೆ", "breakfast", 0, 1, 11.5, 85.0, 3.9, 55.0, "A, B12, D, E", 32.0,
                     "Crack a fresh farm egg directly onto the dosa while cooking on the tawa and sprinkle black pepper.",
                     "ದೋಸೆಯನ್ನು ಹಂಚಿನ ಮೇಲೆ ಬೇಯಿಸುವಾಗ ಒಂದು ಮೊಟ್ಟೆಯನ್ನು ಒಡೆದು ಹಾಕಿ, ಮೆಣಸಿನ ಪುಡಿ ಉದುರಿಸಿ.",
                     "5-15 years", "/static/images/egg_dosa.jpg", "Mangalore, Udupi, Dakshina Kannada, Bengaluru Rural", "1 dosa + 1 egg (150g)",
                     "Dosa batter 1 cup, Egg 1, Black pepper, Salt, Oil",
                     "1. Heat tawa, pour dosa batter. 2. When half cooked, crack egg on top. 3. Spread gently. 4. Sprinkle pepper and salt. 5. Fold and serve hot."),
                    ("Idli Sambar", "ಇಡ್ಲಿ ಸಾಂಬಾರ್", "breakfast", 1, 0, 7.1, 48.0, 2.1, 52.0, "B1, B2, B9", 18.0,
                     "Steam the fermented batter for exactly 10 minutes to maintain maximum fluffiness.",
                     "ಇಡ್ಲಿಯನ್ನು ಕೇವಲ 10 ನಿಮಿಷ ಹಬೆಯಲ್ಲಿ ಬೇಯಿಸಿ ಮೃದುವಾಗಿಸಿ.",
                     "5-15 years", "/static/images/idli_sambar.jpg", "All", "3 idlis + sambar (200g)",
                     "Idli batter 2 cups, Toor dal 1/2 cup, Tomato 2, Onion 1, Tamarind, Sambar powder, Salt",
                     "1. Steam idli batter in moulds for 10 minutes. 2. Boil toor dal. 3. Add tomato, onion, tamarind, sambar powder. 4. Cook sambar 15 minutes. 5. Serve hot idlis with sambar and coconut chutney."),
                    ("Poha with Peanuts", "ಅವಲಕ್ಕಿ ಒಗ್ಗರಣೆ", "breakfast", 1, 0, 6.2, 30.0, 4.5, 46.0, "B1, B3, C", 15.0,
                     "Sprinkle freshly grated coconut and chopped coriander leaves immediately after steaming.",
                     "ಅವಲಕ್ಕಿ ಬೆಂದ ತಕ್ಷಣತಾಜಾ ತೆಂಗಿನತುರಿ ಮತ್ತು ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪನ್ನು ಉದುರಿಸಿ.",
                     "5-15 years", "/static/images/poha.jpg", "All", "1 bowl (150g)",
                     "Flattened rice 1.5 cups, Peanuts 3 tbsp, Mustard seeds, Turmeric, Lemon, Green chilli, Coriander",
                     "1. Rinse poha, drain. 2. Heat oil, add mustard seeds, peanuts. 3. Add onion, green chilli, turmeric. 4. Add poha, mix gently. 5. Cover and cook 3 minutes. 6. Add lemon juice, coriander. Serve."),
                    ("Ragi Mudde with Sambar", "ರಾಗಿ ಮುದ್ದೆ ಮತ್ತು ಸಾಂಬಾರ್", "lunch", 1, 0, 5.2, 344.0, 3.9, 72.0, "B1, B2, B6", 25.0,
                     "Serve piping hot with a spoonful of pure ghee and steaming hot vegetable sambar.",
                     "ಬಿಸಿಬಿಸಿ ಮುದ್ದೆಯನ್ನು ಒಂದು ಚಮಚ ತುಪ್ಪ ಮತ್ತು ಬಿಸಿ ತರಕಾರಿ ಸಾಂಬಾರ್ ಜೊತೆಗೆ ಬಡಿಸಿ.",
                     "5-15 years", "/static/images/ragi_mudde.jpg", "Bengaluru Rural, Shivamogga", "2 mudde + sambar (250g)",
                     "Ragi flour 2 cups, Water 2 cups, Salt, Toor dal, Vegetables, Sambar powder",
                     "1. Boil water with salt. 2. Add ragi flour gradually, stirring. 3. Cook on low flame 5 minutes. 4. Shape into balls (mudde). 5. Prepare sambar with dal and vegetables. 6. Serve hot mudde with sambar and ghee."),
                    ("Coconut Rice", "ತೆಂಗಿನಕಾಯಿ ಅನ್ನ", "lunch", 1, 0, 4.5, 12.0, 1.8, 60.0, "C, E, B6", 28.0,
                     "Garnish with freshly grated coconut, crispy roasted cashews, curry leaves, and a dash of lemon juice.",
                     "ತಾಜಾ ತೆಂಗಿನತುರಿ, ಗರಿಗರಿ ಗೋಡಂಬಿ, ಕರಿಬೇವು ಮತ್ತು ನಿಂಬೆ ರಸದಿಂದ ಅಲಂಕರಿಸಿ.",
                     "5-15 years", "/static/images/coconut_rice.jpg", "Mangalore, Udupi, Dakshina Kannada", "1 cup (200g)",
                     "Cooked rice 2 cups, Grated coconut 1/2 cup, Mustard seeds, Cashews, Curry leaves, Urad dal, Oil",
                     "1. Cook rice and let cool. 2. Heat oil, add mustard seeds, urad dal, cashews. 3. Add curry leaves, grated coconut. 4. Stir 2 minutes. 5. Add rice, mix gently. 6. Add salt, lemon juice. 7. Serve with papad."),
                    ("Sambar Rice", "ಸಾಂಬಾರ್ ಅನ್ನ", "lunch", 1, 0, 6.8, 52.0, 2.5, 62.0, "A, C, B9", 26.0,
                     "Add local seasonal vegetables like drumsticks, carrots, and yellow pumpkin.",
                     "ನಾರಿನಂಶ ಮತ್ತು ಜೀವಸತ್ವಗಳಿಗಾಗಿ ನುಗ್ಗೆಕಾಯಿ, ಕ್ಯಾರೆಟ್ ಮತ್ತು ಕುಂಬಳಕಾಯಿ ಸೇರಿಸಿ.",
                     "5-15 years", "/static/images/sambar_rice.jpg", "All", "1 plate (250g)",
                     "Rice 1 cup, Toor dal 1/2 cup, Drumstick 2, Carrot 1, Pumpkin, Tamarind, Sambar powder, Mustard",
                     "1. Cook rice separately. 2. Boil dal until soft. 3. Add drumstick, carrot, pumpkin. 4. Add tamarind extract, sambar powder. 5. Temper with mustard, curry leaves. 6. Mix rice with sambar. 7. Serve hot."),
                    ("Groundnut Chikki", "ಶೇಂಗಾ ಚಿಕ್ಕಿ", "snack", 1, 0, 8.0, 62.0, 2.9, 34.0, "E, B3, B9", 10.0,
                     "Combine roasted split peanuts with thick jaggery syrup for an instant iron and protein boost.",
                     "ತತ್‌ಕ್ಷಣದ ಶಕ್ತಿ ಮತ್ತು ಕಬ್ಬಿಣಾಂಶಕ್ಕಾಗಿ ಹುರಿದ ಶೇಂಗಾ ಮತ್ತು ಬೆಲ್ಲದ ಪಾಕದಿಂದ ಸಿದ್ಧಪಡಿಸಿ.",
                     "5-15 years", "/static/images/chikki.jpg", "All", "2 pieces (30g)",
                     "Roasted peanuts 1 cup, Jaggery 1/2 cup, Water 2 tbsp, Ghee",
                     "1. Roast peanuts, remove skin. 2. Melt jaggery with water. 3. Cook to hard-ball stage. 4. Add peanuts quickly. 5. Pour on greased plate. 6. Flatten with roller. 7. Cut into pieces before it cools."),
                    ("Ragi Malt", "ರಾಗಿ ಗಂಜಿ", "snack", 1, 0, 4.0, 280.0, 2.8, 38.0, "Calcium, Iron, B1", 12.0,
                     "Whisk ragi flour in water or milk, boil thoroughly, and sweeten lightly with organic jaggery.",
                     "ರಾಗಿ ಹಿಟ್ಟನ್ನು ಹಾಲು ಅಥವಾ ನೀರಿನಲ್ಲಿ ಬೇಯಿಸಿ, ಸ್ವಲ್ಪ ಬೆಲ್ಲ ಸೇರಿಸಿ ಕುಡಿಸಿ.",
                     "5-15 years", "/static/images/ragi_malt.jpg", "All", "1 glass (200ml)",
                     "Ragi flour 2 tbsp, Milk or water 1 cup, Jaggery 1 tbsp, Cardamom pinch",
                     "1. Mix ragi flour in cold water to smooth paste. 2. Heat milk. 3. Add ragi paste to hot milk. 4. Stir continuously to avoid lumps. 5. Cook 5 minutes on low flame. 6. Add jaggery and cardamom. 7. Serve warm."),
                    ("Curd Rice", "ಮೊಸರನ್ನ", "dinner", 1, 0, 5.5, 180.0, 0.8, 42.0, "B2, B12, D", 18.0,
                     "Temper with mustard seeds, grated ginger, and a few pomegranate pearls for digestive health.",
                     "ಒಗ್ಗರಣೆ ಕೊಟ್ಟು ದ್ರಾಕ್ಷಿ ಅಥವಾ ದಾಳಿಂಬೆ ಕಾಳುಗಳನ್ನು ಸೇರಿಸಿ.",
                     "5-15 years", "/static/images/curd_rice.jpg", "All", "1 bowl (200g)",
                     "Cooked rice 1 cup, Curd 1 cup, Milk 2 tbsp, Mustard seeds, Curry leaves, Ginger, Green chilli, Salt",
                     "1. Mash cooked rice. 2. Mix with curd and milk. 3. Add salt. 4. Temper mustard seeds, curry leaves. 5. Add ginger, green chilli. 6. Pour over curd rice. 7. Mix gently. 8. Serve cool or at room temperature."),
                    ("Wheat Chapati with Dal", "ಚಪಾತಿ ಮತ್ತು ಬೇಳೆ ಸಾರು", "dinner", 1, 0, 8.0, 40.0, 3.1, 55.0, "B-complex, Protein", 22.0,
                     "Knead the wheat flour with lukewarm water and a drop of oil to ensure chapatis remain soft.",
                     "ಮೆದುವಾದ ಚಪಾತಿಗಳಿಗಾಗಿ ಗೋಧಿ ಹಿಟ್ಟನ್ನು ಉಗುರುಬೆಚ್ಚಗಿನ ನೀರು ಮತ್ತು ಎಣ್ಣೆಯಿಂದ ಕಲಸಿ.",
                     "5-15 years", "/static/images/chapati_dal.jpg", "All", "2 chapatis + dal (200g)",
                     "Wheat flour 1 cup, Oil 1 tsp, Salt, Warm water, Toor dal 1/2 cup, Tomato, Spices",
                     "1. Knead flour with water, oil, salt. Rest 20 minutes. 2. Roll into thin circles. 3. Cook on hot tawa both sides. 4. For dal: cook toor dal. 5. Add fried tomato, onion, spices. 6. Boil 5 minutes. 7. Serve chapati with dal."),
                    ("Moong Dal Khichdi", "ಹೆಸರುಬೇಳೆ ಖಿಚಡಿ", "dinner", 1, 0, 8.2, 48.0, 3.0, 56.0, "A, B, C", 21.0,
                     "Prepare this light comforting dinner especially on cold or rainy nights with cumin.",
                     "ಜೀರಿಗೆ ಒಗ್ಗರಣೆಯೊಂದಿಗೆ ಜೀರ್ಣಿಸಿಕೊಳ್ಳಲು ಹಗುರವಾದ ಹೆಸರುಬೇಳೆ ಖಿಚಡಿ ಮಾಡಿ.",
                     "5-15 years", "/static/images/moong_dal_khichdi.jpg", "All", "1 bowl (200g)",
                     "Rice 1 cup, Moong dal 1/2 cup, Ghee, Cumin, Turmeric, Ginger, Salt",
                     "1. Wash rice and dal. 2. Heat ghee in pressure cooker. 3. Add cumin, ginger. 4. Add rice and dal. 5. Add water (3:1), turmeric, salt. 6. Pressure cook 3 whistles. 7. Serve hot with pickle and papad."),
                ]

                cursor.executemany('''
                INSERT INTO foods (
                    name_en, name_kn, category, is_veg, is_egg,
                    protein, calcium, iron, carbs, vitamins, cost,
                    recipe_tip_en, recipe_tip_kn, age_recommendation, image_url, regions,
                    serving_size, ingredients, recipe_steps
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', local_foods)
                print("Database seeded successfully with recipes!")

            conn.commit()
            print("Database checked and prepared on Flask startup.")
    except Exception as e:
        conn.rollback()
        print(f"Error initializing schema: {e}")
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
