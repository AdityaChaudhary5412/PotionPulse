import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_agent_reseed_and_status():
    res = client.post("/agent/command", json={"prompt": "Reseed pantry ledger"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["intent"] == "reseed"
    assert len(data["plan"]) > 0

    # Query status
    res_status = client.post("/agent/command", json={"prompt": "What is the status of my pantry?"})
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["success"] is True
    assert status_data["intent"] == "query"
    assert "Pantry Status" in status_data["result"]

def test_agent_restock_and_sale():
    # Restock Bat Wings
    res_restock = client.post("/agent/command", json={"prompt": "Restock 20 Bat Wings"})
    assert res_restock.status_code == 200
    restock_data = res_restock.json()
    assert restock_data["success"] is True
    assert restock_data["intent"] == "restock"
    assert "Bat Wings" in restock_data["result"]

    # Record sale of Bat Wings
    res_sale = client.post("/agent/command", json={"prompt": "Record sale 3 Bat Wings"})
    assert res_sale.status_code == 200
    sale_data = res_sale.json()
    assert sale_data["success"] is True
    assert sale_data["intent"] == "sale"
    assert "Recorded potion brew" in sale_data["result"]

def test_agent_curse_simulation():
    # Activate 3x surge
    res_curse = client.post("/agent/command", json={"prompt": "Simulate 3x surge on Bat Wings and Dragon Scale"})
    assert res_curse.status_code == 200
    curse_data = res_curse.json()
    assert curse_data["success"] is True
    assert curse_data["intent"] == "curse_activate"
    assert "Demand shockwave activated" in curse_data["result"]

    # Dispel surge
    res_dispel = client.post("/agent/command", json={"prompt": "Turn off curse"})
    assert res_dispel.status_code == 200
    dispel_data = res_dispel.json()
    assert dispel_data["success"] is True
    assert dispel_data["intent"] == "curse_deactivate"
    assert "dispelled" in dispel_data["result"]

def test_agent_audit_and_forecast():
    # Audit
    res_audit = client.post("/agent/command", json={"prompt": "Scan pantry for anomalies and theft"})
    assert res_audit.status_code == 200
    audit_data = res_audit.json()
    assert audit_data["success"] is True
    assert audit_data["intent"] == "audit"

    # Forecast
    res_forecast = client.post("/agent/command", json={"prompt": "Forecast demand for Bat Wings"})
    assert res_forecast.status_code == 200
    forecast_data = res_forecast.json()
    assert forecast_data["success"] is True
    assert forecast_data["intent"] == "forecast"
