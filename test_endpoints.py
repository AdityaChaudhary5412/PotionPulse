import io
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "total_ingredients" in data

def test_ingredients_crud():
    unique_suffix = int(uuid.uuid4().int % 1000000)
    unique_name = f"Wyrm Heart Ash {unique_suffix}"
    # 1. Create
    create_res = client.post("/ingredients", json={
        "name": unique_name,
        "unit": "grams",
        "current_stock": 50.0,
        "lead_time_days": 5
    })
    assert create_res.status_code == 201
    item = create_res.json()
    item_id = item["id"]
    assert item["name"] == unique_name
    assert item["current_stock"] == 50.0

    # 2. Read single
    get_res = client.get(f"/ingredients/{item_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == unique_name

    # 3. Update
    put_res = client.put(f"/ingredients/{item_id}", json={"current_stock": 42.0, "lead_time_days": 8})
    assert put_res.status_code == 200
    assert put_res.json()["current_stock"] == 42.0
    assert put_res.json()["lead_time_days"] == 8

    # 4. Delete
    del_res = client.delete(f"/ingredients/{item_id}")
    assert del_res.status_code == 204

    # 5. Verify deleted
    assert client.get(f"/ingredients/{item_id}").status_code == 404

def test_post_sales_and_stock():
    unique_suffix = int(uuid.uuid4().int % 1000000)
    unique_name = f"Salamander Tail {unique_suffix}"
    # Setup test reagent
    create_res = client.post("/ingredients", json={
        "name": unique_name,
        "unit": "tails",
        "current_stock": 20.0,
        "lead_time_days": 3
    })
    assert create_res.status_code == 201
    item = create_res.json()
    item_id = item["id"]

    # Record sale
    sale_res = client.post("/sales", json={
        "ingredient_id": item_id,
        "qty": 4.0,
        "note": "Potion of Fire Breath"
    })
    assert sale_res.status_code == 201
    assert sale_res.json()["qty"] == 4.0

    # Verify stock decremented
    updated_item = client.get(f"/ingredients/{item_id}").json()
    assert updated_item["current_stock"] == 16.0

    # Test POST /ingredients/{id}/stock restock
    restock_res = client.post(f"/ingredients/{item_id}/stock", json={
        "qty": 10.0,
        "type": "restock",
        "note": "Shipment arrived"
    })
    assert restock_res.status_code == 200

    # Verify stock incremented
    after_restock = client.get(f"/ingredients/{item_id}").json()
    assert after_restock["current_stock"] == 26.0

def test_post_upload_with_accepted_and_rejected():
    # CSV containing:
    # Row 1: Valid sale
    # Row 2: Missing ingredient name (should be rejected)
    # Row 3: Invalid date (should be rejected)
    # Row 4: Non-numeric quantity (should be rejected)
    # Row 5: Valid sale
    csv_content = """Date,Ingredient,Quantity,Type
2026-10-25,Bat Wings,3.0,sale
2026-10-25,,5.0,sale
2026-10-25-INVALID,Dragon Scale,2.0,sale
2026-10-26,Ghost Pepper,INVALID_QTY,sale
2026-10-27,Mandrake Root,4.5,sale
"""
    files = {"file": ("test_sales.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["accepted_count"] == 2
    assert data["rejected_count"] == 3
    assert len(data["rejected_details"]) == 3
    reasons = [r["reason"] for r in data["rejected_details"]]
    assert any("ingredient name" in r for r in reasons)
    assert any("date" in r for r in reasons)
    assert any("numeric" in r for r in reasons)

def test_post_upload_friendly_error_on_empty_file():
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    res = client.post("/upload", files=files)
    assert res.status_code == 400
    assert "detail" in res.json()
    assert "empty" in res.json()["detail"].lower()

def test_post_predict_returns_csv_with_fixed_schema():
    csv_content = """Tx_Date,Item_Name,Quantity,Type
2026-10-20,Bat Wings,-4.0,sale
2026-10-21,Bat Wings,-6.0,sale
2026-10-22,Bat Wings,-5.0,sale
2026-10-23,Bat Wings,-7.0,sale
2026-10-24,Bat Wings,-8.0,sale
2026-10-25,Bat Wings,-6.0,sale
2026-10-26,Bat Wings,-10.0,sale
"""
    files = {"file": ("sales_history.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/predict", files=files)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    
    text = res.text.strip().split("\n")
    # Verify fixed schema: ingredient,date,predicted_qty
    header = text[0].strip()
    assert header == "ingredient,date,predicted_qty"
    
    # Row 1 prediction
    data_row = text[1].strip().split(",")
    assert data_row[0] == "Bat Wings"
    assert data_row[1] == "2026-10-27"
    predicted_qty = float(data_row[2])
    # 7-day average of (4+6+5+7+8+6+10)/7 = 46/7 ≈ 6.57
    assert 6.0 <= predicted_qty <= 7.0

def test_post_predict_friendly_error_on_invalid_file():
    files = {"file": ("corrupt.txt", io.BytesIO(b"No,Valid,Headers,Here\nfoo,bar,baz,qux"), "text/csv")}
    res = client.post("/predict", files=files)
    assert res.status_code == 400
    assert "detail" in res.json()
    assert "essential columns" in res.json()["detail"].lower()

def test_get_restock_endpoint():
    res = client.get("/restock")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "ingredient_id" in first
    assert "ingredient" in first
    assert "stock" in first
    assert "days_until_stockout" in first
    assert "status" in first
    assert first["status"] in ["safe", "low", "critical"]
    assert "reorder_qty" in first
    assert first["reorder_qty"] >= 0.0

def test_get_summary_endpoint():
    res = client.get("/summary")
    assert res.status_code == 200
    summary = res.json()
    assert "low_count" in summary
    assert "critical_count" in summary
    assert "alerts_today" in summary
    assert "nearest_stockout_days" in summary
    assert "total_ingredients" in summary
    assert summary["total_ingredients"] >= summary["low_count"] + summary["critical_count"]


