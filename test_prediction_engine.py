import pytest
import pandas as pd
import numpy as np
from forecast import (
    seasonal_naive_forecast,
    moving_average_forecast,
    exponential_smoothing_forecast,
    compute_metrics,
    validate_baselines,
    best_baseline,
    generate_sample_time_series
)

def test_seasonal_naive_forecast():
    # 7-day pattern
    series = pd.Series([10.0, 12.0, 14.0, 15.0, 18.0, 25.0, 30.0])
    # Next day (horizon 1) should match series[-7] -> 10.0
    preds = seasonal_naive_forecast(series, horizon=1, season_length=7)
    assert preds == [10.0]

def test_moving_average_forecast():
    # 7 values with mean 10.0
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
    wape, bias, mae = compute_metrics(actual, predicted)
    assert wape == 0.0
    assert bias == 0.0
    assert mae == 0.0

    # Over-prediction by 10%
    predicted_high = np.array([11.0, 22.0, 33.0])
    wape_h, bias_h, mae_h = compute_metrics(actual, predicted_high)
    assert pytest.approx(wape_h, 0.01) == 0.10
    assert pytest.approx(bias_h, 0.01) == 0.10

def test_validate_baselines_and_best_baseline():
    df = generate_sample_time_series(days=28)
    table = validate_baselines(df, holdout_days=7)
    assert not table.empty
    assert "wape" in table.columns
    assert "bias" in table.columns

    winner = best_baseline("Bat Wings", validation_table=table)
    assert winner["ingredient"] == "Bat Wings"
    assert "best_method" in winner
    assert "wape" in winner
