import os
import math
import random
import datetime
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models.user import User
from .models.household import Household
from .models.meter import SmartMeter
from .models.reading import WaterReading
from .models.anomaly import AnomalyEvent
from .models.recommendation import Recommendation
from .models.community import CommunityBenchmark
from .models.forecast import ForecastRun
from .auth.security import hash_password
from .ml.forecasting import WaterForecastingPipeline
from .config import settings

def seed_database():
    print("[Seed] Creating database tables if not exist...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        existing_admin = db.query(User).filter(User.email == "admin@aquapulse.io").first()
        if existing_admin:
            print("[Seed] Database already seeded. Skipping initial seed.")
            return

        print("[Seed] Populating Community Benchmarks...")
        benchmarks_data = [
            {"district": "Green Valley District", "occupants": 1, "avg": 160.0, "eff": 110.0, "high": 240.0},
            {"district": "Green Valley District", "occupants": 2, "avg": 290.0, "eff": 200.0, "high": 420.0},
            {"district": "Green Valley District", "occupants": 3, "avg": 420.0, "eff": 285.0, "high": 590.0},
            {"district": "Green Valley District", "occupants": 4, "avg": 540.0, "eff": 370.0, "high": 760.0},
            {"district": "Green Valley District", "occupants": 5, "avg": 660.0, "eff": 460.0, "high": 920.0},
        ]
        for b in benchmarks_data:
            bm = CommunityBenchmark(
                district=b["district"],
                occupants=b["occupants"],
                average_daily_liters=b["avg"],
                efficient_daily_liters=b["eff"],
                high_use_daily_liters=b["high"],
                sample_size=480,
                district_target_reduction_pct=15.0,
                district_current_reduction_pct=11.2
            )
            db.add(bm)

        print("[Seed] Populating Households...")
        # Main Demo Resident Household
        hh1 = Household(
            name="Elena Rostova's Residence",
            address="124 Pine Crest Way",
            district="Green Valley District",
            occupants=3,
            property_type="Single-Family Home",
            has_garden=True,
            has_pool=False,
            daily_budget_liters=450.0
        )
        # Neighborhood peer 1
        hh2 = Household(
            name="The Harrison Residence",
            address="128 Pine Crest Way",
            district="Green Valley District",
            occupants=4,
            property_type="Single-Family Home",
            has_garden=True,
            daily_budget_liters=550.0
        )
        # Neighborhood peer 2
        hh3 = Household(
            name="The Chen Residence",
            address="132 Pine Crest Way",
            district="Green Valley District",
            occupants=2,
            property_type="Townhouse",
            has_garden=False,
            daily_budget_liters=280.0
        )
        db.add_all([hh1, hh2, hh3])
        db.flush()

        print("[Seed] Populating Users...")
        resident_user = User(
            email="resident@aquapulse.io",
            hashed_password=hash_password("password123"),
            full_name="Elena Rostova",
            role="resident",
            household_id=hh1.id,
            is_active=True
        )
        admin_user = User(
            email="admin@aquapulse.io",
            hashed_password=hash_password("password123"),
            full_name="Director Marcus Vance",
            role="utility_admin",
            household_id=hh1.id,
            is_active=True
        )
        db.add_all([resident_user, admin_user])
        db.flush()

        print("[Seed] Populating Smart Meters...")
        m1 = SmartMeter(
            serial_number="MTR-0001-ELE",
            household_id=hh1.id,
            meter_model="AquaSense Ultrasonic-500",
            firmware_version="v3.4.1",
            status="online",
            battery_level_pct=96.4,
            signal_strength_dbm=-65.0
        )
        m2 = SmartMeter(
            serial_number="MTR-0002-HAR",
            household_id=hh2.id,
            meter_model="AquaSense Ultrasonic-500",
            status="online",
            battery_level_pct=91.0,
            signal_strength_dbm=-71.0
        )
        m3 = SmartMeter(
            serial_number="MTR-0003-CHE",
            household_id=hh3.id,
            meter_model="AquaSense Ultrasonic-400",
            status="online",
            battery_level_pct=88.5,
            signal_strength_dbm=-69.0
        )
        db.add_all([m1, m2, m3])
        db.flush()

        print("[Seed] Synthesizing 90 days of realistic hourly water telemetry for Elena's household...")
        np.random.seed(42)
        random.seed(42)

        now = datetime.datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        start_time = now - datetime.timedelta(days=90)
        current_time = start_time

        readings_batch = []
        cumulative_m3 = 142.500

        # Typical diurnal shape factors for 24 hours
        # Night lull (0-5), Morning Peak (6-9), Midday (10-16), Evening Peak (17-21), Late Night (22-23)
        diurnal_factors = [
            0.05, 0.02, 0.01, 0.02, 0.04, 0.15, # 00-05
            0.75, 1.45, 1.35, 0.90,              # 06-09
            0.55, 0.50, 0.65, 0.45, 0.40, 0.50, 0.60, # 10-16
            1.20, 1.40, 1.30, 0.95, 0.70,        # 17-21
            0.35, 0.15                          # 22-23
        ]

        total_hours = 90 * 24
        hour_counter = 0

        while current_time <= now:
            hour = current_time.hour
            is_weekend = current_time.weekday() in [5, 6]
            day_of_year = current_time.timetuple().tm_yday
            
            # Seasonal temperature: base 22°C + sinusoidal wave
            ambient_temp = 22.0 + 7.0 * math.sin(2 * math.pi * (day_of_year - 80) / 365) + np.random.normal(0, 1.0)
            
            # Base flow
            base_hourly = (340.0 / 24.0) * diurnal_factors[hour]
            if is_weekend:
                # Weekend morning shifted later, more laundry/dishes
                if 8 <= hour <= 11:
                    base_hourly *= 1.25
                if 12 <= hour <= 17:
                    base_hourly *= 1.15
            
            # Random gaussian noise
            noise = np.random.normal(0, base_hourly * 0.15)
            liters = max(base_hourly + noise, 0.0)

            # Assign realistic end-use category
            if hour in [6, 7, 8, 20, 21] and liters > 15.0:
                end_use = "showers"
            elif hour in [18, 19]:
                end_use = "kitchen_tap"
            elif hour in [10, 14] and is_weekend:
                end_use = "appliances"
            elif hour in [5, 6] and ambient_temp > 24.0:
                end_use = "irrigation"
            elif hour in [1, 2, 3, 4]:
                end_use = "leak_baseline" if liters > 2.0 else "general"
            else:
                end_use = "toilets" if liters > 5.0 else "general"

            is_anomaly = False
            anomaly_score = 0.02
            notes = None
            provenance = "measured"

            # 1. Inject past resolved pipe burst spike (22 days ago, hour 19)
            burst_time = now - datetime.timedelta(days=22)
            if current_time.date() == burst_time.date() and hour == 19:
                liters = 185.0
                is_anomaly = True
                anomaly_score = 0.94
                end_use = "appliances"
                notes = "Historical burst washing machine hose (Resolved)"

            # 2. Inject ongoing continuous toilet flapper leak for the last 4 days (hours 01:00-04:00)
            if (now - current_time).total_seconds() <= 4 * 86400:
                # Add constant leak baseline of 14.2 L/h
                liters += 14.2
                if hour in [1, 2, 3, 4]:
                    is_anomaly = True
                    anomaly_score = 0.95
                    end_use = "leak_baseline"
                    notes = "Continuous night baseline leak detected"

            # Occasional manual meter reading entry (e.g. once per month)
            if hour == 10 and current_time.day == 1:
                provenance = "user_entered"
                notes = "Homeowner monthly dial check"

            # Occasional benchmark simulation reading (e.g. once per two weeks)
            elif hour == 14 and current_time.day == 15:
                provenance = "simulated"
                notes = "IoT meter diagnostic simulation"

            cumulative_m3 += (liters / 1000.0)

            r = WaterReading(
                household_id=hh1.id,
                meter_id=m1.id,
                timestamp=current_time,
                consumption_liters=round(liters, 2),
                provenance=provenance,
                reading_type="hourly",
                meter_dial_reading=round(cumulative_m3, 3) if provenance == "user_entered" else None,
                temperature_c=round(ambient_temp, 1),
                is_weekend=is_weekend,
                end_use_category=end_use,
                is_anomaly=is_anomaly,
                anomaly_score=anomaly_score,
                notes=notes
            )
            readings_batch.append(r)

            if len(readings_batch) >= 500:
                db.bulk_save_objects(readings_batch)
                db.commit()
                readings_batch = []

            current_time += datetime.timedelta(hours=1)
            hour_counter += 1

        if readings_batch:
            db.bulk_save_objects(readings_batch)
            db.commit()

        print(f"[Seed] Successfully logged {hour_counter} hourly readings for Elena's residence.")

        print("[Seed] Populating Anomaly Events...")
        # Active continuous leak anomaly
        active_leak = AnomalyEvent(
            household_id=hh1.id,
            meter_id=m1.id,
            detected_at=now - datetime.timedelta(hours=12),
            start_time=now - datetime.timedelta(days=4),
            end_time=None,
            severity="critical",
            anomaly_type="toilet_flapper_leak",
            flow_rate_liters_per_hour=14.2,
            wasted_liters=round(14.2 * 24.0 * 4.0, 1),
            estimated_cost_usd=round((14.2 * 24.0 * 4.0 / 1000.0) * settings.WATER_RATE_PER_CUBIC_METER, 2),
            confidence_score=0.96,
            status="active",
            description="Continuous baseline flow of 14.2 L/h sustained through consecutive night hours (01:00 - 05:00).",
            root_cause="Degraded toilet tank flapper seal or slow cistern fill-valve leakage.",
            recommended_action="Inspect toilet tank flapper or shut off toilet isolation valve to confirm cessation of flow."
        )
        # Past resolved burst anomaly
        resolved_burst = AnomalyEvent(
            household_id=hh1.id,
            meter_id=m1.id,
            detected_at=now - datetime.timedelta(days=22),
            start_time=now - datetime.timedelta(days=22, hours=2),
            end_time=now - datetime.timedelta(days=22, hours=1),
            severity="high",
            anomaly_type="abnormal_spike",
            flow_rate_liters_per_hour=185.0,
            wasted_liters=145.0,
            estimated_cost_usd=0.53,
            confidence_score=0.94,
            status="resolved",
            description="High instantaneous surge of 185.0 Liters in a single hour.",
            root_cause="Burst washing machine inlet hose valve.",
            recommended_action="Replace braided stainless steel washer hose.",
            resolved_at=now - datetime.timedelta(days=21)
        )
        db.add_all([active_leak, resolved_burst])
        db.commit()

        print("[Seed] Populating Conservation Recommendations...")
        recs = [
            Recommendation(
                household_id=hh1.id,
                title="Repair Active Toilet Flapper Leak",
                category="leak_fix",
                impact_level="high",
                difficulty="easy",
                potential_saving_liters_month=10224.0, # 14.2 * 24 * 30
                potential_saving_usd_month=round((10224.0 / 1000.0) * settings.WATER_RATE_PER_CUBIC_METER, 2),
                estimated_payback_days=1,
                status="pending",
                description="Smart meter leak intelligence detected continuous night loss of 14.2 L/h. Replacing the flapper valve stops 10,200+ Liters of monthly wastage immediately.",
                action_steps="1. Turn off water inlet stopcock behind toilet.\n2. Flush toilet and unhook old rubber flapper.\n3. Snap in new universal silicon flapper ($8 at hardware store) and adjust chain length."
            ),
            Recommendation(
                household_id=hh1.id,
                title="Install WaterSense 1.5 GPM Faucet Aerators & Showerheads",
                category="fixtures",
                impact_level="high",
                difficulty="easy",
                potential_saving_liters_month=1840.0,
                potential_saving_usd_month=round((1840.0 / 1000.0) * settings.WATER_RATE_PER_CUBIC_METER, 2),
                estimated_payback_days=25,
                status="pending",
                description="Standard faucets flow at 2.5 GPM. Installing ultra-low-flow aerators maintains robust pressure while reducing daily indoor fixture draw by ~18%.",
                action_steps="1. Unscrew existing faucet aerators using pliers wrapped in tape.\n2. Screw on 1.5 GPM WaterSense aerators.\n3. Swap master bath showerhead with a high-efficiency aerated model."
            ),
            Recommendation(
                household_id=hh1.id,
                title="Shift Garden Irrigation to 05:00 AM & Add Rain Cutoff",
                category="irrigation",
                impact_level="medium",
                difficulty="easy",
                potential_saving_liters_month=1450.0,
                potential_saving_usd_month=round((1450.0 / 1000.0) * settings.WATER_RATE_PER_CUBIC_METER, 2),
                estimated_payback_days=14,
                status="in_progress",
                description="Watering during afternoon heat loses up to 35% of water to evaporation. Early dawn watering directs moisture straight to root depth.",
                action_steps="1. Reprogram sprinkler timer to cycle between 04:45 AM and 06:00 AM.\n2. Connect an automatic rain sensor to cancel watering during rain events.\n3. Apply cedar bark mulch around plants."
            ),
            Recommendation(
                household_id=hh1.id,
                title="Run Full Laundry Loads & Select Eco-Cycle",
                category="behavior",
                impact_level="medium",
                difficulty="easy",
                potential_saving_liters_month=1350.0,
                potential_saving_usd_month=round((1350.0 / 1000.0) * settings.WATER_RATE_PER_CUBIC_METER, 2),
                estimated_payback_days=0,
                status="pending",
                description="Washing machines draw 50-80 Liters per cycle. Waiting for full loads eliminates 2 unnecessary cycles weekly with zero capital cost.",
                action_steps="1. Run washing machine only when drum is 80% full.\n2. Use Eco 30°C quick wash settings.\n3. Use front-loader liquid detergent to prevent extra rinse cycles."
            ),
            Recommendation(
                household_id=hh1.id,
                title="Dual-Flush Cistern Converter Kit",
                category="fixtures",
                impact_level="medium",
                difficulty="moderate",
                potential_saving_liters_month=1800.0,
                potential_saving_usd_month=round((1800.0 / 1000.0) * settings.WATER_RATE_PER_CUBIC_METER, 2),
                estimated_payback_days=45,
                status="pending",
                description="Converts single-flush toilets into dual-flush (3.5L half flush for liquids / 6L full flush for solids), saving ~1,800 Liters each month.",
                action_steps="1. Empty cistern tank.\n2. Install drop-in dual flush converter.\n3. Test half-flush button and adjust fill float."
            )
        ]
        db.add_all(recs)
        db.commit()

        print("[Seed] Training initial Scikit-Learn Gradient Boosting model for Elena's household...")
        os.makedirs(settings.MODEL_DIR, exist_ok=True)
        
        # Build daily dataframe from the readings just seeded
        daily_readings = (
            db.query(WaterReading)
            .filter(WaterReading.household_id == hh1.id)
            .order_by(WaterReading.timestamp.asc())
            .all()
        )
        day_map = {}
        for r in daily_readings:
            d_str = r.timestamp.strftime("%Y-%m-%d")
            if d_str not in day_map:
                day_map[d_str] = {
                    "date": d_str,
                    "total_liters": 0.0,
                    "temperature_c": r.temperature_c or 22.0,
                    "occupants": hh1.occupants
                }
            day_map[d_str]["total_liters"] += r.consumption_liters

        df_daily = pd.DataFrame(list(day_map.values())).sort_values("date").reset_index(drop=True)
        pipeline = WaterForecastingPipeline(model_type="GradientBoostingRegressor")
        metrics = pipeline.train_and_validate(df_daily)
        
        model_file = os.path.join(settings.MODEL_DIR, f"hh_{hh1.id}_model.joblib")
        pipeline.save_model(model_file)
        print(f"[Seed] Model trained & saved to {model_file} with metrics: {metrics}")

        # Also populate a baseline forecast run record in DB
        fr = ForecastRun(
            household_id=hh1.id,
            horizon_days=14,
            model_name="GradientBoostingRegressor",
            mae_liters=metrics["mae"],
            rmse_liters=metrics["rmse"],
            r2_score=metrics["r2"],
            mape_pct=metrics["mape"],
            training_samples_count=metrics["training_samples"],
            validation_samples_count=metrics["validation_samples"],
            scenario_name="baseline",
            predictions_json="[]",
            feature_importances_json="[]"
        )
        db.add(fr)
        db.commit()

        print("[Seed] Database seeding completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

