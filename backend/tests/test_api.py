import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_demo_login_resident():
    response = client.post("/api/auth/demo-login?role=resident")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "resident@aquapulse.io"
    assert data["user"]["role"] == "resident"

def test_demo_login_admin():
    response = client.post("/api/auth/demo-login?role=utility_admin")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "utility_admin"

def test_analytics_summary():
    # Login as resident
    login_res = client.post("/api/auth/demo-login?role=resident")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/analytics/summary", headers=headers)
    assert response.status_code == 200
    summary = response.json()
    assert "today_consumption_liters" in summary
    assert "weekly_average_liters" in summary
    assert "projected_monthly_bill_usd" in summary
    assert "efficiency_score" in summary

def test_trends_and_hourly():
    login_res = client.post("/api/auth/demo-login?role=resident")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    trends_res = client.get("/api/analytics/trends?days=14", headers=headers)
    assert trends_res.status_code == 200
    trends = trends_res.json()
    assert len(trends) > 0
    assert "measured" in trends[0]
    assert "user_entered" in trends[0]

    diurnal_res = client.get("/api/analytics/hourly-diurnal", headers=headers)
    assert diurnal_res.status_code == 200
    assert len(diurnal_res.json()) == 24

def test_ml_forecasting():
    login_res = client.post("/api/auth/demo-login?role=resident")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/forecast?horizon_days=14", headers=headers)
    assert response.status_code == 200
    forecast = response.json()
    assert forecast["horizon_days"] == 14
    assert len(forecast["forecast_points"]) == 14
    assert "mae_liters" in forecast
    assert "rmse_liters" in forecast
    assert forecast["forecast_points"][0]["provenance"] == "predicted"
    assert forecast["forecast_points"][0]["lower_bound"] <= forecast["forecast_points"][0]["predicted_liters"]
    assert forecast["forecast_points"][0]["upper_bound"] >= forecast["forecast_points"][0]["predicted_liters"]

def test_ml_scenario_simulation():
    login_res = client.post("/api/auth/demo-login?role=resident")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    scenario_payload = {
        "leak_repaired": True,
        "fixture_retrofit": True,
        "smart_irrigation": True,
        "behavioral_conservation": True,
        "custom_reduction_pct": 0.0
    }
    response = client.post("/api/forecast/scenario?horizon_days=14", json=scenario_payload, headers=headers)
    assert response.status_code == 200
    res = response.json()
    assert res["potential_liters_saved"] > 0
    assert res["potential_cost_saved_usd"] > 0

def test_anomalies_and_resolution():
    login_res = client.post("/api/auth/demo-login?role=resident")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get anomalies
    response = client.get("/api/anomalies", headers=headers)
    assert response.status_code == 200
    anomalies = response.json()
    assert len(anomalies) > 0

    first_anomaly_id = anomalies[0]["id"]
    update_res = client.put(
        f"/api/anomalies/{first_anomaly_id}/status",
        json={"status": "investigating", "notes": "Plumber scheduled for tomorrow morning"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "investigating"

def test_conservation_recommendations():
    login_res = client.post("/api/auth/demo-login?role=resident")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/recommendations", headers=headers)
    assert response.status_code == 200
    recs = response.json()
    assert len(recs) > 0
    assert recs[0]["potential_saving_liters_month"] > 0

def test_manual_meter_dial_entry():
    login_res = client.post("/api/auth/demo-login?role=resident")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    entry_payload = {
        "meter_dial_reading": 178.450,
        "notes": "Homeowner monthly test check"
    }
    response = client.post("/api/readings/manual", json=entry_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["provenance"] == "user_entered"
    assert data["reading_type"] == "manual_dial"

def test_monthly_audit_report():
    login_res = client.post("/api/auth/demo-login?role=resident")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/reports/monthly-audit", headers=headers)
    assert response.status_code == 200
    audit = response.json()
    assert "report_id" in audit
    assert "consumption_metrics" in audit
    assert "wastage_and_leak_audit" in audit
    assert "ml_forecast_preview" in audit

def test_admin_endpoints():
    # Login as admin
    admin_res = client.post("/api/auth/demo-login?role=utility_admin")
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    overview = client.get("/api/admin/overview", headers=admin_headers)
    assert overview.status_code == 200
    assert "fleet_connectivity_pct" in overview.json()

    meters = client.get("/api/admin/meters", headers=admin_headers)
    assert meters.status_code == 200
    assert len(meters.json()) > 0

    # Test users list
    users = client.get("/api/admin/users", headers=admin_headers)
    assert users.status_code == 200
    assert len(users.json()) >= 2

    # Test datasets list
    datasets = client.get("/api/admin/datasets", headers=admin_headers)
    assert datasets.status_code == 200
    assert len(datasets.json()) >= 3

    # Test sample CSV template
    sample_csv = client.get("/api/admin/datasets/sample-csv", headers=admin_headers)
    assert sample_csv.status_code == 200
    assert "timestamp,consumption_liters" in sample_csv.json()["template"]

def test_weather_impact_endpoints():
    login_res = client.post("/api/auth/demo-login?role=resident")
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test weather impact analysis
    weather_res = client.get("/api/weather/impact?days=30", headers=headers)
    assert weather_res.status_code == 200
    w_data = weather_res.json()
    assert "summary" in w_data
    assert "temperature_correlation" in w_data["summary"]
    assert "rainfall_correlation" in w_data["summary"]
    assert len(w_data["historical_timeline"]) > 0
    assert len(w_data["upcoming_forecast"]) == 7

    # Test weather simulation
    sim_payload = {
        "temp_change_c": 3.0,
        "rainfall_scenario": "drought",
        "irrigation_smart_delay": True
    }
    sim_res = client.post("/api/weather/simulate", json=sim_payload, headers=headers)
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert "simulated_daily_liters" in sim_data
    assert sim_data["simulated_daily_liters"] > sim_data["baseline_daily_liters"]


