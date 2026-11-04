import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=False, index=True)
    meter_id = Column(Integer, ForeignKey("smart_meters.id"), nullable=True)
    
    detected_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    
    # Severity: critical, high, medium, low
    severity = Column(String(50), default="high", nullable=False, index=True)
    
    # Type: continuous_night_flow, abnormal_spike, irrigation_runaway, toilet_flapper_leak, burst_pipe_suspect
    anomaly_type = Column(String(100), nullable=False)
    
    flow_rate_liters_per_hour = Column(Float, default=0.0)
    wasted_liters = Column(Float, default=0.0)
    estimated_cost_usd = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.92) # Detection algorithm confidence (0.0 to 1.0)
    
    # Status: active, investigating, resolved, dismissed
    status = Column(String(50), default="active", nullable=False, index=True)
    
    description = Column(String(255), nullable=False)
    root_cause = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    household = relationship("Household", back_populates="anomalies")

