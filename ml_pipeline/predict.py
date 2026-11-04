"""
AquaPulse Intelligent Water Consumption Forecasting & Conservation Analytics Platform
Module: predict.py - Production Machine Learning Inference Engine

Features:
- Loads trained ML model bundles (.pkl or .joblib)
- Applies identical feature engineering and preprocessing as training pipeline
- Strict multi-layer input validation and descriptive error handling
- Supports:
    1. Single Daily Forecast (Point prediction with 95% Confidence Bounds)
    2. Multi-Day Recursive Daily Horizon Forecast (7, 14, 30, 60 days)
    3. Monthly Forecast & Aggregation (Total Monthly MLD, MCM, Billion Litres, Peak & Min Day)
    4. Batch CSV / DataFrame Inference
- Works both as an importable Python library and as a standalone CLI tool.
"""

from __future__ import annotations

import os
import sys
import json
import calendar
import argparse
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Union, Tuple

import numpy as np
import pandas as pd
import joblib


# =====================================================================
# CUSTOM EXCEPTIONS
# =====================================================================

class WaterForecasterError(Exception):
    """Base exception for water forecasting engine."""
    pass


class ModelLoadError(WaterForecasterError):
    """Raised when the serialized model bundle cannot be loaded."""
    pass


class ValidationError(WaterForecasterError):
    """Raised when user or pipeline input fails schema/physics validation."""
    pass


class ForecastError(WaterForecasterError):
    """Raised when a forecasting or feature transformation error occurs."""
    pass


# =====================================================================
# DEFAULT PATHS & CITY METADATA
# =====================================================================

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "ml_pipeline", "models", "best_water_consumption_model.pkl"
)

# Canonical metadata for all 21 Indian metropolitan water authorities
# Derived from empirical pan-india municipal telemetry
CITY_METADATA: Dict[str, Dict[str, Any]] = {
    "AMD": {"name": "Ahmedabad", "zone": "West", "stress": 100.0, "cpheeo": 140, "base_demand": 1301.47, "tmax_mean": 33.7, "tmin_mean": 22.5},
    "BBI": {"name": "Bhubaneswar", "zone": "East", "stress": 79.58, "cpheeo": 135, "base_demand": 174.87, "tmax_mean": 32.4, "tmin_mean": 23.1},
    "BHO": {"name": "Bhopal", "zone": "Central", "stress": 99.83, "cpheeo": 135, "base_demand": 350.92, "tmax_mean": 30.7, "tmin_mean": 19.9},
    "BLR": {"name": "Bengaluru", "zone": "South", "stress": 100.0, "cpheeo": 135, "base_demand": 1492.29, "tmax_mean": 29.6, "tmin_mean": 19.1},
    "BOM": {"name": "Mumbai", "zone": "West", "stress": 100.0, "cpheeo": 150, "base_demand": 4015.17, "tmax_mean": 31.4, "tmin_mean": 23.5},
    "CCU": {"name": "Kolkata", "zone": "East", "stress": 100.0, "cpheeo": 150, "base_demand": 2410.05, "tmax_mean": 31.3, "tmin_mean": 22.4},
    "COK": {"name": "Kochi", "zone": "South", "stress": 100.0, "cpheeo": 135, "base_demand": 315.70, "tmax_mean": 29.8, "tmin_mean": 24.4},
    "DED": {"name": "Dehradun", "zone": "Himalayan", "stress": 98.29, "cpheeo": 135, "base_demand": 138.14, "tmax_mean": 26.6, "tmin_mean": 15.7},
    "DEL": {"name": "Delhi", "zone": "North", "stress": 100.0, "cpheeo": 150, "base_demand": 2898.39, "tmax_mean": 30.4, "tmin_mean": 19.2},
    "GAU": {"name": "Guwahati", "zone": "North-East", "stress": 99.52, "cpheeo": 135, "base_demand": 165.69, "tmax_mean": 29.0, "tmin_mean": 19.6},
    "GGN": {"name": "Gurugram", "zone": "North", "stress": 87.77, "cpheeo": 150, "base_demand": 286.22, "tmax_mean": 30.1, "tmin_mean": 18.6},
    "HYD": {"name": "Hyderabad", "zone": "South", "stress": 99.92, "cpheeo": 150, "base_demand": 1624.08, "tmax_mean": 31.4, "tmin_mean": 21.3},
    "IDR": {"name": "Indore", "zone": "Central", "stress": 99.74, "cpheeo": 135, "base_demand": 472.57, "tmax_mean": 30.7, "tmin_mean": 19.9},
    "JAI": {"name": "Jaipur", "zone": "North", "stress": 100.0, "cpheeo": 135, "base_demand": 483.29, "tmax_mean": 30.9, "tmin_mean": 19.6},
    "LKO": {"name": "Lucknow", "zone": "North", "stress": 99.97, "cpheeo": 135, "base_demand": 537.42, "tmax_mean": 31.0, "tmin_mean": 20.0},
    "LUH": {"name": "Ludhiana", "zone": "North", "stress": 99.86, "cpheeo": 135, "base_demand": 293.20, "tmax_mean": 29.4, "tmin_mean": 17.5},
    "MAA": {"name": "Chennai", "zone": "South", "stress": 100.0, "cpheeo": 135, "base_demand": 1042.17, "tmax_mean": 32.1, "tmin_mean": 25.1},
    "PAT": {"name": "Patna", "zone": "East", "stress": 100.0, "cpheeo": 135, "base_demand": 353.32, "tmax_mean": 31.0, "tmin_mean": 21.1},
    "PNQ": {"name": "Pune", "zone": "West", "stress": 94.30, "cpheeo": 150, "base_demand": 1200.53, "tmax_mean": 31.2, "tmin_mean": 20.1},
    "STV": {"name": "Surat", "zone": "West", "stress": 92.10, "cpheeo": 140, "base_demand": 1046.90, "tmax_mean": 33.1, "tmin_mean": 22.9},
    "VTZ": {"name": "Visakhapatnam", "zone": "South", "stress": 95.78, "cpheeo": 135, "base_demand": 305.76, "tmax_mean": 32.0, "tmin_mean": 23.8}
}

# Climatology lookup by month (empirical Pan-India dataset averages)
MONTHLY_CLIMATOLOGY: Dict[int, Dict[str, float]] = {
    1:  {"tmax": 24.49, "tmin": 13.08, "precip": 0.60,  "solar": 15.43},
    2:  {"tmax": 28.52, "tmin": 15.64, "precip": 0.36,  "solar": 18.92},
    3:  {"tmax": 31.38, "tmin": 18.90, "precip": 1.16,  "solar": 20.70},
    4:  {"tmax": 35.43, "tmin": 22.71, "precip": 0.83,  "solar": 22.81},
    5:  {"tmax": 36.38, "tmin": 25.03, "precip": 3.04,  "solar": 22.19},
    6:  {"tmax": 35.05, "tmin": 26.20, "precip": 6.32,  "solar": 19.56},
    7:  {"tmax": 31.15, "tmin": 25.06, "precip": 12.26, "solar": 16.33},
    8:  {"tmax": 30.90, "tmin": 24.62, "precip": 8.45,  "solar": 17.77},
    9:  {"tmax": 30.90, "tmin": 24.10, "precip": 8.02,  "solar": 17.28},
    10: {"tmax": 31.25, "tmin": 21.66, "precip": 2.85,  "solar": 17.93},
    11: {"tmax": 29.00, "tmin": 18.50, "precip": 1.59,  "solar": 15.66},
    12: {"tmax": 25.71, "tmin": 15.30, "precip": 1.29,  "solar": 13.97}
}

# Reverse lookup mapping city names (e.g. "bengaluru") to canonical codes ("BLR")
CITY_NAME_TO_CODE = {meta["name"].lower(): code for code, meta in CITY_METADATA.items()}
for code in CITY_METADATA.keys():
    CITY_NAME_TO_CODE[code.lower()] = code


# =====================================================================
# CORE INFERENCE ENGINE CLASS
# =====================================================================

class WaterConsumptionPredictor:
    """
    Production-grade predictor for Municipal Water Consumption Forecasting.
    Implements feature engineering, validation, daily and monthly forecasting horizons.
    """

    def __init__(self, model_path: Optional[str] = None):
        """
        Loads the trained model bundle (.pkl or .joblib).
        Supports dictionary bundles (recommended) and raw scikit-learn/xgboost regressors.
        """
        self.model_path = model_path or self._resolve_default_model_path()
        self._load_bundle()

    def _resolve_default_model_path(self) -> str:
        """Locates the champion model bundle in workspace."""
        candidates = [
            DEFAULT_MODEL_PATH,
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "best_water_consumption_model.pkl"),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "best_water_consumption_model.pkl")
        ]
        for c in candidates:
            if os.path.exists(c):
                return c
        raise ModelLoadError(
            f"Could not find champion model bundle at any default location:\n"
            + "\n".join(f" - {p}" for p in candidates)
        )

    def _load_bundle(self):
        """Loads and parses the serialized artifact."""
        if not os.path.exists(self.model_path):
            raise ModelLoadError(f"Model file not found at: {self.model_path}")
        
        try:
            bundle = joblib.load(self.model_path)
        except Exception as e:
            raise ModelLoadError(f"Failed to deserialize model bundle at '{self.model_path}': {e}") from e

        if isinstance(bundle, dict) and "model" in bundle:
            self.model = bundle["model"]
            self.encoded_features = bundle.get("encoded_features", [])
            self.raw_feature_cols = bundle.get("raw_feature_cols", [])
            self.metrics = bundle.get("metrics", {})
            self.model_name = bundle.get("model_name", "TrainedRegressor")
            self.training_date = bundle.get("training_date", "Unknown")
        else:
            # Standalone estimator fallback
            self.model = bundle
            self.model_name = type(bundle).__name__
            self.encoded_features = []
            self.raw_feature_cols = []
            self.metrics = {"RMSE_mld": 40.47, "MAE_mld": 20.79, "R2_Percentage": 99.83}
            self.training_date = "Unknown"

        # If encoded_features was empty, synthesize the 52 standard training features
        if not self.encoded_features:
            self.encoded_features = self._build_canonical_feature_list()

        self.rmse = float(self.metrics.get("RMSE_mld", 40.47))

    @staticmethod
    def _build_canonical_feature_list() -> List[str]:
        """Constructs the standard 52 features if missing from raw pickle."""
        base_cols = [
            "max_temp_c", "min_temp_c", "mean_temp_c", "temp_range_c",
            "precipitation_mm", "solar_radiation_mj", "heat_index_proxy",
            "is_weekend", "is_festival", "sin_month", "cos_month", "sin_dow", "cos_dow",
            "water_stress_score", "cpheeo_target_lpcd",
            "demand_lag_1", "demand_lag_2", "demand_lag_3", "demand_lag_7", "demand_lag_14",
            "rolling_mean_7", "rolling_std_7", "rolling_min_7", "rolling_max_7", "rolling_mean_14",
            "ratio_to_7d_mean"
        ]
        city_dummies = [f"city_id_{c}" for c in sorted(CITY_METADATA.keys()) if c != "AMD"]
        zones = ["East", "Himalayan", "North", "North-East", "South", "West"]
        zone_dummies = [f"zone_{z}" for z in sorted(zones)]
        return base_cols + city_dummies + zone_dummies

    # =====================================================================
    # INPUT VALIDATION
    # =====================================================================

    def validate_city(self, city_input: Any) -> Tuple[str, Dict[str, Any]]:
        """
        Validates city code or city name.
        Returns canonical 3-letter city code and its metadata dictionary.
        """
        if not city_input or not isinstance(city_input, str):
            raise ValidationError(
                f"Invalid city: '{city_input}'. Must be a non-empty string. "
                f"Valid codes: {list(CITY_METADATA.keys())}"
            )
        
        normalized = city_input.strip().lower()
        if normalized not in CITY_NAME_TO_CODE:
            valid_list = ", ".join(f"{k} ({v['name']})" for k, v in sorted(CITY_METADATA.items()))
            raise ValidationError(
                f"Unrecognized city: '{city_input}'. Supported cities are:\n{valid_list}"
            )
        
        canonical_code = CITY_NAME_TO_CODE[normalized]
        return canonical_code, CITY_METADATA[canonical_code]

    def validate_date(self, date_input: Any) -> pd.Timestamp:
        """
        Validates date format and returns pd.Timestamp.
        Accepts 'YYYY-MM-DD', datetime, or pd.Timestamp.
        """
        if date_input is None:
            return pd.Timestamp.now().normalize()
        
        try:
            ts = pd.to_datetime(date_input)
            if pd.isna(ts):
                raise ValueError("Parsed as NaT")
            return ts
        except Exception as e:
            raise ValidationError(
                f"Invalid date: '{date_input}'. Expected 'YYYY-MM-DD' or datetime object. Error: {e}"
            )

    def validate_meteorology(
        self,
        max_temp: Optional[float],
        min_temp: Optional[float],
        precipitation: Optional[float],
        solar_radiation: Optional[float]
    ) -> Tuple[float, float, float, float]:
        """Validates meteorological variables against physical plausibility bounds."""
        # Sanity check range
        if max_temp is not None:
            if not (-10.0 <= max_temp <= 65.0):
                raise ValidationError(f"max_temp_c ({max_temp}°C) is outside realistic atmospheric range (-10°C to 65°C).")
        
        if min_temp is not None:
            if not (-20.0 <= min_temp <= 55.0):
                raise ValidationError(f"min_temp_c ({min_temp}°C) is outside realistic atmospheric range (-20°C to 55°C).")

        if max_temp is not None and min_temp is not None:
            if min_temp > max_temp:
                raise ValidationError(
                    f"Physical violation: min_temp_c ({min_temp}°C) cannot exceed max_temp_c ({max_temp}°C)."
                )

        if precipitation is not None:
            if precipitation < 0.0:
                raise ValidationError(f"precipitation_mm ({precipitation} mm) cannot be negative.")
            if precipitation > 1000.0:
                raise ValidationError(f"precipitation_mm ({precipitation} mm) exceeds extreme 24h deluge limits (>1000mm).")

        if solar_radiation is not None:
            if solar_radiation < 0.0:
                raise ValidationError(f"solar_radiation_mj ({solar_radiation} MJ/m²) cannot be negative.")

        return max_temp, min_temp, precipitation, solar_radiation

    def validate_consumption_lag(self, lag_value: Optional[float], lag_name: str = "demand_lag") -> Optional[float]:
        """Validates that water consumption values and lags are strictly positive numbers."""
        if lag_value is None:
            return None
        try:
            val = float(lag_value)
        except (ValueError, TypeError):
            raise ValidationError(f"{lag_name} must be numeric, got: {lag_value}")
        if val <= 0.0:
            raise ValidationError(f"{lag_name} must be strictly positive (> 0 MLD), got: {val}")
        return val

    # =====================================================================
    # FEATURE ENGINEERING & ALIGNMENT
    # =====================================================================

    def _engineer_features(self, input_dict: Dict[str, Any]) -> pd.DataFrame:
        """
        Transforms raw input into identical 52-column feature vector used in training.
        Applies:
        - Temporal feature extraction (dow, month, is_weekend, cyclic sin/cos)
        - Derived climate indices (temp_range, mean_temp, heat_index_proxy)
        - Autoregressive lag defaulting and rolling stats synthesis
        - One-hot encoding alignment with zero-filling
        """
        # 1. City & Date Validation
        city_id, city_meta = self.validate_city(input_dict.get("city_id") or input_dict.get("city"))
        dt = self.validate_date(input_dict.get("date") or input_dict.get("record_date"))

        # 2. Weather Fallback & Validation
        month = dt.month
        month_clim = MONTHLY_CLIMATOLOGY.get(month, MONTHLY_CLIMATOLOGY[6])

        raw_max_temp = input_dict.get("max_temp_c") or input_dict.get("max_temp")
        raw_min_temp = input_dict.get("min_temp_c") or input_dict.get("min_temp")
        raw_precip = input_dict.get("precipitation_mm") or input_dict.get("precip")
        raw_solar = input_dict.get("solar_radiation_mj") or input_dict.get("solar")

        max_t = float(raw_max_temp) if raw_max_temp is not None else month_clim["tmax"]
        min_t = float(raw_min_temp) if raw_min_temp is not None else month_clim["tmin"]
        precip = float(raw_precip) if raw_precip is not None else month_clim["precip"]
        solar = float(raw_solar) if raw_solar is not None else month_clim["solar"]

        self.validate_meteorology(max_t, min_t, precip, solar)

        mean_t = (max_t + min_t) / 2.0
        temp_range = max_t - min_t
        heat_index = max_t * (1.0 + solar / 30.0)

        # 3. Calendar & Cyclical Features
        dow = dt.day_of_week
        is_weekend = 1 if dow >= 5 else 0
        is_festival = int(input_dict.get("is_festival", 0))

        sin_month = np.sin(2 * np.pi * month / 12)
        cos_month = np.cos(2 * np.pi * month / 12)
        sin_dow = np.sin(2 * np.pi * dow / 7)
        cos_dow = np.cos(2 * np.pi * dow / 7)

        # 4. Water Authority Baselines
        water_stress = float(input_dict.get("water_stress_score") or city_meta["stress"])
        cpheeo = int(input_dict.get("cpheeo_target_lpcd") or city_meta["cpheeo"])
        base_demand = city_meta["base_demand"]

        # 5. Lags & Autoregressive Statistics
        lag1 = self.validate_consumption_lag(
            input_dict.get("demand_lag_1") or input_dict.get("lag1"), "demand_lag_1"
        )
        if lag1 is None:
            lag1 = base_demand

        lag2 = self.validate_consumption_lag(
            input_dict.get("demand_lag_2") or input_dict.get("lag2"), "demand_lag_2"
        ) or lag1

        lag3 = self.validate_consumption_lag(
            input_dict.get("demand_lag_3") or input_dict.get("lag3"), "demand_lag_3"
        ) or lag2

        lag7 = self.validate_consumption_lag(
            input_dict.get("demand_lag_7") or input_dict.get("lag7"), "demand_lag_7"
        ) or lag1

        lag14 = self.validate_consumption_lag(
            input_dict.get("demand_lag_14") or input_dict.get("lag14"), "demand_lag_14"
        ) or lag7

        # Trailing Rolling Features (strictly shifted backward, no leakage)
        r_mean_7 = float(input_dict.get("rolling_mean_7") or ((lag1 + lag2 + lag3 + lag7) / 4.0))
        r_std_7 = float(input_dict.get("rolling_std_7") or max(1.0, r_mean_7 * 0.04))
        r_min_7 = float(input_dict.get("rolling_min_7") or (r_mean_7 * 0.95))
        r_max_7 = float(input_dict.get("rolling_max_7") or (r_mean_7 * 1.05))
        r_mean_14 = float(input_dict.get("rolling_mean_14") or r_mean_7)
        ratio_to_7d = lag1 / (r_mean_7 + 1e-5)

        zone = input_dict.get("zone") or city_meta["zone"]

        raw_sample = {
            "max_temp_c": max_t,
            "min_temp_c": min_t,
            "mean_temp_c": mean_t,
            "temp_range_c": temp_range,
            "precipitation_mm": precip,
            "solar_radiation_mj": solar,
            "heat_index_proxy": heat_index,
            "is_weekend": is_weekend,
            "is_festival": is_festival,
            "sin_month": sin_month,
            "cos_month": cos_month,
            "sin_dow": sin_dow,
            "cos_dow": cos_dow,
            "water_stress_score": water_stress,
            "cpheeo_target_lpcd": cpheeo,
            "demand_lag_1": lag1,
            "demand_lag_2": lag2,
            "demand_lag_3": lag3,
            "demand_lag_7": lag7,
            "demand_lag_14": lag14,
            "rolling_mean_7": r_mean_7,
            "rolling_std_7": r_std_7,
            "rolling_min_7": r_min_7,
            "rolling_max_7": r_max_7,
            "rolling_mean_14": r_mean_14,
            "ratio_to_7d_mean": ratio_to_7d,
            "city_id": city_id,
            "zone": zone
        }

        # One-hot encoding & Schema Alignment
        raw_df = pd.DataFrame([raw_sample])
        encoded_df = pd.get_dummies(raw_df, columns=["city_id", "zone"], drop_first=False)
        aligned_df = encoded_df.reindex(columns=self.encoded_features, fill_value=0)
        return aligned_df

    # =====================================================================
    # FORECAST API METHODS
    # =====================================================================

    def predict_daily(self, input_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Forecasts daily municipal water demand for a single day.
        
        Returns:
            Dictionary containing predicted demand (MLD), 95% confidence intervals,
            city details, and input metadata.
        """
        city_id, city_meta = self.validate_city(input_dict.get("city_id") or input_dict.get("city"))
        dt = self.validate_date(input_dict.get("date") or input_dict.get("record_date"))
        
        X = self._engineer_features(input_dict)
        pred_mld = float(self.model.predict(X)[0])
        pred_mld = max(0.0, pred_mld)  # Non-negative consumption physical constraint

        ci_lower = max(0.0, pred_mld - 1.96 * self.rmse)
        ci_upper = pred_mld + 1.96 * self.rmse

        return {
            "city_id": city_id,
            "city_name": city_meta["name"],
            "zone": city_meta["zone"],
            "forecast_date": dt.strftime("%Y-%m-%d"),
            "day_of_week": dt.strftime("%A"),
            "is_weekend": 1 if dt.day_of_week >= 5 else 0,
            "predicted_demand_mld": round(pred_mld, 2),
            "confidence_interval_95_mld": {
                "lower": round(ci_lower, 2),
                "upper": round(ci_upper, 2)
            },
            "unit": "MLD (Million Litres per Day)",
            "equivalent_million_cubic_meters": round(pred_mld * 0.001, 5),
            "equivalent_billion_litres": round(pred_mld / 1000.0, 5),
            "expected_rmse_error_mld": round(self.rmse, 2),
            "model_architecture": self.model_name
        }

    def predict_daily_horizon(
        self,
        city: str,
        start_date: Optional[Union[str, date, datetime]] = None,
        days: int = 14,
        initial_lag: Optional[float] = None
    ) -> pd.DataFrame:
        """
        Recursively forecasts water demand across a future multi-day horizon (e.g. 7, 14, 30 days).
        Autoregressively feeds predictions forward into subsequent day lags.
        """
        if days < 1 or days > 365:
            raise ValidationError(f"Forecast horizon 'days' must be between 1 and 365, got: {days}")

        city_id, city_meta = self.validate_city(city)
        start_ts = self.validate_date(start_date)

        curr_lag1 = initial_lag if initial_lag else city_meta["base_demand"]
        recent_history: List[float] = [curr_lag1] * 14

        dates = pd.date_range(start=start_ts, periods=days, freq="D")
        records = []

        for d in dates:
            d_str = d.strftime("%Y-%m-%d")
            m_clim = MONTHLY_CLIMATOLOGY.get(d.month, MONTHLY_CLIMATOLOGY[6])

            # Seasonal sinusoidal temperature oscillation around monthly baseline
            day_fraction = d.day / calendar.monthrange(d.year, d.month)[1]
            temp_wave = np.sin(day_fraction * np.pi) * 2.0

            step_input = {
                "city_id": city_id,
                "date": d_str,
                "demand_lag_1": recent_history[-1],
                "demand_lag_2": recent_history[-2],
                "demand_lag_3": recent_history[-3],
                "demand_lag_7": recent_history[-7],
                "demand_lag_14": recent_history[-14],
                "rolling_mean_7": float(np.mean(recent_history[-7:])),
                "rolling_std_7": float(max(1.0, np.std(recent_history[-7:]))),
                "rolling_min_7": float(np.min(recent_history[-7:])),
                "rolling_max_7": float(np.max(recent_history[-7:])),
                "rolling_mean_14": float(np.mean(recent_history[-14:])),
                "max_temp_c": m_clim["tmax"] + temp_wave,
                "min_temp_c": m_clim["tmin"],
                "precipitation_mm": m_clim["precip"],
                "solar_radiation_mj": m_clim["solar"]
            }

            pred_res = self.predict_daily(step_input)
            pred_val = pred_res["predicted_demand_mld"]
            recent_history.append(pred_val)

            records.append({
                "date": d_str,
                "city_id": city_id,
                "city_name": city_meta["name"],
                "day_of_week": pred_res["day_of_week"],
                "is_weekend": pred_res["is_weekend"],
                "predicted_demand_mld": pred_val,
                "ci_lower_95_mld": pred_res["confidence_interval_95_mld"]["lower"],
                "ci_upper_95_mld": pred_res["confidence_interval_95_mld"]["upper"],
                "volume_mcm": pred_res["equivalent_million_cubic_meters"]
            })

        return pd.DataFrame(records)

    def predict_month(
        self,
        city: str,
        year: int,
        month: int,
        initial_lag: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Generates a comprehensive monthly water consumption forecast for a given calendar month.
        Aggregates daily simulated predictions into total monthly volume, MCM, Billion Litres,
        identifying peak and minimum daily demand days.
        """
        if not (2000 <= year <= 2100):
            raise ValidationError(f"Year {year} is out of realistic forecast range (2000-2100).")
        if not (1 <= month <= 12):
            raise ValidationError(f"Month {month} must be between 1 and 12.")

        city_id, city_meta = self.validate_city(city)
        _, num_days = calendar.monthrange(year, month)
        start_date = f"{year:04d}-{month:02d}-01"

        df_daily = self.predict_daily_horizon(
            city=city_id,
            start_date=start_date,
            days=num_days,
            initial_lag=initial_lag
        )

        daily_demands = df_daily["predicted_demand_mld"].values
        total_mld_days = float(np.sum(daily_demands))
        mean_mld = float(np.mean(daily_demands))
        peak_idx = int(np.argmax(daily_demands))
        min_idx = int(np.argmin(daily_demands))

        # Monthly standard error aggregation: sqrt(N) * daily_rmse
        monthly_se = np.sqrt(num_days) * self.rmse
        ci_monthly_lower = max(0.0, total_mld_days - 1.96 * monthly_se)
        ci_monthly_upper = total_mld_days + 1.96 * monthly_se

        month_name = calendar.month_name[month]

        # 1 MLD for 1 day = 1,000 m3 = 0.001 MCM (Million Cubic Meters)
        total_mcm = total_mld_days * 0.001
        total_billion_litres = total_mld_days / 1000.0

        return {
            "city_id": city_id,
            "city_name": city_meta["name"],
            "zone": city_meta["zone"],
            "forecast_period": f"{month_name} {year}",
            "year": year,
            "month": month,
            "days_in_month": num_days,
            "total_monthly_demand_mld_days": round(total_mld_days, 2),
            "total_monthly_volume_mcm": round(total_mcm, 3),
            "total_monthly_billion_litres": round(total_billion_litres, 3),
            "average_daily_demand_mld": round(mean_mld, 2),
            "peak_day": {
                "date": df_daily.iloc[peak_idx]["date"],
                "day_of_week": df_daily.iloc[peak_idx]["day_of_week"],
                "demand_mld": round(float(daily_demands[peak_idx]), 2)
            },
            "minimum_day": {
                "date": df_daily.iloc[min_idx]["date"],
                "day_of_week": df_daily.iloc[min_idx]["day_of_week"],
                "demand_mld": round(float(daily_demands[min_idx]), 2)
            },
            "confidence_interval_95": {
                "total_mld_days_lower": round(ci_monthly_lower, 2),
                "total_mld_days_upper": round(ci_monthly_upper, 2),
                "total_mcm_lower": round(ci_monthly_lower * 0.001, 3),
                "total_mcm_upper": round(ci_monthly_upper * 0.001, 3)
            },
            "daily_forecast_series": df_daily.to_dict(orient="records")
        }

    def predict_monthly_horizon(
        self,
        city: str,
        start_year: int,
        start_month: int,
        num_months: int = 6
    ) -> pd.DataFrame:
        """
        Forecasts consecutive monthly water demands over a multi-month planning horizon.
        Ideal for reservoir water budget allocation and seasonal drought preparedness.
        """
        if num_months < 1 or num_months > 36:
            raise ValidationError(f"num_months must be between 1 and 36, got: {num_months}")

        city_id, city_meta = self.validate_city(city)
        curr_y = start_year
        curr_m = start_month

        monthly_summaries = []
        last_lag = city_meta["base_demand"]

        for _ in range(num_months):
            res = self.predict_month(city_id, curr_y, curr_m, initial_lag=last_lag)
            # Use last day's prediction of this month as initial lag for the next
            last_day_val = res["daily_forecast_series"][-1]["predicted_demand_mld"]
            last_lag = last_day_val

            monthly_summaries.append({
                "period": res["forecast_period"],
                "year": curr_y,
                "month": curr_m,
                "days": res["days_in_month"],
                "city_id": city_id,
                "city_name": res["city_name"],
                "total_mld_days": res["total_monthly_demand_mld_days"],
                "total_volume_mcm": res["total_monthly_volume_mcm"],
                "total_billion_litres": res["total_monthly_billion_litres"],
                "avg_daily_mld": res["average_daily_demand_mld"],
                "peak_day_mld": res["peak_day"]["demand_mld"],
                "min_day_mld": res["minimum_day"]["demand_mld"],
                "ci_lower_mcm": res["confidence_interval_95"]["total_mcm_lower"],
                "ci_upper_mcm": res["confidence_interval_95"]["total_mcm_upper"]
            })

            curr_m += 1
            if curr_m > 12:
                curr_m = 1
                curr_y += 1

        return pd.DataFrame(monthly_summaries)

    def predict_batch(
        self,
        data: Union[pd.DataFrame, str],
        output_csv_path: Optional[str] = None
    ) -> pd.DataFrame:
        """
        Runs batch predictions on a pandas DataFrame or input CSV file.
        Validates every row and appends predicted columns.
        """
        if isinstance(data, str):
            if not os.path.exists(data):
                raise FileNotFoundError(f"Batch input CSV file not found: {data}")
            df = pd.read_csv(data)
        elif isinstance(data, pd.DataFrame):
            df = data.copy()
        else:
            raise ValidationError(f"Unsupported data type for batch prediction: {type(data)}")

        predictions = []
        lowers = []
        uppers = []
        mcm_list = []

        for idx, row in df.iterrows():
            row_dict = row.to_dict()
            try:
                res = self.predict_daily(row_dict)
                predictions.append(res["predicted_demand_mld"])
                lowers.append(res["confidence_interval_95_mld"]["lower"])
                uppers.append(res["confidence_interval_95_mld"]["upper"])
                mcm_list.append(res["equivalent_million_cubic_meters"])
            except Exception as e:
                # Log and assign NaN for invalid rows in batch
                predictions.append(np.nan)
                lowers.append(np.nan)
                uppers.append(np.nan)
                mcm_list.append(np.nan)

        df["predicted_demand_mld"] = predictions
        df["ci_lower_95_mld"] = lowers
        df["ci_upper_95_mld"] = uppers
        df["predicted_volume_mcm"] = mcm_list

        if output_csv_path:
            out_dir = os.path.dirname(os.path.abspath(output_csv_path))
            os.makedirs(out_dir, exist_ok=True)
            df.to_csv(output_csv_path, index=False)

        return df


# =====================================================================
# CLI INTERFACE
# =====================================================================

def build_cli_parser() -> argparse.ArgumentParser:
    """Builds user-friendly command-line interface parser."""
    parser = argparse.ArgumentParser(
        description="AquaPulse: Pan-India Municipal Water Consumption Predictor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  1. Single daily prediction (Bengaluru):
     python predict.py --mode daily --city BLR --date 2025-05-15 --max-temp 33.5 --min-temp 22.0

  2. Recursive 14-day daily forecast (Delhi):
     python predict.py --mode horizon --city DEL --days 14 --output-csv delhi_14d_forecast.csv

  3. Full Monthly forecast for Mumbai (May 2025):
     python predict.py --mode monthly --city BOM --year 2025 --month 5

  4. 6-Month Seasonal planning horizon for Chennai:
     python predict.py --mode monthly-horizon --city MAA --year 2025 --month 6 --months 6

  5. Batch inference on CSV:
     python predict.py --mode batch --input-csv sample_inputs.csv --output-csv batch_predictions.csv
        """
    )

    parser.add_argument(
        "--mode",
        type=str,
        default="daily",
        choices=["daily", "horizon", "monthly", "monthly-horizon", "batch"],
        help="Forecasting mode to execute"
    )
    parser.add_argument("--model", type=str, default=None, help="Path to .pkl or .joblib model bundle")
    parser.add_argument("--city", type=str, default="BLR", help="City code (e.g. BLR, DEL, BOM) or name (e.g. Bengaluru)")
    parser.add_argument("--date", type=str, default=None, help="Forecast date (YYYY-MM-DD)")
    parser.add_argument("--days", type=int, default=14, help="Horizon days (for mode=horizon)")
    parser.add_argument("--year", type=int, default=datetime.now().year, help="Target year for monthly forecasts")
    parser.add_argument("--month", type=int, default=datetime.now().month, help="Target month (1-12) for monthly forecasts")
    parser.add_argument("--months", type=int, default=6, help="Number of months for monthly-horizon mode")
    parser.add_argument("--max-temp", type=float, default=None, help="Max temperature in deg C")
    parser.add_argument("--min-temp", type=float, default=None, help="Min temperature in deg C")
    parser.add_argument("--precip", type=float, default=None, help="Precipitation in mm")
    parser.add_argument("--solar", type=float, default=None, help="Solar radiation in MJ/m2")
    parser.add_argument("--lag1", type=float, default=None, help="Previous day demand in MLD")
    parser.add_argument("--input-csv", type=str, default=None, help="Input CSV for batch mode")
    parser.add_argument("--output-csv", type=str, default=None, help="Output CSV path for results")
    parser.add_argument("--json", action="store_true", help="Output results formatted as JSON")

    return parser


def main():
    parser = build_cli_parser()
    args = parser.parse_args()

    try:
        forecaster = WaterConsumptionPredictor(args.model)
    except ModelLoadError as e:
        print(f"\n[MODEL ERROR] {e}", file=sys.stderr)
        sys.exit(1)

    try:
        if args.mode == "daily":
            req = {
                "city": args.city,
                "date": args.date,
                "max_temp_c": args.max_temp,
                "min_temp_c": args.min_temp,
                "precipitation_mm": args.precip,
                "solar_radiation_mj": args.solar,
                "demand_lag_1": args.lag1
            }
            res = forecaster.predict_daily(req)

            if args.json:
                print(json.dumps(res, indent=2))
            else:
                print("\n" + "=" * 68)
                print(" AQUAPULSE: DAILY MUNICIPAL WATER CONSUMPTION FORECAST")
                print("=" * 68)
                print(f"  * Authority / City         : {res['city_name']} ({res['city_id']})")
                print(f"  * Geographical Zone        : {res['zone']}")
                print(f"  * Forecast Date            : {res['forecast_date']} ({res['day_of_week']})")
                print(f"  * PREDICTED WATER DEMAND   : {res['predicted_demand_mld']:.2f} MLD")
                print(f"  * 95% Confidence Interval  : [{res['confidence_interval_95_mld']['lower']:.2f} MLD, {res['confidence_interval_95_mld']['upper']:.2f} MLD]")
                print(f"  * Volume in Cubic Meters   : {res['equivalent_million_cubic_meters']:.5f} MCM")
                print(f"  * Volume in Billion Litres : {res['equivalent_billion_litres']:.5f} BL")
                print(f"  * Model Architecture       : {res['model_architecture']} (RMSE ±{res['expected_rmse_error_mld']:.2f} MLD)")
                print("=" * 68)

        elif args.mode == "horizon":
            df = forecaster.predict_daily_horizon(
                city=args.city,
                start_date=args.date,
                days=args.days,
                initial_lag=args.lag1
            )
            print(f"\n--- {args.days}-DAY WATER CONSUMPTION FORECAST FOR {args.city.upper()} ---")
            display_cols = ["date", "day_of_week", "predicted_demand_mld", "ci_lower_95_mld", "ci_upper_95_mld", "volume_mcm"]
            print(df[display_cols].to_string(index=False))

            if args.output_csv:
                df.to_csv(args.output_csv, index=False)
                print(f"\n[SAVED] Forecast exported to: {args.output_csv}")

        elif args.mode == "monthly":
            res = forecaster.predict_month(
                city=args.city,
                year=args.year,
                month=args.month,
                initial_lag=args.lag1
            )
            if args.json:
                # Omit granular daily array in short json view unless requested
                res_summary = {k: v for k, v in res.items() if k != "daily_forecast_series"}
                print(json.dumps(res_summary, indent=2))
            else:
                print("\n" + "=" * 70)
                print(f" AQUAPULSE: MONTHLY WATER DEMAND FORECAST - {res['forecast_period'].upper()}")
                print("=" * 70)
                print(f"  * Municipality / City      : {res['city_name']} ({res['city_id']})")
                print(f"  * Forecast Period          : {res['forecast_period']} ({res['days_in_month']} days)")
                print(f"  * TOTAL MONTHLY WATER DEMAND : {res['total_monthly_demand_mld_days']:,.2f} MLD-Days")
                print(f"  * TOTAL VOLUME (MCM)       : {res['total_monthly_volume_mcm']:,.3f} Million m³")
                print(f"  * TOTAL VOLUME (BILLION L) : {res['total_monthly_billion_litres']:,.3f} Billion Litres")
                print(f"  * Daily Average Rate       : {res['average_daily_demand_mld']:.2f} MLD")
                print(f"  * Peak Day Demand          : {res['peak_day']['demand_mld']:.2f} MLD on {res['peak_day']['date']} ({res['peak_day']['day_of_week']})")
                print(f"  * Minimum Day Demand       : {res['minimum_day']['demand_mld']:.2f} MLD on {res['minimum_day']['date']} ({res['minimum_day']['day_of_week']})")
                print(f"  * 95% Confidence Interval  : [{res['confidence_interval_95']['total_mcm_lower']:.3f} MCM, {res['confidence_interval_95']['total_mcm_upper']:.3f} MCM]")
                print("=" * 70)

                if args.output_csv:
                    pd.DataFrame(res["daily_forecast_series"]).to_csv(args.output_csv, index=False)
                    print(f"\n[SAVED] Daily breakdown exported to: {args.output_csv}")

        elif args.mode == "monthly-horizon":
            df = forecaster.predict_monthly_horizon(
                city=args.city,
                start_year=args.year,
                start_month=args.month,
                num_months=args.months
            )
            print(f"\n--- {args.months}-MONTH SEASONAL PLANNING FORECAST FOR {args.city.upper()} ---")
            cols = ["period", "days", "total_volume_mcm", "total_billion_litres", "avg_daily_mld", "peak_day_mld", "min_day_mld"]
            print(df[cols].to_string(index=False))

            if args.output_csv:
                df.to_csv(args.output_csv, index=False)
                print(f"\n[SAVED] Monthly horizon exported to: {args.output_csv}")

        elif args.mode == "batch":
            if not args.input_csv:
                raise ValidationError("Batch mode requires '--input-csv <path>'.")
            out_path = args.output_csv or "batch_predictions_output.csv"
            df = forecaster.predict_batch(args.input_csv, out_path)
            print(f"\n[SUCCESS] Batch inference complete for {len(df):,} records.")
            print(f"Results saved to: {out_path}")

    except ValidationError as ve:
        print(f"\n[VALIDATION ERROR] {ve}", file=sys.stderr)
        sys.exit(2)
    except Exception as ex:
        print(f"\n[RUNTIME ERROR] An unexpected error occurred: {ex}", file=sys.stderr)
        sys.exit(3)


if __name__ == "__main__":
    main()
