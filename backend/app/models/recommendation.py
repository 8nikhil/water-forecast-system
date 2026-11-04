import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    category = Column(String(100), default="fixtures") # fixtures, behavior, leak_fix, irrigation, appliances
    impact_level = Column(String(50), default="high") # high, medium, low
    difficulty = Column(String(50), default="easy") # easy, moderate, advanced
    
    potential_saving_liters_month = Column(Float, nullable=False)
    potential_saving_usd_month = Column(Float, nullable=False)
    estimated_payback_days = Column(Integer, default=0)
    
    # Status: pending, in_progress, implemented, dismissed
    status = Column(String(50), default="pending", nullable=False, index=True)
    
    description = Column(Text, nullable=False)
    action_steps = Column(Text, nullable=True) # JSON or markdown steps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    household = relationship("Household", back_populates="recommendations")

