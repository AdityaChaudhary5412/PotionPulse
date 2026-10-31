"""
=============================================================================
PotionPulse · Demand Forecasting & Baseline Validation Engine
- Baselines: Seasonal Naive (t-7), 7-Day Moving Average, Exponential Smoothing
- Time-Based Holdout Validation: Configurable N-day holdout
- Metrics: WAPE (Weighted Absolute Percentage Error), Percentage Bias, MAE
- Winner Selection: best_baseline(ingredient)
=============================================================================
"""

import os
from typing import Dict, List, Tuple, Optional, Union
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# Import data cleaner if available
try:
    from backend.data_cleaner import load_and_clean
except ImportError:
    from data_cleaner import load_and_clean


# =============================================================================
# 1. THREE BASELINE FORECASTING METHODS
# =============================================================================

def seasonal_naive_forecast(series: pd.Series, horizon: int = 1, season_length: int = 7) -> List[float]:
    """
    Seasonal Naive Baseline:
    Predicts demand using the observation from exactly one season (7 days) prior:
    y_hat_{t} = y_{t - 7}
    """
    values = series.tolist()
    preds = []
    extended = list(values)
    for h in range(horizon):
        if len(extended) >= season_length:
            pred = max(0.0, float(extended[-season_length]))
        elif len(extended) > 0:
            pred = max(0.0, float(np.mean(extended)))
        else:
            pred = 0.0
        preds.append(round(pred, 2))
        extended.append(pred)
    return preds


def moving_average_forecast(series: pd.Series, window: int = 7, horizon: int = 1) -> List[float]:
    """
    7-Day Moving Average Baseline:
    Predicts demand as the unweighted arithmetic mean of the preceding 7 days:
    y_hat_{t} = (1 / 7) * sum_{k=1}^7 y_{t - k}
    """
    values = series.tolist()
    preds = []
    extended = list(values)
    for h in range(horizon):
        if len(extended) >= window:
            pred = max(0.0, float(np.mean(extended[-window:])))
        elif len(extended) > 0:
            pred = max(0.0, float(np.mean(extended)))
        else:
            pred = 0.0
        preds.append(round(pred, 2))
        extended.append(pred)
    return preds


def exponential_smoothing_forecast(series: pd.Series, alpha: float = 0.3, horizon: int = 1) -> List[float]:
    """
    Simple Exponential Smoothing (SES) Baseline:
    y_hat_{t} = alpha * y_{t-1} + (1 - alpha) * y_hat_{t-1}
    """
    values = series.tolist()
    if len(values) == 0:
        return [0.0] * horizon

    level = float(values[0])
    for val in values:
        level = alpha * float(val) + (1.0 - alpha) * level

    level = max(0.0, level)
    return [round(level, 2)] * horizon


# =============================================================================
# 2. TIME-BASED HOLDOUT VALIDATION (WAPE & BIAS)
# =============================================================================

def compute_metrics(actual: np.ndarray, predicted: np.ndarray) -> Tuple[float, float, float]:
    """
    Calculates:
    - WAPE (Weighted Absolute Percentage Error): sum(|y - y_hat|) / sum(y)
    - Bias (Percentage Bias): sum(y_hat - y) / sum(y)
    - MAE (Mean Absolute Error): mean(|y - y_hat|)
    """
    actual = np.array(actual, dtype=float)
    predicted = np.array(predicted, dtype=float)

    sum_actual = float(np.sum(actual))
    sum_abs_err = float(np.sum(np.abs(actual - predicted)))
    sum_bias = float(np.sum(predicted - actual))

    # WAPE calculation (handles zero denominator safely)
    if sum_actual > 0:
        wape = sum_abs_err / sum_actual
        bias = sum_bias / sum_actual
    else:
        wape = 0.0 if sum_abs_err == 0.0 else 1.0
        bias = 0.0

    mae = float(np.mean(np.abs(actual - predicted))) if len(actual) > 0 else 0.0
    return round(wape, 4), round(bias, 4), round(mae, 2)


def validate_baselines(
    df: pd.DataFrame, 
    holdout_days: int = 7, 
    alpha_es: float = 0.3
) -> pd.DataFrame:
    """
    Performs time-based rolling-origin holdout validation:
    1. Holds out the last N days (holdout_days) as the unseen test set.
    2. Generates one-step-ahead daily rolling predictions across the holdout window
       for Seasonal Naive, 7-Day Moving Average, and Exponential Smoothing.
    3. Evaluates WAPE and Bias per ingredient per method.
    
    Returns:
        pd.DataFrame formatted validation comparison table.
    """
    # Ensure correct sorting and types
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df = df.sort_values(by=["date", "ingredient"]).reset_index(drop=True)

    all_dates = sorted(df["date"].unique())
    if len(all_dates) <= holdout_days + 7:
        raise ValueError(
            f"Insufficient time history: dataset has {len(all_dates)} days, "
            f"needs at least {holdout_days + 8} days to validate a {holdout_days}-day holdout with 7-day lag."
        )

    split_idx = len(all_dates) - holdout_days
    train_dates = all_dates[:split_idx]
    test_dates = all_dates[split_idx:]

    ingredients = sorted(df["ingredient"].unique())
    results = []

    for ing in ingredients:
        ing_data = df[df["ingredient"] == ing].sort_values("date").reset_index(drop=True)
        
        # Series aligned with full calendar
        full_series = ing_data.set_index("date")["qty"]

        actuals = []
        preds_snaive = []
        preds_ma = []
        preds_es = []

        # Rolling 1-step-ahead validation across test window
        for test_date in test_dates:
            history_series = full_series.loc[full_series.index < test_date]
            actual_val = full_series.get(test_date, 0.0)
            actuals.append(actual_val)

            # Predict day t using history up to t-1
            p_snaive = seasonal_naive_forecast(history_series, horizon=1, season_length=7)[0]
            p_ma = moving_average_forecast(history_series, window=7, horizon=1)[0]
            p_es = exponential_smoothing_forecast(history_series, alpha=alpha_es, horizon=1)[0]

            preds_snaive.append(p_snaive)
            preds_ma.append(p_ma)
            preds_es.append(p_es)

        # Compute performance metrics for all three baselines
        wape_sn, bias_sn, mae_sn = compute_metrics(actuals, preds_snaive)
        wape_ma, bias_ma, mae_ma = compute_metrics(actuals, preds_ma)
        wape_es, bias_es, mae_es = compute_metrics(actuals, preds_es)

        results.append({
            "ingredient": ing,
            "method": "Seasonal Naive (t-7)",
            "wape": wape_sn,
            "bias": bias_sn,
            "mae": mae_sn,
            "sum_actual": round(sum(actuals), 1),
            "sum_pred": round(sum(preds_snaive), 1)
        })
        results.append({
            "ingredient": ing,
            "method": "7-Day Moving Avg",
            "wape": wape_ma,
            "bias": bias_ma,
            "mae": mae_ma,
            "sum_actual": round(sum(actuals), 1),
            "sum_pred": round(sum(preds_ma), 1)
        })
        results.append({
            "ingredient": ing,
            "method": f"Exponential Smoothing (α={alpha_es})",
            "wape": wape_es,
            "bias": bias_es,
            "mae": mae_es,
            "sum_actual": round(sum(actuals), 1),
            "sum_pred": round(sum(preds_es), 1)
        })

    table_df = pd.DataFrame(results)
    return table_df


# =============================================================================
# 3. WINNER SELECTION PER INGREDIENT
# =============================================================================

def best_baseline(
    ingredient: str, 
    validation_table: Optional[pd.DataFrame] = None, 
    df: Optional[pd.DataFrame] = None, 
    holdout_days: int = 7
) -> Dict[str, Union[str, float]]:
    """
    Determines the best performing baseline for a given ingredient:
    - Primary criterion: Lowest WAPE
    - Secondary criterion: Lowest absolute Bias
    
    Returns:
        dict: {'ingredient': str, 'best_method': str, 'wape': float, 'bias': float, 'mae': float}
    """
    if validation_table is None:
        if df is None:
            raise ValueError("Either validation_table or raw df must be provided.")
        validation_table = validate_baselines(df, holdout_days=holdout_days)

    ing_clean = ingredient.strip().title()
    subset = validation_table[validation_table["ingredient"].str.title() == ing_clean]

    if subset.empty:
        raise ValueError(f"No validation results found for ingredient: '{ingredient}'. Available: {list(validation_table['ingredient'].unique())}")

    # Sort primarily by lowest WAPE, then lowest |bias|
    sorted_candidates = subset.copy()
    sorted_candidates["abs_bias"] = sorted_candidates["bias"].abs()
    best_row = sorted_candidates.sort_values(by=["wape", "abs_bias"]).iloc[0]

    return {
        "ingredient": best_row["ingredient"],
        "best_method": best_row["method"],
        "wape": float(best_row["wape"]),
        "wape_pct": f"{best_row['wape'] * 100:.1f}%",
        "bias": float(best_row["bias"]),
        "bias_pct": f"{best_row['bias'] * 100:+.1f}%",
        "mae": float(best_row["mae"])
    }


# =============================================================================
# 4. SAMPLE DATA GENERATOR & DEMONSTRATION RUNNER
# =============================================================================

def generate_sample_time_series(days: int = 28) -> pd.DataFrame:
    """Generates 28 days of daily sales for testing the 3 baselines and Midnight Curse."""
    np.random.seed(42)
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days - 1)
    date_range = pd.date_range(start_date, end_date, freq="D").date

    ingredients = [
        ("Bat Wings", 8.0, True),       # Midnight Curse item (strong weekend & seasonal pulse)
        ("Dragon Scale", 3.0, False),    # Steady demand
        ("Ghost Pepper", 5.0, True),     # Midnight Curse item
        ("Mandrake Root", 6.0, True),    # Midnight Curse item
        ("Nightshade Essence", 2.5, False)
    ]

    records = []
    for d_idx, date_val in enumerate(date_range):
        weekday = date_val.weekday() # 0 = Monday, 6 = Sunday
        is_weekend = weekday >= 5

        for name, base_burn, is_curse in ingredients:
            # Baseline Gaussian volume
            qty = max(0.0, np.random.normal(base_burn, 1.2))
            
            # Weekend seasonal bump
            if is_weekend:
                qty *= 1.35
            
            # Simulate Midnight Curse surge spike on the final 3 days for Bat Wings & Ghost Pepper
            if is_curse and d_idx >= days - 4:
                qty *= 2.8

            records.append({
                "date": date_val,
                "ingredient": name,
                "qty": round(qty, 1)
            })

    return pd.DataFrame(records)


def main():
    print("🔮 ======================================================================")
    print("      POTIONPULSE · BASELINE FORECASTING VALIDATION ENGINE               ")
    print("========================================================================\n")

    # Ingest from CSV or fallback to realistic 28-day sample
    csv_path = "backend/sample_sales.csv"
    if os.path.exists(csv_path):
        clean_df = load_and_clean(csv_path)
        # If sample CSV is too short for a full 7-day holdout + 7-day lag, use 28-day history
        if len(clean_df["date"].unique()) < 16:
            print(f"ℹ️ '{csv_path}' has {len(clean_df['date'].unique())} days. Augmenting with 28-day series for robust validation.\n")
            df = generate_sample_time_series(days=28)
        else:
            df = clean_df
    else:
        df = generate_sample_time_series(days=28)

    holdout = 7
    print(f"📊 Running Time-Based Holdout Validation (Holdout = Last {holdout} Days)...")
    val_table = validate_baselines(df, holdout_days=holdout, alpha_es=0.3)

    # Format table for high-visibility terminal display
    display_df = val_table.copy()
    display_df["wape"] = display_df["wape"].apply(lambda x: f"{x * 100:.1f}%")
    display_df["bias"] = display_df["bias"].apply(lambda x: f"{x * 100:+.1f}%")
    
    print("\n" + "=" * 80)
    print("               TIME-SERIES BASELINE VALIDATION TABLE (N=7)")
    print("=" * 80)
    print(display_df[["ingredient", "method", "wape", "bias", "mae", "sum_actual", "sum_pred"]].to_string(index=False))
    print("=" * 80)

    # Select best baseline for each ingredient
    print("\n🏆 WINNING BASELINES PER INGREDIENT (MINIMUM WAPE):")
    print("-" * 80)
    for ing in sorted(df["ingredient"].unique()):
        winner = best_baseline(ing, validation_table=val_table)
        print(f"  ✦ {winner['ingredient']:<20} ➔ Best: {winner['best_method']:<32} | WAPE: {winner['wape_pct']} | Bias: {winner['bias_pct']} | MAE: {winner['mae']}")
    print("-" * 80 + "\n")


if __name__ == "__main__":
    main()
