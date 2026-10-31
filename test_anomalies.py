import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
from backend.main import app
from anomalies import (
    detect_spikes,
    detect_missing_stock,
    detect_drop_to_zero,
    calculate_robust_z_scores
)

client = TestClient(app)


def test_robust_z_score_math():
    residuals = np.array([0.0, 0.2, -0.1, 0.1, -0.2, 0.0, 0.1, 25.0])
    z_scores = calculate_robust_z_scores(residuals)
    assert len(z_scores) == len(residuals)
    # The outlier (index 7) should easily exceed 3.5
    assert z_scores[-1] > 10.0
    # Normal residuals should stay well below 3.5
    for z in z_scores[:-1]:
        assert abs(z) < 3.5


def test_injected_anomalies_benchmark():
    """
    Injects 5 known anomalies into sample data:
    1. Spike in Bat Wings (52.0 vs 8.0 baseline)
    2. Spike in Ghost Pepper (42.0 vs 5.0 baseline)
    3. Missing stock in Dragon Scale (25.0 units missing)
    4. Missing stock in Eye Of Newt (20.0 units missing)
    5. Drop-to-zero in Phoenix Feather (15.0 plunged to 0.0)

    Verifies all 5 are caught with zero false alarms on normal data.
    """
    np.random.seed(42)
    days = 20
    dates = [f"2026-10-{i+1:02d}" for i in range(days)]

    # 1. Normal sales baselines (clean history with small Gaussian noise)
    bat_wings_normal = [max(1.0, float(np.random.normal(8.0, 0.8))) for _ in range(days)]
    ghost_pepper_normal = [max(1.0, float(np.random.normal(5.0, 0.6))) for _ in range(days)]
    mandrake_normal = [max(1.0, float(np.random.normal(6.0, 0.7))) for _ in range(days)]

    bat_wings_forecast = [8.0] * days
    ghost_pepper_forecast = [5.0] * days
    mandrake_forecast = [6.0] * days

    # INJECT ANOMALY 1: Massive spike on day 18 for Bat Wings
    bat_wings_sales = list(bat_wings_normal)
    bat_wings_sales[17] = 52.0  # 6.5x normal

    # INJECT ANOMALY 2: Massive spike on day 19 for Ghost Pepper
    ghost_pepper_sales = list(ghost_pepper_normal)
    ghost_pepper_sales[18] = 42.0  # 8.4x normal

    # 2. Ledger inventory cases
    # INJECT ANOMALY 3: Dragon Scale (Opening 50 + Restock 20 - Sales 10 = Expected 60, but Recorded 35 -> 25 missing)
    ds_opening, ds_restock, ds_sales, ds_recorded = 50.0, 20.0, 10.0, 35.0

    # INJECT ANOMALY 4: Eye Of Newt (Opening 40 + Restock 5 - Sales 8 = Expected 37, but Recorded 17 -> 20 missing)
    eon_opening, eon_restock, eon_sales, eon_recorded = 40.0, 5.0, 8.0, 17.0

    # Clean Ledger Case (No anomaly): Spider Silk (Opening 60 + Restock 10 - Sales 15 = 55, Recorded 55)
    ss_opening, ss_restock, ss_sales, ss_recorded = 60.0, 10.0, 15.0, 55.0

    # Clean Ledger Case (No anomaly): Nightshade Essence (Opening 35 + Restock 0 - Sales 5 = 30, Recorded 30)
    ne_opening, ne_restock, ne_sales, ne_recorded = 35.0, 0.0, 5.0, 30.0

    # 3. Stock drop cases
    # INJECT ANOMALY 5: Phoenix Feather (Plunged from 15.0 to 0.0)
    pf_prev, pf_curr = 15.0, 0.0

    # Clean Stock Case: Mandrake Root (Healthy stock 12.0)
    mr_prev, mr_curr = 14.0, 12.0

    # =========================================================================
    # EXECUTE DETECTION PIPELINE
    # =========================================================================
    caught_injected = []
    false_alarms = []

    # Check Spikes
    # Injected Item 1: Bat Wings
    bw_spikes = detect_spikes(bat_wings_sales, bat_wings_forecast, ingredient_name="Bat Wings", dates=dates, threshold=3.5)
    for sp in bw_spikes:
        if sp["date"] == dates[17]:
            caught_injected.append(("Bat Wings Spike", sp))
        else:
            false_alarms.append(("Bat Wings False Spike", sp))

    # Injected Item 2: Ghost Pepper
    gp_spikes = detect_spikes(ghost_pepper_sales, ghost_pepper_forecast, ingredient_name="Ghost Pepper", dates=dates, threshold=3.5)
    for sp in gp_spikes:
        if sp["date"] == dates[18]:
            caught_injected.append(("Ghost Pepper Spike", sp))
        else:
            false_alarms.append(("Ghost Pepper False Spike", sp))

    # Normal Item: Mandrake Root (Expect 0 spikes)
    mr_spikes = detect_spikes(mandrake_normal, mandrake_forecast, ingredient_name="Mandrake Root", dates=dates, threshold=3.5)
    for sp in mr_spikes:
        false_alarms.append(("Mandrake Root False Spike", sp))

    # Check Missing Stock
    # Injected Item 3: Dragon Scale
    ds_missing = detect_missing_stock(ds_opening, ds_restock, ds_sales, ds_recorded, ingredient_name="Dragon Scale", tolerance=1.0)
    if ds_missing:
        caught_injected.append(("Dragon Scale Missing Stock", ds_missing))

    # Injected Item 4: Eye Of Newt
    eon_missing = detect_missing_stock(eon_opening, eon_restock, eon_sales, eon_recorded, ingredient_name="Eye Of Newt", tolerance=1.0)
    if eon_missing:
        caught_injected.append(("Eye Of Newt Missing Stock", eon_missing))

    # Normal Item: Spider Silk (Expect no missing stock)
    ss_missing = detect_missing_stock(ss_opening, ss_restock, ss_sales, ss_recorded, ingredient_name="Spider Silk", tolerance=1.0)
    if ss_missing:
        false_alarms.append(("Spider Silk False Missing Stock", ss_missing))

    # Normal Item: Nightshade Essence (Expect no missing stock)
    ne_missing = detect_missing_stock(ne_opening, ne_restock, ne_sales, ne_recorded, ingredient_name="Nightshade Essence", tolerance=1.0)
    if ne_missing:
        false_alarms.append(("Nightshade False Missing Stock", ne_missing))

    # Check Drop-to-Zero
    # Injected Item 5: Phoenix Feather
    pf_drop = detect_drop_to_zero(pf_prev, pf_curr, ingredient_name="Phoenix Feather")
    if pf_drop:
        caught_injected.append(("Phoenix Feather Drop-to-Zero", pf_drop))

    # Normal Item: Mandrake Root (Expect no drop)
    mr_drop = detect_drop_to_zero(mr_prev, mr_curr, ingredient_name="Mandrake Root")
    if mr_drop:
        false_alarms.append(("Mandrake Root False Drop", mr_drop))

    # =========================================================================
    # BENCHMARK EVALUATION & REPORT
    # =========================================================================
    total_injected = 5
    caught_count = len(caught_injected)
    false_alarm_count = len(false_alarms)

    print("\n" + "=" * 80)
    print("               ANOMALY INJECTION BENCHMARK REPORT")
    print("=" * 80)
    print(f"  Target Injected Anomalies : {total_injected}")
    print(f"  Caught Anomalies          : {caught_count} / {total_injected} ({(caught_count / total_injected) * 100:.1f}%)")
    print(f"  False Alarms              : {false_alarm_count}")
    print("-" * 80)
    print("  VERIFIED CAUGHT ANOMALIES:")
    for name, alert in caught_injected:
        print(f"    ✓ [{alert['severity'].upper()}] {name}: {alert['description']}")
    print("=" * 80 + "\n")

    # Assertions: 100% detection rate and 0 false alarms
    assert caught_count == 5, f"Expected 5 caught anomalies, got {caught_count}"
    assert false_alarm_count == 0, f"Expected 0 false alarms, got {false_alarm_count}"


def test_get_alerts_api():
    """Verifies that GET /alerts endpoint returns active alerts with proper schema."""
    client.post("/seed")
    res = client.get("/alerts")
    assert res.status_code == 200
    alerts = res.json()
    assert isinstance(alerts, list)
    assert len(alerts) > 0
    first = alerts[0]
    assert "type" in first
    assert "severity" in first
    assert "description" in first
    assert "ts" in first
