import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.recommendation import Recommendation
from ..models.household import Household
from ..models.reading import WaterReading
from ..models.anomaly import AnomalyEvent
from ..schemas.recommendation import RecommendationOut, RecommendationUpdateStatus
from ..ml.recommender import ConservationRecommender
from ..auth.deps import get_current_user

router = APIRouter(prefix="/recommendations", tags=["Conservation Recommendations"])

@router.get("", response_model=List[RecommendationOut])
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recs = (
        db.query(Recommendation)
        .filter(Recommendation.household_id == current_user.household_id)
        .order_by(Recommendation.potential_saving_liters_month.desc())
        .all()
    )

    if not recs:
        # Generate initial recommendations if none exist yet
        recommender = ConservationRecommender()
        household = db.query(Household).filter(Household.id == current_user.household_id).first()
        active_leaks = (
            db.query(AnomalyEvent)
            .filter(AnomalyEvent.household_id == current_user.household_id)
            .filter(AnomalyEvent.status == "active")
            .all()
        )
        leak_dicts = [{"flow_rate_liters_per_hour": a.flow_rate_liters_per_hour} for a in active_leaks]

        gen_recs = recommender.generate_recommendations(
            household_id=current_user.household_id,
            daily_average_liters=340.0,
            occupants=household.occupants if household else 3,
            has_garden=household.has_garden if household else True,
            active_leaks=leak_dicts
        )
        for gr in gen_recs:
            r = Recommendation(**gr)
            db.add(r)
        db.commit()
        recs = db.query(Recommendation).filter(Recommendation.household_id == current_user.household_id).all()

    return recs

@router.put("/{rec_id}/status", response_model=RecommendationOut)
def update_recommendation_status(
    rec_id: int,
    payload: RecommendationUpdateStatus,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = (
        db.query(Recommendation)
        .filter(Recommendation.id == rec_id)
        .filter(Recommendation.household_id == current_user.household_id)
        .first()
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found."
        )

    rec.status = payload.status
    rec.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return rec

@router.post("/regenerate")
def regenerate_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refreshes conservation recommendations using live telemetry and active leak data."""
    household = db.query(Household).filter(Household.id == current_user.household_id).first()
    occupants = household.occupants if household else 3

    # Calculate recent daily average
    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    readings = (
        db.query(WaterReading.consumption_liters)
        .filter(WaterReading.household_id == current_user.household_id)
        .filter(WaterReading.timestamp >= seven_days_ago)
        .all()
    )
    total_liters = sum(r[0] for r in readings)
    daily_avg = (total_liters / 7.0) if total_liters > 0 else 340.0

    active_leaks = (
        db.query(AnomalyEvent)
        .filter(AnomalyEvent.household_id == current_user.household_id)
        .filter(AnomalyEvent.status == "active")
        .all()
    )
    leak_dicts = [{"flow_rate_liters_per_hour": a.flow_rate_liters_per_hour} for a in active_leaks]

    recommender = ConservationRecommender()
    fresh_recs = recommender.generate_recommendations(
        household_id=current_user.household_id,
        daily_average_liters=daily_avg,
        occupants=occupants,
        has_garden=household.has_garden if household else True,
        active_leaks=leak_dicts
    )

    # Update or add without deleting user's completed actions
    existing_by_title = {
        r.title: r for r in db.query(Recommendation).filter(Recommendation.household_id == current_user.household_id).all()
    }

    for fr in fresh_recs:
        title = fr["title"]
        if title in existing_by_title:
            rec = existing_by_title[title]
            rec.potential_saving_liters_month = fr["potential_saving_liters_month"]
            rec.potential_saving_usd_month = fr["potential_saving_usd_month"]
            rec.description = fr["description"]
        else:
            rec = Recommendation(**fr)
            db.add(rec)

    db.commit()
    return {"success": True, "message": "Conservation recommendations refreshed."}

