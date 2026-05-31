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
    
    # Drop existing table to force re-seeding with non-veg additions
    cursor.execute("DROP TABLE IF EXISTS foods")
    
    # Create table for local foods
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_en TEXT NOT NULL,
        name_kn TEXT NOT NULL,
        category TEXT NOT NULL, -- 'breakfast', 'lunch', 'snack', 'dinner'
        is_veg INTEGER NOT NULL, -- 1 for veg, 0 for egg/non-veg
        is_egg INTEGER NOT NULL, -- 1 for egg, 0 otherwise
        protein REAL NOT NULL, -- g
        calcium REAL NOT NULL, -- mg
        iron REAL NOT NULL, -- mg
        carbs REAL NOT NULL, -- g
        vitamins TEXT NOT NULL, -- list of vitamins, e.g., 'A, B1, C'
        cost REAL NOT NULL, -- Cost per serving in INR
        recipe_tip_en TEXT NOT NULL,
        recipe_tip_kn TEXT NOT NULL,
        age_recommendation TEXT NOT NULL,
        image_url TEXT NOT NULL,
        regions TEXT NOT NULL -- comma separated, e.g. 'Mangalore, Udupi, Dakshina Kannada' or 'All'
    )
    ''')
    
    # Seeding beautiful Karnataka local foods (Veg + Egg + Non-Veg)
    local_foods = [
        # BREAKFASTS
        (
            "Ragi Dosa", "ರಾಗಿ ದೋಸೆ", "breakfast", 1, 0, 5.8, 310.0, 3.5, 65.0, "B1, B3, C", 20.0,
            "Ferment the batter overnight for soft, fluffy, and digestively light dosas.",
            "ಮೃದುವಾದ ಮತ್ತು ಸುಲಭವಾಗಿ ಜೀರ್ಣವಾಗುವ ದೋಸೆಗಾಗಿ ಹಿಟ್ಟನ್ನು ಇಡೀ ರಾತ್ರಿ ಹುದುಗಿಸಿ (ferment).",
            "5-15 years", "/static/images/ragi_dosa.jpg", "All"
        ),
        (
            "Sprout Upma", "ಮೊಳಕೆ ಉಪ್ಮಾ", "breakfast", 1, 0, 9.2, 55.0, 3.6, 50.0, "C, K, B9", 24.0,
            "Sauté sprouted green gram with mustard seeds, green chillies, and a squeeze of fresh lemon.",
            "ಮೊಳಕೆ ಬರಿಸಿದ ಹೆಸರುಕಾಳನ್ನು ಸಾಸಿವೆ, ಹಸಿಮೆಣಸಿನಕಾಯಿ ಮತ್ತು ನಿಂಬೆ ರಸದೊಂದಿಗೆ ಒಗ್ಗರಣೆ ಹಾಕಿ.",
            "5-15 years", "/static/images/sprout_upma.jpg", "All"
        ),
        (
            "Egg Dosa", "ಮೊಟ್ಟೆ ದೋಸೆ", "breakfast", 0, 1, 11.5, 85.0, 3.9, 55.0, "A, B12, D, E", 32.0,
            "Crack a fresh farm egg directly onto the dosa while cooking on the tawa and sprinkle black pepper.",
            "ದೋಸೆಯನ್ನು ಹಂಚಿನ ಮೇಲೆ ಬೇಯಿಸುವಾಗ ಒಂದು ಮೊಟ್ಟೆಯನ್ನು ಒಡೆದು ಹಾಕಿ, ಮೆಣಸಿನ ಪುಡಿ ಉದುರಿಸಿ.",
            "5-15 years", "/static/images/egg_dosa.jpg", "Mangalore, Udupi, Dakshina Kannada, Bengaluru Rural"
        ),
        (
            "Idli Sambar", "ಇಡ್ಲಿ ಸಾಂಬಾರ್", "breakfast", 1, 0, 7.1, 48.0, 2.1, 52.0, "B1, B2, B9", 18.0,
            "Steam the fermented batter for exactly 10 minutes to maintain maximum fluffiness and ease of digestion.",
            "ಇಡ್ಲಿಯನ್ನು ಕೇವಲ 10 ನಿಮಿಷ ಹಬೆಯಲ್ಲಿ ಬೇಯಿಸಿ ಇದರಿಂದ ಇಡ್ಲಿ ಮೃದುವಾಗುತ್ತದೆ ಮತ್ತು ಸುಲಭವಾಗಿ ಜೀರ್ಣವಾಗುತ್ತದೆ.",
            "5-15 years", "/static/images/idli_sambar.jpg", "All"
        ),
        (
            "Poha with Peanuts", "ಅವಲಕ್ಕಿ ಒಗ್ಗರಣೆ", "breakfast", 1, 0, 6.2, 30.0, 4.5, 46.0, "B1, B3, C", 15.0,
            "Sprinkle freshly grated coconut and chopped coriander leaves immediately after steaming the poha.",
            "ಅವಲಕ್ಕಿ ಬೆಂದ ತಕ್ಷಣ ತಾಜಾ ತೆಂಗಿನತುರಿ ಮತ್ತು ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪನ್ನು ಉದುರಿಸಿ.",
            "5-15 years", "/static/images/poha.jpg", "All"
        ),
        (
            "Ragi Roti", "ರಾಗಿ ರೊಟ್ಟಿ", "breakfast", 1, 0, 6.1, 320.0, 3.7, 68.0, "B1, B2, A", 22.0,
            "Add finely chopped onions, dill leaves, and green chillies to the dough for an aromatic, nutrient-packed breakfast.",
            "ಹಿಟ್ಟಿಗೆ ಸಣ್ಣಗೆ ಹೆಚ್ಚಿದ ಈರುಳ್ಳಿ, ಸಬ್ಬಸ್ಸಿಗೆ ಸೊಪ್ಪು ಮತ್ತು ಹಸಿಮೆಣಸಿನಕಾಯಿ ಸೇರಿಸಿ ರುಚಿಕರವಾದ ರೊಟ್ಟಿ ಮಾಡಿ.",
            "5-15 years", "/static/images/ragi_roti.jpg", "Bengaluru Rural, Shivamogga"
        ),
        (
            "Jowar Dosa", "ಜೋಳದ ದೋಸೆ", "breakfast", 1, 0, 6.5, 25.0, 3.2, 63.0, "B3, B5, E", 21.0,
            "Serve crisp with fresh tomato-onion chutney or groundnut chutney.",
            "ಟೊಮೆಟೊ ಈರುಳ್ಳಿ ಚಟ್ನಿ ಅಥವಾ ಶೇಂಗಾ ಚಟ್ನಿಯೊಂದಿಗೆ ಗರಿಗರಿಯಾಗಿ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/jowar_dosa.jpg", "Shivamogga, Bengaluru Rural"
        ),
        (
            "Semolina Rava Idli", "ರವೆ ಇಡ್ಲಿ", "breakfast", 1, 0, 5.5, 38.0, 1.8, 54.0, "B1, B3, B6", 19.0,
            "Add a pinch of grated ginger and cashew nuts tempered in ghee to the batter before steaming.",
            "ಹಬೆಯಲ್ಲಿ ಬೇಯಿಸುವ ಮುನ್ನ ಶುಂಠಿ ತುರಿ ಮತ್ತು ತುಪ್ಪದಲ್ಲಿ ಹುರಿದ ಗೋಡಂಬಿಯನ್ನು ಹಿಟ್ಟಿಗೆ ಸೇರಿಸಿ.",
            "5-15 years", "/static/images/rava_idli.jpg", "All"
        ),
        (
            "Wheat Upma", "ಗೋಧಿ ರವೆ ಉಪ್ಮಾ", "breakfast", 1, 0, 7.0, 42.0, 2.5, 58.0, "B3, E, Iron", 17.0,
            "Cook broken wheat with loaded local vegetables like carrots, beans, and fresh peas.",
            "ನುಚ್ಚು ಗೋಧಿಯನ್ನು ಕ್ಯಾರೆಟ್, ಬೀನ್ಸ್ ಮತ್ತು ಬಟಾಣಿಯೊಂದಿಗೆ ಬೇಯಿಸಿ ರುಚಿಕರ ಉಪ್ಮಾ ಮಾಡಿ.",
            "5-15 years", "/static/images/wheat_upma.jpg", "All"
        ),

        # LUNCHES
        (
            "Ragi Mudde with Sambar", "ರಾಗಿ ಮುದ್ದೆ ಮತ್ತು ಸಾಂಬಾರ್", "lunch", 1, 0, 5.2, 344.0, 3.9, 72.0, "B1, B2, B6", 25.0,
            "Serve piping hot with a spoonful of pure ghee and steaming hot vegetable sambar or leafy greens.",
            "ಬಿಸಿಬಿಸಿ ಮುದ್ದೆಯನ್ನು ಒಂದು ಚಮಚ ತುಪ್ಪ ಮತ್ತು ಬಿಸಿ ತರಕಾರಿ ಸಾಂಬಾರ್ ಜೊತೆಗೆ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/ragi_mudde.jpg", "Bengaluru Rural, Shivamogga"
        ),
        (
            "Jowar Roti with Veggies", "ಜೋಳದ ರೊಟ್ಟಿ ಮತ್ತು ಪಲ್ಯ", "lunch", 1, 0, 8.4, 28.0, 4.1, 72.0, "B3, B5, E", 18.0,
            "Best served hot with traditional roasted eggplant curry (Ennegayi) or spicy peanut chutney powder.",
            "ಎಣ್ಣೆಗಾಯಿ ಬದನೆಕಾಯಿ ಪಲ್ಯ ಅಥವಾ ಶೇಂಗಾ ಚಟ್ನಿ ಪುಡಿಯೊಂದಿಗೆ ಬಿಸಿಬಿಸಿಯಾಗಿ ಸವಿಯಿರಿ.",
            "9-15 years", "/static/images/jowar_roti.jpg", "Shivamogga"
        ),
        (
            "Coconut Rice", "ತೆಂಗಿನಕಾಯಿ ಅನ್ನ", "lunch", 1, 0, 4.5, 12.0, 1.8, 60.0, "C, E, B6", 28.0,
            "Garnish with freshly grated coconut, crispy roasted cashews, curry leaves, and a dash of lemon juice.",
            "ತಾಜಾ ತೆಂಗಿನತುರಿ, ಗರಿಗರಿ ಗೋಡಂಬಿ, ಕರಿಬೇವು ಮತ್ತು ಸ್ವಲ್ಪ ನಿಂಬೆ ರಸದಿಂದ ಅಲಂಕರಿಸಿ.",
            "5-15 years", "/static/images/coconut_rice.jpg", "Mangalore, Udupi, Dakshina Kannada"
        ),
        (
            "Dal Khichdi", "ಬೇಳೆ ಖಿಚಡಿ", "lunch", 1, 0, 8.5, 45.0, 3.2, 58.0, "A, B1, C", 22.0,
            "Drizzle with a teaspoon of pure ghee before serving to aid absorption of fat-soluble vitamins.",
            "ಕೊಬ್ಬಿನಲ್ಲಿ ಕರಗುವ ಜೀವಸತ್ವಗಳ ಹೀರಿಕೊಳ್ಳುವಿಕೆಗೆ ಸಹಾಯ ಮಾಡಲು ಬಡಿಸುವ ಮುನ್ನ ಒಂದು ಚಮಚ ತುಪ್ಪ ಹಾಕಿ.",
            "5-15 years", "/static/images/dal_khichdi.jpg", "All"
        ),
        (
            "Sambar Rice", "ಸಾಂಬಾರ್ ಅನ್ನ", "lunch", 1, 0, 6.8, 52.0, 2.5, 62.0, "A, C, B9", 26.0,
            "Add local seasonal vegetables like drumsticks, carrots, and yellow pumpkin for high fiber and vitamins.",
            "ನಾರಿನಂಶ ಮತ್ತು ಜೀವಸತ್ವಗಳಿಗಾಗಿ ನುಗ್ಗೆಕಾಯಿ, ಕ್ಯಾರೆಟ್ ಮತ್ತು ಕುಂಬಳಕಾಯಿಯಂತಹ ತರಕಾರಿಗಳನ್ನು ಸೇರಿಸಿ.",
            "5-15 years", "/static/images/sambar_rice.jpg", "All"
        ),
        (
            "Vegetable Khichdi", "ತರಕಾರಿ ಖಿಚಡಿ", "lunch", 1, 0, 7.2, 60.0, 2.8, 56.0, "A, C, K, B6", 25.0,
            "Load with local green peas, double beans, and carrots for a balanced high-fiber meal.",
            "ಹೆಚ್ಚಿನ ನಾರಿನಂಶಕ್ಕಾಗಿ ತಾಜಾ ಹಸಿ ಬಟಾಣಿ, ಬೀನ್ಸ್ ಮತ್ತು ಕ್ಯಾರೆಟ್‌ಗಳನ್ನು ಯಥೇಚ್ಛವಾಗಿ ಬಳಸಿ.",
            "5-15 years", "/static/images/veg_khichdi.jpg", "All"
        ),
        (
            "Lemon Rice with Peanuts", "ಚಿತ್ರಾನ್ನ", "lunch", 1, 0, 5.0, 20.0, 2.2, 64.0, "C, B1, E", 20.0,
            "Roast groundnuts to a perfect golden crunch and combine with cold pressed coconut or peanut oil.",
            "ಚಿತ್ರಾನ್ನಕ್ಕೆ ಹಾಕುವ ಶೇಂಗಾ ಬೀಜಗಳನ್ನು ಗರಿಗರಿಯಾಗಿ ಹುರಿದು ಕೊಬ್ಬರಿ ಎಣ್ಣೆಯಲ್ಲಿ ಒಗ್ಗರಣೆ ಕೊಡಿ.",
            "5-15 years", "/static/images/lemon_rice.jpg", "All"
        ),
        (
            "Bisi Bele Bath", "ಬಿಸಿ ಬೇಳೆ ಬಾತ್", "lunch", 1, 0, 7.8, 55.0, 3.1, 59.0, "A, B3, C, K", 29.0,
            "Cook rice, lentils and mixed vegetables together with freshly ground local spices and a dash of tamarind.",
            "ತಾಜಾ ರುಬ್ಬಿದ ಮಸಾಲೆ, ಹುಣಸೆಹಣ್ಣು, ತರಕಾರಿಗಳು ಮತ್ತು ಬೇಳೆಯನ್ನು ಒಟ್ಟಿಗೆ ಬೇಯಿಸಿ ಬಿಸಿಯಾಗಿ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/bisi_bele_bath.jpg", "All"
        ),
        (
            "Steamed Rice with Soppu Saaru", "ಅನ್ನ ಮತ್ತು ಸೊಪ್ಪಿನ ಸಾರು", "lunch", 1, 0, 6.0, 180.0, 4.5, 61.0, "A, C, Iron, Calcium", 23.0,
            "Prepare saaru using local amaranth (dantu) or dill leaves (sabsige) to pack extreme calcium and iron.",
            "ದಂಟು ಸೊಪ್ಪು ಅಥವಾ ಸಬ್ಬಸ್ಸಿಗೆ ಸೊಪ್ಪಿನ ಸಾರು ಮಾಡಿ ಬಿಸಿ ಅನ್ನದೊಂದಿಗೆ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/rice_soppu_saaru.jpg", "Bengaluru Rural, Shivamogga, Mangalore"
        ),
        # NEW LUNCH NON-VEG / EGGETARIAN ITEMS
        (
            "Egg Curry with Rice", "ಮೊಟ್ಟೆ ಸಾರು ಮತ್ತು ಅನ್ನ", "lunch", 0, 1, 12.0, 60.0, 2.8, 54.0, "A, B12, D", 30.0,
            "Simmer hard-boiled eggs in a mildly spiced onion, tomato, and fresh coconut gravy.",
            "ಬೇಯಿಸಿದ ಮೊಟ್ಟೆಗಳನ್ನು ಈರುಳ್ಳಿ, ಟೊಮೆಟೊ ಮತ್ತು ತೆಂಗಿನಕಾಯಿ ಮಸಾಲೆಯೊಂದಿಗೆ ಬೇಯಿಸಿ ಬಿಸಿ ಅನ್ನದೊಂದಿಗೆ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/egg_curry.jpg", "All"
        ),
        (
            "Coastal Fish Curry with Rice", "ಮೀನು ಸಾರು ಮತ್ತು ಅನ್ನ", "lunch", 0, 0, 14.5, 110.0, 2.2, 58.0, "Omega-3, D, B2", 42.0,
            "Use fresh local coastal fish cooked in a tangy tamarind-coconut gravy.",
            "ತಾಜಾ ಕರಾವಳಿ ಮೀನನ್ನು ಹುಣಸೆಹಣ್ಣು ಮತ್ತು ತೆಂಗಿನಕಾಯಿ ಸಾರಿನಲ್ಲಿ ಬೇಯಿಸಿ ಬಿಸಿ ಅನ್ನದೊಂದಿಗೆ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/fish_curry.jpg", "Mangalore, Udupi, Dakshina Kannada"
        ),
        (
            "Chicken Pulav", "ಕೋಳಿ ಪಲಾವ್", "lunch", 0, 0, 16.2, 25.0, 2.7, 62.0, "B3, B6, Iron", 48.0,
            "Prepare with fragrant Jeera rice, mint, coriander, and fresh local chicken portions.",
            "ಸುವಾಸನೆಯ ಜೀರಿಗೆ ಅಕ್ಕಿ, ಪುದೀನಾ, ಕೊತ್ತಂಬರಿ ಮತ್ತು ಹಸಿರು ಮಸಾಲೆಯೊಂದಿಗೆ ಕೋಳಿ ಪಲಾವ್ ಮಾಡಿ ಬಡಿಸಿ.",
            "9-15 years", "/static/images/chicken_pulav.jpg", "All"
        ),

        # SNACKS
        (
            "Groundnut Chikki", "ಶೇಂಗಾ ಚಿಕ್ಕಿ", "snack", 1, 0, 8.0, 62.0, 2.9, 34.0, "E, B3, B9", 10.0,
            "Combine roasted split peanuts with thick jaggery syrup for an instant iron and protein boost.",
            "ತತ್‌ಕ್ಷಣದ ಶಕ್ತಿ ಮತ್ತು ಕಬ್ಬಿಣಾಂಶಕ್ಕಾಗಿ ಹುರಿದ ಶೇಂಗಾ ಬೀಜ ಹಾಗೂ ಬೆಲ್ಲದ ಪಾಕದಿಂದ ಸಿದ್ಧಪಡಿಸಿ.",
            "5-15 years", "/static/images/chikki.jpg", "All"
        ),
        (
            "Banana Sheera", "ಬಾಳೆಹಣ್ಣಿನ ಶೀರಾ", "snack", 1, 0, 3.2, 20.0, 1.2, 48.0, "A, B6, C", 20.0,
            "Use sweet, ripe local Elaichi bananas and organic jaggery to avoid refined white sugar.",
            "ಬಿಳಿ ಸಕ್ಕರೆಯ ಬದಲು ಸಿಹಿಯಾದ ಏಲಕ್ಕಿ ಬಾಳೆಹಣ್ಣು ಮತ್ತು ಸಾವಯವ ಬೆಲ್ಲವನ್ನು ಬಳಸಿ.",
            "5-15 years", "/static/images/banana_sheera.jpg", "All"
        ),
        (
            "Spiced Bengal Gram Usli", "ಕಡಲೆಕಾಳು ಉಸ್ಲಿ", "snack", 1, 0, 8.5, 65.0, 3.4, 30.0, "Protein, Iron, Fiber", 15.0,
            "Boil black chickpeas and temper with mustard seeds, curry leaves, and freshly grated coconut.",
            "ಬೇಯಿಸಿದ ಕಡಲೆಕಾಳಿಗೆ ಸಾಸಿವೆ, ಕರಿಬೇವು ಮತ್ತು ಹಸಿ ತೆಂಗಿನತುರಿ ಸೇರಿಸಿ ಒಗ್ಗರಣೆ ನೀಡಿ.",
            "5-15 years", "/static/images/kadalekalu_usli.jpg", "All"
        ),
        (
            "Steamed Sweet Potato", "ಬೇಯಿಸಿದ ಸಿಹಿ ಗೆಣಸು", "snack", 1, 0, 2.0, 30.0, 0.8, 27.0, "A, C, B6, Potassium", 12.0,
            "Steam sweet potatoes until soft, peel, and sprinkle a tiny pinch of cardamom powder.",
            "ಸಿಹಿ ಗೆಣಸನ್ನು ಹಬೆಯಲ್ಲಿ ಬೇಯಿಸಿ, ಸಿಪ್ಪೆ ಸುಲಿದು ಸ್ವಲ್ಪ ಏಲಕ್ಕಿ ಪುಡಿ ಉದುರಿಸಿ ತಿನ್ನಿಸಿ.",
            "5-15 years", "/static/images/sweet_potato.jpg", "Mangalore, Udupi, Dakshina Kannada, Shivamogga"
        ),
        (
            "Ragi Malt", "ರಾಗಿ ಗಂಜಿ / ಮಾಲ್ಟ್", "snack", 1, 0, 4.0, 280.0, 2.8, 38.0, "Calcium, Iron, B1", 12.0,
            "Whisk ragi flour in water/milk, boil thoroughly, and sweeten lightly with organic jaggery.",
            "ರಾಗಿ ಹಿಟ್ಟನ್ನು ಹಾಲು ಅಥವಾ ನೀರಿನಲ್ಲಿ ಬೇಯಿಸಿ, ಸ್ವಲ್ಪ ಸಾವಯವ ಬೆಲ್ಲ ಸೇರಿಸಿ ಕುಡಿಸಿ.",
            "5-15 years", "/static/images/ragi_malt.jpg", "All"
        ),
        (
            "Moong Dal Payasam", "ಹೆಸರುಬೇಳೆ ಪಾಯಸ", "snack", 1, 0, 5.5, 45.0, 2.2, 42.0, "Protein, B-complex", 22.0,
            "Cook yellow split moong dal with thin coconut milk, jaggery, and green cardamom.",
            "ಹೆಸರುಬೇಳೆಯನ್ನು ತೆಂಗಿನಹಾಲು, ಬೆಲ್ಲ ಮತ್ತು ಏಲಕ್ಕಿ ಪುಡಿಯೊಂದಿಗೆ ಬೇಯಿಸಿ ರುಚಿಕರ ಪಾಯಸ ಮಾಡಿ.",
            "5-15 years", "/static/images/moong_dal_payasam.jpg", "Mangalore, Udupi, Dakshina Kannada"
        ),
        # NEW SNACK NON-VEG ITEM
        (
            "Mutton Bone Broth", "ಮಟನ್ ಮೂಳೆ ಸೂಪ್", "snack", 0, 0, 9.5, 40.0, 3.5, 12.0, "B12, Calcium, Zinc", 45.0,
            "Slow cook lamb bones with black pepper, cumin, ginger, and garlic for a strong immunity booster.",
            "ಮಟನ್ ಮೂಳೆಗಳನ್ನು ಕರಿಮೆಣಸು, ಜೀರಿಗೆ, ಶುಂಠಿ ಮತ್ತು ಬೆಳ್ಳುಳ್ಳಿಯೊಂದಿಗೆ ನಿಧಾನವಾಗಿ ಬೇಯಿಸಿ ಬಿಸಿ ಬಿಸಿ ಸೂಪ್ ಮಾಡಿ.",
            "5-15 years", "/static/images/mutton_broth.jpg", "All"
        ),

        # DINNERS
        (
            "Jowar Khichdi", "ಜೋಳದ ಖಿಚಡಿ", "dinner", 1, 0, 7.8, 35.0, 3.8, 64.0, "B3, B6, A", 30.0,
            "Slow-cook broken jowar with split yellow moong dal, ginger, and local green leafy vegetables.",
            "ಒಡೆದ ಜೋಳವನ್ನು ಹೆಸರುಬೇಳೆ, ಶುಂಠಿ ಮತ್ತು ಹಸಿರು ಸೊಪ್ಪಿನೊಂದಿಗೆ ನಿಧಾನವಾಗಿ ಬೇಯಿಸಿ.",
            "5-15 years", "/static/images/jowar_khichdi.jpg", "Shivamogga"
        ),
        (
            "Curd Rice", "ಮೊಸರನ್ನ", "dinner", 1, 0, 5.5, 180.0, 0.8, 42.0, "B2, B12, D", 18.0,
            "Temper with mustard seeds, grated ginger, and a few pomegranate pearls for digestive health and cooling.",
            "ರುಚಿಕರ ಮೊಸರನ್ನಕ್ಕೆ ಒಗ್ಗರಣೆ ಕೊಟ್ಟು, ಕೊನೆಯಲ್ಲಿ ದ್ರಾಕ್ಷಿ ಅಥವಾ ದಾಳಿಂಬೆ ಕಾಳುಗಳನ್ನು ಸೇರಿಸಿ.",
            "5-15 years", "/static/images/curd_rice.jpg", "All"
        ),
        (
            "Ragi Mudde with Soppu Bassaru", "ರಾಗಿ ಮುದ್ದೆ ಮತ್ತು ಬಸ್ಸಾರು", "dinner", 1, 0, 5.0, 340.0, 4.0, 70.0, "A, B, C, Iron", 24.0,
            "Prepare bassaru from the nutritious strained broth of leafy greens and lentils to accompany hot ragi mudde.",
            "ತರಕಾರಿ ಹಾಗೂ ಸೊಪ್ಪ ಬೇಯಿಸಿದ ನೀರಿನಿಂದ ತಿಳಿಸಾರು (ಬಸ್ಸಾರು) ಮಾಡಿ ಬಿಸಿ ಮುದ್ದೆಯೊಂದಿಗೆ ಸವಿಯಿರಿ.",
            "9-15 years", "/static/images/ragi_mudde_bassaru.jpg", "Bengaluru Rural, Shivamogga"
        ),
        (
            "Vegetable Pulav", "ತರಕಾರಿ ಪಲಾವ್", "dinner", 1, 0, 6.2, 45.0, 2.0, 68.0, "A, C, E, K", 27.0,
            "Use regional sona masuri rice, loading it with local beans, mint, coriander, and green peas.",
            "ಸೋನಾ ಮಸೂರಿ ಅಕ್ಕಿಯೊಂದಿಗೆ ಪುದೀನಾ, ಕೊತ್ತಂಬರಿ ಮತ್ತು ಹಸಿರು ತರಕಾರಿಗಳನ್ನು ಸೇರಿಸಿ ಮಾಡಿ.",
            "5-15 years", "/static/images/veg_pulav.jpg", "All"
        ),
        (
            "Wheat Chapati with Dal Saaru", "ಚಪಾತಿ ಮತ್ತು ಬೇಳೆ ಸಾರು", "dinner", 1, 0, 8.0, 40.0, 3.1, 55.0, "B-complex, Protein", 22.0,
            "Knead the wheat flour with lukewarm water and a drop of oil to ensure chapatis remain soft.",
            "ಮೆದುವಾದ ಚಪಾತಿಗಳಿಗಾಗಿ ಗೋಧಿ ಹಿಟ್ಟನ್ನು ಉಗುರುಬೆಚ್ಚಗಿನ ನೀರು ಮತ್ತು ಸ್ವಲ್ಪ ಎಣ್ಣೆಯಿಂದ ಕಲಸಿ.",
            "5-15 years", "/static/images/chapati_dal.jpg", "All"
        ),
        (
            "Moong Dal Khichdi", "ಹೆಸರುಬೇಳೆ ಖಿಚಡಿ", "dinner", 1, 0, 8.2, 48.0, 3.0, 56.0, "A, B, C", 21.0,
            "Prepare this light comforting dinner especially on cold or rainy nights with a dash of cumin.",
            "ಜೀರಿಗೆ ಒಗ್ಗರಣೆಯೊಂದಿಗೆ ಜೀರ್ಣಿಸಿಕೊಳ್ಳಲು ಹಗುರವಾದ ಬಿಸಿಬಿಸಿ ಹೆಸರುಬೇಳೆ ಖಿಚಡಿ ಮಾಡಿ.",
            "5-15 years", "/static/images/moong_dal_khichdi.jpg", "All"
        ),
        # NEW DINNER NON-VEG / EGGETARIAN ITEMS
        (
            "Egg Bhurji with Chapati", "ಮೊಟ್ಟೆ ಬುರ್ಜಿ ಮತ್ತು ಚಪಾತಿ", "dinner", 0, 1, 13.0, 75.0, 3.2, 48.0, "A, B12, D, E", 32.0,
            "Sauté scrambled eggs with onions, green chillies, coriander, and serve with wheat chapati.",
            "ಈರುಳ್ಳಿ, ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು ಹಾಕಿ ಮಾಡಿದ ಮೊಟ್ಟೆ ಬುರ್ಜಿಯನ್ನು ಬಿಸಿ ಗೋಧಿ ಚಪಾತಿಯೊಂದಿಗೆ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/egg_bhurji.jpg", "All"
        ),
        (
            "Egg Fried Rice", "ಮೊಟ್ಟೆ ಅನ್ನ / ಫ್ರೈಡ್ ರೈಸ್", "dinner", 0, 1, 11.2, 58.0, 2.6, 60.0, "A, B-complex", 28.0,
            "Sauté boiled rice with scrambled eggs, carrots, beans, and fresh pepper spices.",
            "ಬೇಯಿಸಿದ ಅನ್ನವನ್ನು ಮೊಟ್ಟೆ ಪಲ್ಯ, ಕ್ಯಾರೆಟ್ ಮತ್ತು ಬೀನ್ಸ್‌ನೊಂದಿಗೆ ಫ್ರೈ ಮಾಡಿ ಸ್ವಲ್ಪ ಕಾಳುಮೆಣಸಿನ ಪುಡಿ ಉದುರಿಸಿ.",
            "5-15 years", "/static/images/egg_fried_rice.jpg", "All"
        ),
        (
            "Chicken Saaru with Rice", "ಕೋಳಿ ಸಾರು ಮತ್ತು ಅನ್ನ", "dinner", 0, 0, 15.0, 22.0, 2.5, 56.0, "B6, B12, Zinc", 45.0,
            "Cook tender chicken in aromatic home-ground spices and a thick coconut milk broth.",
            "ನಾಟಿ ಕೋಳಿ ಮಾಂಸವನ್ನು ತಾಜಾ ರುಬ್ಬಿದ ಮಸಾಲೆ ಮತ್ತು ಗಸಗಸೆ ಹಾಕಿ ಬಿಸಿ ಬಿಸಿ ಸಾರು ಮಾಡಿ ಬಡಿಸಿ.",
            "5-15 years", "/static/images/chicken_saaru.jpg", "All"
        )
    ]
    
    cursor.executemany('''
    INSERT INTO foods (
        name_en, name_kn, category, is_veg, is_egg,
        protein, calcium, iron, carbs, vitamins, cost,
        recipe_tip_en, recipe_tip_kn, age_recommendation, image_url, regions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', local_foods)
    
    conn.commit()
    print("Database successfully seeded with Karnataka local foods (Vegetarian, Eggetarian, and Non-Vegetarian)!")
    
    conn.close()

if __name__ == "__main__":
    init_db()
