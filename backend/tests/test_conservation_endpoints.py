"""
AquaPulse Water Conservation Analytics API Test Suite
Validates endpoints for:
1. City conservation analysis and KPI diagnostics
2. Active anomaly detection alerts (high NRW, unseasonal surges)
3. Pan-India municipal conservation rankings
4. Conservation intervention roadmap simulation
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_conservation_analysis_endpoint():
    """Verify city conservation analytics calculation and KPI fields."""
    response = client.get("/api/conservation/analysis?city_id=BLR&days=30")
    assert response.status_code == 200
    data = response.json()
    assert data["city_id"] == "BLR"
    assert "kpis" in data
    kpis = data["kpis"]
    assert kpis["average_demand_mld"] > 0
    assert kpis["average_nrw_percentage"] > 0
    assert "potential_avoidable_wastage_mld_days" in kpis
    assert "estimated_financial_loss_usd" in kpis
    assert len(data["timeline"]) == 30
    assert len(data["recommendations"]) >= 2


def test_conservation_alerts_endpoint():
    """Verify anomaly detection alerts feed."""
    response = client.get("/api/conservation/alerts?city_id=BLR&days=30")
    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert "total_alerts" in data


def test_conservation_overview_endpoint():
    """Verify Pan-India municipal rankings of water loss and recovery potential."""
    response = client.get("/api/conservation/overview")
    assert response.status_code == 200
    data = response.json()
    assert "rankings" in data
    assert len(data["rankings"]) == 21
    first = data["rankings"][0]
    assert "potential_recoverable_mld" in first
    assert "average_nrw_percentage" in first
    assert "conservation_priority" in first


def test_simulate_intervention_endpoint():
    """Verify conservation intervention simulation."""
    payload = {
        "city_id": "DEL",
        "pressure_management": True,
        "smart_irrigation_cutoff": True,
        "fixture_aerator_retrofit": True,
        "meter_modernization": False
    }
    response = client.post("/api/conservation/simulate-intervention", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["city_id"] == "DEL"
    assert data["total_demand_reduction_pct"] > 0
    assert data["daily_saved_mld"] > 0
    assert data["annual_saved_volume_mcm"] > 0
    assert data["annual_financial_savings_usd"] > 0
    assert len(data["interventions_applied"]) == 3

