import pytest
from restock import days_until_stockout, safety_stock, reorder_quantity, status

def test_days_until_stockout():
    # Stock 0 -> 0.0 days
    assert days_until_stockout(0, [5.0, 5.0]) == 0.0
    assert days_until_stockout(-2.0, [5.0]) == 0.0

    # Stock 7 with daily demand [5.0, 5.0, 5.0]
    # Day 0 burns 5.0, 2.0 remaining. Day 1 needs 5.0 -> 1 + (2.0/5.0) = 1.4 days
    assert days_until_stockout(7.0, [5.0, 5.0, 5.0]) == 1.4

    # Stock 15 with daily demand [5.0, 5.0, 5.0] -> exactly 3.0 days
    assert days_until_stockout(15.0, [5.0, 5.0, 5.0]) == 3.0

    # Stock 25 with 2-day series [5.0, 5.0] -> burns 10 in 2 days, 15 remaining / 5 avg = 3 extra days -> 5.0 days
    assert days_until_stockout(25.0, [5.0, 5.0]) == 5.0

    # Zero demand
    assert days_until_stockout(10.0, [0.0, 0.0]) == 999.0

def test_safety_stock():
    # SS = z * sigma * sqrt(lead_time)
    # sigma = 2.0, lead_time = 4, z = 1.65 -> 1.65 * 2.0 * 2 = 6.6
    assert safety_stock(sigma=2.0, lead_time=4, z=1.65) == 6.6
    assert safety_stock(sigma=0.0, lead_time=4) == 0.0
    assert safety_stock(sigma=2.0, lead_time=0) == 0.0

def test_reorder_quantity():
    # reorder = max(0, forecast + safety_stock - current_stock)
    # 40 + 10 - 25 = 25
    assert reorder_quantity(forecast_demand=40.0, safety_stock=10.0, current_stock=25.0) == 25.0
    # Current stock exceeds target: 40 + 10 - 60 = -10 -> clamped to 0.0
    assert reorder_quantity(forecast_demand=40.0, safety_stock=10.0, current_stock=60.0) == 0.0

    # Using daily_demand and lead_time + review_period (7)
    # daily_demand = 5.0, lead_time = 3, review_period = 7 -> forecast = 5 * (3 + 7) = 50.0
    # SS = 5.0, current = 15.0 -> 50 + 5 - 15 = 40.0
    assert reorder_quantity(daily_demand=5.0, lead_time=3, review_period=7, safety_stock=5.0, current_stock=15.0) == 40.0

def test_status_classification():
    # > 7 days -> 'safe'
    assert status(14.0) == "safe"
    assert status(7.1) == "safe"

    # 3 to 7 days, and 2 to 3 treated as low -> 'low'
    assert status(7.0) == "low"
    assert status(5.0) == "low"
    assert status(3.0) == "low"
    assert status(2.1) == "low"
    assert status(2.0) == "low"

    # <= 2 days (i.e. < 2.0) -> 'critical'
    assert status(1.9) == "critical"
    assert status(1.4) == "critical"
    assert status(0.0) == "critical"

