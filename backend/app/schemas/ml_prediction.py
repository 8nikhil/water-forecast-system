"""
AquaPulse Intelligent Water Consumption Platform
Pydantic Schemas for Machine Learning Inference, Historical Data & Diagnostics
"""

from __future__ import annotations

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, model_validator


# =====================================================================
# PREDICTION SCHEMAS
# =====================================================================

class DailyPredictionRequest(BaseModel):
    """Input payload for single-day municipal water consumption forecast."""
    city_id: str = Field(
        ...,
        description="3-letter canonical Indian city code (e.g. BLR, DEL, BOM, MAA) or city name (e.g. Bengaluru, Delhi)",
        examples=["BLR"]
    )
    date: Optional[str] = Field(
        None,
        description="Target forecast date in ISO format (YYYY-MM-DD). Defaults to current date if omitted.",
        examples=["2025-05-15"]
    )
    max_temp_c: Optional[float] = Field(
        None,
        ge=-10.0,
        le=65.0,
        description="Forecasted maximum ambient temperature in Celsius.",
        examples=[33.5]
    )
    min_temp_c: Optional[float] = Field(
        None,
        ge=-20.0,
        le=55.0,
        description="Forecasted minimum ambient temperature in Celsius.",
        examples=[22.0]
    )
    precipitation_mm: Optional[float] = Field(
        None,
        ge=0.0,
        le=1000.0,
        description="Forecasted 24h precipitation in millimetres.",
        examples=[0.0]
    )
    solar_radiation_mj: Optional[float] = Field(
        None,
        ge=0.0,
        description="Forecasted surface solar radiation in MJ/m².",
        examples=[21.5]
    )
    demand_lag_1: Optional[float] = Field(
        None,
        gt=0.0,
        description="Previous day (t-1) actual water consumption in MLD. Auto-inferred from city baseline if omitted.",
        examples=[1520.0]
    )
    is_festival: Optional[int] = Field(
        0,
        ge=0,
        le=1,
        description="Binary indicator (1 or 0) for national/regional festival demand spikes.",
        examples=[0]
    )

    @model_validator(mode="after")
    def validate_temperatures(self) -> DailyPredictionRequest:
        if self.min_temp_c is not None and self.max_temp_c is not None:
            if self.min_temp_c > self.max_temp_c:
                raise ValueError(
                    f"Physical violation: min_temp_c ({self.min_temp_c}°C) cannot exceed max_temp_c ({self.max_temp_c}°C)."
                )
        return self


class ConfidenceInterval(BaseModel):
    lower: float = Field(..., description="Lower 95% confidence bound in MLD")
    upper: float = Field(..., description="Upper 95% confidence bound in MLD")


class DailyPredictionResponse(BaseModel):
    """Output payload for single-day water forecast."""
    city_id: str
    city_name: str
    zone: str
    forecast_date: str
    day_of_week: str
    is_weekend: int
    predicted_demand_mld: float = Field(..., description="Predicted municipal water consumption in Million Litres per Day (MLD)")
    confidence_interval_95_mld: ConfidenceInterval
    unit: str = "MLD (Million Litres per Day)"
    equivalent_million_cubic_meters: float = Field(..., description="Forecasted water volume in Million Cubic Meters (MCM)")
    equivalent_billion_litres: float = Field(..., description="Forecasted water volume in Billion Litres")
    expected_rmse_error_mld: float
    model_architecture: str
    # Optional flat-specific metrics for household telemetry
    predicted_demand_litres: Optional[float] = None
    per_head_lpcd: Optional[float] = None
    occupants: Optional[int] = None
    form1a_target_lpcd: Optional[float] = None
    form1a_target_liters: Optional[float] = None
    usage_tier: Optional[str] = None


class HorizonPredictionRequest(BaseModel):
    """Input payload for recursive multi-day horizon forecast."""
    city_id: str = Field(..., description="City code (e.g. DEL, BOM, BLR)", examples=["DEL"])
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD). Defaults to current date.", examples=["2025-06-01"])
    days: int = Field(14, ge=1, le=365, description="Number of future consecutive days to forecast", examples=[14])
    initial_lag: Optional[float] = Field(None, gt=0.0, description="Initial consumption prior to horizon start (MLD)", examples=[2890.0])


class HorizonStepItem(BaseModel):
    date: str
    city_id: str
    city_name: str
    day_of_week: str
    is_weekend: int
    predicted_demand_mld: float
    ci_lower_95_mld: float
    ci_upper_95_mld: float
    volume_mcm: float


class HorizonPredictionResponse(BaseModel):
    city_id: str
    city_name: str
    zone: str
    horizon_days: int
    start_date: str
    end_date: str
    total_projected_volume_mcm: float
    average_daily_demand_mld: float
    peak_day: Dict[str, Any]
    minimum_day: Dict[str, Any]
    forecast_series: List[HorizonStepItem]


class MonthlyPredictionRequest(BaseModel):
    """Input payload for full calendar month consumption forecast."""
    city_id: str = Field(..., description="City code (e.g. BOM, BLR, HYD)", examples=["BOM"])
    year: int = Field(..., ge=2020, le=2050, description="Target calendar year", examples=[2025])
    month: int = Field(..., ge=1, le=12, description="Target calendar month (1-12)", examples=[5])
    initial_lag: Optional[float] = Field(None, gt=0.0, description="Starting demand lag in MLD")


class MonthlyConfidenceInterval(BaseModel):
    total_mld_days_lower: float
    total_mld_days_upper: float
    total_mcm_lower: float
    total_mcm_upper: float


class PeakDayInfo(BaseModel):
    date: str
    day_of_week: str
    demand_mld: float


class MonthlyPredictionResponse(BaseModel):
    city_id: str
    city_name: str
    zone: str
    forecast_period: str
    year: int
    month: int
    days_in_month: int
    total_monthly_demand_mld_days: float = Field(..., description="Total monthly consumption (MLD × Days)")
    total_monthly_volume_mcm: float = Field(..., description="Total monthly volume in Million Cubic Meters (MCM)")
    total_monthly_billion_litres: float = Field(..., description="Total monthly volume in Billion Litres")
    average_daily_demand_mld: float
    peak_day: PeakDayInfo
    minimum_day: PeakDayInfo
    confidence_interval_95: MonthlyConfidenceInterval
    daily_forecast_series: List[Dict[str, Any]]


class BatchPredictionRequest(BaseModel):
    """Batch input payload containing multiple daily forecasting items."""
    records: List[DailyPredictionRequest] = Field(..., description="List of forecasting requests")


class BatchPredictionResponse(BaseModel):
    total_records: int
    successful_predictions: int
    predictions: List[DailyPredictionResponse]


# =====================================================================
# HISTORICAL DATA SCHEMAS
# =====================================================================

class HistoricalDataPoint(BaseModel):
    record_date: str
    city_id: str
    city_name: str
    zone: str
    actual_demand_mld: float
    billed_consumption_mld: Optional[float] = None
    bulk_supply_mld: Optional[float] = None
    nrw_loss_mld: Optional[float] = None
    nrw_ratio_pct: Optional[float] = None
    revenue_collection_cr: Optional[float] = None
    max_temp_c: float
    min_temp_c: float
    mean_temp_c: float
    precipitation_mm: float
    solar_radiation_mj: float
    water_stress_score: float
    cpheeo_target_lpcd: int
    is_weekend: int
    is_festival: int


class HistoricalDataResponse(BaseModel):
    total_records: int
    returned_records: int
    limit: int
    offset: int
    city_filter: Optional[str]
    zone_filter: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    records: List[HistoricalDataPoint]


class CitySummaryStats(BaseModel):
    city_id: str
    city_name: str
    zone: str
    total_records: int
    date_range: Dict[str, str]
    average_demand_mld: float
    max_demand_mld: float
    min_demand_mld: float
    total_volume_mcm: float
    average_nrw_loss_mld: float
    average_nrw_pct: float
    average_max_temp_c: float
    water_stress_score: float
    cpheeo_target_lpcd: int


class HistoricalSummaryResponse(BaseModel):
    cities: List[CitySummaryStats]


class CityMetadataItem(BaseModel):
    city_id: str
    city_name: str
    zone: str
    water_stress_score: float
    cpheeo_target_lpcd: int
    base_demand_mld: float
    mean_max_temp_c: float
    mean_min_temp_c: float


# =====================================================================
# MODEL PERFORMANCE METRICS & AUDIT SCHEMAS
# =====================================================================

class PerformanceMetricsSet(BaseModel):
    MAE_mld: float = Field(..., description="Mean Absolute Error in MLD")
    MSE: float = Field(..., description="Mean Squared Error")
    RMSE_mld: float = Field(..., description="Root Mean Squared Error in MLD")
    R2_Score: float = Field(..., description="Coefficient of Determination R²")
    R2_Percentage: float = Field(..., description="R² expressed as percentage (0-100%)")
    MAPE_pct: float = Field(..., description="Mean Absolute Percentage Error (%)")
    Median_AE_mld: Optional[float] = None
    Max_Error_mld: Optional[float] = None


class GeneralizationDiagnosis(BaseModel):
    R2_gap_pct: float
    RMSE_ratio_test_vs_train: float
    MAE_ratio_test_vs_train: float
    overfitting_detected: bool
    underfitting_detected: bool
    verdict: str


class ModelMetricsResponse(BaseModel):
    model_architecture: str
    model_file: str
    training_date: str
    target_variable: str
    total_features_count: int
    sample_counts: Dict[str, int]
    performance_train: PerformanceMetricsSet
    performance_test: PerformanceMetricsSet
    generalization_diagnosis: GeneralizationDiagnosis
    data_leakage_audit: Dict[str, str]
    residual_analysis: Dict[str, Any]


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    category: Optional[str] = None


class FeatureImportanceResponse(BaseModel):
    model_architecture: str
    total_features: int
    top_features: List[FeatureImportanceItem]


class AlgorithmBenchmarkItem(BaseModel):
    algorithm: str
    mae_mld: float
    rmse_mld: float
    mse: float
    r2_percentage: float
    mape_pct: float
    training_time_sec: Optional[float] = None
    is_champion: bool


class BenchmarkResponse(BaseModel):
    evaluation_date: str
    champion_algorithm: str
    models: List[AlgorithmBenchmarkItem]


# =====================================================================
# HEALTH CHECK SCHEMAS
# =====================================================================

class ComponentHealth(BaseModel):
    status: str
    details: Dict[str, Any]


class ComprehensiveHealthResponse(BaseModel):
    status: str
    service: str
    version: str
    server_time_utc: str
    ml_model_engine: ComponentHealth
    pan_india_dataset: ComponentHealth
    sqlite_database: ComponentHealth
    documentation_urls: Dict[str, str]

