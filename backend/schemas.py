from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
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
class EventCreate(BaseModel):
    name: str = Field(..., example="Midnight Curse")
    start_date: Optional[datetime] = Field(default=None, example="2026-10-31T00:00:00")
    end_date: Optional[datetime] = Field(default=None, example="2026-11-03T00:00:00")
    ingredient_ids: List[int] = Field(default_factory=list, example=[1, 4, 5])
    multiplier: float = Field(default=3.0, gt=0.0, example=3.0)
    active: bool = Field(default=True, example=True)

class EventOut(BaseModel):
    id: int
    name: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    ingredient_ids: List[int] = []
    multiplier: float
    active: bool

    class Config:
        from_attributes = True

# Demand Chart Schemas
class DemandHistoryPoint(BaseModel):
    date: str
    actual: float

class DemandForecastPoint(BaseModel):
    date: str
    predicted_qty: float
    lo: float
    hi: float

class DemandChartPoint(BaseModel):
    date: str
    actual: Optional[float] = None
    forecast: Optional[float] = None
    lo: Optional[float] = None
    hi: Optional[float] = None

class DemandResponse(BaseModel):
    ingredient_id: int
    ingredient: str
    unit: str
    current_stock: float
    with_event: bool
    active_multiplier: float
    history: List[DemandHistoryPoint]
    forecast: List[DemandForecastPoint]
    chart_data: List[DemandChartPoint]

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
    mongodb: Optional[Dict[str, Any]] = None

# Restock & Inventory Intelligence Schemas
class RestockItem(BaseModel):
    ingredient_id: int
    ingredient: str
    stock: float
    unit: str
    days_until_stockout: float
    status: str  # 'safe', 'low', 'critical'
    reorder_qty: float
    safety_stock: Optional[float] = None
    lead_time_days: Optional[int] = None
    daily_demand: Optional[float] = None
    active_multiplier: Optional[float] = 1.0

class SummaryResponse(BaseModel):
    low_count: int
    critical_count: int
    safe_count: Optional[int] = 0
    alerts_today: int
    nearest_stockout_days: Optional[float] = None
    total_ingredients: int

# Emergent Agentic Command Schemas
class AgentCommandRequest(BaseModel):
    prompt: str = Field(..., example="Restock 20 Bat Wings")

class AgentCommandResponse(BaseModel):
    success: bool
    intent: str
    thought: str
    plan: List[str]
    actions_taken: List[str]
    result: str
    suggestions: List[str]
    data: Optional[dict] = None



