"""
=============================================================================
PotionPulse · Inventory Restock & Stockout Prediction Engine (restock.py)
- Stockout estimation: days_until_stockout(stock, forecast_series)
- Safety buffer: safety_stock(sigma, lead_time, z=1.65)
- Reorder recommendation: reorder_quantity(...)
- Health classification: status(days) -> "safe" | "low" | "critical"
=============================================================================
"""

import math
from typing import List, Union, Dict, Any, Optional


def days_until_stockout(stock: float, forecast_series: List[float]) -> float:
    """
    Computes exact fractional days until current stock reaches zero given
    a forward forecast series of daily demand quantities.
    
    Args:
        stock: Current on-hand quantity in the pantry.
        forecast_series: List of daily forecasted demands [d_1, d_2, d_3, ...].
        
    Returns:
        float: Days until stockout rounded to 1 decimal place. 0.0 if stock <= 0.
               If stock outlasts forecast_series, projects based on average daily demand.
    """
    if stock <= 0:
        return 0.0

    if not forecast_series:
        return 999.0

    remaining = float(stock)
    for day_idx, daily_demand in enumerate(forecast_series):
        if daily_demand <= 0:
            continue
        if remaining < daily_demand:
            fractional_day = remaining / daily_demand
            return round(day_idx + fractional_day, 1)
        remaining -= daily_demand

    # If stock still remains beyond forecast series, project using average demand
    positive_demands = [d for d in forecast_series if d > 0]
    avg_demand = sum(positive_demands) / len(positive_demands) if positive_demands else 0.0

    if avg_demand > 0:
        extra_days = remaining / avg_demand
        return round(len(forecast_series) + extra_days, 1)

    return 999.0


def safety_stock(sigma: float, lead_time: Union[int, float], z: float = 1.65) -> float:
    """
    Calculates statistical safety stock using lead time variance:
    SS = z * sigma * sqrt(lead_time)
    
    Args:
        sigma: Standard deviation of forecast demand errors (residual std).
        lead_time: Supplier lead time in days.
        z: Service-level factor (default 1.65 corresponds to ~95% cycle service level).
        
    Returns:
        float: Recommended safety stock buffer quantity, rounded to 2 decimal places.
    """
    if sigma <= 0 or lead_time <= 0:
        return 0.0
    ss = z * float(sigma) * math.sqrt(float(lead_time))
    return round(max(0.0, ss), 2)


def reorder_quantity(
    forecast_demand: float = 0.0,
    safety_stock: float = 0.0,
    current_stock: float = 0.0,
    lead_time: Optional[Union[int, float]] = None,
    review_period: Union[int, float] = 7,
    daily_demand: Optional[float] = None
) -> float:
    """
    Reorder quantity calculation:
    reorder_quantity = max(0, forecast over lead time + review period + safety stock - current stock)
    
    Supports both direct passing of forecast over lead_time + review_period,
    or automatic computation if daily_demand and lead_time are supplied.
    """
    if daily_demand is not None and lead_time is not None:
        total_forecast = float(daily_demand) * (float(lead_time) + float(review_period))
    else:
        total_forecast = float(forecast_demand)

    target_inventory = total_forecast + float(safety_stock)
    reorder_needed = target_inventory - float(current_stock)
    return round(max(0.0, reorder_needed), 2)


def status(days: float) -> str:
    """
    Inventory health status classifier:
    - "safe"     : > 7 days of supply
    - "low"      : 3 to 7 days (and 2 to 3 treated as low -> 2.0 <= days <= 7.0)
    - "critical" : <= 2 days (days < 2.0)
    
    Args:
        days: Days until stockout.
        
    Returns:
        str: "safe", "low", or "critical"
    """
    if days > 7.0:
        return "safe"
    elif days >= 2.0:
        return "low"
    else:
        return "critical"


def compute_restock_profile(
    ingredient_id: int,
    name: str,
    unit: str,
    current_stock: float,
    lead_time_days: int,
    daily_demand: float,
    sigma: Optional[float] = None,
    review_period: int = 7,
    z: float = 1.65
) -> Dict[str, Any]:
    """
    Builds the complete restock profile for an individual potion reagent.
    """
    sigma_val = sigma if (sigma is not None and sigma > 0) else max(0.5, 0.25 * daily_demand)
    horizon_days = max(14, lead_time_days + review_period)
    forecast_series = [daily_demand] * horizon_days

    days_left = days_until_stockout(current_stock, forecast_series)
    st = status(days_left)
    ss = safety_stock(sigma_val, lead_time_days, z=z)
    forecast_lead_review = daily_demand * (lead_time_days + review_period)
    reorder = reorder_quantity(forecast_lead_review, ss, current_stock)

    return {
        "ingredient_id": ingredient_id,
        "ingredient": name,
        "stock": round(float(current_stock), 2),
        "unit": unit,
        "days_until_stockout": days_left,
        "status": st,
        "reorder_qty": reorder,
        "safety_stock": ss,
        "lead_time_days": lead_time_days,
        "daily_demand": round(float(daily_demand), 2)
    }


def main():
    print("🔮 ======================================================================")
    print("       POTIONPULSE · RESTOCK RECOMMENDATION & STOCKOUT ENGINE            ")
    print("========================================================================\n")

    sample_inventory = [
        {"id": 1, "name": "Bat Wings", "unit": "pairs", "stock": 17.0, "lt": 3, "burn": 8.0, "sigma": 1.8},
        {"id": 2, "name": "Dragon Scale", "unit": "scales", "stock": 38.0, "lt": 10, "burn": 3.0, "sigma": 0.8},
        {"id": 3, "name": "Eye Of Newt", "unit": "eyeballs", "stock": 20.0, "lt": 5, "burn": 3.0, "sigma": 0.7},
        {"id": 4, "name": "Ghost Pepper", "unit": "peppers", "stock": 7.0, "lt": 4, "burn": 5.0, "sigma": 1.4},
        {"id": 5, "name": "Mandrake Root", "unit": "roots", "stock": 12.0, "lt": 6, "burn": 6.0, "sigma": 1.5},
        {"id": 6, "name": "Nightshade Essence", "unit": "vials", "stock": 35.0, "lt": 7, "burn": 2.5, "sigma": 0.6},
        {"id": 7, "name": "Phoenix Feather", "unit": "feathers", "stock": 4.0, "lt": 14, "burn": 1.0, "sigma": 0.4},
        {"id": 8, "name": "Spider Silk", "unit": "skeins", "stock": 50.0, "lt": 4, "burn": 4.0, "sigma": 1.0},
    ]

    profiles = []
    for item in sample_inventory:
        p = compute_restock_profile(
            ingredient_id=item["id"],
            name=item["name"],
            unit=item["unit"],
            current_stock=item["stock"],
            lead_time_days=item["lt"],
            daily_demand=item["burn"],
            sigma=item["sigma"]
        )
        profiles.append(p)

    low_count = sum(1 for p in profiles if p["status"] == "low")
    critical_count = sum(1 for p in profiles if p["status"] == "critical")
    nearest_days = min(p["days_until_stockout"] for p in profiles)

    print(f"{'Ingredient':<20} {'Stock':<10} {'Days Left':<12} {'Status':<12} {'Safety Stock':<14} {'Reorder Qty':<12}")
    print("-" * 80)
    for p in profiles:
        print(f"{p['ingredient']:<20} {p['stock']:<10.1f} {p['days_until_stockout']:<12.1f} {p['status'].upper():<12} {p['safety_stock']:<14.2f} {p['reorder_qty']:<12.1f}")
    print("-" * 80)

    print(f"\n📊 Summary Metrics:")
    print(f"  • Low Stock Items     : {low_count}")
    print(f"  • Critical Stock Items: {critical_count}")
    print(f"  • Nearest Stockout    : {nearest_days} days\n")


if __name__ == "__main__":
    main()
