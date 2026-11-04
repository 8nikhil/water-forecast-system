import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class ForecastRun(Base):
    __tablename__ = "forecast_runs"

    id = Column(Integer, primary_key=True, index=True)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    horizon_days = Column(Integer, default=14, nullable=False) # 7, 14, 30 days
    model_name = Column(String(100), default="GradientBoostingRegressor")
    
    # Real ML Evaluation Metrics computed on temporal validation holdout
    mae_liters = Column(Float, nullable=False)   # Mean Absolute Error
    rmse_liters = Column(Float, nullable=False)  # Root Mean Squared Error
    r2_score = Column(Float, nullable=False)     # R-Squared
    mape_pct = Column(Float, nullable=True)      # Mean Absolute Percentage Error
    
    training_samples_count = Column(Integer, default=0)
    validation_samples_count = Column(Integer, default=0)
    
    scenario_name = Column(String(100), default="baseline") # baseline, leak_repaired, low_flow_retrofit, drought_conservation
    scenario_adjustment_pct = Column(Float, default=0.0)
    
    # Stored predictions JSON: list of {date, predicted_liters, lower_bound, upper_bound, scenario_liters, provenance: "predicted"}
    predictions_json = Column(Text, nullable=False)
    feature_importances_json = Column(Text, nullable=True)

    household = relationship("Household", back_populates="forecast_runs")

