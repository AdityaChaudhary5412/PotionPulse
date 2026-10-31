import io
import time
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_failure_mode_new_ingredients_safe_baseline():
    """
    Simulates new ingredients with no prior history or sparse history (< 7 days).
    Verifies that /predict falls back to a safe baseline and reports it in the response headers.
    """
    # 2 rows for a brand-new ingredient "Unicorn Horn Powder"
    csv_content = """Date,Ingredient,Qty,Type
2026-10-25,Unicorn Horn Powder,3.0,sale
2026-10-26,Unicorn Horn Powder,5.0,sale
"""
    files = {"file": ("sparse_new_ingredient.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/predict", files=files)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]

    # Verify fallback notice in response headers
    assert res.headers.get("X-Prediction-Fallback") == "true"
    assert "Unicorn Horn Powder" in res.headers.get("X-Fallback-Details", "")
    assert "safe baseline" in res.headers.get("X-Fallback-Details", "").lower()

    # Verify strict fixed schema output
    lines = res.text.strip().split("\n")
    assert lines[0].strip() == "ingredient,date,predicted_qty"
    data = lines[1].strip().split(",")
    assert data[0] == "Unicorn Horn Powder"
    assert data[1] == "2026-10-27"
    # Safe baseline: mean of observed sales (3.0 + 5.0) / 2 = 4.0
    assert float(data[2]) == 4.0


def test_failure_mode_missing_calendar_days():
    """
    Simulates missing days: sales recorded only on Oct 20 and Oct 26.
    Intermediate days (Oct 21-25) must be filled with 0.0 demand.
    """
    csv_content = """date,ingredient,qty,type
2026-10-20,Dragon Scale,14.0,sale
2026-10-26,Dragon Scale,7.0,sale
"""
    files = {"file": ("missing_days.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/predict", files=files)
    assert res.status_code == 200

    lines = res.text.strip().split("\n")
    assert lines[0].strip() == "ingredient,date,predicted_qty"
    data = lines[1].strip().split(",")
    assert data[0] == "Dragon Scale"
    assert data[1] == "2026-10-27"
    # Over the 7-day span (Oct 20 to Oct 26: 7 days total):
    # Daily sales: [14.0, 0, 0, 0, 0, 0, 7.0] -> sum = 21.0 -> 21.0 / 7 = 3.0
    predicted_qty = float(data[2])
    assert predicted_qty == 3.0


def test_failure_mode_negative_and_zero_quantities():
    """
    Simulates negative sales deltas (e.g. -5.0) and zero-quantity rows (0.0).
    Verifies that zero quantities are handled cleanly and negative deltas convert to positive demand.
    """
    csv_content = """Date,Item,Qty,Type
2026-10-20,Bat Wings,-4.0,sale
2026-10-21,Bat Wings,0.0,sale
2026-10-22,Bat Wings,-8.0,sale
2026-10-23,Bat Wings,0,sale
2026-10-24,Bat Wings,-6.0,sale
2026-10-25,Bat Wings,-10.0,sale
2026-10-26,Bat Wings,-7.0,sale
"""
    files = {"file": ("negative_quantities.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/predict", files=files)
    assert res.status_code == 200

    lines = res.text.strip().split("\n")
    assert lines[0].strip() == "ingredient,date,predicted_qty"
    data = lines[1].strip().split(",")
    assert data[0] == "Bat Wings"
    # Predicted quantity should be positive
    predicted = float(data[2])
    assert predicted > 0.0


def test_failure_mode_different_date_formats():
    """
    Simulates multiple different real-world date formats in the same file:
    - ISO (2026-10-20)
    - UK/EU dayfirst (21/10/2026, 22/10/2026)
    - US monthfirst (10/23/2026)
    - ISO timestamp (2026-10-24T18:00:00Z)
    """
    csv_content = """Date,Ingredient,Quantity,Type
2026-10-20,Eye Of Newt,5,sale
21/10/2026,Eye Of Newt,6,sale
22/10/2026,Eye Of Newt,4,sale
10/23/2026,Eye Of Newt,7,sale
2026-10-24T18:00:00Z,Eye Of Newt,5,sale
2026/10/25,Eye Of Newt,6,sale
2026-10-26,Eye Of Newt,8,sale
"""
    files = {"file": ("date_formats.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/predict", files=files)
    assert res.status_code == 200

    lines = res.text.strip().split("\n")
    assert lines[0].strip() == "ingredient,date,predicted_qty"
    data = lines[1].strip().split(",")
    assert data[0] == "Eye Of Newt"
    assert data[1] == "2026-10-27"
    predicted = float(data[2])
    assert 4.0 <= predicted <= 8.0


def test_failure_mode_renamed_columns():
    """
    Simulates renamed columns with domain synonyms:
    - 'Transaction_Timestamp' instead of 'Date'
    - 'Reagent_Product' instead of 'Ingredient'
    - 'Dispensed_Volume' instead of 'Qty'
    - 'Movement_Action' instead of 'Type'
    """
    csv_content = """Transaction_Timestamp,Reagent_Product,Dispensed_Volume,Movement_Action
2026-10-20,Spider Silk,3,sale
2026-10-21,Spider Silk,4,sale
2026-10-22,Spider Silk,2,sale
2026-10-23,Spider Silk,5,sale
2026-10-24,Spider Silk,3,sale
2026-10-25,Spider Silk,4,sale
2026-10-26,Spider Silk,7,sale
"""
    files = {"file": ("renamed_columns.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/predict", files=files)
    assert res.status_code == 200

    lines = res.text.strip().split("\n")
    assert lines[0].strip() == "ingredient,date,predicted_qty"
    data = lines[1].strip().split(",")
    assert data[0] == "Spider Silk"
    assert data[1] == "2026-10-27"
    assert float(data[2]) > 0.0


def test_failure_mode_duplicate_rows():
    """
    Simulates duplicate transaction entries in the uploaded file.
    Verifies that identical rows are deduplicated and do not falsely double sales.
    """
    # 7 days of 5 units each, but each row is duplicated twice
    csv_content = """date,ingredient,qty,type
2026-10-20,Ghost Pepper,5.0,sale
2026-10-20,Ghost Pepper,5.0,sale
2026-10-21,Ghost Pepper,5.0,sale
2026-10-21,Ghost Pepper,5.0,sale
2026-10-22,Ghost Pepper,5.0,sale
2026-10-23,Ghost Pepper,5.0,sale
2026-10-24,Ghost Pepper,5.0,sale
2026-10-25,Ghost Pepper,5.0,sale
2026-10-26,Ghost Pepper,5.0,sale
"""
    files = {"file": ("duplicates.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/predict", files=files)
    assert res.status_code == 200

    lines = res.text.strip().split("\n")
    assert lines[0].strip() == "ingredient,date,predicted_qty"
    data = lines[1].strip().split(",")
    assert data[0] == "Ghost Pepper"
    # Since deduplicated, daily average of 5.0 across all days is exactly 5.0 (not 10.0)
    assert float(data[2]) == 5.0


def test_failure_mode_very_large_values_outliers():
    """
    Simulates extreme outliers/typos (e.g. qty = 999999999).
    Verifies that outlier clipping protects the model and keeps predictions bounded.
    """
    csv_content = """date,ingredient,qty,type
2026-10-20,Mandrake Root,6,sale
2026-10-21,Mandrake Root,5,sale
2026-10-22,Mandrake Root,7,sale
2026-10-23,Mandrake Root,999999999,sale
2026-10-24,Mandrake Root,6,sale
2026-10-25,Mandrake Root,8,sale
2026-10-26,Mandrake Root,7,sale
"""
    files = {"file": ("outliers.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/predict", files=files)
    assert res.status_code == 200

    lines = res.text.strip().split("\n")
    data = lines[1].strip().split(",")
    assert data[0] == "Mandrake Root"
    predicted = float(data[2])
    # Must not overflow or blow up to hundreds of millions
    assert predicted < 15000.0


def test_predict_performance_and_determinism():
    """
    Verifies that /predict is:
    1. Deterministic (identical input produces exact identical output across multiple runs).
    2. Fast (executes in under 2 seconds even with multiple ingredients).
    3. Strictly conforms to fixed schema: ingredient,date,predicted_qty.
    """
    csv_content = """date,ingredient,qty,type
2026-10-20,Bat Wings,8,sale
2026-10-20,Dragon Scale,4,sale
2026-10-21,Bat Wings,9,sale
2026-10-21,Dragon Scale,3,sale
2026-10-22,Bat Wings,7,sale
2026-10-22,Dragon Scale,5,sale
2026-10-23,Bat Wings,10,sale
2026-10-23,Dragon Scale,4,sale
2026-10-24,Bat Wings,8,sale
2026-10-24,Dragon Scale,3,sale
2026-10-25,Bat Wings,9,sale
2026-10-25,Dragon Scale,4,sale
2026-10-26,Bat Wings,11,sale
2026-10-26,Dragon Scale,5,sale
"""
    # Run 1: Measure execution speed
    start_time = time.perf_counter()
    files_1 = {"file": ("sales_1.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res_1 = client.post("/predict", files=files_1)
    duration = time.perf_counter() - start_time

    assert res_1.status_code == 200
    # Fast requirement: under a few seconds (typically < 0.1s)
    assert duration < 2.0, f"Execution was too slow: {duration:.3f}s"

    # Run 2: Test determinism
    files_2 = {"file": ("sales_2.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res_2 = client.post("/predict", files=files_2)
    assert res_2.status_code == 200

    # Output text must be 100% identical byte-for-byte
    assert res_1.text == res_2.text

    # Fixed output schema verification
    lines = res_1.text.strip().split("\n")
    assert lines[0].strip() == "ingredient,date,predicted_qty"
    assert len(lines) == 3  # Header + 2 ingredients
