from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Ingredient Schemas
class IngredientBase(BaseModel):
    name: str = Field(..., example="Bat Wings")
    unit: str = Field(default="units", example="pairs")
    current_stock: float = Field(default=0.0, ge=0.0, example=25.0)
    lead_time_days: int = Field(default=7, ge=1, example=5)

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    current_stock: Optional[float] = Field(None, ge=0.0)
    lead_time_days: Optional[int] = Field(None, ge=1)

class IngredientOut(IngredientBase):
    id: int

    class Config:
        from_attributes = True

# Movement Schemas
class MovementBase(BaseModel):
    ingredient_id: int
    type: str = Field(..., example="sale")  # 'sale', 'restock', 'adjustment'
    qty: float = Field(..., example=3.0)
    note: Optional[str] = ""

class MovementCreate(MovementBase):
    pass

class MovementOut(MovementBase):
    id: int
    ts: datetime

    class Config:
        from_attributes = True

# Specific Endpoint Schemas
class SaleCreate(BaseModel):
    ingredient_id: int
    qty: float = Field(..., gt=0.0, example=2.0)
    note: Optional[str] = "Customer potion brew"

class StockChange(BaseModel):
    qty: float = Field(..., example=10.0)
    type: str = Field(default="restock", example="restock")  # 'restock' or 'adjustment'
    note: Optional[str] = "Supplier batch arrival"

# Event & Alert Schemas
class EventBase(BaseModel):
    name: str = "Midnight Curse"
    multiplier: float = 3.0
    active: bool = False

class EventOut(EventBase):
    id: int
    starts_at: datetime
    ends_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AlertOut(BaseModel):
    id: int
    ingredient_id: Optional[int]
    type: str
    severity: str
    description: str
    ts: datetime

    class Config:
        from_attributes = True

# System Health
class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: datetime
    total_ingredients: int
    total_movements: int
    active_alerts: int

