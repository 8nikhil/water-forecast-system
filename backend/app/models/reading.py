import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from ..database import Base

class WaterReading(Base):
    __tablename__ = "water_readings"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=False, index=True)
    meter_id = Column(Integer, ForeignKey("smart_meters.id"), nullable=True, index=True)
    
    timestamp = Column(DateTime, nullable=False, index=True)
    consumption_liters = Column(Float, nullable=False)
    
    # Data provenance: "measured" (IoT smart meter), "user_entered" (manual reading), 
    # "simulated" (sensor benchmark/test bed), "predicted" (ML forecast model)
    provenance = Column(String(50), default="measured", nullable=False, index=True)
    
    reading_type = Column(String(50), default="hourly", nullable=False) # hourly, daily, manual_dial
    meter_dial_reading = Column(Float, nullable=True) # cumulative counter in m3 or liters
    
    # Ambient features for ML modeling
    temperature_c = Column(Float, default=22.0)
    is_weekend = Column(Boolean, default=False)
    
    # Appliance / end-use attribution
    end_use_category = Column(String(50), default="general") # showers, toilets, kitchen_tap, appliances, irrigation, leak_baseline, general
    
    # Quality / detection flags
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)
    notes = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    household = relationship("Household", back_populates="readings")
    meter = relationship("SmartMeter", back_populates="readings")

    __table_args__ = (
        Index("idx_household_timestamp", "household_id", "timestamp"),
        Index("idx_provenance_timestamp", "provenance", "timestamp"),
    )

