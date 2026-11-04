"""
AquaPulse MySQL Integration & Persistence Test Suite
Tests MySQL database tables, CRUD operations, prediction logging, and dataset synchronization.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

client = TestClient(app)

# Ensure tables are created
Base.metadata.create_all(bind=engine)


def test_mysql_status_endpoint():
    """Verify database diagnostic status and table row counts."""
    response = client.get("/api/mysql/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["online", "degraded"]
    assert "active_dialect" in data
    assert "table_row_counts" in data
    assert "historical_water_consumption" in data["table_row_counts"]
    assert "forecast_predictions" in data["table_row_counts"]


def test_create_and_read_historical_telemetry():
    """Verify CRUD creation of historical water consumption and weather telemetry in database."""
    # Ensure BLR city exists
    from app.database import SessionLocal
    from app.crud.crud_mysql import CRUDMySQL
    db = SessionLocal()
    CRUDMySQL.upsert_city(db, {"city_id": "BLR", "name": "Bengaluru", "zone": "South", "base_demand": 1492.0})
    db.close()

    payload = {
        "city_id": "BLR",
        "record_date": "2025-05-20",
        "actual_demand_mld": 1540.25,
        "billed_consumption_mld": 1310.0,
        "bulk_supply_mld": 1600.0,
        "nrw_loss_mld": 290.0,
        "max_temp_c": 34.5,
        "min_temp_c": 22.0,
        "precipitation_mm": 2.5,
        "solar_radiation_mj": 21.5
    }
    create_res = client.post("/api/mysql/historical", json=payload)
    assert create_res.status_code == 201
    res_data = create_res.json()
    assert res_data["status"] == "success"
    assert res_data["data"]["city_id"] == "BLR"
    assert res_data["data"]["actual_demand_mld"] == 1540.25

    # Query back
    read_res = client.get("/api/mysql/historical?city_id=BLR&start_date=2025-05-20&end_date=2025-05-20")
    assert read_res.status_code == 200
    read_data = read_res.json()
    assert read_data["total_returned"] >= 1
    matched = next(r for r in read_data["records"] if r["record_date"] == "2025-05-20")
    assert matched["actual_demand_mld"] == 1540.25


def test_historical_telemetry_validation_rejections():
    """Verify validation: min_temp > max_temp and invalid date formats are rejected."""
    # Invalid physical temperature
    invalid_temp = {
        "city_id": "BLR",
        "record_date": "2025-05-20",
        "actual_demand_mld": 1500.0,
        "max_temp_c": 20.0,
        "min_temp_c": 35.0
    }
    res1 = client.post("/api/mysql/historical", json=invalid_temp)
    assert res1.status_code in [400, 422]

    # Invalid date
    invalid_date = {
        "city_id": "BLR",
        "record_date": "not-a-valid-date",
        "actual_demand_mld": 1500.0,
        "max_temp_c": 30.0,
        "min_temp_c": 20.0
    }
    res2 = client.post("/api/mysql/historical", json=invalid_date)
    assert res2.status_code in [400, 422]


def test_save_and_retrieve_prediction():
    """Verify storing ML forecast results in the database and querying history."""
    payload = {
        "city_id": "DEL",
        "forecast_date": "2025-06-01",
        "forecast_type": "daily",
        "horizon_days": 1,
        "predicted_demand_mld": 2895.50,
        "confidence_interval_95_mld": {
            "lower": 2816.18,
            "upper": 2974.82
        },
        "equivalent_million_cubic_meters": 2.8955,
        "expected_rmse_error_mld": 40.47,
        "model_architecture": "RandomForestRegressor",
        "input_parameters": {
            "max_temp_c": 38.5,
            "min_temp_c": 27.0
        }
    }
    # Ensure DEL city exists
    from app.database import SessionLocal
    from app.crud.crud_mysql import CRUDMySQL
    db = SessionLocal()
    CRUDMySQL.upsert_city(db, {"city_id": "DEL", "name": "Delhi", "zone": "North", "base_demand": 2898.39})
    db.close()

    save_res = client.post("/api/mysql/predictions", json=payload)
    assert save_res.status_code == 201
    save_data = save_res.json()
    assert save_data["status"] == "success"
    assert "prediction_uuid" in save_data
    assert save_data["city_id"] == "DEL"
    assert save_data["predicted_demand_mld"] == 2895.50

    # Query history
    hist_res = client.get("/api/mysql/predictions?city_id=DEL&limit=5")
    assert hist_res.status_code == 200
    hist_list = hist_res.json()
    assert len(hist_list) >= 1
    assert hist_list[0]["city_id"] == "DEL"
    assert hist_list[0]["predicted_demand_mld"] == 2895.50


def test_sync_dataset_to_database():
    """Verify ingesting sample rows from pan_india_daily_municipal_water.csv into database."""
    sync_res = client.post("/api/mysql/sync-dataset?max_rows=50")
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["status"] == "success"
    assert sync_data["total_csv_rows"] == 50
    assert sync_data["historical_records_inserted"] >= 0


def test_mysql_connection_diagnostic():
    """Verify test-connection endpoint executes cleanly."""
    payload = {
        "host": "localhost",
        "port": 3306,
        "user": "root",
        "password": "",
        "database": "aquapulse_water_db"
    }
    res = client.post("/api/mysql/test-connection", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "success" in data
    assert "message" in data

