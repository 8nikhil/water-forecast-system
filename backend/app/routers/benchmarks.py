import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.household import Household
from ..models.reading import WaterReading
from ..models.community import CommunityBenchmark
from ..schemas.community import ComparisonReport, CommunityBenchmarkOut
from ..auth.deps import get_current_user

router = APIRouter(prefix="/benchmarks", tags=["Community Benchmarks & Social Comparison"])

@router.get("", response_model=ComparisonReport)
def get_household_comparison(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    household = db.query(Household).filter(Household.id == current_user.household_id).first()
    occupants = household.occupants if household else 3
    district_name = household.district if household else "Green Valley District"

    # Get user 14-day daily average
    fourteen_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=14)
    readings = (
        db.query(WaterReading.consumption_liters)
        .filter(WaterReading.household_id == current_user.household_id)
        .filter(WaterReading.timestamp >= fourteen_days_ago)
        .all()
    )
    user_sum = sum(r[0] for r in readings)
    user_avg = (user_sum / 14.0) if user_sum > 0 else 320.0

    # Fetch community benchmark for this household size and district
    benchmark = (
        db.query(CommunityBenchmark)
        .filter(CommunityBenchmark.district == district_name)
        .filter(CommunityBenchmark.occupants == occupants)
        .first()
    )

    if not benchmark:
        # Default realistic benchmark values
        avg_comm = 120.0 * occupants + 50.0 # ~410 L/day for 3 occupants
        eff_comm = 85.0 * occupants + 30.0  # ~285 L/day for efficient 3 occupants
    else:
        avg_comm = benchmark.average_daily_liters
        eff_comm = benchmark.efficient_daily_liters

    # Compute percentile rank (lower consumption = higher efficiency percentile)
    # If user uses less than efficient benchmark: top 15%
    if user_avg <= eff_comm:
        pct_rank = round(90.0 + (1.0 - (user_avg / eff_comm)) * 9.0, 1)
        tier = "Eco-Champion (Top 10%)"
        pct_diff = round(((avg_comm - user_avg) / avg_comm) * 100.0, 1)
        comp_text = f"Outstanding! You use {pct_diff}% less water than similar {occupants}-person homes in {district_name}."
    elif user_avg <= avg_comm:
        diff_span = avg_comm - eff_comm
        rel_pos = (avg_comm - user_avg) / diff_span if diff_span > 0 else 0.5
        pct_rank = round(50.0 + rel_pos * 39.0, 1)
        tier = "Water Conscious"
        pct_diff = round(((avg_comm - user_avg) / avg_comm) * 100.0, 1)
        comp_text = f"Great work! You consume {pct_diff}% less than your neighborhood average."
    else:
        pct_excess = round(((user_avg - avg_comm) / avg_comm) * 100.0, 1)
        pct_rank = max(round(50.0 - pct_excess * 0.8, 1), 5.0)
        tier = "High Consumer"
        comp_text = f"Notice: Your consumption is {pct_excess}% above similar {occupants}-person households in your district."

    return ComparisonReport(
        user_daily_average_liters=round(user_avg, 1),
        community_average_liters=round(avg_comm, 1),
        efficient_benchmark_liters=round(eff_comm, 1),
        percentile_rank=pct_rank,
        comparison_text=comp_text,
        tier=tier,
        district=district_name,
        occupants=occupants
    )

@router.get("/community-stats")
def get_community_district_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    household = db.query(Household).filter(Household.id == current_user.household_id).first()
    district = household.district if household else "Green Valley District"

    return {
        "district": district,
        "total_enrolled_households": 580,
        "district_water_saved_liters_ytd": 2480000,
        "district_water_saved_usd_ytd": 9052.0,
        "district_target_reduction_pct": 15.0,
        "district_current_reduction_pct": 11.2,
        "active_anomalies_resolved_this_month": 42,
        "community_leaderboard": [
            {"rank": 1, "neighborhood": "Maple Ridge Sector 4", "efficiency_score": 96, "avg_daily_liters": 260, "badge": "Gold Tier"},
            {"rank": 2, "neighborhood": "Pine Crest Valley (Your District)", "efficiency_score": 91, "avg_daily_liters": 295, "badge": "Silver Tier"},
            {"rank": 3, "neighborhood": "Oakwood Commons", "efficiency_score": 87, "avg_daily_liters": 330, "badge": "Bronze Tier"},
            {"rank": 4, "neighborhood": "Highland Terrace", "efficiency_score": 82, "avg_daily_liters": 365, "badge": "Active Participant"},
            {"rank": 5, "neighborhood": "Cedar River Basin", "efficiency_score": 75, "avg_daily_liters": 415, "badge": "Improving"}
        ]
    }

