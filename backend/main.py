from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from datetime import datetime

from backend.database import engine, Base, get_db
from backend.models import Ingredient, Movement, Event, Alert
from backend.schemas import (
    IngredientCreate, IngredientUpdate, IngredientOut,
    MovementOut, SaleCreate, StockChange,
    EventOut, AlertOut, HealthResponse
)
from backend import crud
from backend.seed import seed_database

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
def list_alerts(db: Session = Depends(get_db)):
    """List all stockout warnings and statistical anomaly alerts."""
    return db.query(Alert).order_by(desc(Alert.ts)).limit(30).all()

# ==============================================================================
# 5. DEMO SEEDING
# ==============================================================================
@app.post("/seed", tags=["System"])
def seed_endpoint():
    """Seed the database with sample ingredients, cleaned sales history, and events."""
    seed_database()
    return {"message": "Database seeded successfully with clean movements and initial alerts."}
