import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.user import User
from ..models.reading import WaterReading
from ..models.anomaly import AnomalyEvent
from ..models.household import Household
from ..auth.deps import get_current_user
from ..config import settings

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    household = db.query(Household).filter(Household.id == current_user.household_id).first()
    daily_budget = household.daily_budget_liters if household else 450.0

    today_start = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0)
    
    # Today's consumption
    today_sum = (
        db.query(func.sum(WaterReading.consumption_liters))
        .filter(WaterReading.household_id == current_user.household_id)
        .filter(WaterReading.timestamp >= today_start)
        .scalar()
    ) or 0.0

    # 7-day average
    seven_days_ago = today_start - datetime.timedelta(days=7)
    past_7_days_readings = (
        db.query(WaterReading.consumption_liters, WaterReading.timestamp)
        .filter(WaterReading.household_id == current_user.household_id)
        .filter(WaterReading.timestamp >= seven_days_ago)
        .filter(WaterReading.timestamp < today_start)
        .all()
    )
    
    past_7_sum = sum(r[0] for r in past_7_days_readings)
    weekly_avg = past_7_sum / 7.0 if past_7_sum > 0 else (today_sum if today_sum > 0 else 340.0)

    # Active leaks
    active_anomalies = (
        db.query(AnomalyEvent)
        .filter(AnomalyEvent.household_id == current_user.household_id)
        .filter(AnomalyEvent.status.in_(["active", "investigating"]))
        .all()
    )
    
    wasted_liters_day = sum(a.wasted_liters for a in active_anomalies)
    
    # Financial projection (tariff per liter = WATER_RATE_PER_CUBIC_METER / 1000)
    tariff = settings.WATER_RATE_PER_CUBIC_METER / 1000.0
    projected_monthly_bill = (weekly_avg * 30.0) * tariff

    # Efficiency score (0-100)
    ratio = weekly_avg / max(daily_budget, 100.0)
    if ratio <= 0.8:
        efficiency_score = 95
        efficiency_tier = "Eco-Leader"
    elif ratio <= 1.0:
        efficiency_score = 85
        efficiency_tier = "Water Conscious"
    elif ratio <= 1.25:
        efficiency_score = 68
        efficiency_tier = "Moderate Consumer"
    else:
        efficiency_score = 45
        efficiency_tier = "High Consumer"

    return {
        "today_consumption_liters": round(today_sum, 1),
        "daily_budget_liters": round(daily_budget, 1),
        "budget_percentage": round((today_sum / max(daily_budget, 1.0)) * 100.0, 1),
        "weekly_average_liters": round(weekly_avg, 1),
        "projected_monthly_liters": round(weekly_avg * 30.0, 0),
        "projected_monthly_bill_usd": round(projected_monthly_bill, 2),
        "active_leaks_count": len(active_anomalies),
        "daily_wasted_liters": round(wasted_liters_day, 1),
        "efficiency_score": efficiency_score,
        "efficiency_tier": efficiency_tier,
        "occupants": household.occupants if household else 3,
        "water_tariff_rate_usd_m3": settings.WATER_RATE_PER_CUBIC_METER
    }

@router.get("/trends")
def get_consumption_trends(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns daily historical consumption aggregated with provenance distribution."""
    since_date = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - datetime.timedelta(days=days)
    
    readings = (
        db.query(WaterReading)
        .filter(WaterReading.household_id == current_user.household_id)
        .filter(WaterReading.timestamp >= since_date)
        .order_by(WaterReading.timestamp.asc())
        .all()
    )

    daily_map: Dict[str, Dict[str, Any]] = {}
    for r in readings:
        dt_str = r.timestamp.strftime("%Y-%m-%d")
        if dt_str not in daily_map:
            daily_map[dt_str] = {
                "date": dt_str,
                "total_liters": 0.0,
                "measured": 0.0,
                "user_entered": 0.0,
                "simulated": 0.0,
                "predicted": 0.0,
                "temperature_c": r.temperature_c or 22.0,
                "is_anomaly": False,
                "notes": []
            }
        
        daily_map[dt_str]["total_liters"] += r.consumption_liters
        prov = r.provenance if r.provenance in ["measured", "user_entered", "simulated", "predicted"] else "measured"
        daily_map[dt_str][prov] += r.consumption_liters
        if r.is_anomaly:
            daily_map[dt_str]["is_anomaly"] = True
        if r.notes and r.notes not in daily_map[dt_str]["notes"]:
            daily_map[dt_str]["notes"].append(r.notes)

    trend_list = []
    for dt_str in sorted(daily_map.keys()):
        item = daily_map[dt_str]
        trend_list.append({
            "date": item["date"],
            "total_liters": round(item["total_liters"], 1),
            "measured": round(item["measured"], 1),
            "user_entered": round(item["user_entered"], 1),
            "simulated": round(item["simulated"], 1),
            "predicted": round(item["predicted"], 1),
            "temperature_c": round(item["temperature_c"], 1),
            "is_anomaly": item["is_anomaly"],
            "notes": ", ".join(item["notes"][:2]) if item["notes"] else None
        })

    return trend_list

@router.get("/hourly-diurnal")
def get_hourly_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculates 24-hour diurnal pattern (morning peak, daytime lull, evening peak, night baseline)."""
    readings = (
        db.query(WaterReading)
        .filter(WaterReading.household_id == current_user.household_id)
        .filter(WaterReading.reading_type == "hourly")
        .order_by(WaterReading.timestamp.desc())
        .limit(720) # 30 days of hourly data
        .all()
    )

    hour_bins = {h: [] for h in range(24)}
    for r in readings:
        h = r.timestamp.hour
        hour_bins[h].append(r.consumption_liters)

    hourly_profile = []
    for h in range(24):
        vals = hour_bins[h]
        avg_val = float(sum(vals) / len(vals)) if vals else (5.0 if h < 6 else 22.0)
        hourly_profile.append({
            "hour": h,
            "label": f"{h:02d}:00",
            "average_liters": round(avg_val, 1),
            "is_peak": bool((7 <= h <= 9) or (18 <= h <= 21)),
            "is_night_baseline": bool(1 <= h <= 4)
        })

    return hourly_profile

@router.get("/end-use")
def get_end_use_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregates estimated water consumption by end-use category."""
    readings = (
        db.query(WaterReading)
        .filter(WaterReading.household_id == current_user.household_id)
        .order_by(WaterReading.timestamp.desc())
        .limit(500)
        .all()
    )

    cat_map: Dict[str, float] = {
        "showers": 0.0,
        "toilets": 0.0,
        "kitchen_tap": 0.0,
        "appliances": 0.0,
        "irrigation": 0.0,
        "leak_baseline": 0.0,
        "general": 0.0
    }

    for r in readings:
        cat = r.end_use_category if r.end_use_category in cat_map else "general"
        cat_map[cat] += r.consumption_liters

    total = sum(cat_map.values())
    if total == 0:
        # Default distribution for realistic initial display
        cat_map = {
            "showers": 110.0,
            "toilets": 85.0,
            "kitchen_tap": 60.0,
            "appliances": 55.0,
            "irrigation": 40.0,
            "leak_baseline": 15.0,
            "general": 20.0
        }
        total = sum(cat_map.values())

    categories_info = [
        {"id": "showers", "name": "Showers & Baths", "color": "#0284c7"},
        {"id": "toilets", "name": "Toilets & Flushes", "color": "#0ea5e9"},
        {"id": "kitchen_tap", "name": "Kitchen & Faucets", "color": "#38bdf8"},
        {"id": "appliances", "name": "Washing & Dishwasher", "color": "#0d9488"},
        {"id": "irrigation", "name": "Lawn & Garden", "color": "#10b981"},
        {"id": "leak_baseline", "name": "Continuous Leaks", "color": "#f43f5e"},
        {"id": "general", "name": "General Utility", "color": "#64748b"},
    ]

    breakdown = []
    for info in categories_info:
        cat_id = info["id"]
        liters = cat_map.get(cat_id, 0.0)
        pct = (liters / total * 100.0) if total > 0 else 0.0
        breakdown.append({
            "category": info["name"],
            "category_id": cat_id,
            "liters": round(liters, 1),
            "percentage": round(pct, 1),
            "color": info["color"]
        })

    return {
        "total_liters": round(total, 1),
        "breakdown": breakdown
    }

@router.post("/simulate-event")
def simulate_water_event(
    event_type: str = Query("leak", description="leak, spike, or drought_drop"),
    flow_rate_lph: float = Query(16.5, ge=2.0, le=250.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Live event injector: immediately creates new readings and an anomaly event
    so the user can observe live detection, alerts, and recalculation in real time!
    """
    now = datetime.datetime.utcnow()
    
    if event_type == "leak":
        # Inject continuous readings
        for offset in range(4):
            reading = WaterReading(
                household_id=current_user.household_id,
                timestamp=now - datetime.timedelta(hours=offset),
                consumption_liters=flow_rate_lph,
                provenance="simulated",
                reading_type="hourly",
                end_use_category="leak_baseline",
                is_anomaly=True,
                anomaly_score=0.96,
                notes="Simulated continuous baseline pipe leak"
            )
            db.add(reading)
            
        # Create AnomalyEvent
        wasted_liters = flow_rate_lph * 24.0
        cost_usd = wasted_liters * (settings.WATER_RATE_PER_CUBIC_METER / 1000.0)
        anomaly = AnomalyEvent(
            household_id=current_user.household_id,
            detected_at=now,
            start_time=now - datetime.timedelta(hours=4),
            end_time=now,
            severity="critical" if flow_rate_lph > 15.0 else "high",
            anomaly_type="continuous_plumbing_leak",
            flow_rate_liters_per_hour=flow_rate_lph,
            wasted_liters=wasted_liters,
            estimated_cost_usd=cost_usd,
            confidence_score=0.96,
            status="active",
            description=f"Simulated continuous leak of {flow_rate_lph:.1f} L/h injected.",
            root_cause="Live simulator stress test: valve seal failure.",
            recommended_action="Inspect main shutoff valve and toilet flush seals."
        )
        db.add(anomaly)
    elif event_type == "spike":
        reading = WaterReading(
            household_id=current_user.household_id,
            timestamp=now,
            consumption_liters=flow_rate_lph * 3.5,
            provenance="simulated",
            reading_type="hourly",
            end_use_category="irrigation",
            is_anomaly=True,
            anomaly_score=0.91,
            notes="Simulated high flow surge (burst hose/pipe)"
        )
        db.add(reading)
        
        anomaly = AnomalyEvent(
            household_id=current_user.household_id,
            detected_at=now,
            start_time=now,
            end_time=now + datetime.timedelta(hours=1),
            severity="high",
            anomaly_type="abnormal_spike",
            flow_rate_liters_per_hour=flow_rate_lph * 3.5,
            wasted_liters=flow_rate_lph * 2.5,
            estimated_cost_usd=(flow_rate_lph * 2.5) * (settings.WATER_RATE_PER_CUBIC_METER / 1000.0),
            confidence_score=0.91,
            status="active",
            description=f"Simulated surge spike of {flow_rate_lph * 3.5:.1f} Liters in a single hour.",
            root_cause="Irrigation stuck open or burst pipe.",
            recommended_action="Check outdoor line valves."
        )
        db.add(anomaly)

    db.commit()
    return {
        "success": True,
        "message": f"Successfully injected simulated {event_type} event ({flow_rate_lph:.1f} L/h). Check Alerts and Dashboard!"
    }

