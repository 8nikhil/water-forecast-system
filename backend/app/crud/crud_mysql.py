"""
CRUD Operations for MySQL Municipal Water Telemetry, Weather, Predictions, and Dataset Sync.
"""

from __future__ import annotations

import os
import uuid
import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from ..models.mysql_tables import (
    MunicipalCity,
    HistoricalConsumption,
    WeatherTelemetry,
    PredictionResult
)
from ..models.user import User


class CRUDMySQL:
    """Enterprise CRUD manager for MySQL water telemetry and predictions."""

    # =====================================================================
    # MUNICIPAL CITIES
    # =====================================================================
    @staticmethod
    def get_cities(db: Session) -> List[MunicipalCity]:
        return db.query(MunicipalCity).order_by(MunicipalCity.base_demand_mld.desc()).all()

    @staticmethod
    def get_city_by_id(db: Session, city_id: str) -> Optional[MunicipalCity]:
        return db.query(MunicipalCity).filter(MunicipalCity.city_id == city_id.upper()).first()

    @staticmethod
    def upsert_city(db: Session, city_dict: Dict[str, Any]) -> MunicipalCity:
        cid = city_dict["city_id"].upper()
        city = db.query(MunicipalCity).filter(MunicipalCity.city_id == cid).first()
        if not city:
            city = MunicipalCity(
                city_id=cid,
                city_name=city_dict["name"],
                zone=city_dict["zone"],
                water_stress_score=city_dict.get("stress", 100.0),
                cpheeo_target_lpcd=city_dict.get("cpheeo", 135),
                base_demand_mld=city_dict["base_demand"],
                mean_max_temp_c=city_dict.get("tmax_mean"),
                mean_min_temp_c=city_dict.get("tmin_mean")
            )
            db.add(city)
        else:
            city.city_name = city_dict.get("name", city.city_name)
            city.base_demand_mld = city_dict.get("base_demand", city.base_demand_mld)
        db.commit()
        db.refresh(city)
        return city

    # =====================================================================
    # HISTORICAL WATER CONSUMPTION & WEATHER
    # =====================================================================
    @staticmethod
    def create_telemetry_entry(
        db: Session,
        city_id: str,
        record_date: datetime.date,
        consumption_data: Dict[str, Any],
        weather_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Creates or updates historical consumption and weather records atomically."""
        cid = city_id.upper()
        
        # Ensure city exists
        city = db.query(MunicipalCity).filter(MunicipalCity.city_id == cid).first()
        if not city:
            raise ValueError(f"City '{cid}' does not exist in municipal_cities registry.")

        # Upsert Historical Consumption
        hist = db.query(HistoricalConsumption).filter(
            HistoricalConsumption.city_id == cid,
            HistoricalConsumption.record_date == record_date
        ).first()

        if not hist:
            hist = HistoricalConsumption(
                city_id=cid,
                record_date=record_date,
                actual_demand_mld=consumption_data["actual_demand_mld"],
                billed_consumption_mld=consumption_data.get("billed_consumption_mld"),
                bulk_supply_mld=consumption_data.get("bulk_supply_mld"),
                nrw_loss_mld=consumption_data.get("nrw_loss_mld"),
                nrw_ratio_pct=consumption_data.get("nrw_ratio_pct"),
                revenue_collection_cr=consumption_data.get("revenue_collection_cr"),
                is_weekend=consumption_data.get("is_weekend", 0),
                is_festival=consumption_data.get("is_festival", 0)
            )
            db.add(hist)
        else:
            hist.actual_demand_mld = consumption_data["actual_demand_mld"]
            hist.billed_consumption_mld = consumption_data.get("billed_consumption_mld", hist.billed_consumption_mld)
            hist.bulk_supply_mld = consumption_data.get("bulk_supply_mld", hist.bulk_supply_mld)
            hist.nrw_loss_mld = consumption_data.get("nrw_loss_mld", hist.nrw_loss_mld)

        # Upsert Weather Telemetry
        weather = db.query(WeatherTelemetry).filter(
            WeatherTelemetry.city_id == cid,
            WeatherTelemetry.record_date == record_date
        ).first()

        if not weather:
            weather = WeatherTelemetry(
                city_id=cid,
                record_date=record_date,
                max_temp_c=weather_data["max_temp_c"],
                min_temp_c=weather_data["min_temp_c"],
                mean_temp_c=weather_data.get("mean_temp_c", (weather_data["max_temp_c"] + weather_data["min_temp_c"]) / 2.0),
                temp_range_c=weather_data.get("temp_range_c", weather_data["max_temp_c"] - weather_data["min_temp_c"]),
                precipitation_mm=weather_data.get("precipitation_mm", 0.0),
                solar_radiation_mj=weather_data.get("solar_radiation_mj", 20.0),
                heat_index_proxy=weather_data.get("heat_index_proxy")
            )
            db.add(weather)
        else:
            weather.max_temp_c = weather_data["max_temp_c"]
            weather.min_temp_c = weather_data["min_temp_c"]
            weather.precipitation_mm = weather_data.get("precipitation_mm", weather.precipitation_mm)

        db.commit()
        db.refresh(hist)
        db.refresh(weather)

        return {
            "city_id": cid,
            "record_date": str(record_date),
            "actual_demand_mld": hist.actual_demand_mld,
            "max_temp_c": weather.max_temp_c,
            "min_temp_c": weather.min_temp_c,
            "precipitation_mm": weather.precipitation_mm
        }

    @staticmethod
    def get_historical_records(
        db: Session,
        city_id: Optional[str] = None,
        start_date: Optional[datetime.date] = None,
        end_date: Optional[datetime.date] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[HistoricalConsumption]:
        query = db.query(HistoricalConsumption)
        if city_id:
            query = query.filter(HistoricalConsumption.city_id == city_id.upper())
        if start_date:
            query = query.filter(HistoricalConsumption.record_date >= start_date)
        if end_date:
            query = query.filter(HistoricalConsumption.record_date <= end_date)
        
        return query.order_by(desc(HistoricalConsumption.record_date)).offset(skip).limit(limit).all()

    # =====================================================================
    # PREDICTIONS LOGGING
    # =====================================================================
    @staticmethod
    def log_prediction_result(
        db: Session,
        prediction_payload: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> PredictionResult:
        """Stores machine learning inference results for audits and compliance."""
        pred_uuid = prediction_payload.get("prediction_uuid") or f"PRED-{uuid.uuid4().hex[:12].upper()}"
        
        record = PredictionResult(
            prediction_uuid=pred_uuid,
            city_id=prediction_payload["city_id"].upper(),
            forecast_date=pd.to_datetime(prediction_payload["forecast_date"]).date(),
            forecast_type=prediction_payload.get("forecast_type", "daily"),
            horizon_days=prediction_payload.get("horizon_days", 1),
            predicted_demand_mld=prediction_payload["predicted_demand_mld"],
            ci_lower_95_mld=prediction_payload["confidence_interval_95_mld"]["lower"],
            ci_upper_95_mld=prediction_payload["confidence_interval_95_mld"]["upper"],
            volume_mcm=prediction_payload.get("equivalent_million_cubic_meters", prediction_payload["predicted_demand_mld"] * 0.001),
            model_architecture=prediction_payload.get("model_architecture", "RandomForestRegressor"),
            expected_rmse_error_mld=prediction_payload.get("expected_rmse_error_mld", 40.47),
            input_parameters_json=str(prediction_payload.get("input_parameters", {})),
            created_by_user_id=user_id
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_prediction_history(
        db: Session,
        city_id: Optional[str] = None,
        limit: int = 20
    ) -> List[PredictionResult]:
        query = db.query(PredictionResult)
        if city_id:
            query = query.filter(PredictionResult.city_id == city_id.upper())
        return query.order_by(desc(PredictionResult.created_at)).limit(limit).all()

    # =====================================================================
    # DATASET SYNC FROM CSV INTO MYSQL
    # =====================================================================
    @staticmethod
    def sync_dataset_csv_to_mysql(db: Session, csv_path: str, max_rows: Optional[int] = None) -> Dict[str, Any]:
        """
        Reads pan-india municipal water dataset CSV and bulk ingests records into MySQL.
        Preserves data integrity by avoiding duplicates.
        """
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"Dataset CSV not found at: {csv_path}")

        df = pd.read_csv(csv_path)
        if max_rows:
            df = df.iloc[:max_rows]

        # 1. Seed Cities first
        from predict import CITY_METADATA
        for code, meta in CITY_METADATA.items():
            CRUDMySQL.upsert_city(db, {"city_id": code, **meta})

        inserted_hist = 0
        inserted_weather = 0

        # Existing date keys in DB to avoid duplicates
        existing_hist_keys = set(
            db.query(HistoricalConsumption.city_id, HistoricalConsumption.record_date).all()
        )
        existing_weather_keys = set(
            db.query(WeatherTelemetry.city_id, WeatherTelemetry.record_date).all()
        )

        hist_batch = []
        weather_batch = []

        for _, row in df.iterrows():
            cid = str(row["city_id"]).upper()
            r_date = pd.to_datetime(row["record_date"]).date()
            key = (cid, r_date)

            if key not in existing_hist_keys:
                hist_batch.append(HistoricalConsumption(
                    city_id=cid,
                    record_date=r_date,
                    actual_demand_mld=float(row["actual_demand_mld"]),
                    billed_consumption_mld=float(row.get("billed_consumption_mld", 0.0)) if "billed_consumption_mld" in row else None,
                    bulk_supply_mld=float(row.get("bulk_supply_mld", 0.0)) if "bulk_supply_mld" in row else None,
                    nrw_loss_mld=float(row.get("nrw_loss_mld", 0.0)) if "nrw_loss_mld" in row else None,
                    nrw_ratio_pct=float(row.get("nrw_ratio_pct", 0.0)) if "nrw_ratio_pct" in row else None,
                    revenue_collection_cr=float(row.get("revenue_collection_cr", 0.0)) if "revenue_collection_cr" in row else None,
                    is_weekend=int(row.get("is_weekend", 0)),
                    is_festival=int(row.get("is_festival", 0))
                ))
                existing_hist_keys.add(key)
                inserted_hist += 1

            if key not in existing_weather_keys:
                weather_batch.append(WeatherTelemetry(
                    city_id=cid,
                    record_date=r_date,
                    max_temp_c=float(row.get("max_temp_c", 30.0)),
                    min_temp_c=float(row.get("min_temp_c", 20.0)),
                    mean_temp_c=float(row.get("mean_temp_c", 25.0)),
                    temp_range_c=float(row.get("temp_range_c", 10.0)),
                    precipitation_mm=float(row.get("precipitation_mm", 0.0)),
                    solar_radiation_mj=float(row.get("solar_radiation_mj", 20.0)),
                    heat_index_proxy=float(row.get("heat_index_proxy", 30.0))
                ))
                existing_weather_keys.add(key)
                inserted_weather += 1

            # Commit in chunks of 500 for high performance
            if len(hist_batch) >= 500:
                db.bulk_save_objects(hist_batch)
                hist_batch.clear()
            if len(weather_batch) >= 500:
                db.bulk_save_objects(weather_batch)
                weather_batch.clear()

        if hist_batch:
            db.bulk_save_objects(hist_batch)
        if weather_batch:
            db.bulk_save_objects(weather_batch)

        db.commit()

        return {
            "status": "success",
            "total_csv_rows": len(df),
            "historical_records_inserted": inserted_hist,
            "weather_records_inserted": inserted_weather
        }

