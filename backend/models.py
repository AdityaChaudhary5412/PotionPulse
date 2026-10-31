from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import List
import json
from backend.database import Base

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    unit = Column(String(20), default="units", nullable=False)
    current_stock = Column(Float, default=0.0, nullable=False)
    lead_time_days = Column(Integer, default=7, nullable=False)

    movements = relationship("Movement", back_populates="ingredient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="ingredient", cascade="all, delete-orphan")


class Movement(Base):
    __tablename__ = "movements"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    ts = Column(DateTime, default=datetime.utcnow, nullable=False)
    type = Column(String(20), nullable=False)  # 'sale', 'restock', 'adjustment'
    qty = Column(Float, nullable=False)
    note = Column(String(255), default="")

    ingredient = relationship("Ingredient", back_populates="movements")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., 'Midnight Curse', 'Full Moon Festival'
    multiplier = Column(Float, default=3.0, nullable=False)
    starts_at = Column(DateTime, default=datetime.utcnow)
    ends_at = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    ingredient_ids_str = Column(String(255), default="[]", nullable=False)

    @property
    def ingredient_ids(self) -> List[int]:
        if not self.ingredient_ids_str:
            return []
        try:
            return json.loads(self.ingredient_ids_str)
        except Exception:
            return []

    @ingredient_ids.setter
    def ingredient_ids(self, val: List[int]):
        self.ingredient_ids_str = json.dumps(val if val is not None else [])


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=True)
    type = Column(String(50), nullable=False)  # 'LOW_STOCK', 'OUT_OF_STOCK', 'SPIKE', 'THEFT'
    severity = Column(String(20), default="MEDIUM")  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    description = Column(String(255), nullable=False)
    ts = Column(DateTime, default=datetime.utcnow, nullable=False)

    ingredient = relationship("Ingredient", back_populates="alerts")

