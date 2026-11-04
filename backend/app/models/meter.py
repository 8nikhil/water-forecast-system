import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class SmartMeter(Base):
    __tablename__ = "smart_meters"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String(100), unique=True, index=True, nullable=False)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=False)
    meter_model = Column(String(100), default="AquaSense Ultrasonic-500")
    firmware_version = Column(String(50), default="v3.4.1")
    status = Column(String(50), default="online")  # online, offline, maintenance
    battery_level_pct = Column(Float, default=94.5)
    signal_strength_dbm = Column(Float, default=-68.0)
    last_ping = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    household = relationship("Household", back_populates="meters")
    readings = relationship("WaterReading", back_populates="meter", cascade="all, delete-orphan")

