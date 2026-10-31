import pytest
from fastapi.testclient import TestClient
from backend.main import app, SessionLocal, Item, Transaction, Anomaly

client = TestClient(app)

def test_seed_and_initial_inventory():
    res = client.post("/seed")
    assert res.status_code == 200
    
    items_res = client.get("/items")
    assert items_res.status_code == 200
    items = items_res.data if hasattr(items_res, 'data') else items_res.json()
    assert len(items) >= 8

def test_stock_sale_and_transaction_audit():
    # Record sale of 1 unit of Bat Wings
    res = client.put("/items/1/stock", json={"change_amount": -1, "tx_type": "sale", "notes": "Test Potion Brewed"})
    assert res.status_code == 200
    data = res.json()
    assert data["item_id"] == 1

    # Check transactions
    tx_res = client.get("/transactions")
    assert tx_res.status_code == 200
    txs = tx_res.json()
    assert len(txs) > 0
    assert txs[0]["change_amount"] == -1

def test_midnight_curse_spike_multiplier():
    # Get standard forecast for Bat Wings
    f_norm = client.get("/api/forecast/1?full_moon_festival=false").json()
    
    # Get cursed forecast (+300% spike)
    f_curse = client.get("/api/forecast/1?full_moon_festival=true").json()
    
    assert f_curse["is_cursed"] is True
    # Demand should triple
    assert f_curse["daily_demand"] == pytest.approx(f_norm["daily_demand"] * 3.0, rel=0.1)
    # Days left should drop to approximately one third
    assert f_curse["days_until_stockout"] < f_norm["days_until_stockout"]

def test_anomaly_detection_trigger():
    # Inject an abnormally massive consumption spike (e.g. 150 units)
    res = client.put("/items/2/stock", json={"change_amount": -150, "tx_type": "sale", "notes": "Coven Bulk Theft"})
    assert res.status_code == 200

    anom_res = client.get("/api/anomalies")
    assert anom_res.status_code == 200
    anomalies = anom_res.json()
    descriptions = [a["description"] for a in anomalies]
    assert any("Dragon Scale" in d or "Item #2" in d for d in descriptions)

