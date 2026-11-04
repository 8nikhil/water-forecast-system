import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class RecommendationOut(BaseModel):
    id: int
    household_id: int
    title: str
    category: str
    impact_level: str
    difficulty: str
    potential_saving_liters_month: float
    potential_saving_usd_month: float
    estimated_payback_days: int
    status: str
    description: str
    action_steps: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class RecommendationUpdateStatus(BaseModel):
    status: str = Field(..., description="pending, in_progress, implemented, dismissed")
