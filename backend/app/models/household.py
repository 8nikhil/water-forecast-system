import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.orm import relationship
from ..database import Base

class Household(Base):
    __tablename__ = "households"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=False)
    district = Column(String(100), default="Green Valley District", index=True)
    occupants = Column(Integer, default=3, nullable=False)
    property_type = Column(String(100), default="Single-Family Home") # Single-Family Home, Apartment, Duplex, Townhouse
    has_garden = Column(Boolean, default=True)
    has_pool = Column(Boolean, default=False)
    daily_budget_liters = Column(Float, default=450.0) # Daily consumption budget target
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    residents = relationship("User", back_populates="household")
    meters = relationship("SmartMeter", back_populates="household", cascade="all, delete-orphan")
    readings = relationship("WaterReading", back_populates="household", cascade="all, delete-orphan")
    anomalies = relationship("AnomalyEvent", back_populates="household", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="household", cascade="all, delete-orphan")
    forecast_runs = relationship("ForecastRun", back_populates="household", cascade="all, delete-orphan")

