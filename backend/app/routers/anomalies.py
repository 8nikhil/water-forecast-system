import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.anomaly import AnomalyEvent
from ..models.reading import WaterReading
from ..models.household import Household
from ..schemas.anomaly import AnomalyOut, AnomalyUpdateStatus, ThresholdConfig
from ..ml.anomaly_detector import WaterAnomalyDetector
from ..auth.deps import get_current_user

router = APIRouter(prefix="/anomalies", tags=["Alerts & Anomalies"])

@router.get("", response_model=List[AnomalyOut])
def get_anomalies(
    status_filter: Optional[str] = None, # active, investigating, resolved, dismissed
    severity_filter: Optional[str] = None, # critical, high, medium, low
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(AnomalyEvent).filter(AnomalyEvent.household_id == current_user.household_id)
    
    if status_filter:
        query = query.filter(AnomalyEvent.status == status_filter)
    if severity_filter:
        query = query.filter(AnomalyEvent.severity == severity_filter)

    return query.order_by(AnomalyEvent.detected_at.desc()).all()

@router.put("/{anomaly_id}/status", response_model=AnomalyOut)
def update_anomaly_status(
    anomaly_id: int,
    payload: AnomalyUpdateStatus,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    anomaly = (
        db.query(AnomalyEvent)
        .filter(AnomalyEvent.id == anomaly_id)
        .filter(AnomalyEvent.household_id == current_user.household_id)
        .first()
    )
    if not anomaly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anomaly record not found."
        )

    anomaly.status = payload.status
    if payload.status in ["resolved", "dismissed"]:
        anomaly.resolved_at = datetime.datetime.utcnow()
    else:
        anomaly.resolved_at = None

    if payload.notes:
        anomaly.description = f"{anomaly.description} [Note: {payload.notes}]"

    db.commit()
    db.refresh(anomaly)
    return anomaly

@router.post("/scan")
def run_anomaly_scan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Executes rule-based and statistical anomaly detection over last 7 days of readings."""
    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    readings = (
        db.query(WaterReading)
        .filter(WaterReading.household_id == current_user.household_id)
        .filter(WaterReading.timestamp >= seven_days_ago)
        .order_by(WaterReading.timestamp.asc())
        .all()
    )

    reading_dicts = [
        {
            "timestamp": r.timestamp,
            "consumption_liters": r.consumption_liters,
            "is_anomaly": r.is_anomaly
        }
        for r in readings
    ]

    detector = WaterAnomalyDetector()
    detected = detector.analyze_hourly_readings(reading_dicts, current_user.household_id)

    new_anomalies_count = 0
    for d in detected:
        # Check if already recorded around same start time
        exists = (
            db.query(AnomalyEvent)
            .filter(AnomalyEvent.household_id == current_user.household_id)
            .filter(AnomalyEvent.start_time >= d["start_time"] - datetime.timedelta(hours=2))
            .filter(AnomalyEvent.start_time <= d["start_time"] + datetime.timedelta(hours=2))
            .first()
        )
        if not exists:
            event = AnomalyEvent(
                household_id=current_user.household_id,
                detected_at=datetime.datetime.utcnow(),
                start_time=d["start_time"],
                end_time=d["end_time"],
                severity=d["severity"],
                anomaly_type=d["anomaly_type"],
                flow_rate_liters_per_hour=d["flow_rate_liters_per_hour"],
                wasted_liters=d["wasted_liters"],
                estimated_cost_usd=d["estimated_cost_usd"],
                confidence_score=d["confidence_score"],
                status=d["status"],
                description=d["description"],
                root_cause=d["root_cause"],
                recommended_action=d["recommended_action"]
            )
            db.add(event)
            new_anomalies_count += 1

    db.commit()
    return {
        "success": True,
        "scanned_readings": len(readings),
        "newly_detected_anomalies": new_anomalies_count
    }

@router.get("/thresholds", response_model=ThresholdConfig)
def get_thresholds(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    household = db.query(Household).filter(Household.id == current_user.household_id).first()
    return ThresholdConfig(
        night_flow_threshold_liters_per_hour=6.0,
        spike_multiplier_threshold=2.5,
        daily_budget_liters=household.daily_budget_liters if household else 450.0
    )

@router.put("/thresholds", response_model=ThresholdConfig)
def update_thresholds(
    payload: ThresholdConfig,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    household = db.query(Household).filter(Household.id == current_user.household_id).first()
    if household:
        household.daily_budget_liters = payload.daily_budget_liters
        db.commit()
    return payload

