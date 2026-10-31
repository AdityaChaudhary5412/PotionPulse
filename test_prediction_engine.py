import pytest
import pandas as pd
import numpy as np
from forecast import (
    seasonal_naive_forecast,
    moving_average_forecast,
    exponential_smoothing_forecast,
    build_features,
    train_lightgbm_model,
    compute_metrics,
    validate_baselines,
    best_baseline,
    predict_future,
    generate_sample_time_series,
    FEATURE_COLS
)

def test_seasonal_naive_forecast():
    series = pd.Series([10.0, 12.0, 14.0, 15.0, 18.0, 25.0, 30.0])
    preds = seasonal_naive_forecast(series, horizon=1, season_length=7)
    assert preds == [10.0]

def test_moving_average_forecast():
    series = pd.Series([10.0] * 7)
    preds = moving_average_forecast(series, window=7, horizon=1)
    assert preds == [10.0]

def test_exponential_smoothing_forecast():
    series = pd.Series([10.0, 20.0, 10.0, 20.0])
    preds = exponential_smoothing_forecast(series, alpha=0.5, horizon=1)
    assert len(preds) == 1
    assert isinstance(preds[0], float)

def test_compute_metrics():
    actual = np.array([10.0, 20.0, 30.0])
    predicted = np.array([10.0, 20.0, 30.0])
    wape, bias, mae, res_std = compute_metrics(actual, predicted)
    assert wape == 0.0
    assert bias == 0.0
    assert mae == 0.0
    assert res_std == 0.0

    # Over-prediction by 10%
    predicted_high = np.array([11.0, 22.0, 33.0])
    wape_h, bias_h, mae_h, res_std_h = compute_metrics(actual, predicted_high)
    assert pytest.approx(wape_h, 0.01) == 0.10
    assert pytest.approx(bias_h, 0.01) == 0.10
    assert res_std_h > 0.0

def test_feature_engineering_and_lightgbm():
    df = generate_sample_time_series(days=28)
    feat_df = build_features(df)
    
    # Check all required features exist
    for col in ["dayofweek", "lag_1", "lag_7", "lag_14", "rolling_mean_7", "rolling_mean_14", "event_multiplier", "ingredient"]:
        assert col in feat_df.columns
    
    # Check categorical ingredient
    assert feat_df["ingredient"].dtype.name == "category"

    # Train global model
    model = train_lightgbm_model(feat_df, feature_cols=FEATURE_COLS)
    assert model is not None
    preds = model.predict(feat_df[FEATURE_COLS])
    assert len(preds) == len(feat_df)

def test_validate_baselines_with_lightgbm_and_best_baseline():
    df = generate_sample_time_series(days=28)
    table = validate_baselines(df, holdout_days=7)
    assert not table.empty
    assert "wape" in table.columns
    assert "bias" in table.columns
    assert "residual_std" in table.columns
    assert "LightGBM Regressor" in table["method"].values

    winner = best_baseline("Bat Wings", validation_table=table)
    assert winner["ingredient"] == "Bat Wings"
    assert "best_method" in winner
    assert "wape" in winner
    assert "residual_std" in winner
    assert "confidence_band_95_margin" in winner
    assert winner["confidence_band_95_margin"] >= 0.0

def test_predict_future_with_confidence_bands():
    df = generate_sample_time_series(days=28)
    table = validate_baselines(df, holdout_days=7)
    forecasts = predict_future("Bat Wings", df=df, horizon=5, event_multiplier=3.0, validation_table=table)
    assert len(forecasts) == 5
    for f in forecasts:
        assert f["predicted_qty"] >= 0.0
        assert f["lower_bound_95"] <= f["predicted_qty"]
        assert f["upper_bound_95"] >= f["predicted_qty"]
        assert f["residual_std"] >= 0.0
        assert "method" in f
