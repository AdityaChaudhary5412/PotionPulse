from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import Optional, List
from backend.models import Ingredient, Movement, Alert, Event
from backend.schemas import IngredientCreate, IngredientUpdate, SaleCreate, StockChange

def get_ingredient(db: Session, ingredient_id: int) -> Optional[Ingredient]:
    return db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()

def get_ingredient_by_name(db: Session, name: str) -> Optional[Ingredient]:
    return db.query(Ingredient).filter(Ingredient.name.ilike(name.strip())).first()

def get_ingredients(db: Session, skip: int = 0, limit: int = 100) -> List[Ingredient]:
    return db.query(Ingredient).offset(skip).limit(limit).all()

def create_ingredient(db: Session, data: IngredientCreate) -> Ingredient:
    cleaned_name = data.name.strip().title()
    db_item = Ingredient(
        name=cleaned_name,
        unit=data.unit.strip().lower(),
        current_stock=data.current_stock,
        lead_time_days=data.lead_time_days
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    # Initial stock movement
    if db_item.current_stock > 0:
        mv = Movement(
            ingredient_id=db_item.id,
            type="adjustment",
            qty=db_item.current_stock,
            note="Initial inventory setup"
        )
        db.add(mv)
        db.commit()

    return db_item

def update_ingredient(db: Session, ingredient_id: int, data: IngredientUpdate) -> Optional[Ingredient]:
    db_item = get_ingredient(db, ingredient_id)
    if not db_item:
        return None

    if data.name is not None:
        db_item.name = data.name.strip().title()
    if data.unit is not None:
        db_item.unit = data.unit.strip().lower()
    if data.current_stock is not None:
        # Log adjustment delta
        delta = data.current_stock - db_item.current_stock
        db_item.current_stock = data.current_stock
        mv = Movement(
            ingredient_id=db_item.id,
            type="adjustment",
            qty=delta,
            note="Manual stock correction"
        )
        db.add(mv)
    if data.lead_time_days is not None:
        db_item.lead_time_days = data.lead_time_days

    db.commit()
    db.refresh(db_item)
    return db_item

def delete_ingredient(db: Session, ingredient_id: int) -> bool:
    db_item = get_ingredient(db, ingredient_id)
    if not db_item:
        return False
    db.delete(db_item)
    db.commit()
    return True

def record_sale(db: Session, sale: SaleCreate) -> Movement:
    ingredient = get_ingredient(db, sale.ingredient_id)
    if not ingredient:
        raise ValueError(f"Ingredient #{sale.ingredient_id} not found")

    # Check stock sufficiency and decrement
    if ingredient.current_stock < sale.qty:
        # Create theft/deficit alert
        alert = Alert(
            ingredient_id=ingredient.id,
            type="OUT_OF_STOCK",
            severity="CRITICAL",
            description=f"Negative stock attempted for {ingredient.name}: requested {sale.qty}, available {ingredient.current_stock}"
        )
        db.add(alert)

    ingredient.current_stock = max(0.0, ingredient.current_stock - sale.qty)

    # Log movement
    mv = Movement(
        ingredient_id=ingredient.id,
        type="sale",
        qty=sale.qty,
        note=sale.note or "Potion sale"
    )
    db.add(mv)

    # Automatic low stock trigger
    if ingredient.current_stock <= 5.0 and ingredient.current_stock > 0:
        alert = Alert(
            ingredient_id=ingredient.id,
            type="LOW_STOCK",
            severity="HIGH",
            description=f"Dangerously low stock for {ingredient.name} ({ingredient.current_stock} {ingredient.unit} remaining)"
        )
        db.add(alert)
    elif ingredient.current_stock == 0:
        alert = Alert(
            ingredient_id=ingredient.id,
            type="OUT_OF_STOCK",
            severity="CRITICAL",
            description=f"{ingredient.name} is completely depleted from shelves!"
        )
        db.add(alert)

    db.commit()
    db.refresh(mv)
    return mv

def update_ingredient_stock(db: Session, ingredient_id: int, stock_change: StockChange) -> Movement:
    ingredient = get_ingredient(db, ingredient_id)
    if not ingredient:
        raise ValueError(f"Ingredient #{ingredient_id} not found")

    qty_change = stock_change.qty
    movement_type = stock_change.type.lower()

    if movement_type == "restock":
        ingredient.current_stock += abs(qty_change)
        applied_qty = abs(qty_change)
    elif movement_type == "adjustment":
        ingredient.current_stock = max(0.0, ingredient.current_stock + qty_change)
        applied_qty = qty_change
    else:
        raise ValueError("Type must be 'restock' or 'adjustment'")

    mv = Movement(
        ingredient_id=ingredient.id,
        type=movement_type,
        qty=applied_qty,
        note=stock_change.note or f"Stock updated via {movement_type}"
    )
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv

