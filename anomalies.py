"""
=============================================================================
PotionPulse · Anomaly & Risk Detection Engine (anomalies.py)
(a) Spike Detection: Robust Z-Score (Median & MAD) of (Actual - Forecast), Threshold 3.5
(b) Missing Stock Detection: Expected Stock (Opening + Restocks - Sales) vs Recorded Stock
(c) Drop-to-Zero Detection: Depletion tracking from positive stock to zero
- Plain-language explanations & severity classification (low, medium, high)
- Persistence in SQLite Alerts table
=============================================================================
"""

import math
from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

try:
    from backend.models import Alert, Ingredient, Movement
    from backend.database import get_db, SessionLocal
except ImportError:
    try:
        from models import Alert, Ingredient, Movement
        from database import get_db, SessionLocal
    except ImportError:
        Alert = None
        Ingredient = None
        Movement = None
        SessionLocal = None


# =============================================================================
# 1. CORE ANOMALY DETECTION ALGORITHMS
# =============================================================================

def calculate_robust_z_scores(residuals: np.ndarray) -> np.ndarray:
    """
    Computes modified/robust z-scores using median and Median Absolute Deviation (MAD):
    robust_z = 0.6745 * (residual - median) / MAD
    Handles MAD == 0 via mean absolute deviation fallback to prevent division by zero.
    """
    residuals = np.array(residuals, dtype=float)
    if len(residuals) == 0:
        return np.array([])

    med = float(np.median(residuals))
    abs_dev = np.abs(residuals - med)
    mad = float(np.median(abs_dev))

    # Fallback scale if MAD is 0 (e.g. over 50% identical residuals)
    if mad < 1e-4:
        mean_ad = float(np.mean(abs_dev))
        mad = (mean_ad / 1.2533) if mean_ad > 1e-4 else 1.0

    robust_z = 0.6745 * (residuals - med) / mad
    return robust_z


def detect_spikes(
    actual: Union[List[float], np.ndarray],
    forecast: Union[List[float], np.ndarray],
    ingredient_name: str = "Unknown Reagent",
    ingredient_id: Optional[int] = None,
    dates: Optional[List[Any]] = None,
    threshold: float = 3.5
) -> List[Dict[str, Any]]:
    """
    Detects sudden consumption spikes where (actual - forecast) has a robust z-score >= threshold.
    
    Args:
        actual: Historical actual daily sales volume.
        forecast: Expected/forecasted baseline daily sales volume.
        ingredient_name: Reagent name for human-readable reason.
        ingredient_id: Reagent database primary key.
        dates: List of corresponding transaction dates.
        threshold: Robust z-score threshold (default 3.5).
        
    Returns:
        List of detected anomaly records.
    """
    actual_arr = np.array(actual, dtype=float)
    forecast_arr = np.array(forecast, dtype=float)

    if len(actual_arr) != len(forecast_arr) or len(actual_arr) == 0:
        return []

    residuals = actual_arr - forecast_arr
    robust_z = calculate_robust_z_scores(residuals)

    anomalies = []
    for idx, (act, fcast, rz) in enumerate(zip(actual_arr, forecast_arr, robust_z)):
        if rz >= threshold and act > fcast:
            ratio = round(act / max(0.5, fcast), 1)
            
            # Severity based on magnitude of spike
            if rz >= 6.0 or ratio >= 4.0:
                severity = "high"
            elif rz >= 4.5 or ratio >= 2.5:
                severity = "medium"
            else:
                severity = "low"

            date_str = str(dates[idx]) if dates is not None and idx < len(dates) else "today"
            reason = f"{ingredient_name}: sales {ratio}x above normal (spike of {act:.1f} vs forecast {fcast:.1f})"

            anomalies.append({
                "type": "SPIKE",
                "severity": severity,
                "description": reason,
                "ingredient_id": ingredient_id,
                "ingredient_name": ingredient_name,
                "metric_value": round(float(rz), 2),
                "date": date_str,
                "ts": datetime.utcnow()
            })

    return anomalies


def detect_missing_stock(
    opening_stock: float,
    restocks: float,
    sales: float,
    recorded_stock: float,
    ingredient_name: str = "Unknown Reagent",
    ingredient_id: Optional[int] = None,
    tolerance: float = 1.0
) -> Optional[Dict[str, Any]]:
    """
    Detects unexplained stock deficit:
    expected_stock = opening_stock + restocks - sales
    discrepancy = expected_stock - recorded_stock
    Triggers when discrepancy > tolerance.
    """
    expected_stock = float(opening_stock) + float(restocks) - float(sales)
    discrepancy = expected_stock - float(recorded_stock)

    if discrepancy > tolerance:
        pct_loss = (discrepancy / max(1.0, expected_stock)) * 100.0
        
        # Severity ranking
        if discrepancy >= 15.0 or pct_loss >= 35.0:
            severity = "high"
        elif discrepancy >= 5.0 or pct_loss >= 15.0:
            severity = "medium"
        else:
            severity = "low"

        reason = (
            f"{ingredient_name}: {discrepancy:.1f} units missing compared to ledger "
            f"(expected {expected_stock:.1f}, recorded {recorded_stock:.1f})"
        )

        return {
            "type": "MISSING_STOCK",
            "severity": severity,
            "description": reason,
            "ingredient_id": ingredient_id,
            "ingredient_name": ingredient_name,
            "metric_value": round(discrepancy, 2),
            "ts": datetime.utcnow()
        }

    return None


def detect_drop_to_zero(
    previous_stock: float,
    current_stock: float,
    ingredient_name: str = "Unknown Reagent",
    ingredient_id: Optional[int] = None,
    lead_time_days: int = 7
) -> Optional[Dict[str, Any]]:
    """
    Detects sudden stockout: stock plunged from positive balance directly to zero.
    """
    if previous_stock > 0 and current_stock <= 0:
        if previous_stock >= 15.0 or lead_time_days >= 7:
            severity = "high"
        elif previous_stock >= 5.0 or lead_time_days >= 4:
            severity = "medium"
        else:
            severity = "low"

        reason = f"{ingredient_name}: stock abruptly plunged from {previous_stock:.1f} to zero; pantry depleted"

        return {
            "type": "DROP_TO_ZERO",
            "severity": severity,
            "description": reason,
            "ingredient_id": ingredient_id,
            "ingredient_name": ingredient_name,
            "metric_value": float(previous_stock),
            "ts": datetime.utcnow()
        }

    return None


# =============================================================================
# 2. DATABASE INTEGRATION & PIPELINE SCANNER
# =============================================================================

def scan_and_record_alerts(db, persist: bool = True) -> List[Dict[str, Any]]:
    """
    Scans all pantry inventory and sales movements for:
    - Consumption spikes (robust z-score >= 3.5)
    - Missing stock (expected ledger vs current stock)
    - Abrupt drop-to-zero stockouts
    
    Persists unique alerts into the Alert table if persist=True.
    """
    if Alert is None or Ingredient is None or Movement is None:
        return []

    ingredients = db.query(Ingredient).all()
    detected_alerts = []

    for ing in ingredients:
        # 1. Fetch sales movements
        sales_movements = (
            db.query(Movement)
            .filter(Movement.ingredient_id == ing.id, Movement.type == "sale")
            .order_by(Movement.ts)
            .all()
        )
        restock_movements = (
            db.query(Movement)
            .filter(Movement.ingredient_id == ing.id, Movement.type == "restock")
            .all()
        )

        total_sales = sum(m.qty for m in sales_movements)
        total_restocks = sum(m.qty for m in restock_movements)

        # 2. Spike Detection
        if len(sales_movements) >= 4:
            actual_sales = [m.qty for m in sales_movements]
            dates = [m.ts.date() for m in sales_movements]
            
            # Forecast: rolling 7-day average of prior sales
            forecast_sales = []
            for i in range(len(actual_sales)):
                prior = actual_sales[max(0, i - 7):i]
                forecast_sales.append(np.mean(prior) if len(prior) > 0 else np.mean(actual_sales))

            spikes = detect_spikes(
                actual=actual_sales,
                forecast=forecast_sales,
                ingredient_name=ing.name,
                ingredient_id=ing.id,
                dates=dates,
                threshold=3.5
            )
            detected_alerts.extend(spikes)

        # 3. Drop to Zero Detection
        if ing.current_stock <= 0 and total_sales > 0:
            last_positive = sales_movements[-1].qty if sales_movements else 10.0
            drop_alert = detect_drop_to_zero(
                previous_stock=last_positive,
                current_stock=ing.current_stock,
                ingredient_name=ing.name,
                ingredient_id=ing.id,
                lead_time_days=ing.lead_time_days
            )
            if drop_alert:
                detected_alerts.append(drop_alert)

    # Persist alerts to database
    if persist and detected_alerts:
        for alert_dict in detected_alerts:
            # Check for existing alert with same description within past 24 hours
            recent_cutoff = datetime.utcnow() - timedelta(hours=24)
            exists = (
                db.query(Alert)
                .filter(
                    Alert.ingredient_id == alert_dict["ingredient_id"],
                    Alert.type == alert_dict["type"],
                    Alert.description == alert_dict["description"],
                    Alert.ts >= recent_cutoff
                )
                .first()
            )
            if not exists:
                db_alert = Alert(
                    ingredient_id=alert_dict["ingredient_id"],
                    type=alert_dict["type"],
                    severity=alert_dict["severity"],
                    description=alert_dict["description"],
                    ts=alert_dict["ts"]
                )
                db.add(db_alert)
        db.commit()

    return detected_alerts


def main():
    print("🔮 ======================================================================")
    print("           POTIONPULSE · ANOMALY & RISK DETECTION ENGINE                ")
    print("========================================================================\n")

    # 1. Spike detection demo
    actual = [8.0, 7.5, 8.5, 9.0, 7.8, 8.2, 8.1, 38.0]
    forecast = [8.0] * 8
    spikes = detect_spikes(actual, forecast, ingredient_name="Bat Wings", threshold=3.5)
    print(f"⚡ Spike Detection: {len(spikes)} anomaly flagged")
    for s in spikes:
        print(f"   [{s['severity'].upper()}] {s['description']} (Robust Z={s['metric_value']})")

    # 2. Missing stock demo
    missing = detect_missing_stock(
        opening_stock=40.0,
        restocks=10.0,
        sales=5.0,
        recorded_stock=25.0,
        ingredient_name="Eye Of Newt",
        tolerance=1.0
    )
    print(f"\n🕵️ Missing Stock Detection: 1 anomaly flagged")
    if missing:
        print(f"   [{missing['severity'].upper()}] {missing['description']}")

    # 3. Drop to zero demo
    drop = detect_drop_to_zero(
        previous_stock=25.0,
        current_stock=0.0,
        ingredient_name="Dragon Scale"
    )
    print(f"\n📉 Drop-to-Zero Detection: 1 anomaly flagged")
    if drop:
        print(f"   [{drop['severity'].upper()}] {drop['description']}\n")


if __name__ == "__main__":
    main()
