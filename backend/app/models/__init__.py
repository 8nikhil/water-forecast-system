from .user import User
from .household import Household
from .meter import SmartMeter
from .reading import WaterReading
from .forecast import ForecastRun
from .anomaly import AnomalyEvent
from .recommendation import Recommendation
from .community import CommunityBenchmark
from .mysql_tables import (
    MunicipalCity,
    HistoricalConsumption,
    WeatherTelemetry,
    PredictionResult
)

__all__ = [
    "User",
    "Household",
    "SmartMeter",
    "WaterReading",
    "ForecastRun",
    "AnomalyEvent",
    "Recommendation",
    "CommunityBenchmark",
    "MunicipalCity",
    "HistoricalConsumption",
    "WeatherTelemetry",
    "PredictionResult"
]
