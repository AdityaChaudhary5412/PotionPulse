"""
=============================================================================
PotionPulse · Demand Forecasting & Baseline Validation Engine
- Baselines: Seasonal Naive (t-7), 7-Day Moving Average, Exponential Smoothing
- Machine Learning: LightGBM Regressor with Lags, Rolling Means & Event Multipliers
- Time-Based Holdout Validation: Configurable N-day holdout
- Metrics: WAPE, Percentage Bias, MAE, and Residual Standard Deviation
- Selection: Ship winning method per ingredient with 95% Confidence Bands
=============================================================================
"""

import os
from typing import Dict, List, Tuple, Optional, Union, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# LightGBM Regressor
try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False

# Import data cleaner if available
try:
    from backend.data_cleaner import load_and_clean
except ImportError:
    try:
        from data_cleaner import load_and_clean
    except ImportError:
        load_and_clean = None


# Feature set definition for LightGBM
FEATURE_COLS = [
    "ingredient",
    "dayofweek",
    "lag_1",
    "lag_7",
    "lag_14",
    "rolling_mean_7",
    "rolling_mean_14",
    "event_multiplier"
]


# =============================================================================
# 1. THREE STATISTICAL BASELINES
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
# 2. FEATURE ENGINEERING & LIGHTGBM MODEL
# =============================================================================

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Constructs causal time-series features per ingredient:
    - dayofweek: Day of week index (0=Monday, 6=Sunday)
    - lag_1, lag_7, lag_14: Past demand lags strictly prior to day t
    - rolling_mean_7, rolling_mean_14: Backward rolling averages over preceding days
    - event_multiplier: Event multiplier (default 1.0 when no event)
    - ingredient: Categorical ingredient identifier
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.date
    if "event_multiplier" not in df.columns:
        df["event_multiplier"] = 1.0

    feat_dfs = []
    for ing, g in df.groupby("ingredient", observed=True):
        g = g.sort_values("date").copy()
        first_val = float(g["qty"].iloc[0]) if len(g) > 0 else 0.0

        # Day of week
        g["dayofweek"] = pd.to_datetime(g["date"]).dt.dayofweek

        # Lags computed strictly prior to current day
        g["lag_1"] = g["qty"].shift(1).fillna(first_val)
        g["lag_7"] = g["qty"].shift(7).fillna(g["lag_1"])
        g["lag_14"] = g["qty"].shift(14).fillna(g["lag_7"])

        # Backward rolling means (shifted by 1 so no lookahead bias)
        g["rolling_mean_7"] = g["qty"].shift(1).rolling(7, min_periods=1).mean().fillna(first_val)
        g["rolling_mean_14"] = g["qty"].shift(1).rolling(14, min_periods=1).mean().fillna(first_val)

        feat_dfs.append(g)

    result = pd.concat(feat_dfs).sort_values(["date", "ingredient"]).reset_index(drop=True)
    result["ingredient"] = result["ingredient"].astype("category")
    return result


def train_lightgbm_model(
    train_df: pd.DataFrame, 
    feature_cols: Optional[List[str]] = None,
    per_ingredient: bool = False
) -> Union[Any, Dict[str, Any]]:
    """
    Trains LightGBM model(s):
    - Default: One global LightGBM model with 'ingredient' as a categorical feature.
    - If per_ingredient=True: Trains a dedicated model dictionary for each ingredient.
    """
    if not LIGHTGBM_AVAILABLE:
        raise ImportError("lightgbm is required for training LightGBM models. Install via pip install lightgbm")

    cols = feature_cols or FEATURE_COLS

    if per_ingredient:
        models = {}
        for ing, g in train_df.groupby("ingredient", observed=True):
            sub_cols = [c for c in cols if c != "ingredient"]
            model = lgb.LGBMRegressor(
                n_estimators=50,
                learning_rate=0.08,
                num_leaves=15,
                min_child_samples=max(2, min(5, len(g) // 4)),
                random_state=42,
                verbose=-1
            )
            model.fit(g[sub_cols], g["qty"])
            models[str(ing)] = model
        return models

    # Global model with ingredient as categorical feature
    global_model = lgb.LGBMRegressor(
        n_estimators=60,
        learning_rate=0.08,
        num_leaves=15,
        min_child_samples=2,
        random_state=42,
        verbose=-1
    )
    global_model.fit(train_df[cols], train_df["qty"])
    return global_model


# =============================================================================
# 3. METRICS EVALUATION & TIME-BASED HOLDOUT VALIDATION
# =============================================================================

def compute_metrics(actual: np.ndarray, predicted: np.ndarray) -> Tuple[float, float, float, float]:
    """
    Calculates forecast accuracy and residual dispersion:
    - WAPE: sum(|y - y_hat|) / sum(y)
    - Bias: sum(y_hat - y) / sum(y)
    - MAE: mean(|y - y_hat|)
    - Residual Standard Deviation: std(y - y_hat, ddof=1)
    """
    actual = np.array(actual, dtype=float)
    predicted = np.array(predicted, dtype=float)

    sum_actual = float(np.sum(actual))
    sum_abs_err = float(np.sum(np.abs(actual - predicted)))
    sum_bias = float(np.sum(predicted - actual))

    if sum_actual > 0:
        wape = sum_abs_err / sum_actual
        bias = sum_bias / sum_actual
    else:
        wape = 0.0 if sum_abs_err == 0.0 else 1.0
        bias = 0.0

    mae = float(np.mean(np.abs(actual - predicted))) if len(actual) > 0 else 0.0

    residuals = actual - predicted
    if len(residuals) > 1:
        residual_std = float(np.std(residuals, ddof=1))
    elif len(residuals) == 1:
        residual_std = float(np.abs(residuals[0]))
    else:
        residual_std = 0.0

    return round(wape, 4), round(bias, 4), round(mae, 2), round(residual_std, 2)


def validate_baselines(
    df: pd.DataFrame, 
    holdout_days: int = 7, 
    alpha_es: float = 0.3
) -> pd.DataFrame:
    """
    Performs time-based rolling-origin holdout validation across 4 methods:
    1. Seasonal Naive (t-7)
    2. 7-Day Moving Average
    3. Exponential Smoothing (α=0.3)
    4. LightGBM Regressor (with lags 1/7/14, rolling means 7/14, event_multiplier, ingredient)

    Returns:
        pd.DataFrame containing metrics and residual std per ingredient per method.
    """
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

    # Build feature table for LightGBM
    feat_df = build_features(df)
    train_feat = feat_df[feat_df["date"].isin(train_dates)].copy()

    # Train global LightGBM model on train set
    lgb_model = None
    if LIGHTGBM_AVAILABLE:
        try:
            lgb_model = train_lightgbm_model(train_feat, feature_cols=FEATURE_COLS, per_ingredient=False)
        except Exception as e:
            print(f"Warning: LightGBM training failed: {e}. Skipping LightGBM.")

    ingredients = sorted(df["ingredient"].unique())
    results = []

    for ing in ingredients:
        ing_data = df[df["ingredient"] == ing].sort_values("date").reset_index(drop=True)
        full_series = ing_data.set_index("date")["qty"]

        actuals = []
        preds_snaive = []
        preds_ma = []
        preds_es = []
        preds_lgb = []

        # Predict each day in the holdout window
        for test_date in test_dates:
            history_series = full_series.loc[full_series.index < test_date]
            actual_val = full_series.get(test_date, 0.0)
            actuals.append(actual_val)

            # 1. Seasonal Naive
            p_snaive = seasonal_naive_forecast(history_series, horizon=1, season_length=7)[0]
            preds_snaive.append(p_snaive)

            # 2. Moving Average
            p_ma = moving_average_forecast(history_series, window=7, horizon=1)[0]
            preds_ma.append(p_ma)

            # 3. Exponential Smoothing
            p_es = exponential_smoothing_forecast(history_series, alpha=alpha_es, horizon=1)[0]
            preds_es.append(p_es)

            # 4. LightGBM
            if lgb_model is not None:
                # Find test day feature row
                test_row = feat_df[(feat_df["ingredient"] == ing) & (feat_df["date"] == test_date)]
                if not test_row.empty:
                    pred_l = float(lgb_model.predict(test_row[FEATURE_COLS])[0])
                    preds_lgb.append(round(max(0.0, pred_l), 2))
                else:
                    preds_lgb.append(p_ma)

        # Baseline metrics calculation
        wape_sn, bias_sn, mae_sn, res_std_sn = compute_metrics(actuals, preds_snaive)
        wape_ma, bias_ma, mae_ma, res_std_ma = compute_metrics(actuals, preds_ma)
        wape_es, bias_es, mae_es, res_std_es = compute_metrics(actuals, preds_es)

        results.append({
            "ingredient": ing,
            "method": "Seasonal Naive (t-7)",
            "wape": wape_sn,
            "bias": bias_sn,
            "mae": mae_sn,
            "residual_std": res_std_sn,
            "sum_actual": round(sum(actuals), 1),
            "sum_pred": round(sum(preds_snaive), 1)
        })
        results.append({
            "ingredient": ing,
            "method": "7-Day Moving Avg",
            "wape": wape_ma,
            "bias": bias_ma,
            "mae": mae_ma,
            "residual_std": res_std_ma,
            "sum_actual": round(sum(actuals), 1),
            "sum_pred": round(sum(preds_ma), 1)
        })
        results.append({
            "ingredient": ing,
            "method": f"Exponential Smoothing (α={alpha_es})",
            "wape": wape_es,
            "bias": bias_es,
            "mae": mae_es,
            "residual_std": res_std_es,
            "sum_actual": round(sum(actuals), 1),
            "sum_pred": round(sum(preds_es), 1)
        })

        if lgb_model is not None and len(preds_lgb) == len(actuals):
            wape_lgb, bias_lgb, mae_lgb, res_std_lgb = compute_metrics(actuals, preds_lgb)
            results.append({
                "ingredient": ing,
                "method": "LightGBM Regressor",
                "wape": wape_lgb,
                "bias": bias_lgb,
                "mae": mae_lgb,
                "residual_std": res_std_lgb,
                "sum_actual": round(sum(actuals), 1),
                "sum_pred": round(sum(preds_lgb), 1)
            })

    table_df = pd.DataFrame(results)
    return table_df


# =============================================================================
# 4. WINNER SELECTION & FUTURE PREDICTION WITH CONFIDENCE BANDS
# =============================================================================

def best_baseline(
    ingredient: str, 
    validation_table: Optional[pd.DataFrame] = None, 
    df: Optional[pd.DataFrame] = None, 
    holdout_days: int = 7
) -> Dict[str, Union[str, float]]:
    """
    Selects the best performing model for an ingredient:
    - Primary criterion: Lowest WAPE
    - Secondary criterion: Lowest absolute Bias
    - Computes residual standard deviation and 95% confidence band margin (1.96 * sigma)
    """
    if validation_table is None:
        if df is None:
            raise ValueError("Either validation_table or raw df must be provided.")
        validation_table = validate_baselines(df, holdout_days=holdout_days)

    ing_clean = ingredient.strip().title()
    subset = validation_table[validation_table["ingredient"].str.title() == ing_clean]

    if subset.empty:
        raise ValueError(f"No validation results found for ingredient: '{ingredient}'. Available: {list(validation_table['ingredient'].unique())}")

    sorted_candidates = subset.copy()
    sorted_candidates["abs_bias"] = sorted_candidates["bias"].abs()
    best_row = sorted_candidates.sort_values(by=["wape", "abs_bias"]).iloc[0]

    residual_std = float(best_row["residual_std"])
    band_95_margin = round(1.96 * residual_std, 2)

    return {
        "ingredient": best_row["ingredient"],
        "best_method": best_row["method"],
        "wape": float(best_row["wape"]),
        "wape_pct": f"{best_row['wape'] * 100:.1f}%",
        "bias": float(best_row["bias"]),
        "bias_pct": f"{best_row['bias'] * 100:+.1f}%",
        "mae": float(best_row["mae"]),
        "residual_std": residual_std,
        "confidence_band_95_margin": band_95_margin
    }


def predict_future(
    ingredient: str,
    df: pd.DataFrame,
    horizon: int = 7,
    event_multiplier: float = 1.0,
    validation_table: Optional[pd.DataFrame] = None
) -> List[Dict[str, Any]]:
    """
    Ships the winning model per ingredient to predict future demand with 95% confidence bands.
    Confidence intervals are defined as [max(0, y_hat - 1.96 * sigma), y_hat + 1.96 * sigma].
    """
    winner = best_baseline(ingredient, validation_table=validation_table, df=df)
    best_method = winner["best_method"]
    sigma = winner["residual_std"]

    df_ing = df[df["ingredient"].str.title() == ingredient.strip().title()].sort_values("date")
    last_date = pd.to_datetime(df_ing["date"].iloc[-1]).date()
    future_dates = [last_date + timedelta(days=i + 1) for i in range(horizon)]

    series = df_ing.set_index("date")["qty"]
    predictions = []

    if "LightGBM" in best_method and LIGHTGBM_AVAILABLE:
        # Build features and train global model on full data
        feat_df = build_features(df)
        model = train_lightgbm_model(feat_df, feature_cols=FEATURE_COLS)
        
        # Sequentially forecast with recursive update
        running_history = list(series.tolist())
        for f_date in future_dates:
            lag1 = running_history[-1]
            lag7 = running_history[-7] if len(running_history) >= 7 else lag1
            lag14 = running_history[-14] if len(running_history) >= 14 else lag7
            rm7 = float(np.mean(running_history[-7:]))
            rm14 = float(np.mean(running_history[-14:]))

            row = pd.DataFrame([{
                "ingredient": ingredient,
                "dayofweek": f_date.weekday(),
                "lag_1": lag1,
                "lag_7": lag7,
                "lag_14": lag14,
                "rolling_mean_7": rm7,
                "rolling_mean_14": rm14,
                "event_multiplier": event_multiplier
            }])
            row["ingredient"] = row["ingredient"].astype("category")
            pred_val = max(0.0, float(model.predict(row[FEATURE_COLS])[0]))
            predictions.append(round(pred_val, 2))
            running_history.append(pred_val)

    elif "Seasonal Naive" in best_method:
        predictions = seasonal_naive_forecast(series, horizon=horizon, season_length=7)
    elif "Exponential Smoothing" in best_method:
        predictions = exponential_smoothing_forecast(series, alpha=0.3, horizon=horizon)
    else:
        predictions = moving_average_forecast(series, window=7, horizon=horizon)

    # Apply event multiplier to statistical baselines if active
    if "LightGBM" not in best_method and event_multiplier != 1.0:
        predictions = [round(p * event_multiplier, 2) for p in predictions]

    # Package forecast with confidence bands
    forecast_records = []
    for f_date, pred in zip(future_dates, predictions):
        lower_band = round(max(0.0, pred - 1.96 * sigma), 2)
        upper_band = round(pred + 1.96 * sigma, 2)
        forecast_records.append({
            "date": str(f_date),
            "ingredient": ingredient,
            "predicted_qty": pred,
            "lower_bound_95": lower_band,
            "upper_bound_95": upper_band,
            "residual_std": sigma,
            "method": best_method
        })

    return forecast_records


# =============================================================================
# 5. SAMPLE DATA GENERATOR & DEMONSTRATION RUNNER
# =============================================================================

def generate_sample_time_series(days: int = 28) -> pd.DataFrame:
    """Generates 28 days of daily sales including weekend seasonality, events, and Midnight Curse."""
    np.random.seed(42)
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days - 1)
    date_range = pd.date_range(start_date, end_date, freq="D").date

    ingredients = [
        ("Bat Wings", 8.0, True),       # Midnight Curse item
        ("Dragon Scale", 3.0, False),    # Steady demand
        ("Ghost Pepper", 5.0, True),     # Midnight Curse item
        ("Mandrake Root", 6.0, True),    # Midnight Curse item
        ("Nightshade Essence", 2.5, False)
    ]

    records = []
    for d_idx, date_val in enumerate(date_range):
        weekday = date_val.weekday()
        is_weekend = weekday >= 5

        for name, base_burn, is_curse in ingredients:
            qty = max(0.0, np.random.normal(base_burn, 1.2))
            if is_weekend:
                qty *= 1.35
            
            # Historical festival on days 10-11, and holdout curse surge on final 4 days
            is_event_now = (is_curse and d_idx in [10, 11]) or (is_curse and d_idx >= days - 4)
            event_mult = 3.0 if is_event_now else 1.0
            if is_event_now:
                qty *= event_mult

            records.append({
                "date": date_val,
                "ingredient": name,
                "qty": round(qty, 1),
                "event_multiplier": event_mult
            })

    return pd.DataFrame(records)


def main():
    print("🔮 ======================================================================")
    print("      POTIONPULSE · HYBRID FORECASTING & VALIDATION ENGINE               ")
    print("  (Seasonal Naive, 7-Day MA, Exponential Smoothing & LightGBM Regressor) ")
    print("========================================================================\n")

    csv_path = "backend/sample_sales.csv"
    if os.path.exists(csv_path) and load_and_clean:
        clean_df = load_and_clean(csv_path)
        if len(clean_df["date"].unique()) < 16:
            df = generate_sample_time_series(days=28)
        else:
            df = clean_df
    else:
        df = generate_sample_time_series(days=28)

    holdout = 7
    print(f"📊 Running Time-Based Holdout Validation (Holdout = Last {holdout} Days)...")
    val_table = validate_baselines(df, holdout_days=holdout, alpha_es=0.3)

    # Format table for terminal display
    display_df = val_table.copy()
    display_df["wape"] = display_df["wape"].apply(lambda x: f"{x * 100:.1f}%")
    display_df["bias"] = display_df["bias"].apply(lambda x: f"{x * 100:+.1f}%")
    
    print("\n" + "=" * 90)
    print("               MODEL VALIDATION TABLE (HOLDOUT N=7 DAYS)")
    print("=" * 90)
    print(display_df[["ingredient", "method", "wape", "bias", "mae", "residual_std", "sum_actual", "sum_pred"]].to_string(index=False))
    print("=" * 90)

    # Select best model for each ingredient
    print("\n🏆 WINNING SHIPPED METHOD PER INGREDIENT (LOWEST WAPE):")
    print("-" * 90)
    for ing in sorted(df["ingredient"].unique()):
        winner = best_baseline(ing, validation_table=val_table)
        print(
            f"  ✦ {winner['ingredient']:<20} ➔ Shipped: {winner['best_method']:<24} "
            f"| WAPE: {winner['wape_pct']} | Bias: {winner['bias_pct']} "
            f"| ResStd (σ): {winner['residual_std']} | 95% Band: ±{winner['confidence_band_95_margin']}"
        )
    print("-" * 90 + "\n")

    # Sample future forecast with confidence bands
    sample_ing = "Bat Wings"
    future_fc = predict_future(sample_ing, df=df, horizon=5, event_multiplier=3.0, validation_table=val_table)
    print(f"🔮 Example 5-Day Forecast with 95% Confidence Bands for '{sample_ing}' (Curse Mult = 3.0x):")
    for f in future_fc:
        print(f"  📅 {f['date']}: {f['predicted_qty']:>5.1f} units  (95% CI: [{f['lower_bound_95']:>5.1f}, {f['upper_bound_95']:>5.1f}]) via {f['method']}")
    print()


if __name__ == "__main__":
    main()
