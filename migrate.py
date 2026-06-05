"""
Run this once to add serving_size column to foods table.
Usage: python migrate.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'nutriprint.db')

SERVING_SIZES = {
    'Ragi Mudde':       '2 balls (120g)',
    'Ragi Dosa':        '2 dosas (100g)',
    'Ragi Roti':        '2 rotis (80g)',
    'Jowar Roti':       '2 rotis (80g)',
    'Jowar Dosa':       '2 dosas (100g)',
    'Idli':             '3 pieces (150g)',
    'Sambar Rice':      '1 cup (200g)',
    'Coconut Rice':     '1 cup (200g)',
    'Khichdi':          '1 bowl (200g)',
    'Curd Rice':        '1 bowl (200g)',
    'Dal Rice':         '1 bowl (200g)',
    'Vegetable Pulao':  '1 cup (180g)',
    'Chapati':          '2 chapatis (60g)',
    'Poha':             '1 bowl (150g)',
    'Rava Upma':        '1 bowl (150g)',
    'Sprout Upma':      '1 bowl (150g)',
    'Pongal':           '1 bowl (180g)',
    'Sweet Potato':     '1 medium (130g)',
    'Banana':           '1 medium (100g)',
    'Groundnut Chikki': '2 pieces (30g)',
    'Egg Curry':        '1 egg + gravy (150g)',
    'Fish Curry':       '1 piece + gravy (150g)',
    'Chicken Curry':    '1 piece + gravy (150g)',
    'Mixed Veg Curry':  '1 bowl (150g)',
    'Green Gram Usli':  '½ cup (80g)',
    'Horse Gram Usli':  '½ cup (80g)',
}

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Add serving_size column if not exists
    try:
        cursor.execute("ALTER TABLE foods ADD COLUMN serving_size TEXT DEFAULT '1 portion'")
        print("Added serving_size column.")
    except sqlite3.OperationalError:
        print("serving_size column already exists.")

    # Update serving sizes
    for food_name, serving in SERVING_SIZES.items():
        cursor.execute(
            "UPDATE foods SET serving_size = ? WHERE name_en LIKE ?",
            (serving, f'%{food_name}%')
        )
        print(f"Updated: {food_name} → {serving}")

    conn.commit()
    conn.close()
    print("\nMigration complete!")

if __name__ == '__main__':
    migrate()
