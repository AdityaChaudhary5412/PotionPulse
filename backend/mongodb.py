"""
PotionPulse MongoDB Atlas Integration
Connects to MongoDB Atlas for cloud persistence, reagent archiving, and audit logging.
"""

import os
import logging
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger("potionpulse.mongodb")

DEFAULT_MONGO_URI = (
    "mongodb+srv://rajjasani2008_db_user:G4LNHI79z04IDsdB@cluster0.e01dabt.mongodb.net/?retryWrites=true&w=majority"
)
MONGODB_URI = os.getenv("MONGODB_URI", DEFAULT_MONGO_URI)
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "potion_pulse")

_client: Optional[MongoClient] = None


def get_mongo_client() -> Optional[MongoClient]:
    global _client
    if _client is None:
        try:
            _client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000,
            )
            # Ping to verify
            _client.admin.command("ping")
            logger.info("Successfully connected to MongoDB Atlas.")
        except Exception as e:
            logger.warning(f"Could not connect to MongoDB Atlas: {e}")
            _client = None
    return _client


def get_mongo_db():
    client = get_mongo_client()
    if client is not None:
        return client[MONGODB_DB_NAME]
    return None


def check_mongo_health() -> Dict[str, Any]:
    try:
        client = get_mongo_client()
        if client is not None:
            server_info = client.server_info()
            db = client[MONGODB_DB_NAME]
            collections = db.list_collection_names()
            return {
                "status": "connected",
                "database": MONGODB_DB_NAME,
                "server_version": server_info.get("version"),
                "collections": collections,
                "cluster": "cluster0.e01dabt.mongodb.net",
            }
        return {"status": "disconnected", "error": "Client not initialized"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def init_mongo_indexes():
    """Create useful indexes on collections if connected."""
    db = get_mongo_db()
    if db is None:
        return
    try:
        db.ingredients.create_index("id", unique=True)
        db.ingredients.create_index("name")
        db.movements.create_index("id", unique=True)
        db.movements.create_index("ingredient_id")
        db.movements.create_index("created_at")
        db.alerts.create_index("created_at")
        db.events.create_index("name")
        db.agent_logs.create_index("timestamp")
    except Exception as e:
        logger.warning(f"Failed to create MongoDB indexes: {e}")


def sync_ingredient_to_mongo(item: Dict[str, Any]):
    db = get_mongo_db()
    if db is None:
        return
    try:
        doc = dict(item)
        doc["updated_at"] = datetime.utcnow()
        db.ingredients.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
    except Exception as e:
        logger.warning(f"Mongo ingredient sync error: {e}")


def delete_ingredient_from_mongo(item_id: int):
    db = get_mongo_db()
    if db is None:
        return
    try:
        db.ingredients.delete_one({"id": item_id})
    except Exception as e:
        logger.warning(f"Mongo ingredient delete error: {e}")


def sync_movement_to_mongo(movement: Dict[str, Any]):
    db = get_mongo_db()
    if db is None:
        return
    try:
        doc = dict(movement)
        db.movements.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
    except Exception as e:
        logger.warning(f"Mongo movement sync error: {e}")


def sync_alert_to_mongo(alert: Dict[str, Any]):
    db = get_mongo_db()
    if db is None:
        return
    try:
        doc = dict(alert)
        db.alerts.insert_one(doc)
    except Exception as e:
        logger.warning(f"Mongo alert sync error: {e}")


def sync_event_to_mongo(event: Dict[str, Any]):
    db = get_mongo_db()
    if db is None:
        return
    try:
        doc = dict(event)
        db.events.update_one({"name": doc.get("name")}, {"$set": doc}, upsert=True)
    except Exception as e:
        logger.warning(f"Mongo event sync error: {e}")


def log_agent_interaction_to_mongo(prompt: str, action_taken: str, details: Dict[str, Any]):
    db = get_mongo_db()
    if db is None:
        return
    try:
        db.agent_logs.insert_one({
            "prompt": prompt,
            "action_taken": action_taken,
            "details": details,
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        logger.warning(f"Mongo agent log error: {e}")


def sync_all_sql_to_mongo(session) -> Dict[str, int]:
    """Syncs the entire relational database into MongoDB Atlas collections."""
    from backend.models import Ingredient, Movement, Event, Alert

    db = get_mongo_db()
    if db is None:
        return {"error": "MongoDB not connected"}

    counts = {"ingredients": 0, "movements": 0, "events": 0, "alerts": 0}

    try:
        # 1. Ingredients
        ingredients = session.query(Ingredient).all()
        for ing in ingredients:
            db.ingredients.update_one(
                {"id": ing.id},
                {
                    "$set": {
                        "id": ing.id,
                        "name": ing.name,
                        "unit": ing.unit,
                        "current_stock": ing.current_stock,
                        "lead_time_days": ing.lead_time_days,
                        "synced_at": datetime.utcnow(),
                    }
                },
                upsert=True,
            )
            counts["ingredients"] += 1

        # 2. Movements
        movements = session.query(Movement).all()
        for mov in movements:
            db.movements.update_one(
                {"id": mov.id},
                {
                    "$set": {
                        "id": mov.id,
                        "ingredient_id": mov.ingredient_id,
                        "type": mov.type,
                        "qty": mov.qty,
                        "note": mov.note or "",
                        "ts": mov.ts,
                        "synced_at": datetime.utcnow(),
                    }
                },
                upsert=True,
            )
            counts["movements"] += 1

        # 3. Events
        events = session.query(Event).all()
        for ev in events:
            db.events.update_one(
                {"id": ev.id},
                {
                    "$set": {
                        "id": ev.id,
                        "name": ev.name,
                        "starts_at": ev.starts_at,
                        "ends_at": ev.ends_at,
                        "ingredient_ids": ev.ingredient_ids,
                        "multiplier": ev.multiplier,
                        "active": ev.active,
                        "synced_at": datetime.utcnow(),
                    }
                },
                upsert=True,
            )
            counts["events"] += 1

        # 4. Alerts
        alerts = session.query(Alert).all()
        for al in alerts:
            db.alerts.update_one(
                {"id": al.id},
                {
                    "$set": {
                        "id": al.id,
                        "ingredient_id": al.ingredient_id,
                        "type": al.type,
                        "severity": al.severity,
                        "description": al.description,
                        "ts": al.ts,
                        "synced_at": datetime.utcnow(),
                    }
                },
                upsert=True,
            )
            counts["alerts"] += 1

        return counts
    except Exception as e:
        logger.error(f"Error during full MongoDB sync: {e}")
        return {"error": str(e), **counts}
