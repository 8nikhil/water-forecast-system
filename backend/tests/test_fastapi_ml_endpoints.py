"""
AquaPulse Comprehensive Backend & ML API Test Suite
Tests FastAPI endpoints for:
1. Health checks and model diagnostics
2. Supported cities metadata
3. Daily point prediction (valid + physical error checks)
4. Recursive multi-day horizon forecast
5. Monthly consumption forecast & MCM volume conversions
6. Batch predictions
7. Historical data retrieval and filtering
8. Model performance metrics, feature importances, and algorithm benchmarks
9. Swagger & OpenAPI schema accessibility
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """Verify system health, model bundle status, and dataset connectivity."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "ml_model_engine" in data
    assert data["ml_model_engine"]["details"]["loaded"] is True
    assert "pan_india_dataset" in data
    assert data["pan_india_dataset"]["details"]["total_rows"] > 10000


def test_get_supported_cities():
    """Verify retrieval of all 21 monitored Indian metropolitan water authorities."""
    response = client.get("/api/predict/cities")
    assert response.status_code == 200
    cities = response.json()
    assert len(cities) == 21
    city_codes = [c["city_id"] for c in cities]
    assert "BLR" in city_codes
    assert "DEL" in city_codes
    assert "BOM" in city_codes
    assert "MAA" in city_codes


def test_predict_daily_valid():
    """Verify single-day water demand prediction for Bengaluru."""
    payload = {
        "city_id": "BLR",
        "date": "2025-05-15",
        "max_temp_c": 33.5,
        "min_temp_c": 22.0,
        "precipitation_mm": 0.0,
        "solar_radiation_mj": 21.0,
        "demand_lag_1": 1520.0
    }
    response = client.post("/api/predict/daily", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["city_id"] == "BLR"
    assert data["city_name"] == "Bengaluru"
    assert data["predicted_demand_mld"] > 0
    assert data["equivalent_million_cubic_meters"] > 0
    assert data["confidence_interval_95_mld"]["lower"] <= data["predicted_demand_mld"] <= data["confidence_interval_95_mld"]["upper"]


def test_predict_daily_validation_errors():
    """Verify that physical temperature violations and invalid cities return HTTP 400."""
    # Physical violation: min_temp > max_temp
    invalid_temp_payload = {
        "city_id": "BLR",
        "max_temp_c": 20.0,
        "min_temp_c": 35.0
    }
    res1 = client.post("/api/predict/daily", json=invalid_temp_payload)
    assert res1.status_code == 422 or res1.status_code == 400

    # Unrecognized city
    invalid_city_payload = {
        "city_id": "Atlantis",
        "date": "2025-05-15"
    }
    res2 = client.post("/api/predict/daily", json=invalid_city_payload)
    assert res2.status_code == 400


def test_predict_horizon_endpoint():
    """Verify recursive 14-day horizon forecast for Delhi."""
    payload = {
        "city_id": "DEL",
        "start_date": "2025-06-01",
        "days": 14
    }
    response = client.post("/api/predict/horizon", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["city_id"] == "DEL"
    assert data["horizon_days"] == 14
    assert len(data["forecast_series"]) == 14
    assert data["total_projected_volume_mcm"] > 0
    assert data["average_daily_demand_mld"] > 2000.0


def test_predict_monthly_endpoint():
    """Verify full calendar month forecast for Mumbai (May 2025)."""
    payload = {
        "city_id": "BOM",
        "year": 2025,
        "month": 5
    }
    response = client.post("/api/predict/monthly", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["city_id"] == "BOM"
    assert data["days_in_month"] == 31
    assert data["total_monthly_demand_mld_days"] > 100000.0
    assert data["total_monthly_volume_mcm"] > 100.0
    assert "peak_day" in data
    assert "minimum_day" in data


def test_predict_batch_endpoint():
    """Verify batch forecasting across multiple cities."""
    payload = {
        "records": [
            {"city_id": "BLR", "date": "2025-07-01", "max_temp_c": 31.0, "min_temp_c": 21.0},
            {"city_id": "DEL", "date": "2025-07-01", "max_temp_c": 38.0, "min_temp_c": 28.0},
            {"city_id": "HYD", "date": "2025-07-01", "max_temp_c": 33.0, "min_temp_c": 23.0}
        ]
    }
    response = client.post("/api/predict/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] == 3
    assert data["successful_predictions"] == 3
    assert len(data["predictions"]) == 3


def test_get_historical_telemetry():
    """Verify historical data querying and pagination."""
    # Filter by city
    response = client.get("/api/data/historical?city_id=BLR&limit=10&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert data["city_filter"] == "BLR"
    assert data["returned_records"] == 10
    assert len(data["records"]) == 10
    first = data["records"][0]
    assert first["city_id"] == "BLR"
    assert first["actual_demand_mld"] > 0


def test_get_historical_summary():
    """Verify historical summary statistics by city."""
    response = client.get("/api/data/historical/summary")
    assert response.status_code == 200
    data = response.json()
    assert "cities" in data
    assert len(data["cities"]) > 0
    top_city = data["cities"][0]
    assert "average_demand_mld" in top_city
    assert "total_volume_mcm" in top_city


def test_get_model_metrics():
    """Verify model performance metrics endpoint (MAE, RMSE, R²)."""
    response = client.get("/api/model/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "performance_test" in data
    test_metrics = data["performance_test"]
    assert test_metrics["R2_Percentage"] >= 99.0
    assert test_metrics["MAE_mld"] < 30.0
    assert test_metrics["RMSE_mld"] < 50.0
    assert "generalization_diagnosis" in data
    assert data["generalization_diagnosis"]["overfitting_detected"] is False


def test_get_feature_importances():
    """Verify feature importance ranking endpoint."""
    response = client.get("/api/model/feature-importance")
    assert response.status_code == 200
    data = response.json()
    assert "top_features" in data
    assert len(data["top_features"]) > 0
    top_feat = data["top_features"][0]["feature"]
    assert "demand_lag_1" in top_feat or "rolling" in top_feat


def test_get_algorithm_benchmarks():
    """Verify algorithm benchmark comparison table."""
    response = client.get("/api/model/benchmark")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert len(data["models"]) >= 4
    champion = next(m for m in data["models"] if m["is_champion"])
    assert champion["algorithm"] == "Random Forest"


def test_swagger_and_openapi_docs():
    """Verify Swagger UI and OpenAPI JSON endpoints are accessible."""
    docs_res = client.get("/docs")
    assert docs_res.status_code == 200
    openapi_res = client.get("/openapi.json")
    assert openapi_res.status_code == 200
    schema = openapi_res.json()
    assert "/api/predict/daily" in schema["paths"]
    assert "/api/data/historical" in schema["paths"]
    assert "/api/model/metrics" in schema["paths"]

