"""
AquaPulse MySQL Database API Router
Provides endpoints for database diagnostics, CRUD operations, prediction persistence, and dataset synchronization.
"""

from typing import Optional, List, Dict, Any
import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from ..database import get_db, get_database_status, active_dialect
from ..crud.crud_mysql import CRUDMySQL
from ..models.mysql_tables import (
    MunicipalCity,
    HistoricalConsumption,
    WeatherTelemetry,
    PredictionResult
)
from ..schemas.ml_prediction import DailyPredictionResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/mysql", tags=["MySQL Database & Persistence Integration"])


# =====================================================================
# SCHEMAS FOR MYSQL OPERATIONS
# =====================================================================

class CreateTelemetryPayload(BaseModel):
    city_id: str = Field(..., description="3-letter canonical city code (e.g. BLR, DEL, BOM)", examples=["BLR"])
    record_date: str = Field(..., description="Date of observation (YYYY-MM-DD)", examples=["2025-05-15"])
    actual_demand_mld: float = Field(..., gt=0.0, description="Municipal water consumption in MLD", examples=[1520.5])
    billed_consumption_mld: Optional[float] = Field(None, gt=0.0, description="Billed metered volume (MLD)")
    bulk_supply_mld: Optional[float] = Field(None, gt=0.0, description="Bulk supply volume into distribution (MLD)")
    nrw_loss_mld: Optional[float] = Field(None, ge=0.0, description="Non-revenue water loss (MLD)")
    max_temp_c: float = Field(..., ge=-10.0, le=65.0, description="Max temperature in deg C", examples=[33.5])
    min_temp_c: float = Field(..., ge=-20.0, le=55.0, description="Min temperature in deg C", examples=[22.0])
    precipitation_mm: float = Field(0.0, ge=0.0, description="Precipitation in mm", examples=[0.0])
    solar_radiation_mj: float = Field(20.0, ge=0.0, description="Solar radiation in MJ/m2", examples=[21.0])


class SavePredictionPayload(BaseModel):
    city_id: str
    forecast_date: str
    forecast_type: str = "daily"
    horizon_days: int = 1
    predicted_demand_mld: float
    confidence_interval_95_mld: Dict[str, float]
    equivalent_million_cubic_meters: Optional[float] = None
    expected_rmse_error_mld: float = 40.47
    model_architecture: str = "RandomForestRegressor"
    input_parameters: Optional[Dict[str, Any]] = None


class TestConnectionPayload(BaseModel):
    host: str = "localhost"
    port: int = 3306
    user: str = "root"
    password: str = ""
    database: str = "aquapulse_water_db"


# =====================================================================
# DATABASE STATUS & HEALTH
# =====================================================================

@router.get(
    "/status",
    summary="MySQL Engine Status & Table Telemetry",
    description="Returns active database dialect, host connectivity, pool stats, and stored record counts across all MySQL tables."
)
def get_mysql_status(db: Session = Depends(get_db)):
    """Inspects database health and counts rows in tables."""
    info = get_database_status()

    # Query table counts safely
    try:
        cities_count = db.query(func.count(MunicipalCity.city_id)).scalar() or 0
        hist_count = db.query(func.count(HistoricalConsumption.id)).scalar() or 0
        weather_count = db.query(func.count(WeatherTelemetry.id)).scalar() or 0
        pred_count = db.query(func.count(PredictionResult.id)).scalar() or 0
    except Exception as e:
        cities_count, hist_count, weather_count, pred_count = 0, 0, 0, 0

    return {
        "status": "online" if info["connected"] else "error",
        "active_dialect": info["active_dialect"],
        "connected": info["connected"],
        "latency_ms": info["latency_ms"],
        "configured_engine": info["configured_engine"],
        "connection_url_target": info["database_url_masked"],
        "mysql_config": info["mysql_config"],
        "table_row_counts": {
            "municipal_cities": cities_count,
            "historical_water_consumption": hist_count,
            "weather_telemetry": weather_count,
            "forecast_predictions": pred_count
        }
    }


# =====================================================================
# CRUD OPERATIONS: HISTORICAL DATA & TELEMETRY
# =====================================================================

@router.post(
    "/historical",
    status_code=status.HTTP_201_CREATED,
    summary="Insert / Upsert Historical Water & Weather Telemetry",
    description="Atomically creates or updates daily consumption and weather telemetry records in MySQL."
)
def create_historical_record(
    payload: CreateTelemetryPayload = Body(...),
    db: Session = Depends(get_db)
):
    try:
        r_date = datetime.datetime.strptime(payload.record_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Expected YYYY-MM-DD.")

    if payload.min_temp_c > payload.max_temp_c:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="min_temp_c cannot exceed max_temp_c.")

    consumption_dict = {
        "actual_demand_mld": payload.actual_demand_mld,
        "billed_consumption_mld": payload.billed_consumption_mld,
        "bulk_supply_mld": payload.bulk_supply_mld,
        "nrw_loss_mld": payload.nrw_loss_mld
    }
    weather_dict = {
        "max_temp_c": payload.max_temp_c,
        "min_temp_c": payload.min_temp_c,
        "precipitation_mm": payload.precipitation_mm,
        "solar_radiation_mj": payload.solar_radiation_mj
    }

    try:
        res = CRUDMySQL.create_telemetry_entry(
            db=db,
            city_id=payload.city_id,
            record_date=r_date,
            consumption_data=consumption_dict,
            weather_data=weather_dict
        )
        return {"status": "success", "message": "Record upserted successfully in MySQL.", "data": res}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database insert error: {e}")


@router.get(
    "/historical",
    summary="Query Historical Water Records from Database",
    description="Retrieves historical municipal water telemetry directly from database tables with filtering."
)
def read_historical_records(
    city_id: Optional[str] = Query(None, description="City code (e.g. BLR, DEL, BOM)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=1000, description="Records limit"),
    db: Session = Depends(get_db)
):
    s_date = datetime.datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else None
    e_date = datetime.datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None

    records = CRUDMySQL.get_historical_records(
        db=db,
        city_id=city_id,
        start_date=s_date,
        end_date=e_date,
        skip=skip,
        limit=limit
    )

    results = []
    for r in records:
        results.append({
            "id": r.id,
            "city_id": r.city_id,
            "record_date": str(r.record_date),
            "actual_demand_mld": r.actual_demand_mld,
            "billed_consumption_mld": r.billed_consumption_mld,
            "bulk_supply_mld": r.bulk_supply_mld,
            "nrw_loss_mld": r.nrw_loss_mld,
            "nrw_ratio_pct": r.nrw_ratio_pct,
            "revenue_collection_cr": r.revenue_collection_cr,
            "is_weekend": r.is_weekend,
            "is_festival": r.is_festival
        })

    return {
        "total_returned": len(results),
        "skip": skip,
        "limit": limit,
        "city_filter": city_id,
        "records": results
    }


# =====================================================================
# PREDICTION RESULTS LOGGING & RETRIEVAL
# =====================================================================

@router.post(
    "/predictions",
    status_code=status.HTTP_201_CREATED,
    summary="Persist ML Forecast Output in MySQL",
    description="Stores ML model forecast results (predicted demand, confidence intervals, volume in MCM) in the MySQL database."
)
def save_prediction(
    payload: SavePredictionPayload = Body(...),
    db: Session = Depends(get_db)
):
    try:
        rec = CRUDMySQL.log_prediction_result(db=db, prediction_payload=payload.model_dump())
        return {
            "status": "success",
            "prediction_uuid": rec.prediction_uuid,
            "city_id": rec.city_id,
            "forecast_date": str(rec.forecast_date),
            "predicted_demand_mld": rec.predicted_demand_mld,
            "volume_mcm": rec.volume_mcm,
            "created_at": rec.created_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to persist prediction: {e}")


@router.get(
    "/predictions",
    summary="Retrieve Stored Prediction History",
    description="Queries stored historical machine learning forecasts and confidence intervals."
)
def get_predictions_history(
    city_id: Optional[str] = Query(None, description="Filter by city code"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    records = CRUDMySQL.get_prediction_history(db=db, city_id=city_id, limit=limit)
    return [
        {
            "id": r.id,
            "prediction_uuid": r.prediction_uuid,
            "city_id": r.city_id,
            "forecast_date": str(r.forecast_date),
            "forecast_type": r.forecast_type,
            "horizon_days": r.horizon_days,
            "predicted_demand_mld": r.predicted_demand_mld,
            "ci_lower_95_mld": r.ci_lower_95_mld,
            "ci_upper_95_mld": r.ci_upper_95_mld,
            "volume_mcm": r.volume_mcm,
            "model_architecture": r.model_architecture,
            "created_at": r.created_at.isoformat()
        }
        for r in records
    ]


# =====================================================================
# DATASET SYNCHRONIZATION
# =====================================================================

@router.post(
    "/sync-dataset",
    summary="Synchronize Pan-India CSV Dataset into MySQL",
    description="Ingests historical water and weather records from `pan_india_daily_municipal_water.csv` directly into MySQL tables."
)
def sync_dataset_to_database(
    max_rows: Optional[int] = Query(None, ge=10, description="Optional cap on rows to ingest for quick verification"),
    db: Session = Depends(get_db)
):
    import os
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    csv_path = os.path.join(base_dir, "datasets", "pan_india", "pan_india_daily_municipal_water.csv")

    try:
        res = CRUDMySQL.sync_dataset_csv_to_mysql(db=db, csv_path=csv_path, max_rows=max_rows)
        return {
            "status": "success",
            "message": "Dataset successfully synchronized into database.",
            **res
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Sync error: {e}")


# =====================================================================
# TEST CONNECTION
# =====================================================================

@router.post(
    "/test-connection",
    summary="Test External MySQL Connection Parameters",
    description="Attempts a trial connection against specified MySQL host, user, and credentials."
)
def test_mysql_connection(payload: TestConnectionPayload = Body(...)):
    import time
    from sqlalchemy import create_engine, text

    pwd_part = f":{payload.password}" if payload.password else ""
    trial_url = f"mysql+pymysql://{payload.user}{pwd_part}@{payload.host}:{payload.port}/{payload.database}?charset=utf8mb4"

    t0 = time.time()
    try:
        test_eng = create_engine(trial_url, connect_args={"connect_timeout": 3})
        with test_eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency = round((time.time() - t0) * 1000.0, 2)
        return {
            "success": True,
            "message": f"Successfully connected to MySQL database '{payload.database}' at {payload.host}:{payload.port}",
            "latency_ms": latency
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection failed: {str(e)}",
            "latency_ms": None
        }

