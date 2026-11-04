from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class CommunityBenchmarkOut(BaseModel):
    id: int
    district: str
    occupants: int
    property_type: str
    average_daily_liters: float
    efficient_daily_liters: float
    high_use_daily_liters: float
    sample_size: int
    district_target_reduction_pct: float
    district_current_reduction_pct: float

    model_config = ConfigDict(from_attributes=True)

class ComparisonReport(BaseModel):
    user_daily_average_liters: float
    community_average_liters: float
    efficient_benchmark_liters: float
    percentile_rank: float
    comparison_text: str
    tier: str # Eco Champion, Water Conscious, Moderate, High Consumer
    district: str
    occupants: int
