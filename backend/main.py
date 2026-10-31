from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import io
import csv
import pandas as pd
import numpy as np

from backend.database import engine, Base, get_db
from backend.models import Ingredient, Movement, Event, Alert
from backend.schemas import (
    IngredientCreate, IngredientUpdate, IngredientOut,
    MovementOut, SaleCreate, StockChange,
    EventOut, AlertOut, HealthResponse,
    RestockItem, SummaryResponse
)
from backend import crud
from backend.seed import seed_database
from backend.data_cleaner import resolve_column, COLUMN_ALIASES, load_and_clean

try:
    from restock import (
        days_until_stockout, safety_stock, reorder_quantity, status as stock_status, compute_restock_profile
    )
except ImportError:
    from backend.restock import (
        days_until_stockout, safety_stock, reorder_quantity, status as stock_status, compute_restock_profile
    )

try:
    from anomalies import (
        scan_and_record_alerts, detect_spikes, detect_missing_stock, detect_drop_to_zero
    )
except ImportError:
    from backend.anomalies import (
        scan_and_record_alerts, detect_spikes, detect_missing_stock, detect_drop_to_zero
    )

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PotionPulse API",
    description="Smart Inventory and Demand Prediction Backend for The Witch's Potion Pantry",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# 1. SYSTEM HEALTH
# ==============================================================================
@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """System health verification and database telemetry."""
    total_ingredients = db.query(Ingredient).count()
    total_movements = db.query(Movement).count()
    active_alerts = db.query(Alert).count()

    return HealthResponse(
        status="healthy",
        database="sqlite connected",
        timestamp=datetime.utcnow(),
        total_ingredients=total_ingredients,
        total_movements=total_movements,
        active_alerts=active_alerts
    )

# ==============================================================================
# 2. INGREDIENTS CRUD
# ==============================================================================
@app.get("/ingredients", response_model=List[IngredientOut], tags=["Ingredients"])
def list_ingredients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve all potion ingredients with current stock levels."""
    return crud.get_ingredients(db, skip=skip, limit=limit)

@app.post("/ingredients", response_model=IngredientOut, status_code=status.HTTP_201_CREATED, tags=["Ingredients"])
def create_ingredient(payload: IngredientCreate, db: Session = Depends(get_db)):
    """Add a new magical potion reagent to the pantry."""
    existing = crud.get_ingredient_by_name(db, payload.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Ingredient '{payload.name}' already exists in pantry."
        )
    return crud.create_ingredient(db, payload)

@app.get("/ingredients/{ingredient_id}", response_model=IngredientOut, tags=["Ingredients"])
def get_ingredient_detail(ingredient_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a single ingredient by ID."""
    item = crud.get_ingredient(db, ingredient_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Ingredient #{ingredient_id} not found.")
    return item

@app.put("/ingredients/{ingredient_id}", response_model=IngredientOut, tags=["Ingredients"])
def update_ingredient_detail(ingredient_id: int, payload: IngredientUpdate, db: Session = Depends(get_db)):
    """Update reagent parameters such as lead_time_days, name, or current_stock."""
    updated = crud.update_ingredient(db, ingredient_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Ingredient #{ingredient_id} not found.")
    return updated

@app.delete("/ingredients/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Ingredients"])
def delete_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    """Remove an ingredient from the pantry."""
    success = crud.delete_ingredient(db, ingredient_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Ingredient #{ingredient_id} not found.")
    return None

# ==============================================================================
# 3. STOCK & MOVEMENT TRANSACTIONS
# ==============================================================================
@app.post("/sales", response_model=MovementOut, status_code=status.HTTP_201_CREATED, tags=["Stock & Movements"])
def record_potion_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    """
    Record an ingredient sale:
    - Decrements current_stock
    - Logs a 'sale' record in movements
    - Automatically checks stock levels and triggers alerts if critical
    """
    try:
        return crud.record_sale(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/ingredients/{ingredient_id}/stock", response_model=MovementOut, tags=["Stock & Movements"])
def adjust_or_restock_ingredient(ingredient_id: int, payload: StockChange, db: Session = Depends(get_db)):
    """
    Adjust stock or record a supplier restock:
    - Updates ingredient current_stock
    - Logs an 'adjustment' or 'restock' record in movements
    """
    try:
        return crud.update_ingredient_stock(db, ingredient_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/movements", response_model=List[MovementOut], tags=["Stock & Movements"])
def list_movements(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """List historical inventory movements and sales audit logs."""
    return db.query(Movement).order_by(desc(Movement.ts)).offset(skip).limit(limit).all()

# ==============================================================================
# 4. EVENTS & ALERTS (MIDNIGHT CURSE)
# ==============================================================================
@app.get("/events", response_model=List[EventOut], tags=["Events & Alerts"])
def list_events(db: Session = Depends(get_db)):
    """List active and scheduled festival events (e.g. Midnight Curse)."""
    return db.query(Event).all()

@app.post("/events/{event_id}/toggle", response_model=EventOut, tags=["Events & Alerts"])
def toggle_event(event_id: int, db: Session = Depends(get_db)):
    """Toggle seasonal demand multiplier on/off (e.g., Midnight Curse 3x demand)."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail=f"Event #{event_id} not found.")
    event.active = not event.active
    db.commit()
    db.refresh(event)
    return event

@app.get("/alerts", response_model=List[AlertOut], tags=["Events & Alerts"])
def list_alerts(
    severity: Optional[str] = None, 
    type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    List all stockout warnings, statistical spikes, and missing stock alerts.
    Scans recent inventory telemetry to detect and record new anomalies.
    """
    try:
        scan_and_record_alerts(db, persist=True)
    except Exception as e:
        print(f"Warning: anomaly scan failed: {e}")

    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity.ilike(severity))
    if type:
        query = query.filter(Alert.type.ilike(type))

    return query.order_by(desc(Alert.ts)).limit(limit).all()

# ==============================================================================
# 5. CSV UPLOAD PIPELINE (VALIDATION & ACCEPTED/REJECTED AUDIT)
# ==============================================================================
@app.post("/upload", tags=["Data Pipeline & Forecasting"])
async def upload_sales_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload and validate a CSV of sales transactions:
    - Tolerates renamed and reordered column headers.
    - Validates rows: rejects null names, unparseable dates, and non-numeric quantities.
    - Ingests accepted rows into database movements and decrements current stock.
    - Returns a friendly JSON summary with accepted vs rejected rows and failure reasons.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No file selected. Please select a valid CSV file to upload."
        )

    try:
        contents = await file.read()
        if not contents or len(contents.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="The uploaded file is empty. Please upload a CSV containing sales data."
            )
        
        # Parse CSV text safely
        try:
            df = pd.read_csv(io.StringIO(contents.decode("utf-8", errors="replace")))
        except Exception as parse_err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Unable to parse file as CSV: {str(parse_err)}"
            )

        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="The uploaded CSV has headers but contains zero data rows."
            )

        # Dynamic header mapping
        date_col = resolve_column(df.columns, "date")
        item_col = resolve_column(df.columns, "ingredient")
        qty_col = resolve_column(df.columns, "qty")
        type_col = resolve_column(df.columns, "type")

        missing_fields = []
        if not date_col: missing_fields.append("Date")
        if not item_col: missing_fields.append("Ingredient/Item Name")
        if not qty_col: missing_fields.append("Quantity/Volume")

        if missing_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"CSV is missing required columns: {', '.join(missing_fields)}. Detected headers: {list(df.columns)}"
            )

        # Cache existing ingredients for fast lookup
        ingredients_cache = {ing.name.title(): ing for ing in db.query(Ingredient).all()}

        accepted = []
        rejected = []

        for idx, row in df.iterrows():
            row_num = int(idx) + 2  # 1-based index accounting for header row
            raw_dict = {str(k): (None if pd.isna(v) else str(v)) for k, v in row.items()}

            # 1. Validate Ingredient Name
            raw_name = str(row[item_col]).strip() if pd.notna(row[item_col]) else ""
            if not raw_name or raw_name.lower() in ["nan", "none", "null"]:
                rejected.append({
                    "row": row_num,
                    "data": raw_dict,
                    "reason": "Missing or blank ingredient name."
                })
                continue

            clean_name = raw_name.title()

            # 2. Validate Date
            raw_date_val = row[date_col]
            parsed_date = pd.to_datetime(raw_date_val, errors="coerce")
            if pd.isna(parsed_date):
                rejected.append({
                    "row": row_num,
                    "data": raw_dict,
                    "reason": f"Invalid date value: '{raw_date_val}' could not be parsed."
                })
                continue

            # 3. Validate Quantity
            raw_qty_val = row[qty_col]
            try:
                clean_qty_str = str(raw_qty_val).replace(",", "").strip()
                qty_float = float(clean_qty_str)
            except (ValueError, TypeError):
                rejected.append({
                    "row": row_num,
                    "data": raw_dict,
                    "reason": f"Quantity '{raw_qty_val}' is not a valid numeric value."
                })
                continue

            # Check if quantity is zero
            if qty_float == 0:
                rejected.append({
                    "row": row_num,
                    "data": raw_dict,
                    "reason": "Quantity is 0.0; no inventory movement to log."
                })
                continue

            # Determine movement type
            raw_type = str(row[type_col]).strip().lower() if (type_col and pd.notna(row[type_col])) else ""
            if "restock" in raw_type:
                mv_type = "restock"
                delta_stock = abs(qty_float)
            else:
                mv_type = "sale"
                delta_stock = -abs(qty_float)

            # Auto-register ingredient if not present in pantry
            if clean_name not in ingredients_cache:
                new_ing = Ingredient(
                    name=clean_name,
                    unit="units",
                    current_stock=max(0.0, 50.0 + delta_stock),
                    lead_time_days=7
                )
                db.add(new_ing)
                db.commit()
                db.refresh(new_ing)
                ingredients_cache[clean_name] = new_ing
            
            target_ing = ingredients_cache[clean_name]
            target_ing.current_stock = max(0.0, target_ing.current_stock + delta_stock)

            # Record Movement
            mv = Movement(
                ingredient_id=target_ing.id,
                ts=parsed_date.to_pydatetime(),
                type=mv_type,
                qty=abs(qty_float),
                note=f"Imported via CSV upload row #{row_num}"
            )
            db.add(mv)

            accepted.append({
                "row": row_num,
                "ingredient": clean_name,
                "date": parsed_date.strftime("%Y-%m-%d"),
                "qty": abs(qty_float),
                "type": mv_type,
                "current_stock_after": target_ing.current_stock
            })

        db.commit()

        return {
            "status": "success",
            "filename": file.filename,
            "total_rows_processed": len(df),
            "accepted_count": len(accepted),
            "rejected_count": len(rejected),
            "rejected_details": rejected,
            "accepted_sample": accepted[:5]
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to process upload file: {str(exc)}"
        )


# ==============================================================================
# 6. CSV PREDICTION PIPELINE (7-DAY MOVING AVERAGE -> CSV OUTPUT)
# ==============================================================================
@app.post("/predict", tags=["Data Pipeline & Forecasting"])
async def predict_demand_csv(file: UploadFile = File(...)):
    """
    Demand Prediction Engine:
    - Ingests raw sales CSV (tolerating diverse column names).
    - Cleans data and fills missing calendar days with 0 demand.
    - Calculates a 7-day rolling moving average per unique ingredient.
    - Returns a downloadable CSV with the strict schema: 'ingredient,date,predicted_qty'.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Please provide a valid CSV file for demand prediction."
        )

    try:
        contents = await file.read()
        if not contents or len(contents.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Uploaded file is empty. Please provide a CSV with historical sales."
            )

        # 1. Parse into DataFrame
        try:
            raw_df = pd.read_csv(io.StringIO(contents.decode("utf-8", errors="replace")))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"CSV parse error: {str(e)}"
            )

        if raw_df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="The provided CSV contains headers but no sales records."
            )

        # 2. Dynamic header resolution
        date_col = resolve_column(raw_df.columns, "date")
        item_col = resolve_column(raw_df.columns, "ingredient")
        qty_col = resolve_column(raw_df.columns, "qty")
        type_col = resolve_column(raw_df.columns, "type")

        if not date_col or not item_col or not qty_col:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"CSV missing essential columns for prediction. Required: Date, Ingredient, Quantity. Detected: {list(raw_df.columns)}"
            )

        # 3. Clean and prepare data
        df = raw_df.copy()
        df["clean_ingredient"] = df[item_col].astype(str).str.strip().str.title()
        df = df[df["clean_ingredient"].str.lower() != "nan"]
        df["clean_date"] = pd.to_datetime(df[date_col], errors="coerce").dt.date
        df = df.dropna(subset=["clean_date"])

        df["clean_qty"] = pd.to_numeric(
            df[qty_col].astype(str).str.replace(",", "").str.strip(), 
            errors="coerce"
        ).fillna(0.0)

        if type_col:
            df["clean_type"] = df[type_col].astype(str).str.strip().str.lower()
            is_sale = df["clean_type"].str.contains("sale|dispense|out|consume") | (df["clean_qty"] < 0)
            df = df[is_sale]
        
        df["clean_qty"] = df["clean_qty"].abs()

        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid sales rows found after cleaning. Ensure transactions represent sales."
            )

        # Deduplicate
        df = df.drop_duplicates(subset=["clean_date", "clean_ingredient", "clean_qty"])

        # 4. Aggregate daily sales and fill missing days with 0.0
        daily_sales = (
            df.groupby(["clean_date", "clean_ingredient"], as_index=False)["clean_qty"]
            .sum()
        )

        min_date = daily_sales["clean_date"].min()
        max_date = daily_sales["clean_date"].max()
        all_dates = pd.date_range(min_date, max_date, freq="D").date
        all_ingredients = daily_sales["clean_ingredient"].unique()

        full_grid = pd.MultiIndex.from_product(
            [all_dates, all_ingredients], 
            names=["clean_date", "clean_ingredient"]
        ).to_frame().reset_index(drop=True)

        full_daily = pd.merge(full_grid, daily_sales, on=["clean_date", "clean_ingredient"], how="left")
        full_daily["clean_qty"] = full_daily["clean_qty"].fillna(0.0)

        # 5. Compute 7-day Moving Average Prediction for next day
        output = io.StringIO()
        writer = csv.writer(output)
        # Fixed output schema: ingredient,date,predicted_qty
        writer.writerow(["ingredient", "date", "predicted_qty"])

        next_date_str = (max_date + timedelta(days=1)).strftime("%Y-%m-%d")

        for ingredient in sorted(all_ingredients):
            ing_history = full_daily[full_daily["clean_ingredient"] == ingredient].sort_values("clean_date")
            
            # Take last 7 days of daily demand (including 0s)
            recent_7_days = ing_history["clean_qty"].tail(7)
            
            # Calculate 7-day moving average
            moving_avg = float(recent_7_days.mean()) if len(recent_7_days) > 0 else 0.0
            predicted_qty = round(max(0.0, moving_avg), 2)

            writer.writerow([ingredient, next_date_str, predicted_qty])

        csv_content = output.getvalue()

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=predictions.csv"}
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Prediction pipeline encountered an error: {str(exc)}"
        )


# ==============================================================================
# 7. RESTOCK & SUMMARY INTELLIGENCE
# ==============================================================================
DEFAULT_BURN_RATES = {
    "Bat Wings": 8.0,
    "Dragon Scale": 3.0,
    "Eye Of Newt": 3.0,
    "Ghost Pepper": 5.0,
    "Mandrake Root": 6.0,
    "Nightshade Essence": 2.5,
    "Phoenix Feather": 1.0,
    "Spider Silk": 4.0
}

def _build_restock_list(db: Session) -> List[dict]:
    ingredients = db.query(Ingredient).order_by(Ingredient.name).all()
    active_curse = db.query(Event).filter(Event.active == True).first()
    curse_multiplier = active_curse.multiplier if active_curse else 1.0
    cursed_names = {"Bat Wings", "Ghost Pepper", "Mandrake Root"}

    items = []
    for ing in ingredients:
        # Check sales movements in the last 14 days
        cutoff = datetime.utcnow() - timedelta(days=14)
        sales = (
            db.query(Movement)
            .filter(Movement.ingredient_id == ing.id, Movement.type == "sale", Movement.ts >= cutoff)
            .all()
        )
        if sales:
            total_sold = sum(s.qty for s in sales)
            distinct_days = len(set(s.ts.date() for s in sales))
            daily_burn = total_sold / max(1, distinct_days)
        else:
            daily_burn = DEFAULT_BURN_RATES.get(ing.name.title(), max(1.0, round(ing.current_stock / 7.0, 1)))

        # Apply active event multiplier
        if active_curse and ing.name.title() in cursed_names:
            daily_burn *= curse_multiplier

        daily_burn = round(daily_burn, 2)
        horizon = max(14, ing.lead_time_days + 7)
        forecast_series = [daily_burn] * horizon

        days_left = days_until_stockout(ing.current_stock, forecast_series)
        st = stock_status(days_left)
        sigma = max(0.5, round(0.25 * daily_burn, 2))
        ss = safety_stock(sigma, ing.lead_time_days, z=1.65)
        forecast_lead_review = daily_burn * (ing.lead_time_days + 7)
        reorder = reorder_quantity(forecast_lead_review, ss, ing.current_stock)

        items.append({
            "ingredient_id": ing.id,
            "ingredient": ing.name,
            "stock": round(float(ing.current_stock), 2),
            "unit": ing.unit,
            "days_until_stockout": days_left,
            "status": st,
            "reorder_qty": reorder,
            "safety_stock": ss,
            "lead_time_days": ing.lead_time_days,
            "daily_demand": daily_burn
        })
    return items


@app.get("/restock", response_model=List[RestockItem], tags=["Restock & Prophecy"])
def get_restock_list(db: Session = Depends(get_db)):
    """
    Returns restock recommendations, days until stockout, health status,
    and reorder quantities for each ingredient.
    """
    return _build_restock_list(db)


@app.get("/summary", response_model=SummaryResponse, tags=["Restock & Prophecy"])
def get_inventory_summary(db: Session = Depends(get_db)):
    """
    Returns high-level pantry summary metrics:
    - low_count: count of items with status 'low'
    - critical_count: count of items with status 'critical'
    - alerts_today: alerts recorded today
    - nearest_stockout_days: minimum days until stockout
    - total_ingredients: total items in pantry
    """
    items = _build_restock_list(db)
    low_cnt = sum(1 for it in items if it["status"] == "low")
    critical_cnt = sum(1 for it in items if it["status"] == "critical")
    safe_cnt = sum(1 for it in items if it["status"] == "safe")

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    alerts_today = db.query(Alert).filter(Alert.ts >= today_start).count()
    if alerts_today == 0:
        alerts_today = db.query(Alert).count()

    nearest_days = min((it["days_until_stockout"] for it in items), default=0.0)

    return SummaryResponse(
        low_count=low_cnt,
        critical_count=critical_cnt,
        safe_count=safe_cnt,
        alerts_today=alerts_today,
        nearest_stockout_days=nearest_days,
        total_ingredients=len(items)
    )


# ==============================================================================
# 8. DEMO SEEDING
# ==============================================================================
@app.post("/seed", tags=["System"])
def seed_endpoint():
    """Seed the database with sample ingredients, cleaned sales history, and events."""
    seed_database()
    return {"message": "Database seeded successfully with clean movements and initial alerts."}

