import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class WaterReadingBase(BaseModel):
    timestamp: datetime.datetime
    consumption_liters: float = Field(..., ge=0.0)
    provenance: str = Field("measured", description="measured, user_entered, simulated, or predicted")
    reading_type: str = "hourly"
    temperature_c: Optional[float] = 22.0
    end_use_category: Optional[str] = "general"
    notes: Optional[str] = None
    is_anomaly: Optional[bool] = False
    anomaly_score: Optional[float] = 0.0

class WaterReadingCreate(WaterReadingBase):
    meter_id: Optional[int] = None
    household_id: Optional[int] = None

class ManualDialEntry(BaseModel):
    timestamp: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))
    meter_dial_reading: float = Field(..., description="Current dial reading in cubic meters or total liters", ge=0.0)
    notes: Optional[str] = "Manual homeowner meter dial reading"

class WaterReadingOut(WaterReadingBase):
    id: int
    household_id: int
    meter_id: Optional[int] = None
    meter_dial_reading: Optional[float] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class DailyAggregation(BaseModel):
    date: str
    total_liters: float
    avg_hourly_liters: float
    peak_hour: int
    provenance: str
    is_anomaly: bool
    end_use_breakdown: dict

class ReadingFilterParams(BaseModel):
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    provenance: Optional[str] = None
    reading_type: Optional[str] = None
