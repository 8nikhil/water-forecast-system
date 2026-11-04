"""
AquaPulse Machine Learning & Telemetry Router
FastAPI Endpoints for Model Inference, Historical Pan-India Telemetry, and Diagnostics.
"""

from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, status, Body
from ..schemas.ml_prediction import (
    DailyPredictionRequest,
    DailyPredictionResponse,
    HorizonPredictionRequest,
    HorizonPredictionResponse,
    MonthlyPredictionRequest,
    MonthlyPredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    HistoricalDataResponse,
    HistoricalSummaryResponse,
    CityMetadataItem,
    ModelMetricsResponse,
    FeatureImportanceResponse,
    BenchmarkResponse,
    ComprehensiveHealthResponse
)
from ..services.water_ml_service import WaterMLService, PredictValidationError

router = APIRouter(tags=["AI Water Consumption Forecasting & Analytics"])
ml_service = WaterMLService()


# =====================================================================
# SYSTEM HEALTH & READINESS
# =====================================================================

@router.get(
    "/health/comprehensive",
    response_model=ComprehensiveHealthResponse,
    summary="Comprehensive System Health Check",
    description="Inspects real-time operational status of the ML model engine, Pan-India municipal dataset, and database."
)
def get_comprehensive_health():
    """Returns complete diagnostic health metrics for model engine and telemetry pipelines."""
    return ml_service.get_health_status()


# =====================================================================
# MACHINE LEARNING INFERENCE ENDPOINTS
# =====================================================================

@router.post(
    "/predict/daily",
    response_model=DailyPredictionResponse,
    summary="Single-Day Water Consumption Point Forecast",
    description="Forecasts municipal water demand (in MLD and MCM) for any Indian city given atmospheric indices and historical lags. Missing inputs are auto-inferred."
)
def predict_daily_consumption(payload: DailyPredictionRequest = Body(...)):
    """Generates point prediction with 95% confidence intervals."""
    try:
        req_dict = payload.model_dump()
        result = ml_service.predict_daily(req_dict)
        return DailyPredictionResponse(**result)
    except PredictValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Prediction error: {e}")


@router.post(
    "/predict/horizon",
    response_model=HorizonPredictionResponse,
    summary="Recursive Multi-Day Horizon Forecast (7, 14, 30 Days)",
    description="Recursively forecasts consecutive future days using autoregressive lag feedback. Returns daily demand, volume in MCM, and confidence bands."
)
def predict_horizon_consumption(payload: HorizonPredictionRequest = Body(...)):
    """Generates multi-step recursive daily projections."""
    try:
        result = ml_service.predict_horizon(
            city_id=payload.city_id,
            start_date=payload.start_date,
            days=payload.days,
            initial_lag=payload.initial_lag
        )
        return HorizonPredictionResponse(**result)
    except PredictValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Horizon forecast error: {e}")


@router.post(
    "/predict/monthly",
    response_model=MonthlyPredictionResponse,
    summary="Full Calendar Month Demand & Volume Forecast",
    description="Forecasts complete monthly water demand, aggregating daily cycles into total MLD-Days, Million m³ (MCM), Billion Litres, peak day, and trough day."
)
def predict_monthly_consumption(payload: MonthlyPredictionRequest = Body(...)):
    """Generates monthly water budget and peak demand diagnostics."""
    try:
        result = ml_service.predict_month(
            city_id=payload.city_id,
            year=payload.year,
            month=payload.month,
            initial_lag=payload.initial_lag
        )
        return MonthlyPredictionResponse(**result)
    except PredictValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Monthly forecast error: {e}")


@router.post(
    "/predict/batch",
    response_model=BatchPredictionResponse,
    summary="Batch Water Consumption Forecasting",
    description="Runs inference on a collection of multiple dates or multiple cities simultaneously."
)
def predict_batch_consumption(payload: BatchPredictionRequest = Body(...)):
    """Executes high-throughput batch inference."""
    try:
        records_dict = [r.model_dump() for r in payload.records]
        result = ml_service.predict_batch(records_dict)
        return BatchPredictionResponse(**result)
    except PredictValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Batch error: {e}")


@router.get(
    "/predict/cities",
    response_model=List[CityMetadataItem],
    summary="List Supported Metropolitan Water Authorities",
    description="Returns metadata, CPHEEO per-capita supply targets (LPCD), water stress scores, and baseline demand for 21 Indian cities."
)
def get_supported_cities():
    """Returns canonical reference metadata for all 21 monitored Indian cities."""
    return ml_service.get_supported_cities()


# =====================================================================
# HISTORICAL DATA RETRIEVAL ENDPOINTS
# =====================================================================

@router.get(
    "/data/historical",
    response_model=HistoricalDataResponse,
    summary="Retrieve Historical Water Consumption Telemetry",
    description="Queries historical municipal water consumption, bulk supply, NRW loss, and weather parameters with date range filtering and pagination."
)
def get_historical_telemetry(
    city_id: Optional[str] = Query(None, description="Filter by 3-letter city code (e.g. BLR, DEL, BOM)"),
    zone: Optional[str] = Query(None, description="Filter by geographic zone (e.g. South, North, West, East)"),
    start_date: Optional[str] = Query(None, description="Filter records starting from date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter records ending at date (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=1000, description="Page size (records to return)"),
    offset: int = Query(0, ge=0, description="Offset index for pagination")
):
    """Fetches paginated historical municipal water telemetry."""
    try:
        return ml_service.get_historical_records(
            city_id=city_id,
            zone=zone,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database query error: {e}")


@router.get(
    "/data/historical/summary",
    response_model=HistoricalSummaryResponse,
    summary="Historical Consumption Summary by City",
    description="Calculates historical averages, maximum peak demands, total volumetric extraction, and average NRW loss for all monitored cities."
)
def get_historical_summary():
    """Returns aggregated historical analytics across all monitored water boards."""
    summaries = ml_service.get_historical_summary()
    return HistoricalSummaryResponse(cities=summaries)


@router.get(
    "/data/cities",
    response_model=List[CityMetadataItem],
    summary="List Monitored Municipal Cities",
    description="Alias endpoint returning list of cities with telemetry coverage."
)
def list_monitored_cities():
    return ml_service.get_supported_cities()


# =====================================================================
# MODEL PERFORMANCE METRICS & AUDIT ENDPOINTS
# =====================================================================

@router.get(
    "/model/metrics",
    response_model=ModelMetricsResponse,
    summary="Production Model Performance & Evaluation Metrics",
    description="Returns quantitative metrics (MAE, MSE, RMSE, R² Score, MAPE) for both Train and Holdout Test sets, along with data leakage and generalization diagnoses."
)
def get_model_evaluation_metrics():
    """Returns official performance metrics verified by Senior ML Engineer audit."""
    return ml_service.get_model_metrics()


@router.get(
    "/model/feature-importance",
    response_model=FeatureImportanceResponse,
    summary="Model Feature Importance Ranking",
    description="Returns normalized Gini importance ranking for the top contributing features in the random forest ensemble."
)
@router.get(
    "/model/features",
    response_model=FeatureImportanceResponse,
    include_in_schema=False
)
def get_feature_importance_breakdown():
    """Returns ranked feature importance analysis."""
    return ml_service.get_feature_importances()


@router.get(
    "/model/benchmark",
    response_model=BenchmarkResponse,
    summary="Algorithm Benchmark Comparison",
    description="Compares Linear Regression, Ridge, Random Forest, Gradient Boosting, and XGBoost on holdout test data."
)
@router.get(
    "/model/benchmarks",
    response_model=BenchmarkResponse,
    include_in_schema=False
)
def get_algorithm_benchmarks():
    """Returns cross-model benchmark evaluation table."""
    return ml_service.get_benchmarks()

