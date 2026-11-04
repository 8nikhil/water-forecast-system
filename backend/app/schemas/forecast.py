import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ScenarioParams(BaseModel):
    leak_repaired: bool = Field(False, description="Simulate fixing detected continuous baseline leak")
    fixture_retrofit: bool = Field(False, description="Simulate installing low-flow aerators & showerheads (18% savings)")
    smart_irrigation: bool = Field(False, description="Simulate weather-optimized early morning drip irrigation (35% outdoor savings)")
    behavioral_conservation: bool = Field(False, description="Simulate family water-saving habits (10% overall savings)")
    custom_reduction_pct: float = Field(0.0, ge=0.0, le=75.0, description="Custom reduction percentage")

class ForecastPoint(BaseModel):
    date: str
    predicted_liters: float
    lower_bound: float
    upper_bound: float
    scenario_liters: Optional[float] = None
    provenance: str = "predicted"
    day_name: str
    is_weekend: bool
    temperature_c: float

class ForecastResponse(BaseModel):
    id: Optional[int] = None
    household_id: int
    created_at: datetime.datetime
    horizon_days: int
    model_name: str
    
    # Real ML Evaluation Metrics
    mae_liters: float
    rmse_liters: float
    r2_score: float
    mape_pct: Optional[float] = None
    
    training_samples_count: int
    validation_samples_count: int
    
    baseline_projected_total_liters: float
    scenario_projected_total_liters: float
    potential_liters_saved: float
    potential_cost_saved_usd: float
    
    scenario_params: Optional[ScenarioParams] = None
    feature_importances: Dict[str, float] = {}
    forecast_points: List[ForecastPoint]

class RetrainRequest(BaseModel):
    household_id: Optional[int] = None
    model_type: Optional[str] = "GradientBoostingRegressor" # or RandomForestRegressor

