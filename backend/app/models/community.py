import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from ..database import Base

class CommunityBenchmark(Base):
    __tablename__ = "community_benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    district = Column(String(100), default="Green Valley District", index=True)
    occupants = Column(Integer, default=3, index=True)
    property_type = Column(String(100), default="Single-Family Home")
    
    # Baseline statistics (liters per day)
    average_daily_liters = Column(Float, default=420.0)
    efficient_daily_liters = Column(Float, default=290.0) # 20th percentile
    high_use_daily_liters = Column(Float, default=610.0)  # 80th percentile
    
    sample_size = Column(Integer, default=450)
    district_target_reduction_pct = Column(Float, default=15.0)
    district_current_reduction_pct = Column(Float, default=8.4)
    
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

