"""
AquaPulse Water Conservation Analytics API Router
Provides endpoints for anomaly detection, consumption differences, wastage quantification, and conservation insights.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status, Body
from pydantic import BaseModel, Field

from ..services.conservation_analytics_service import ConservationAnalyticsService

router = APIRouter(prefix="/conservation", tags=["Water Conservation Analytics & Anomaly Detection"])
service = ConservationAnalyticsService()


class SimulateInterventionPayload(BaseModel):
    city_id: str = Field(..., description="Target city code (e.g. BLR, DEL, BOM)", examples=["BLR"])
    pressure_management: bool = Field(True, description="DMA night pressure reduction (reduces leak rate by 8-10%)")
    smart_irrigation_cutoff: bool = Field(True, description="Rain-triggered automated irrigation cutback")
    fixture_aerator_retrofit: bool = Field(False, description="Subsidized 1.5 GPM low-flow tap aerator rollout")
    meter_modernization: bool = Field(False, description="Industrial AMR flowmeter calibration")


@router.get(
    "/analysis",
    summary="Comprehensive City Conservation & Anomaly Analysis",
    description="Analyzes historical and predicted water consumption, detects anomalies, calculates consumption differences, and generates practical data-backed recommendations."
)
def get_conservation_analysis(
    city_id: str = Query("BLR", description="Canonical city code (e.g. BLR, DEL, BOM, MAA)"),
    days: int = Query(30, ge=7, le=180, description="Analysis time window in days")
):
    try:
        return service.analyze_city(city_id=city_id, days=days)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Conservation analysis error: {e}")


@router.get(
    "/alerts",
    summary="Active Water Wastage & Leakage Alerts",
    description="Returns list of detected anomalies (unseasonal spikes, high NRW distribution loss, rainy day irrigation decoupling) with recommended mitigation actions."
)
def get_conservation_alerts(
    city_id: Optional[str] = Query(None, description="Optional city filter"),
    days: int = Query(30, ge=7, le=180)
):
    try:
        data = service.analyze_city(city_id=city_id or "BLR", days=days)
        return {
            "city_id": data["city_id"],
            "city_name": data["city_name"],
            "total_alerts": len(data["alerts"]),
            "alerts": data["alerts"]
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Alerts retrieval error: {e}")


@router.get(
    "/overview",
    summary="Pan-India Municipal Water Conservation Overview",
    description="Ranks all 21 monitored Indian metropolitan water authorities by NRW loss, water stress score, and potential recoverable water volume."
)
def get_pan_india_conservation_overview():
    try:
        rankings = service.get_pan_india_overview()
        return {
            "total_cities": len(rankings),
            "rankings": rankings
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Overview retrieval error: {e}")


@router.post(
    "/simulate-intervention",
    summary="Simulate Conservation Intervention Roadmap",
    description="Computes projected water volume savings and financial payback from selected municipal conservation measures."
)
def simulate_conservation_intervention(payload: SimulateInterventionPayload = Body(...)):
    try:
        city_data = service.analyze_city(city_id=payload.city_id, days=30)
        kpis = city_data["kpis"]
        base_demand = kpis["average_demand_mld"]
        base_nrw_pct = kpis["average_nrw_percentage"]

        savings_pct = 0.0
        applied_actions = []

        if payload.pressure_management:
            savings_pct += 8.5
            applied_actions.append("DMA Off-Peak Night Pressure Management (-8.5% background loss)")
        if payload.smart_irrigation_cutoff:
            savings_pct += 4.0
            applied_actions.append("Rain-Delayed Municipal Horticultural Cutback (-4.0% seasonal outdoor draw)")
        if payload.fixture_aerator_retrofit:
            savings_pct += 6.0
            applied_actions.append("Domestic 1.5 GPM Aerator & Dual-Flush Retrofit Program (-6.0% indoor draw)")
        if payload.meter_modernization:
            savings_pct += 3.5
            applied_actions.append("Bulk Commercial Ultrasonic AMR Flowmeter Calibration (+3.5% revenue recovery)")

        saved_mld = (base_demand * savings_pct) / 100.0
        new_projected_demand = base_demand - saved_mld
        annual_saved_mcm = saved_mld * 365 * 0.001
        annual_saved_usd = annual_saved_mcm * 1000 * 3.65

        return {
            "city_id": payload.city_id,
            "city_name": city_data["city_name"],
            "baseline_demand_mld": round(base_demand, 2),
            "projected_demand_mld": round(new_projected_demand, 2),
            "total_demand_reduction_pct": round(savings_pct, 1),
            "daily_saved_mld": round(saved_mld, 2),
            "annual_saved_volume_mcm": round(annual_saved_mcm, 2),
            "annual_financial_savings_usd": round(annual_saved_usd, 0),
            "new_projected_nrw_pct": max(15.0, round(base_nrw_pct - (savings_pct * 0.7), 1)),
            "interventions_applied": applied_actions
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Simulation error: {e}")

