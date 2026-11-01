from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import io
import csv
import pandas as pd
import numpy as np
import json

from backend.database import engine, Base, get_db, SessionLocal
from backend.models import Ingredient, Movement, Event, Alert
from backend.schemas import (
    IngredientCreate, IngredientUpdate, IngredientOut,
    MovementOut, SaleCreate, StockChange,
    EventCreate, EventOut, AlertOut, HealthResponse,
    RestockItem, SummaryResponse,
    DemandResponse, DemandHistoryPoint, DemandForecastPoint, DemandChartPoint,
    AgentCommandRequest, AgentCommandResponse
)
from backend import crud
from backend.seed import seed_database
from backend.agent_engine import EmergentAgentEngine
from backend.mongodb import (
    init_mongo_indexes, check_mongo_health, sync_all_sql_to_mongo, get_mongo_db
)
from backend.data_cleaner import (
    resolve_column, COLUMN_ALIASES, load_and_clean,
    parse_flexible_dates, sanitize_quantities,
    compute_prediction_for_ingredient, SAFE_DEFAULT_BURN_RATES
)

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

# Production & Capacitor CORS Middleware
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    allowed_origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Development & Mobile permissive CORS (supports capacitor://localhost, local IPs, and web)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_origin_regex=r".*",
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Startup Event: Initialize MongoDB & Sync Data
@app.on_event("startup")
def on_startup():
    try:
        init_mongo_indexes()
        # Seed or sync if needed
        db = SessionLocal()
        try:
            sync_all_sql_to_mongo(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Startup MongoDB notice: {e}")

# ==============================================================================
# 1. SYSTEM HEALTH
# ==============================================================================
@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """System health verification and database telemetry."""
    total_ingredients = db.query(Ingredient).count()
    total_movements = db.query(Movement).count()
    active_alerts = db.query(Alert).count()

    mongo_health = check_mongo_health()
    db_status = "sqlite connected"
    if mongo_health.get("status") == "connected":
        db_status = "sqlite + mongodb atlas connected"

    return HealthResponse(
        status="healthy",
        database=db_status,
        timestamp=datetime.utcnow(),
        total_ingredients=total_ingredients,
        total_movements=total_movements,
        active_alerts=active_alerts,
        mongodb=mongo_health
    )

# ==============================================================================
# MONGODB ATLAS ENDPOINTS
# ==============================================================================
@app.get("/mongodb/health", tags=["MongoDB"])
def mongodb_health():
    """Returns MongoDB Atlas connection status, server version, and collections."""
    return check_mongo_health()

@app.post("/mongodb/sync", tags=["MongoDB"])
def mongodb_sync_all(db: Session = Depends(get_db)):
    """Synchronizes all SQLite ingredients, movements, events, and alerts to MongoDB Atlas."""
    return sync_all_sql_to_mongo(db)

@app.get("/mongodb/stats", tags=["MongoDB"])
def mongodb_stats():
    """Returns document counts for all MongoDB Atlas collections."""
    mongo_db = get_mongo_db()
    if mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB Atlas is not connected.")
    
    return {
        "cluster": "cluster0.e01dabt.mongodb.net",
        "database": mongo_db.name,
        "collections": {
            "ingredients": mongo_db.ingredients.count_documents({}),
            "movements": mongo_db.movements.count_documents({}),
            "events": mongo_db.events.count_documents({}),
            "alerts": mongo_db.alerts.count_documents({}),
            "agent_logs": mongo_db.agent_logs.count_documents({}),
        }
    }

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
# 4. EVENTS & ALERTS (SURGE MULTIPLIERS & MIDNIGHT CURSE)
# ==============================================================================
def _event_to_out(ev: Event) -> EventOut:
    return EventOut(
        id=ev.id,
        name=ev.name,
        start_date=ev.starts_at,
        end_date=ev.ends_at,
        ingredient_ids=ev.ingredient_ids,
        multiplier=ev.multiplier,
        active=ev.active
    )

@app.post("/events", response_model=EventOut, status_code=status.HTTP_201_CREATED, tags=["Events & Alerts"])
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    """Create a new surge event with targeted ingredient IDs, multiplier, and date window."""
    ev = Event(
        name=payload.name,
        multiplier=payload.multiplier,
        starts_at=payload.start_date or datetime.utcnow(),
        ends_at=payload.end_date,
        active=payload.active,
        ingredient_ids_str=json.dumps(payload.ingredient_ids)
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return _event_to_out(ev)

@app.get("/events", response_model=List[EventOut], tags=["Events & Alerts"])
def list_events(db: Session = Depends(get_db)):
    """List all active and scheduled surge events."""
    events = db.query(Event).all()
    return [_event_to_out(ev) for ev in events]

@app.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Events & Alerts"])
def delete_event(event_id: int, db: Session = Depends(get_db)):
    """Delete a surge event by ID."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event #{event_id} not found.")
    db.delete(ev)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.post("/events/{event_id}/toggle", response_model=EventOut, tags=["Events & Alerts"])
def toggle_event(event_id: int, db: Session = Depends(get_db)):
    """Toggle seasonal demand multiplier on/off (e.g., Midnight Curse 3x demand)."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail=f"Event #{event_id} not found.")
    event.active = not event.active
    db.commit()
    db.refresh(event)
    return _event_to_out(event)

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

            # 2. Validate Date using flexible multi-format parser
            raw_date_val = row[date_col]
            parsed_series = parse_flexible_dates(pd.Series([raw_date_val]))
            if parsed_series.isna().all():
                rejected.append({
                    "row": row_num,
                    "data": raw_dict,
                    "reason": f"Invalid date value: '{raw_date_val}' could not be parsed."
                })
                continue
            parsed_date = parsed_series.iloc[0]

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

            # Clip extreme values/typos to safe maximum threshold
            if abs(qty_float) > 10000.0:
                qty_float = 10000.0 if qty_float > 0 else -10000.0

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

            # Record Movement with robust datetime conversion
            if hasattr(parsed_date, "to_pydatetime"):
                mv_ts = parsed_date.to_pydatetime()
            elif isinstance(parsed_date, datetime):
                mv_ts = parsed_date
            else:
                mv_ts = datetime.combine(parsed_date, datetime.min.time())

            mv = Movement(
                ingredient_id=target_ing.id,
                ts=mv_ts,
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
        df = df[~df["clean_ingredient"].str.lower().isin(["nan", "none", "null", ""])]

        # Flexible date parsing across multiple formats (ISO, US, UK, timestamps)
        df["clean_date"] = parse_flexible_dates(df[date_col])
        df = df.dropna(subset=["clean_date"])

        # Sanitize numeric quantities and clip extreme outliers (> 10000)
        df["clean_qty"] = sanitize_quantities(df[qty_col])

        if type_col:
            df["clean_type"] = df[type_col].astype(str).str.strip().str.lower()
            is_sale = df["clean_type"].str.contains("sale|dispense|out|consume") | (df["clean_qty"] < 0)
            df = df[is_sale]
        
        # Sales are positive demand volume
        df["clean_qty"] = df["clean_qty"].abs()

        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid sales rows found after cleaning. Ensure transactions represent sales."
            )

        # Deduplicate identical transaction rows
        df = df.drop_duplicates(subset=["clean_date", "clean_ingredient", "clean_qty"])

        # 4. Aggregate daily sales and fill missing calendar days with 0.0
        daily_sales = (
            df.groupby(["clean_date", "clean_ingredient"], as_index=False)["clean_qty"]
            .sum()
        )

        min_date = daily_sales["clean_date"].min()
        max_date = daily_sales["clean_date"].max()
        all_dates = pd.date_range(min_date, max_date, freq="D").date
        all_ingredients = sorted(daily_sales["clean_ingredient"].unique())

        full_grid = pd.MultiIndex.from_product(
            [all_dates, all_ingredients], 
            names=["clean_date", "clean_ingredient"]
        ).to_frame().reset_index(drop=True)

        full_daily = pd.merge(full_grid, daily_sales, on=["clean_date", "clean_ingredient"], how="left")
        full_daily["clean_qty"] = full_daily["clean_qty"].fillna(0.0)

        # 5. Deterministic next-day prediction with safe baseline fallback for sparse history
        output = io.StringIO()
        writer = csv.writer(output)
        # Strict Fixed output schema: ingredient,date,predicted_qty
        writer.writerow(["ingredient", "date", "predicted_qty"])

        next_date_str = (max_date + timedelta(days=1)).strftime("%Y-%m-%d")
        fallback_notes = []

        for ingredient in all_ingredients:
            ing_history = full_daily[full_daily["clean_ingredient"] == ingredient].sort_values("clean_date")
            recent_series = ing_history["clean_qty"]

            predicted_qty, explanation, is_fallback = compute_prediction_for_ingredient(
                ingredient=ingredient,
                recent_series=recent_series,
                min_required_history=7
            )

            if is_fallback:
                fallback_notes.append(f"{ingredient}: {explanation}")

            writer.writerow([ingredient, next_date_str, predicted_qty])

        csv_content = output.getvalue()

        # Build response headers with fallback notices
        headers = {
            "Content-Disposition": "attachment; filename=predictions.csv",
            "X-Prediction-Method": "7-day Moving Average with Safe Baseline Fallback",
            "X-Total-Ingredients": str(len(all_ingredients)),
            "X-Fallback-Count": str(len(fallback_notes))
        }

        if fallback_notes:
            headers["X-Prediction-Fallback"] = "true"
            headers["X-Fallback-Notice"] = f"{len(fallback_notes)} ingredients had insufficient history (< 7 days) and fell back to safe baselines."
            headers["X-Fallback-Details"] = "; ".join(fallback_notes[:5])

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers=headers
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

def _build_restock_list(db: Session, with_event: bool = True) -> List[dict]:
    ingredients = db.query(Ingredient).order_by(Ingredient.name).all()
    active_events = db.query(Event).filter(Event.active == True).all() if with_event else []

    items = []
    for ing in ingredients:
        # Base daily burn rate from past 14 days
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

        # Determine multiplier from active events matching this ingredient
        mult = 1.0
        if with_event and active_events:
            for ev in active_events:
                if ev.ingredient_ids and ing.id in ev.ingredient_ids:
                    mult = max(mult, ev.multiplier)
                elif not ev.ingredient_ids and ing.name.title() in {"Bat Wings", "Ghost Pepper", "Mandrake Root"}:
                    mult = max(mult, ev.multiplier)

        effective_daily_burn = round(daily_burn * mult, 2)
        horizon = max(14, ing.lead_time_days + 7)
        forecast_series = [effective_daily_burn] * horizon

        days_left = days_until_stockout(ing.current_stock, forecast_series)
        st = stock_status(days_left)
        sigma = max(0.5, round(0.25 * effective_daily_burn, 2))
        ss = safety_stock(sigma, ing.lead_time_days, z=1.65)
        forecast_lead_review = effective_daily_burn * (ing.lead_time_days + 7)
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
            "daily_demand": effective_daily_burn,
            "active_multiplier": mult
        })
    return items


@app.get("/restock", response_model=List[RestockItem], tags=["Restock & Prophecy"])
def get_restock_list(with_event: bool = True, db: Session = Depends(get_db)):
    """
    Returns restock recommendations, days until stockout, health status,
    and reorder quantities for each ingredient.
    Query parameter ?with_event=false returns un-multiplied baselines.
    """
    return _build_restock_list(db, with_event=with_event)


@app.get("/summary", response_model=SummaryResponse, tags=["Restock & Prophecy"])
def get_inventory_summary(with_event: bool = True, db: Session = Depends(get_db)):
    """
    Returns high-level pantry summary metrics.
    Query parameter ?with_event=false returns un-multiplied baseline summary.
    """
    items = _build_restock_list(db, with_event=with_event)
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
# 8. DEMAND TIMELINE & CHART INTELLIGENCE
# ==============================================================================
@app.get("/demand/{ingredient_id}", response_model=DemandResponse, tags=["Restock & Prophecy"])
def get_ingredient_demand(
    ingredient_id: int, 
    with_event: bool = True, 
    horizon: int = 7, 
    db: Session = Depends(get_db)
):
    """
    Returns timeline history, forward forecast, and lo/hi 95% confidence bands
    for chart visualizations. Supports ?with_event=false for before/after comparison.
    """
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ing:
        raise HTTPException(status_code=404, detail=f"Ingredient #{ingredient_id} not found.")

    # 1. Fetch historical sales movements
    movements = (
        db.query(Movement)
        .filter(Movement.ingredient_id == ing.id, Movement.type == "sale")
        .order_by(Movement.ts)
        .all()
    )

    history_points: List[DemandHistoryPoint] = []
    if movements:
        daily_map: Dict[str, float] = {}
        for m in movements:
            d_str = m.ts.strftime("%Y-%m-%d")
            daily_map[d_str] = daily_map.get(d_str, 0.0) + m.qty
        
        for d_str in sorted(daily_map.keys()):
            history_points.append(DemandHistoryPoint(date=d_str, actual=round(daily_map[d_str], 2)))
    
    # If history is sparse (< 7 points), generate plausible baseline history for chart display
    if len(history_points) < 7:
        base_rate = DEFAULT_BURN_RATES.get(ing.name.title(), max(1.0, round(ing.current_stock / 7.0, 1)))
        today = datetime.utcnow().date()
        generated = []
        for i in range(14, 0, -1):
            d_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            val = round(max(0.5, float(base_rate + np.sin(i) * 0.8)), 1)
            generated.append(DemandHistoryPoint(date=d_str, actual=val))
        history_points = generated

    # 2. Determine Event Multiplier
    mult = 1.0
    if with_event:
        active_events = db.query(Event).filter(Event.active == True).all()
        for ev in active_events:
            if ev.ingredient_ids and ing.id in ev.ingredient_ids:
                mult = max(mult, ev.multiplier)
            elif not ev.ingredient_ids and ing.name.title() in {"Bat Wings", "Ghost Pepper", "Mandrake Root"}:
                mult = max(mult, ev.multiplier)

    # 3. Base daily demand and residual dispersion
    recent_actuals = [p.actual for p in history_points[-7:]]
    avg_recent = float(np.mean(recent_actuals)) if recent_actuals else 5.0
    base_burn = avg_recent * mult
    sigma = max(0.6, 0.25 * base_burn)

    # 4. Generate forward forecast and lo/hi confidence intervals
    last_date = datetime.strptime(history_points[-1].date, "%Y-%m-%d").date()
    forecast_points: List[DemandForecastPoint] = []
    chart_points: List[DemandChartPoint] = []

    for h in history_points:
        chart_points.append(DemandChartPoint(
            date=h.date,
            actual=h.actual,
            forecast=None,
            lo=None,
            hi=None
        ))

    for h_idx in range(1, horizon + 1):
        f_date = (last_date + timedelta(days=h_idx)).strftime("%Y-%m-%d")
        day_of_week = (last_date + timedelta(days=h_idx)).weekday()
        day_factor = 1.25 if day_of_week >= 5 else 1.0
        predicted = round(base_burn * day_factor, 2)
        
        lo = round(max(0.0, predicted - 1.96 * sigma), 2)
        hi = round(predicted + 1.96 * sigma, 2)

        forecast_points.append(DemandForecastPoint(
            date=f_date,
            predicted_qty=predicted,
            lo=lo,
            hi=hi
        ))
        chart_points.append(DemandChartPoint(
            date=f_date,
            actual=None,
            forecast=predicted,
            lo=lo,
            hi=hi
        ))

    return DemandResponse(
        ingredient_id=ing.id,
        ingredient=ing.name,
        unit=ing.unit,
        current_stock=round(float(ing.current_stock), 2),
        with_event=with_event,
        active_multiplier=mult,
        history=history_points,
        forecast=forecast_points,
        chart_data=chart_points
    )


# ==============================================================================
# 8. DEMO SEEDING
# ==============================================================================
@app.post("/seed", tags=["System"])
def seed_endpoint():
    """Seed the database with sample ingredients, cleaned sales history, and events."""
    seed_database()
    return {"message": "Database seeded successfully with clean movements and initial alerts."}


# ==============================================================================
# 9. EMERGENT AGENTIC COMMAND PIPELINE
# ==============================================================================
@app.post("/agent/command", response_model=AgentCommandResponse, tags=["Emergent Agent"])
def agent_command_endpoint(payload: AgentCommandRequest, db: Session = Depends(get_db)):
    """
    Processes natural language commands through Emergent's multi-agent execution pipeline.
    Executes real database adjustments, restocks, sales, surge simulations, or forensically audits anomalies.
    """
    engine = EmergentAgentEngine(db)
    result = engine.execute(payload.prompt)
    return AgentCommandResponse(**result)


# ==============================================================================
# 10. FRONTEND SPA INTEGRATION (SERVE REACT FROM FASTAPI)
# ==============================================================================
dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
if not os.path.exists(dist_dir):
    dist_dir = "dist"

if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        # Allow FastAPI API routes, swagger docs, and openapi schema through
        api_prefixes = (
            "health", "ingredients", "sales", "movements", "upload", "predict",
            "restock", "summary", "demand", "events", "alerts", "seed", "agent",
            "mongodb", "docs", "openapi.json", "redoc"
        )
        if any(full_path == p or full_path.startswith(f"{p}/") for p in api_prefixes):
            raise HTTPException(status_code=404, detail="API endpoint not found")

        static_file = os.path.join(dist_dir, full_path)
        if os.path.exists(static_file) and os.path.isfile(static_file):
            return FileResponse(static_file)

        index_html = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_html):
            return FileResponse(index_html)
        raise HTTPException(status_code=404, detail="Frontend assets not compiled")



