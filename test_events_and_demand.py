import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_events_crud():
    """Verifies POST, GET, and DELETE endpoints for demand surge events."""
    # 1. Create a 3x event targeting ingredients [1, 4, 5]
    create_payload = {
        "name": "Blood Moon Conjunction",
        "start_date": "2026-10-31T00:00:00",
        "end_date": "2026-11-03T23:59:59",
        "ingredient_ids": [1, 4, 5],
        "multiplier": 3.0,
        "active": True
    }
    create_res = client.post("/events", json=create_payload)
    assert create_res.status_code == 201
    event = create_res.json()
    event_id = event["id"]
    assert event["name"] == "Blood Moon Conjunction"
    assert event["multiplier"] == 3.0
    assert event["ingredient_ids"] == [1, 4, 5]
    assert event["active"] is True

    # 2. Get events list
    list_res = client.get("/events")
    assert list_res.status_code == 200
    events = list_res.json()
    assert any(e["id"] == event_id for e in events)

    # 3. Delete event
    del_res = client.delete(f"/events/{event_id}")
    assert del_res.status_code == 204

    # Verify deleted
    events_after = client.get("/events").json()
    assert not any(e["id"] == event_id for e in events_after)


def test_get_demand_endpoint_with_bands():
    """Verifies GET /demand/{id} returns history, forecast, and lo/hi confidence bands."""
    client.post("/seed")
    res = client.get("/demand/1?with_event=false&horizon=7")
    assert res.status_code == 200
    data = res.json()
    assert data["ingredient_id"] == 1
    assert data["ingredient"] == "Bat Wings"
    assert "history" in data
    assert len(data["history"]) > 0
    assert "forecast" in data
    assert len(data["forecast"]) == 7

    first_forecast = data["forecast"][0]
    assert "date" in first_forecast
    assert "predicted_qty" in first_forecast
    assert "lo" in first_forecast
    assert "hi" in first_forecast
    assert first_forecast["lo"] <= first_forecast["predicted_qty"]
    assert first_forecast["hi"] >= first_forecast["predicted_qty"]

    # Verify chart_data structure for Recharts
    assert "chart_data" in data
    assert len(data["chart_data"]) >= 7


def test_apply_3x_event_and_show_changes():
    """
    Applies a 3x multiplier event to 3 specific ingredients ([1, 4, 5]),
    verifies that forecast, days_until_stockout, status, and reorder_qty reflect it,
    verifies ?with_event=false returns un-multiplied baselines,
    and prints the before vs after audit table.
    """
    client.post("/seed")

    # Deactivate any residual active events
    for ev in client.get("/events").json():
        if ev["active"]:
            client.post(f"/events/{ev['id']}/toggle")

    # 1. Fetch baseline metrics (with_event=false)
    baseline_res = client.get("/restock?with_event=false")
    assert baseline_res.status_code == 200
    baseline_items = {item["ingredient_id"]: item for item in baseline_res.json()}

    # 2. Create and activate a 3.0x event targeting 3 ingredients: Bat Wings (1), Ghost Pepper (4), Mandrake Root (5)
    targeted_ids = [1, 4, 5]
    event_payload = {
        "name": "Midnight Curse",
        "multiplier": 3.0,
        "ingredient_ids": targeted_ids,
        "active": True
    }
    create_res = client.post("/events", json=event_payload)
    assert create_res.status_code == 201

    # 3. Fetch cursed metrics (with_event=true)
    cursed_res = client.get("/restock?with_event=true")
    assert cursed_res.status_code == 200
    cursed_items = {item["ingredient_id"]: item for item in cursed_res.json()}

    # 4. Fetch with_event=false again to ensure before vs after query param works
    after_with_event_false = {item["ingredient_id"]: item for item in client.get("/restock?with_event=false").json()}

    # =========================================================================
    # DISPLAY BEFORE VS AFTER AUDIT TABLE
    # =========================================================================
    print("\n" + "=" * 96)
    print("        POTIONPULSE · 3X EVENT IMPACT AUDIT TABLE (MIDNIGHT CURSE ON 3 INGREDIENTS)")
    print("=" * 96)
    print(f"{'Ingredient':<18} {'Event':<8} {'Daily Burn':<14} {'Days Left':<14} {'Status':<14} {'Reorder Qty':<16} {'Changed?'}")
    print("-" * 96)

    for item_id in sorted(baseline_items.keys()):
        b = baseline_items[item_id]
        c = cursed_items[item_id]
        is_targeted = item_id in targeted_ids

        # Print baseline row
        print(f"{b['ingredient']:<18} {'None':<8} {b['daily_demand']:>6.1f} / day    {b['days_until_stockout']:>6.1f} days    {b['status'].upper():<14} {b['reorder_qty']:>8.1f} units")
        # Print cursed row
        change_indicator = "⚡ 3x SURGE" if is_targeted else "✓ UNCHANGED"
        print(f"{'  ↳ With 3x Event':<18} {'3.0x':<8} {c['daily_demand']:>6.1f} / day    {c['days_until_stockout']:>6.1f} days    {c['status'].upper():<14} {c['reorder_qty']:>8.1f} units    {change_indicator}")
        print("-" * 96)

        if is_targeted:
            # Targeted: daily demand roughly 3x
            assert c["daily_demand"] == pytest.approx(b["daily_demand"] * 3.0, rel=0.1)
            # Days left drops or stays at 0.0 if already depleted
            assert c["days_until_stockout"] <= b["days_until_stockout"]
            if b["days_until_stockout"] > 0.1:
                assert c["days_until_stockout"] < b["days_until_stockout"]
            # Reorder quantity increases
            assert c["reorder_qty"] > b["reorder_qty"]
            # with_event=false matches baseline
            assert after_with_event_false[item_id]["daily_demand"] == b["daily_demand"]
        else:
            # Untargeted control ingredient: perfectly identical
            assert c["daily_demand"] == b["daily_demand"]
            assert c["days_until_stockout"] == b["days_until_stockout"]
            assert c["reorder_qty"] == b["reorder_qty"]
            assert c["status"] == b["status"]

    print("=" * 96 + "\n")
