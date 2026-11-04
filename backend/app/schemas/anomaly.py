import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class AnomalyOut(BaseModel):
    id: int
    household_id: int
    meter_id: Optional[int] = None
    detected_at: datetime.datetime
    start_time: datetime.datetime
    end_time: Optional[datetime.datetime] = None
    severity: str
    anomaly_type: str
    flow_rate_liters_per_hour: float
    wasted_liters: float
    estimated_cost_usd: float
    confidence_score: float
    status: str
    description: str
    root_cause: Optional[str] = None
    recommended_action: Optional[str] = None
    resolved_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AnomalyUpdateStatus(BaseModel):
    status: str = Field(..., description="active, investigating, resolved, dismissed")
    notes: Optional[str] = None

class ThresholdConfig(BaseModel):
    night_flow_threshold_liters_per_hour: float = Field(5.0, ge=1.0, le=50.0)
    spike_multiplier_threshold: float = Field(2.5, ge=1.5, le=5.0)
    daily_budget_liters: float = Field(450.0, ge=100.0, le=2000.0)
