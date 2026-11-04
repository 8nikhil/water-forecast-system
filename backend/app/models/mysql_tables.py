"""
SQLAlchemy ORM Models for Pan-India Municipal Water Telemetry & Predictions.
Designed with MySQL InnoDB standards (UTF8MB4, foreign keys, composite indexes).
"""

import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
    Index
)
from sqlalchemy.orm import relationship
from ..database import Base


class MunicipalCity(Base):
    """Monitored municipal water authority metadata."""
    __tablename__ = "municipal_cities"

    city_id = Column(String(10), primary_key=True, index=True)  # e.g. "BLR", "DEL"
    city_name = Column(String(100), nullable=False)
    zone = Column(String(50), nullable=False)                    # "South", "North", etc.
    water_stress_score = Column(Float, nullable=False, default=100.0)
    cpheeo_target_lpcd = Column(Integer, nullable=False, default=135)
    base_demand_mld = Column(Float, nullable=False)
    mean_max_temp_c = Column(Float, nullable=True)
    mean_min_temp_c = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    historical_records = relationship("HistoricalConsumption", back_populates="city", cascade="all, delete-orphan")
    weather_records = relationship("WeatherTelemetry", back_populates="city", cascade="all, delete-orphan")
    prediction_records = relationship("PredictionResult", back_populates="city", cascade="all, delete-orphan")


class HistoricalConsumption(Base):
    """Historical municipal daily water extraction, bulk supply, and NRW loss."""
    __tablename__ = "historical_water_consumption"

    id = Column(Integer, primary_key=True, autoincrement=True)
    city_id = Column(String(10), ForeignKey("municipal_cities.city_id", ondelete="CASCADE"), nullable=False, index=True)
    record_date = Column(Date, nullable=False, index=True)
    actual_demand_mld = Column(Float, nullable=False)
    billed_consumption_mld = Column(Float, nullable=True)
    bulk_supply_mld = Column(Float, nullable=True)
    nrw_loss_mld = Column(Float, nullable=True)
    nrw_ratio_pct = Column(Float, nullable=True)
    revenue_collection_cr = Column(Float, nullable=True)
    is_weekend = Column(Integer, default=0)
    is_festival = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("city_id", "record_date", name="uq_city_record_date"),
        Index("idx_city_date_demand", "city_id", "record_date", "actual_demand_mld"),
    )

    city = relationship("MunicipalCity", back_populates="historical_records")


class WeatherTelemetry(Base):
    """Historical atmospheric telemetry per municipal district."""
    __tablename__ = "weather_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    city_id = Column(String(10), ForeignKey("municipal_cities.city_id", ondelete="CASCADE"), nullable=False, index=True)
    record_date = Column(Date, nullable=False, index=True)
    max_temp_c = Column(Float, nullable=False)
    min_temp_c = Column(Float, nullable=False)
    mean_temp_c = Column(Float, nullable=False)
    temp_range_c = Column(Float, nullable=True)
    precipitation_mm = Column(Float, default=0.0)
    solar_radiation_mj = Column(Float, nullable=False)
    heat_index_proxy = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("city_id", "record_date", name="uq_city_weather_date"),
        Index("idx_city_weather_date", "city_id", "record_date"),
    )

    city = relationship("MunicipalCity", back_populates="weather_records")


class PredictionResult(Base):
    """Audit log of ML model predictions (daily, recursive horizon, and monthly)."""
    __tablename__ = "forecast_predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    prediction_uuid = Column(String(64), unique=True, index=True, nullable=False)
    city_id = Column(String(10), ForeignKey("municipal_cities.city_id", ondelete="CASCADE"), nullable=False, index=True)
    forecast_date = Column(Date, nullable=False, index=True)
    forecast_type = Column(String(20), nullable=False)  # "daily", "horizon", "monthly"
    horizon_days = Column(Integer, default=1)
    predicted_demand_mld = Column(Float, nullable=False)
    ci_lower_95_mld = Column(Float, nullable=False)
    ci_upper_95_mld = Column(Float, nullable=False)
    volume_mcm = Column(Float, nullable=False)
    model_architecture = Column(String(100), default="RandomForestRegressor")
    expected_rmse_error_mld = Column(Float, nullable=False)
    input_parameters_json = Column(Text, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    city = relationship("MunicipalCity", back_populates="prediction_records")

