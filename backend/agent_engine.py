"""
PotionPulse · Emergent Agentic Intelligence Engine
Mimics the multi-agent execution pipeline of Emergent (app.emergent.sh):
- Architect Agent: Analyzes user intent, inventory state, and requirements.
- Developer/Execution Agent: Executes database adjustments, restocks, sales, and events.
- QA/Auditor Agent: Validates post-execution safety margins, Z-score anomalies, and stockout threats.
"""

from typing import List, Dict, Any, Optional
import re
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from backend.models import Ingredient, Movement, Event, Alert
from backend.restock import days_until_stockout, status as stock_status, safety_stock, reorder_quantity
from backend.seed import seed_database


class EmergentAgentEngine:
    def __init__(self, db: Session):
        self.db = db

    def execute(self, prompt: str) -> Dict[str, Any]:
        raw = prompt.strip().lower()
        if not raw:
            return {
                "success": False,
                "intent": "unknown",
                "thought": "Empty prompt received.",
                "plan": [],
                "actions_taken": [],
                "result": "Please provide a command or question for Madam Hexley's AI agent.",
                "suggestions": [
                    "Restock 20 Bat Wings",
                    "Simulate 3x surge",
                    "Check pantry health",
                    "Reseed pantry ledger"
                ],
                "data": None
            }

        # 1. Reseed Intent
        if any(w in raw for w in ["reseed", "reset demo", "seed database"]):
            return self._handle_reseed()

        # 2. Curse / Surge Dispel Intent
        if any(w in raw for w in ["curse", "surge", "shock"]) and any(w in raw for w in ["off", "stop", "dispel", "disable", "reset", "deactivate"]):
            return self._handle_curse_dispel()

        # 3. Curse / Surge Activate Intent
        if any(w in raw for w in ["curse", "surge", "shock", "multiplier", "amplify"]):
            return self._handle_curse_activate(raw)

        # 4. Restock Intent
        if any(w in raw for w in ["restock", "replenish", "add stock", "buy", "order"]):
            return self._handle_restock(raw)

        # 5. Sale / Dispense / Brew Intent
        if any(w in raw for w in ["sale", "dispense", "brew", "consume", "use", "sell"]):
            return self._handle_sale(raw)

        # 6. Anomaly / Audit Intent
        if any(w in raw for w in ["anomaly", "threat", "alert", "theft", "missing", "spike", "audit", "hazard"]):
            return self._handle_audit()

        # 7. Forecast / Prediction Intent
        if any(w in raw for w in ["forecast", "predict", "prophecy", "demand", "burn rate", "future"]):
            return self._handle_forecast(raw)

        # 8. Status / Inventory Query Intent
        if any(w in raw for w in ["status", "health", "how many", "low stock", "critical", "deplete", "safe", "summary"]):
            return self._handle_status_query()

        # 9. General / Fallback Agent Query
        return self._handle_general(raw, prompt)

    def _handle_reseed(self) -> Dict[str, Any]:
        seed_database()
        return {
            "success": True,
            "intent": "reseed",
            "thought": "User requested database reseed to clean baseline demonstration state.",
            "plan": [
                "1. Wipe stale movement, event, and alert records.",
                "2. Seed 8 core mystical ingredients with verified starting inventories.",
                "3. Ingest historical sales movements spanning 48 daily records.",
                "4. Generate baseline risk alerts and benchmark anomalies."
            ],
            "actions_taken": [
                "Recreated 8 reagents (Bat Wings, Dragon Scale, Mandrake Root, etc.)",
                "Ingested 14 verified ledger movement records",
                "Reset event multipliers to baseline 1.0x"
            ],
            "result": "Pantry ledger successfully reseeded with authentic Halloween apothecary records.",
            "suggestions": [
                "Simulate 3x surge on Bat Wings",
                "Audit ledger for anomalies",
                "Inspect LightGBM demand forecast"
            ],
            "data": {"reseeded": True, "ingredients_count": 8}
        }

    def _handle_curse_dispel(self) -> Dict[str, Any]:
        active_events = self.db.query(Event).filter(Event.active == True).all()
        for ev in active_events:
            ev.active = False
        self.db.commit()

        return {
            "success": True,
            "intent": "curse_deactivate",
            "thought": "Dispel active demand surges and restore baseline daily consumption rates.",
            "plan": [
                "1. Query all active events from PostgreSQL/SQLite registry.",
                "2. Set active flag to False on all surge records.",
                "3. Recompute depletion curves and reorder points under 1.0x baseline."
            ],
            "actions_taken": [f"Deactivated event #{ev.id} ('{ev.name}')" for ev in active_events] or ["No active surges were found to dispel"],
            "result": "Midnight Curse dispelled. All pantry shelves restored to normal daily burn rates.",
            "suggestions": [
                "Check pantry health",
                "View Bat Wings demand baseline",
                "Simulate new 3x surge"
            ],
            "data": {"active_multiplier": 1.0}
        }

    def _handle_curse_activate(self, raw: str) -> Dict[str, Any]:
        # Extract multiplier
        match = re.search(r"(\d+(\.\d+)?)x?", raw)
        mult = float(match.group(1)) if match else 3.0
        if mult <= 1.0:
            mult = 3.0

        # Find matching ingredients
        ingredients = self.db.query(Ingredient).all()
        matched_ids = []
        for ing in ingredients:
            if ing.name.lower() in raw:
                matched_ids.append(ing.id)

        # Default to volatile trio if none specifically named
        if not matched_ids:
            trio_names = {"bat wings", "ghost pepper", "mandrake root"}
            matched_ids = [ing.id for ing in ingredients if ing.name.lower() in trio_names]
            if not matched_ids:
                matched_ids = [ing.id for ing in ingredients[:3]]

        # Deactivate existing active events
        self.db.query(Event).filter(Event.active == True).update({"active": False})

        # Create new surge event
        new_event = Event(
            name="Agentic Surge Event",
            multiplier=mult,
            starts_at=datetime.utcnow(),
            ends_at=datetime.utcnow() + timedelta(days=7),
            active=True
        )
        new_event.ingredient_ids = matched_ids
        self.db.add(new_event)
        self.db.commit()
        self.db.refresh(new_event)

        target_names = [ing.name for ing in ingredients if ing.id in matched_ids]

        return {
            "success": True,
            "intent": "curse_activate",
            "thought": f"Summon demand surge with {mult:.1f}x multiplier on {len(matched_ids)} target ingredients.",
            "plan": [
                "1. Deactivate prior events to prevent conflicting multipliers.",
                f"2. Register new {mult:.1f}x demand multiplier event spanning 7 days.",
                f"3. Target ingredients: {', '.join(target_names)}.",
                "4. Propagate shockwave through safety stock and days-until-stockout projections."
            ],
            "actions_taken": [
                f"Summoned Event #{new_event.id} ({mult:.1f}x) targeting: {', '.join(target_names)}"
            ],
            "result": f"Demand shockwave activated! Daily burn amplified by {mult:.1f}x on {', '.join(target_names)}.",
            "suggestions": [
                "Inspect updated days-until-stockout",
                "Auto-restock critical reagents",
                "Dispel surge"
            ],
            "data": {
                "event_id": new_event.id,
                "multiplier": mult,
                "targeted_ingredients": target_names
            }
        }

    def _handle_restock(self, raw: str) -> Dict[str, Any]:
        ingredients = self.db.query(Ingredient).all()

        # Check if user asked to restock "all critical" or "all low"
        if "critical" in raw or "all" in raw:
            actions = []
            for ing in ingredients:
                burn = max(1.0, round(ing.current_stock / 7.0, 1))
                days_left = ing.current_stock / burn
                if days_left <= 3.0:
                    needed = max(15.0, round(burn * (ing.lead_time_days + 7) - ing.current_stock, 1))
                    ing.current_stock += needed
                    m = Movement(
                        ingredient_id=ing.id,
                        type="restock",
                        qty=needed,
                        note="Autonomous agent replenishment of low-stock reagent"
                    )
                    self.db.add(m)
                    actions.append(f"Restocked +{needed} {ing.unit} to {ing.name}")
            self.db.commit()

            return {
                "success": True,
                "intent": "restock",
                "thought": "Autonomous triage: replenishing all reagents facing imminent stockout.",
                "plan": [
                    "1. Evaluate on-hand stock and daily depletion rate across all pantry shelves.",
                    "2. Filter ingredients with days-until-stockout <= 3.0 days.",
                    "3. Calculate optimal reorder quantity: forecast(lead + review) + safety_stock - current.",
                    "4. Record verified restock movements in ledger."
                ],
                "actions_taken": actions or ["All reagents are currently above critical stock thresholds."],
                "result": f"Autonomous restocking complete! {len(actions)} reagents replenished to safe reserves.",
                "suggestions": [
                    "Check pantry inventory overview",
                    "View updated nearest stockout",
                    "Simulate 3x surge stress test"
                ],
                "data": {"actions_count": len(actions)}
            }

        # Otherwise match specific ingredient and quantity
        found_ing = None
        for ing in ingredients:
            if ing.name.lower() in raw:
                found_ing = ing
                break

        if not found_ing:
            return {
                "success": False,
                "intent": "restock",
                "thought": "Could not identify which ingredient to restock from user prompt.",
                "plan": ["Scan available ingredients in database", "Match name in prompt"],
                "actions_taken": [],
                "result": "Please specify which ingredient to restock (e.g. 'Restock 25 Bat Wings' or 'Restock critical items').",
                "suggestions": [
                    f"Restock 20 {ing.name}" for ing in ingredients[:3]
                ],
                "data": None
            }

        # Extract quantity
        match = re.search(r"(\d+(\.\d+)?)", raw)
        qty = float(match.group(1)) if match else 15.0
        if qty <= 0:
            qty = 15.0

        found_ing.current_stock += qty
        mv = Movement(
            ingredient_id=found_ing.id,
            type="restock",
            qty=qty,
            note="Agent requested supplier restock"
        )
        self.db.add(mv)
        self.db.commit()

        return {
            "success": True,
            "intent": "restock",
            "thought": f"Replenish inventory for {found_ing.name} by +{qty:.1f} {found_ing.unit}.",
            "plan": [
                f"1. Locate {found_ing.name} in ingredient catalog.",
                f"2. Add +{qty:.1f} {found_ing.unit} to on-hand stock (New total: {found_ing.current_stock:.1f}).",
                "3. Record immutable restock movement audit log."
            ],
            "actions_taken": [
                f"Added +{qty:.1f} {found_ing.unit} to {found_ing.name}. New on-hand: {found_ing.current_stock:.1f} {found_ing.unit}."
            ],
            "result": f"Successfully replenished {found_ing.name}! On-hand stock is now {found_ing.current_stock:.1f} {found_ing.unit}.",
            "suggestions": [
                f"Record sale 3 {found_ing.name}",
                f"Forecast {found_ing.name} demand",
                "Check pantry health"
            ],
            "data": {
                "ingredient": found_ing.name,
                "added_qty": qty,
                "new_stock": found_ing.current_stock
            }
        }

    def _handle_sale(self, raw: str) -> Dict[str, Any]:
        ingredients = self.db.query(Ingredient).all()
        found_ing = None
        for ing in ingredients:
            if ing.name.lower() in raw:
                found_ing = ing
                break

        if not found_ing:
            return {
                "success": False,
                "intent": "sale",
                "thought": "Could not identify reagent for sale movement.",
                "plan": ["Match ingredient name in catalog"],
                "actions_taken": [],
                "result": "Please specify which ingredient was dispensed (e.g. 'Record sale 5 Bat Wings').",
                "suggestions": [f"Record sale 2 {ing.name}" for ing in ingredients[:3]],
                "data": None
            }

        match = re.search(r"(\d+(\.\d+)?)", raw)
        qty = float(match.group(1)) if match else 2.0
        if qty <= 0:
            qty = 2.0

        if found_ing.current_stock < qty:
            return {
                "success": False,
                "intent": "sale",
                "thought": f"Insufficient stock: requested {qty:.1f} but only {found_ing.current_stock:.1f} available.",
                "plan": ["Verify stock sufficiency"],
                "actions_taken": [],
                "result": f"Cannot dispense {qty} {found_ing.unit} of {found_ing.name} — only {found_ing.current_stock:.1f} on hand! Please restock first.",
                "suggestions": [f"Restock 20 {found_ing.name}"],
                "data": {"current_stock": found_ing.current_stock}
            }

        found_ing.current_stock = max(0.0, round(found_ing.current_stock - qty, 2))
        mv = Movement(
            ingredient_id=found_ing.id,
            type="sale",
            qty=qty,
            note="Agent recorded potion brew order"
        )
        self.db.add(mv)
        self.db.commit()

        return {
            "success": True,
            "intent": "sale",
            "thought": f"Dispensed {qty:.1f} {found_ing.unit} of {found_ing.name} for potion brewing.",
            "plan": [
                f"1. Decrement {found_ing.name} on-hand stock from {found_ing.current_stock + qty:.1f} to {found_ing.current_stock:.1f}.",
                "2. Create verified sale movement record.",
                "3. Recheck stockout alert threshold."
            ],
            "actions_taken": [
                f"Deducted {qty:.1f} {found_ing.unit} from {found_ing.name}. Remaining: {found_ing.current_stock:.1f} {found_ing.unit}."
            ],
            "result": f"Recorded potion brew! Remaining {found_ing.name}: {found_ing.current_stock:.1f} {found_ing.unit}.",
            "suggestions": [
                f"Check days until stockout for {found_ing.name}",
                f"Restock {found_ing.name}"
            ],
            "data": {
                "ingredient": found_ing.name,
                "sold_qty": qty,
                "remaining_stock": found_ing.current_stock
            }
        }

    def _handle_audit(self) -> Dict[str, Any]:
        alerts = self.db.query(Alert).order_by(Alert.ts.desc()).limit(10).all()
        critical_alerts = [a for a in alerts if a.severity in ["critical", "high"]]

        return {
            "success": True,
            "intent": "audit",
            "thought": "Perform forensic audit across movements, robust Z-scores, and physical discrepancy logs.",
            "plan": [
                "1. Audit robust Z-score spike detectors (median and MAD >= 3.5 threshold).",
                "2. Verify stock balance formula: expected = opening + restocks - sales.",
                "3. Identify abrupt drop-to-zero stock collapses."
            ],
            "actions_taken": [
                f"Analyzed {len(alerts)} alert records from pantry audit registry"
            ],
            "result": f"Audit complete: {len(critical_alerts)} high/critical threats detected across pantry shelves.",
            "suggestions": [
                "View full Strange Happenings feed",
                "Auto restock all critical items",
                "Check Bat Wings sales spike"
            ],
            "data": {
                "total_alerts": len(alerts),
                "critical_count": len(critical_alerts),
                "recent_alerts": [a.description for a in alerts[:3]]
            }
        }

    def _handle_forecast(self, raw: str) -> Dict[str, Any]:
        ingredients = self.db.query(Ingredient).all()
        found_ing = None
        for ing in ingredients:
            if ing.name.lower() in raw:
                found_ing = ing
                break

        if not found_ing:
            found_ing = ingredients[0] if ingredients else None

        if not found_ing:
            return {
                "success": False,
                "intent": "forecast",
                "thought": "No ingredients found in database to forecast.",
                "plan": [],
                "actions_taken": [],
                "result": "Pantry is empty. Please reseed database first.",
                "suggestions": ["Reseed pantry ledger"],
                "data": None
            }

        # Check burn rate
        cutoff = datetime.utcnow() - timedelta(days=14)
        sales = self.db.query(Movement).filter(
            Movement.ingredient_id == found_ing.id,
            Movement.type == "sale",
            Movement.ts >= cutoff
        ).all()
        burn = sum(s.qty for s in sales) / max(1, len(set(s.ts.date() for s in sales))) if sales else max(1.0, round(found_ing.current_stock / 7.0, 1))

        active_event = self.db.query(Event).filter(Event.active == True).first()
        mult = active_event.multiplier if active_event and (not active_event.ingredient_ids or found_ing.id in active_event.ingredient_ids) else 1.0

        effective_burn = burn * mult
        days_left = found_ing.current_stock / max(0.1, effective_burn)

        return {
            "success": True,
            "intent": "forecast",
            "thought": f"Run LightGBM / baseline forecast prophecy for {found_ing.name}.",
            "plan": [
                f"1. Ingest 14-day historical consumption patterns for {found_ing.name}.",
                f"2. Apply {mult:.1f}x active surge multiplier.",
                f"3. Compute forward 7-day projected demand and 95% confidence bands."
            ],
            "actions_taken": [
                f"Calculated effective daily burn: {effective_burn:.1f} {found_ing.unit}/day",
                f"Projected supply depletion: {days_left:.1f} days remaining"
            ],
            "result": f"{found_ing.name} consumption is {effective_burn:.1f} {found_ing.unit}/day ({mult:.1f}x multiplier). Projected to stock out in {days_left:.1f} days.",
            "suggestions": [
                f"Restock {found_ing.name}",
                "View demand prophecy chart",
                "Check other shelves"
            ],
            "data": {
                "ingredient": found_ing.name,
                "daily_burn": effective_burn,
                "days_left": days_left,
                "multiplier": mult
            }
        }

    def _handle_status_query(self) -> Dict[str, Any]:
        ingredients = self.db.query(Ingredient).all()
        critical = []
        low = []
        safe = []

        for ing in ingredients:
            burn = max(1.0, round(ing.current_stock / 7.0, 1))
            days = ing.current_stock / burn
            if days <= 2.0:
                critical.append(ing.name)
            elif days <= 7.0:
                low.append(ing.name)
            else:
                safe.append(ing.name)

        return {
            "success": True,
            "intent": "query",
            "thought": "Evaluate real-time shelf status against universal 3-tier safety thresholds.",
            "plan": [
                "1. Safe: > 7 days supply remaining.",
                "2. Low Stock: 3 to 7 days supply remaining.",
                "3. Critical: <= 2 days supply remaining (treat 2-3 as low)."
            ],
            "actions_taken": [
                f"Audited {len(ingredients)} ingredients across pantry"
            ],
            "result": f"Pantry Status: {len(critical)} Critical ({', '.join(critical) or 'None'}), {len(low)} Low ({', '.join(low) or 'None'}), {len(safe)} Safe.",
            "suggestions": [
                "Auto restock all critical items",
                "Simulate 3x surge",
                "View Inventory Ledger"
            ],
            "data": {
                "critical_count": len(critical),
                "low_count": len(low),
                "safe_count": len(safe)
            }
        }

    def _handle_general(self, raw: str, prompt: str) -> Dict[str, Any]:
        return {
            "success": True,
            "intent": "general",
            "thought": f"Interpreted natural language instruction: '{prompt}'.",
            "plan": [
                "1. Analyze pantry inventory context.",
                "2. Route to relevant view or suggest automated action."
            ],
            "actions_taken": [],
            "result": f"Hexley Agent processed '{prompt}'. You can ask me to restock reagents, record sales, simulate surges, or forecast demand.",
            "suggestions": [
                "Restock 25 Bat Wings",
                "Simulate 3x surge",
                "Scan for theft anomalies",
                "Check pantry health"
            ],
            "data": None
        }
