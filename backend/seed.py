import os
from datetime import datetime
from backend.database import SessionLocal, engine, Base
from backend.models import Ingredient, Movement, Event, Alert
from backend.data_cleaner import load_and_clean

def seed_database(csv_path: str = "backend/sample_sales.csv"):
    """
    Initializes tables, seeds ingredients, runs load_and_clean on sample sales CSV,
    populates movements, creates the Midnight Curse event, and sets up alerts.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing records
        db.query(Alert).delete()
        db.query(Movement).delete()
        db.query(Event).delete()
        db.query(Ingredient).delete()
        db.commit()

        # 1. Seed Base Ingredients
        initial_ingredients = [
            {"name": "Bat Wings", "unit": "pairs", "current_stock": 25.0, "lead_time_days": 3},
            {"name": "Dragon Scale", "unit": "scales", "current_stock": 40.0, "lead_time_days": 10},
            {"name": "Eye Of Newt", "unit": "eyeballs", "current_stock": 30.0, "lead_time_days": 5},
            {"name": "Ghost Pepper", "unit": "peppers", "current_stock": 12.0, "lead_time_days": 4},
            {"name": "Mandrake Root", "unit": "roots", "current_stock": 18.0, "lead_time_days": 6},
            {"name": "Nightshade Essence", "unit": "vials", "current_stock": 35.0, "lead_time_days": 7},
            {"name": "Phoenix Feather", "unit": "feathers", "current_stock": 5.0, "lead_time_days": 14},
            {"name": "Spider Silk", "unit": "skeins", "current_stock": 60.0, "lead_time_days": 4},
        ]

        ingredient_map = {}
        for item in initial_ingredients:
            ing = Ingredient(**item)
            db.add(ing)
            db.commit()
            db.refresh(ing)
            ingredient_map[ing.name.title()] = ing

        print(f"✅ Seeded {len(ingredient_map)} base ingredients.")

        # 2. Ingest and Clean Sales Data using load_and_clean
        if os.path.exists(csv_path):
            clean_sales_df = load_and_clean(csv_path)
            print(f"📊 Cleaned sales data: {len(clean_sales_df)} daily records processed.")

            movements_count = 0
            for _, row in clean_sales_df.iterrows():
                ing_name = row["ingredient"].title()
                qty = float(row["qty"])
                date_val = row["date"]

                if qty > 0 and ing_name in ingredient_map:
                    ing = ingredient_map[ing_name]
                    ing.current_stock = max(0.0, ing.current_stock - qty)
                    
                    tx_datetime = datetime.combine(date_val, datetime.min.time())
                    mv = Movement(
                        ingredient_id=ing.id,
                        ts=tx_datetime,
                        type="sale",
                        qty=qty,
                        note="Historical sales movement (cleaned)"
                    )
                    db.add(mv)
                    movements_count += 1

            db.commit()
            print(f"✅ Created {movements_count} verified historical movement records.")

        # 3. Seed Midnight Curse Event
        cursed_ids = [
            ingredient_map["Bat Wings"].id,
            ingredient_map["Ghost Pepper"].id,
            ingredient_map["Mandrake Root"].id
        ]
        curse_event = Event(
            name="Midnight Curse",
            multiplier=3.0,
            starts_at=datetime.utcnow(),
            active=False,
            ingredient_ids_str=f"[{cursed_ids[0]}, {cursed_ids[1]}, {cursed_ids[2]}]"
        )
        db.add(curse_event)

        # 4. Seed Critical Alerts
        db.add(Alert(
            ingredient_id=ingredient_map.get("Ghost Pepper", list(ingredient_map.values())[0]).id,
            type="LOW_STOCK",
            severity="HIGH",
            description="Ghost Pepper stock dropped below reorder safety margin."
        ))
        db.add(Alert(
            ingredient_id=ingredient_map.get("Phoenix Feather", list(ingredient_map.values())[0]).id,
            type="CRITICAL",
            severity="CRITICAL",
            description="Phoenix Feather requires 14-day lead time. Immediate reorder required."
        ))

        db.commit()
        print("✅ Seeded events and initial risk alerts.")

        # 4. Sync initial seed state to MongoDB Atlas
        try:
            from backend.mongodb import sync_all_sql_to_mongo
            synced = sync_all_sql_to_mongo(db)
            print(f"☁️ Synced to MongoDB Atlas: {synced}")
        except Exception as e:
            print(f"⚠️ MongoDB Atlas sync notice: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

