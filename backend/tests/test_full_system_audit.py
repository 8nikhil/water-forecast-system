"""
AquaPulse: Master End-to-End System, Performance, Security & Integrity Test Suite
Comprehensive testing covering:
1. Machine Learning Accuracy, Latency & Physical Bounds
2. REST API Functional Contracts & Response Latency
3. Database Operations (CRUD, Rollback, Constraint Enforcement)
4. Security & Sanitization (SQLi probes, XSS probes, Physical Bounds)
5. Conservation Analytics & Anomaly Detection Logic
"""

import os
import sys
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal, get_database_status
from app.models.mysql_tables import HistoricalConsumption, PredictionResult
from app.services.water_ml_service import WaterMLService, PredictValidationError

client = TestClient(app)


# ==============================================================================
# SECTION 1: MACHINE LEARNING MODEL ACCURACY & INFERENCE BENCHMARK
# ==============================================================================

class TestMLModelIntegrity:
    """Validates ML model characteristics, inference speed, accuracy and stability."""

    def test_ml_singleton_and_metadata(self):
        service = WaterMLService()
        assert service.model_loaded is True
        assert service.predictor is not None
        assert service.predictor.model_name == "Random Forest"
        assert len(service.predictor.encoded_features) == 52
        metrics_dict = service.get_model_metrics()
        assert "performance_test" in metrics_dict
        test_m = metrics_dict["performance_test"]
        assert test_m["R2_Percentage"] >= 99.0
        assert test_m["MAE_mld"] <= 25.0
        assert test_m["RMSE_mld"] <= 45.0

    def test_ml_inference_latency_benchmark(self):
        """Model inference must complete in < 150ms for a single point forecast."""
        service = WaterMLService()
        sample_input = {
            "city_id": "BLR",
            "date": "2025-06-15",
            "max_temp_c": 33.0,
            "min_temp_c": 21.0,
            "precipitation_mm": 5.0,
            "solar_radiation_mj": 21.5,
            "demand_lag_1": 1500.0
        }
        start_time = time.perf_counter()
        result = service.predict_daily(sample_input)
        latency_ms = (time.perf_counter() - start_time) * 1000.0

        assert latency_ms < 150.0, f"Inference took {latency_ms:.2f}ms, exceeding 150ms SLA"
        assert result["predicted_demand_mld"] > 0
        ci = result["confidence_interval_95_mld"]
        assert ci["lower"] < result["predicted_demand_mld"] < ci["upper"]

    def test_recursive_horizon_conservation_of_mass(self):
        """Recursive 14-day forecasts should not diverge or collapse to zero."""
        service = WaterMLService()
        horizon_results = service.predict_horizon(city_id="BOM", days=14, start_date="2025-07-01")
        assert len(horizon_results["forecast_series"]) == 14
        demands = [r["predicted_demand_mld"] for r in horizon_results["forecast_series"]]
        
        # Mumbai typical demand is ~3500-5000 MLD. Ensure forecast stays within sensible physical bounds.
        for d in demands:
            assert 3000.0 <= d <= 6000.0, f"Divergent forecast: {d} MLD"

    def test_monthly_calendar_budget_exact_unit_math(self):
        """Verify mathematical identity: 1 MLD-Day == 1,000 m3 == 0.001 MCM == 0.001 Billion Litres."""
        service = WaterMLService()
        monthly = service.predict_month(city_id="DEL", year=2025, month=8)
        assert monthly["days_in_month"] == 31
        expected_mcm = round(monthly["total_monthly_demand_mld_days"] / 1000.0, 5)
        assert abs(monthly["total_monthly_volume_mcm"] - expected_mcm) < 1e-3
        assert abs(monthly["total_monthly_billion_litres"] - expected_mcm) < 1e-3


# ==============================================================================
# SECTION 2: API FUNCTIONALITY & SCHEMA VALIDATION
# ==============================================================================

class TestAPIFunctionality:
    """Validates FastAPI routes, HTTP status codes, and JSON response contracts."""

    def test_health_check_comprehensive_status(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ["healthy", "degraded"]
        assert data["ml_model_engine"]["status"] == "online"
        assert data["ml_model_engine"]["details"]["model_name"] == "Random Forest"
        assert "pan_india_dataset" in data

    def test_post_daily_predict_valid(self):
        payload = {
            "city_id": "HYD",
            "date": "2025-08-10",
            "max_temp_c": 31.0,
            "min_temp_c": 23.0,
            "precipitation_mm": 12.0
        }
        resp = client.post("/api/predict/daily", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["city_id"] == "HYD"
        assert data["predicted_demand_mld"] > 1000.0
        assert data["confidence_interval_95_mld"]["lower"] < data["predicted_demand_mld"]

    def test_post_horizon_endpoint(self):
        payload = {
            "city_id": "CCU",
            "days": 7,
            "start_date": "2025-09-01"
        }
        resp = client.post("/api/predict/horizon", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["city_id"] == "CCU"
        assert data["horizon_days"] == 7
        assert len(data["forecast_series"]) == 7
        assert data["total_projected_volume_mcm"] > 0

    def test_post_monthly_endpoint(self):
        payload = {
            "city_id": "PNQ",
            "year": 2025,
            "month": 4
        }
        resp = client.post("/api/predict/monthly", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["city_id"] == "PNQ"
        assert data["days_in_month"] == 30
        assert data["total_monthly_volume_mcm"] > 0

    def test_historical_telemetry_pagination_and_filter(self):
        resp = client.get("/api/data/historical?city_id=BLR&limit=10")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_records" in data
        assert "records" in data
        assert len(data["records"]) <= 10
        if len(data["records"]) > 0:
            assert data["records"][0]["city_id"] == "BLR"

    def test_model_metrics_and_feature_importances(self):
        resp = client.get("/api/model/metrics")
        assert resp.status_code == 200
        metrics = resp.json()
        assert "performance_test" in metrics
        assert metrics["performance_test"]["R2_Percentage"] >= 99.0

        resp_feat = client.get("/api/model/features")
        assert resp_feat.status_code == 200
        features = resp_feat.json()
        assert "top_features" in features
        assert len(features["top_features"]) > 0


# ==============================================================================
# SECTION 3: INPUT VALIDATION & SECURITY CHECKS
# ==============================================================================

class TestValidationAndSecurity:
    """Validates robust rejection of invalid data, physical boundary violations and injection attempts."""

    def test_temperature_inversion_rejection(self):
        """min_temp > max_temp must fail with 400/422 Bad Request."""
        payload = {
            "city_id": "BLR",
            "date": "2025-05-15",
            "max_temp_c": 20.0,
            "min_temp_c": 35.0  # Physical impossibility
        }
        resp = client.post("/api/predict/daily", json=payload)
        assert resp.status_code in [400, 422]
        error_text = resp.text.lower()
        assert "physical violation" in error_text or "cannot exceed" in error_text

    def test_negative_precipitation_rejection(self):
        """Precipitation < 0 must fail with 400/422 Unprocessable Entity."""
        payload = {
            "city_id": "BLR",
            "date": "2025-05-15",
            "precipitation_mm": -25.0
        }
        resp = client.post("/api/predict/daily", json=payload)
        assert resp.status_code in [400, 422]

    def test_unsupported_city_rejection(self):
        """Fictional or uncalibrated city names must fail with 400."""
        payload = {
            "city_id": "GOTHAM",
            "date": "2025-05-15"
        }
        resp = client.post("/api/predict/daily", json=payload)
        assert resp.status_code == 400
        assert "Unrecognized city" in resp.json()["detail"]

    def test_sql_injection_probe_in_city_parameter(self):
        """SQL injection attacks in path/query parameters must not cause 500 or SQL leakage."""
        sqli_payloads = [
            "' OR '1'='1",
            "BLR'; DROP TABLE prediction_results; --",
            "UNION SELECT * FROM municipal_cities--",
            "admin'--"
        ]
        for payload in sqli_payloads:
            resp = client.get(f"/api/data/historical?city_id={payload}")
            assert resp.status_code in [200, 400]
            if resp.status_code == 200:
                assert resp.json()["returned_records"] == 0

            post_resp = client.post("/api/predict/daily", json={"city_id": payload, "date": "2025-06-01"})
            assert post_resp.status_code in [400, 422]

    def test_xss_probe_in_inputs(self):
        """Cross-site scripting probes in text fields must be sanitized / rejected."""
        xss_string = "<script>alert('pwned')</script>"
        resp = client.post("/api/predict/daily", json={"city_id": xss_string, "date": "2025-06-01"})
        assert resp.status_code in [400, 422]
        assert "<script>" not in resp.headers.get("content-type", "")

    def test_excessive_horizon_bounds(self):
        """Horizon > 365 days should be rejected by schema validator."""
        payload = {"city_id": "BLR", "days": 1000, "start_date": "2025-01-01"}
        resp = client.post("/api/predict/horizon", json=payload)
        assert resp.status_code in [400, 422]


# ==============================================================================
# SECTION 4: DATABASE OPERATIONS & TRANSACTION INTEGRITY
# ==============================================================================

class TestDatabaseOperations:
    """Tests CRUD persistence, transaction rollback, and connection pooling diagnostics."""

    def test_database_status_endpoint(self):
        resp = client.get("/api/mysql/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ["online", "degraded"]
        assert "active_dialect" in data
        assert "table_row_counts" in data

    def test_create_and_query_prediction_record(self):
        prediction_payload = {
            "city_id": "BLR",
            "forecast_date": "2026-04-15",
            "forecast_type": "daily",
            "horizon_days": 1,
            "predicted_demand_mld": 1540.25,
            "confidence_interval_95_mld": {"lower": 1460.00, "upper": 1620.50},
            "equivalent_million_cubic_meters": 1.54025,
            "model_version": "AquaPulse-RandomForest-v2.0",
            "r2_score": 0.9983,
            "mae_mld": 20.79,
            "rmse_mld": 40.47,
            "notes": "Automated audit persistence test"
        }
        resp = client.post("/api/mysql/predictions", json=prediction_payload)
        assert resp.status_code in [200, 201]
        data = resp.json()
        assert data["city_id"] == "BLR"
        assert data["predicted_demand_mld"] == 1540.25

        # Query back saved predictions
        query_resp = client.get("/api/mysql/predictions?city_id=BLR&limit=5")
        assert query_resp.status_code == 200
        preds = query_resp.json()
        assert any(p["forecast_date"] == "2026-04-15" for p in preds)

    def test_database_session_rollback_on_error(self):
        """Verify that an invalid database write rolls back cleanly without locking session."""
        db = SessionLocal()
        try:
            # Attempt to insert record with NULL in non-nullable column
            bad_record = HistoricalConsumption(
                city_id=None,  # Not nullable
                record_date=None,
                actual_demand_mld=-999.0
            )
            db.add(bad_record)
            with pytest.raises(Exception):
                db.commit()
            db.rollback()
            # Session should be healthy after rollback
            healthy_count = db.query(HistoricalConsumption).count()
            assert healthy_count >= 0
        finally:
            db.close()


# ==============================================================================
# SECTION 5: CONSERVATION ANALYTICS & ANOMALY DETECTION
# ==============================================================================

class TestConservationAnalytics:
    """Tests water loss anomaly detection, NRW alerts, and simulation scenarios."""

    def test_city_conservation_analysis_output(self):
        resp = client.get("/api/conservation/analysis?city_id=BLR")
        assert resp.status_code == 200
        data = resp.json()
        assert data["city_id"] == "BLR"
        assert "kpis" in data
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0

    def test_conservation_overview_rankings(self):
        resp = client.get("/api/conservation/overview")
        assert resp.status_code == 200
        data = resp.json()
        assert "rankings" in data
        assert len(data["rankings"]) == 21

    def test_conservation_intervention_simulation(self):
        payload = {
            "city_id": "BLR",
            "pressure_management": True,
            "smart_irrigation_cutoff": True,
            "fixture_aerator_retrofit": True,
            "meter_modernization": False
        }
        resp = client.post("/api/conservation/simulate-intervention", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["daily_saved_mld"] > 0
        assert data["annual_saved_volume_mcm"] > 0
        assert data["annual_financial_savings_usd"] > 0
        assert data["total_demand_reduction_pct"] > 0
