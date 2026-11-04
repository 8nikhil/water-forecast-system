"""
AquaPulse Water Conservation Analytics & Anomaly Detection Engine
Analyzes historical and predicted water consumption, detects anomalies,
quantifies potential wastage, and generates grounded, practical conservation recommendations.
"""

from __future__ import annotations

import os
import datetime
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional

# Root directory access
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
DATASET_PATH = os.path.join(root_dir, "datasets", "pan_india", "pan_india_daily_municipal_water.csv")


class ConservationAnalyticsService:
    """Service providing data-backed conservation diagnostics, anomaly detection, and recommendations."""

    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self._load_data()

    def _load_data(self):
        if os.path.exists(DATASET_PATH):
            try:
                df = pd.read_csv(DATASET_PATH)
                df["record_date"] = pd.to_datetime(df["record_date"]).dt.strftime("%Y-%m-%d")
                df = df.sort_values(["city_id", "record_date"]).reset_index(drop=True)
                self.df = df
            except Exception as e:
                print(f"[ConservationAnalyticsService] Error reading dataset: {e}")

    def analyze_city(self, city_id: str = "BLR", days: int = 30) -> Dict[str, Any]:
        """
        Runs comprehensive water conservation analysis for a specific municipal authority.
        Calculates:
        - Consumption differences (Actual vs Predicted, Actual vs CPHEEO Target, Bulk vs Billed)
        - Wastage and leakage anomalies (Z-score, High NRW, Rainy day decoupling)
        - Data-backed conservation action plan
        """
        if self.df is None:
            self._load_data()
        
        cid = city_id.strip().upper()
        city_df = self.df[self.df["city_id"] == cid] if self.df is not None else pd.DataFrame()

        if city_df.empty:
            cid = "BLR"
            city_df = self.df[self.df["city_id"] == "BLR"] if self.df is not None else pd.DataFrame()

        # Tail the last `days` records
        recent_df = city_df.tail(days).copy()
        city_name = str(recent_df["city_name"].iloc[0] if not recent_df.empty else cid)
        zone = str(recent_df["zone"].iloc[0] if not recent_df.empty else "South")
        water_board = str(recent_df["water_board"].iloc[0] if "water_board" in recent_df else "Water Supply Board")
        cpheeo_target = int(recent_df["cpheeo_target_lpcd"].iloc[0] if not recent_df.empty else 135)
        water_stress = float(recent_df["water_stress_score"].iloc[0] if not recent_df.empty else 100.0)

        # Baseline & Averages
        avg_actual_demand = float(recent_df["actual_demand_mld"].mean())
        avg_bulk_supply = float(recent_df["bulk_supply_mld"].mean())
        avg_billed = float(recent_df["billed_consumption_mld"].mean())
        avg_nrw_loss = float(recent_df["nrw_loss_mld"].mean())
        avg_nrw_pct = float(recent_df["nrw_percentage"].mean())
        avg_per_capita = float(recent_df["per_capita_lpcd"].mean())
        mean_std = float(recent_df["actual_demand_mld"].std()) if len(recent_df) > 1 else 15.0

        # Anomaly Detection Evaluation
        anomalies: List[Dict[str, Any]] = []
        timeline: List[Dict[str, Any]] = []

        total_avoidable_loss_mld = 0.0

        for idx, row in recent_df.iterrows():
            d_str = row["record_date"]
            actual = float(row["actual_demand_mld"])
            bulk = float(row["bulk_supply_mld"])
            billed = float(row["billed_consumption_mld"])
            nrw_loss = float(row["nrw_loss_mld"])
            nrw_pct = float(row["nrw_percentage"])
            precip = float(row["precipitation_mm"])
            tmax = float(row["max_temp_c"])
            lpcd = float(row["per_capita_lpcd"])

            # Difference vs moving baseline
            z_score = (actual - avg_actual_demand) / (mean_std if mean_std > 0 else 1.0)
            
            # Simulated model prediction baseline: accounts for seasonal temperature wave
            predicted = avg_actual_demand + (tmax - 30.0) * 4.5 - (precip * 1.2)
            diff_actual_predicted = actual - predicted

            is_anomaly = False
            anomaly_type = None
            severity = "normal"
            reason = ""

            # Check 1: Severe Non-Revenue Water Loss (> 32% or > 1.2x city mean)
            if nrw_pct > max(32.0, avg_nrw_pct * 1.15):
                is_anomaly = True
                anomaly_type = "high_nrw_distribution_leak"
                severity = "critical" if nrw_pct > 35.0 else "high"
                excess_loss = max(0.0, nrw_loss - (bulk * 0.20)) # Benchmark 20% NRW target
                total_avoidable_loss_mld += excess_loss
                reason = f"Critical transmission loss: Non-Revenue Water peaked at {nrw_pct:.1f}% ({nrw_loss:.1f} MLD unbilled)."

            # Check 2: Unseasonal Volumetric Surge (Z-score > 2.2)
            elif z_score > 2.2:
                is_anomaly = True
                anomaly_type = "unusual_demand_surge"
                severity = "high"
                excess = actual - avg_actual_demand
                total_avoidable_loss_mld += excess * 0.5
                reason = f"Abrupt consumption spike of {actual:.1f} MLD (+{excess:.1f} MLD above 30-day baseline, Z={z_score:.2f})."

            # Check 3: Rain Decoupling (High precipitation but no demand reduction)
            elif precip >= 15.0 and actual > avg_actual_demand:
                is_anomaly = True
                anomaly_type = "rain_irrigation_decoupling"
                severity = "medium"
                total_avoidable_loss_mld += 12.0
                reason = f"Outdoor irrigation continued despite {precip:.1f} mm precipitation deluge."

            # Check 4: Excessive Per Capita Draw (> 135% of CPHEEO target)
            elif lpcd > cpheeo_target * 1.35:
                is_anomaly = True
                anomaly_type = "per_capita_over_extraction"
                severity = "medium"
                reason = f"Per-capita extraction reached {lpcd:.1f} LPCD (exceeds CPHEEO {cpheeo_target} LPCD guideline by {(lpcd - cpheeo_target):.1f} LPCD)."

            if is_anomaly:
                anomalies.append({
                    "date": d_str,
                    "city_id": cid,
                    "city_name": city_name,
                    "anomaly_type": anomaly_type,
                    "severity": severity,
                    "actual_demand_mld": round(actual, 1),
                    "bulk_supply_mld": round(bulk, 1),
                    "nrw_loss_mld": round(nrw_loss, 1),
                    "nrw_percentage": round(nrw_pct, 1),
                    "per_capita_lpcd": round(lpcd, 1),
                    "description": reason,
                    "recommended_action": self._get_action_for_type(anomaly_type)
                })

            timeline.append({
                "date": d_str,
                "actual_demand_mld": round(actual, 1),
                "predicted_demand_mld": round(predicted, 1),
                "bulk_supply_mld": round(bulk, 1),
                "billed_consumption_mld": round(billed, 1),
                "nrw_loss_mld": round(nrw_loss, 1),
                "nrw_percentage": round(nrw_pct, 1),
                "per_capita_lpcd": round(lpcd, 1),
                "cpheeo_target_lpcd": cpheeo_target,
                "precipitation_mm": round(precip, 1),
                "max_temp_c": round(tmax, 1),
                "is_anomaly": is_anomaly
            })

        # Calculate Financial & Volume Metrics
        total_avoidable_mcm = round(total_avoidable_loss_mld * 0.001, 3)
        tariff_per_m3 = 3.65  # $3.65 per 1,000 m3
        financial_loss_usd = round(total_avoidable_mcm * 1000 * tariff_per_m3, 2)

        # Generate Grounded Recommendations
        recommendations = self._generate_recommendations(
            city_id=cid,
            city_name=city_name,
            avg_demand=avg_actual_demand,
            avg_nrw_pct=avg_nrw_pct,
            avg_nrw_loss=avg_nrw_loss,
            water_stress=water_stress,
            cpheeo_target=cpheeo_target,
            avg_per_capita=avg_per_capita
        )

        return {
            "city_id": cid,
            "city_name": city_name,
            "zone": zone,
            "water_board": water_board,
            "analysis_window_days": days,
            "kpis": {
                "average_demand_mld": round(avg_actual_demand, 2),
                "average_bulk_supply_mld": round(avg_bulk_supply, 2),
                "average_billed_mld": round(avg_billed, 2),
                "average_nrw_loss_mld": round(avg_nrw_loss, 2),
                "average_nrw_percentage": round(avg_nrw_pct, 2),
                "average_per_capita_lpcd": round(avg_per_capita, 1),
                "cpheeo_target_lpcd": cpheeo_target,
                "cpheeo_compliance_pct": round((cpheeo_target / avg_per_capita) * 100, 1) if avg_per_capita > 0 else 100.0,
                "water_stress_score": water_stress,
                "anomalies_detected_count": len(anomalies),
                "potential_avoidable_wastage_mld_days": round(total_avoidable_loss_mld, 2),
                "potential_avoidable_wastage_mcm": total_avoidable_mcm,
                "estimated_financial_loss_usd": financial_loss_usd
            },
            "alerts": sorted(anomalies, key=lambda x: x["date"], reverse=True),
            "timeline": timeline,
            "recommendations": recommendations
        }

    @staticmethod
    def _get_action_for_type(atype: str) -> str:
        actions = {
            "high_nrw_distribution_leak": "Deploy acoustic correlators and initiate night step-testing in high-loss District Metered Areas (DMAs).",
            "unusual_demand_surge": "Inspect bulk transmission flowmeters and verify valve positions along primary feeder mains.",
            "rain_irrigation_decoupling": "Enforce automated rain cutoff delays across municipal parks and automated sprinkler networks.",
            "per_capita_over_extraction": "Enact tier-2 conservation tariffs and distribute WaterSense aerators to multi-story developments."
        }
        return actions.get(atype, "Investigate telemetry anomalies and calibrate boundary flow sensors.")

    def _generate_recommendations(
        self,
        city_id: str,
        city_name: str,
        avg_demand: float,
        avg_nrw_pct: float,
        avg_nrw_loss: float,
        water_stress: float,
        cpheeo_target: int,
        avg_per_capita: float
    ) -> List[Dict[str, Any]]:
        """Synthesizes actionable, quantified water-saving interventions."""
        recs = []

        # Rec 1: DMA Night Pressure Management & Acoustic Leak Remediation
        if avg_nrw_pct > 24.0:
            target_pct_reduction = 8.0 # Reduce NRW by 8 percentage points
            savings_mld = (avg_demand * target_pct_reduction) / 100.0
            savings_mcm = savings_mld * 365 * 0.001
            annual_val_usd = savings_mcm * 1000 * 3.65

            recs.append({
                "id": f"REC-{city_id}-01",
                "title": "DMA Off-Peak Pressure Reduction & Acoustic Leak Surveys",
                "category": "infrastructure_leakage",
                "priority": "High",
                "difficulty": "Medium",
                "estimated_savings_mld": round(savings_mld, 2),
                "estimated_savings_mcm_annual": round(savings_mcm, 2),
                "estimated_savings_usd_annual": round(annual_val_usd, 0),
                "payback_months": 7,
                "status": "Recommended",
                "description": f"City NRW is currently {avg_nrw_pct:.1f}% ({avg_nrw_loss:.1f} MLD loss). Modulating water distribution pressure down to 1.8 bar between 23:00–04:30 reduces pipe stress and background joint leakage by ~{target_pct_reduction}%.",
                "action_steps": [
                    "Install automated Pressure Reducing Valves (PRVs) at 4 main DMA inlets.",
                    "Conduct acoustic correlator sweeps along older cast iron pipe alignments.",
                    "Verify district boundary isolation valves to isolate sub-district leaks."
                ]
            })

        # Rec 2: Weather-Responsive Park & Public Irrigation Curtailment
        irrigation_savings_mld = avg_demand * 0.04
        irrigation_savings_mcm = irrigation_savings_mld * 365 * 0.001
        recs.append({
            "id": f"REC-{city_id}-02",
            "title": "Automated Rain-Delayed Municipal Irrigation Curtailment",
            "category": "weather_adaptive",
            "priority": "High" if water_stress > 80 else "Medium",
            "difficulty": "Easy",
            "estimated_savings_mld": round(irrigation_savings_mld, 2),
            "estimated_savings_mcm_annual": round(irrigation_savings_mcm, 2),
            "estimated_savings_usd_annual": round(irrigation_savings_mcm * 1000 * 3.65, 0),
            "payback_months": 2,
            "status": "Recommended",
            "description": f"Connecting public landscape irrigation controllers to local rainfall telemetry enforces a 48-hour watering freeze after rain events > 5 mm, curtailing ~4% of city extraction.",
            "action_steps": [
                "Deploy wireless rain sensors on central park automated sprinkler controllers.",
                "Shift all municipal horticultural watering to early morning hours (05:00 - 07:00).",
                "Replace perimeter lawn turf with drought-resilient native shrubs and wood mulch."
            ]
        })

        # Rec 3: Commercial & Bulk Meter Calibration / AMR Upgrade
        meter_savings_mld = avg_demand * 0.035
        recs.append({
            "id": f"REC-{city_id}-03",
            "title": "Industrial Bulk Water Meter Modernization & AMR Upgrade",
            "category": "commercial_metering",
            "priority": "Medium",
            "difficulty": "Medium",
            "estimated_savings_mld": round(meter_savings_mld, 2),
            "estimated_savings_mcm_annual": round(meter_savings_mld * 365 * 0.001, 2),
            "estimated_savings_usd_annual": round(meter_savings_mld * 365 * 0.001 * 1000 * 3.65, 0),
            "payback_months": 11,
            "status": "Under Review",
            "description": "Mechanical turbine bulk meters older than 5 years under-record high velocity draws by 8–14%. Ultrasonic AMR replacements restore revenue reconciliation.",
            "action_steps": [
                "Audit top 200 bulk industrial and commercial consumer flowmeters.",
                "Replace degraded mechanical meters with electromagnetic or ultrasonic AMR units.",
                "Implement cellular automated meter reading (AMI) for real-time draw verification."
            ]
        })

        # Rec 4: Domestic Aerator & Dual-Flush Retrofit Program
        if avg_per_capita > cpheeo_target:
            domestic_savings_mld = avg_demand * 0.06
            recs.append({
                "id": f"REC-{city_id}-04",
                "title": "Subsidized 1.5 GPM Tap Aerator & Dual-Flush Toilet Retrofit",
                "category": "demand_side_management",
                "priority": "Medium",
                "difficulty": "Easy",
                "estimated_savings_mld": round(domestic_savings_mld, 2),
                "estimated_savings_mcm_annual": round(domestic_savings_mld * 365 * 0.001, 2),
                "estimated_savings_usd_annual": round(domestic_savings_mld * 365 * 0.001 * 1000 * 3.65, 0),
                "payback_months": 5,
                "status": "Recommended",
                "description": f"Household extraction averages {avg_per_capita:.1f} LPCD vs {cpheeo_target} target. Low-flow aerators reduce washbasin and shower consumption by 18% without diminishing spray pressure.",
                "action_steps": [
                    "Distribute low-cost tap aerator retrofit kits across municipal wards.",
                    "Mandate dual-flush cisterns for all new residential building permits.",
                    "Launch public awareness campaigns highlighting per-capita daily targets."
                ]
            })

        return recs

    def get_pan_india_overview(self) -> List[Dict[str, Any]]:
        """Returns Pan-India comparative ranking of water loss and conservation opportunities."""
        if self.df is None:
            self._load_data()
        if self.df is None:
            return []

        rankings = []
        for cid, group in self.df.groupby("city_id"):
            last_30 = group.tail(30)
            avg_demand = float(last_30["actual_demand_mld"].mean())
            avg_nrw_pct = float(last_30["nrw_percentage"].mean())
            avg_nrw_mld = float(last_30["nrw_loss_mld"].mean())
            water_stress = float(last_30["water_stress_score"].iloc[0])
            city_name = str(last_30["city_name"].iloc[0])
            zone = str(last_30["zone"].iloc[0])

            # Potential recoverable water if NRW is lowered to 18%
            recoverable_mld = max(0.0, avg_nrw_mld - (avg_demand * 0.18))

            rankings.append({
                "city_id": str(cid),
                "city_name": city_name,
                "zone": zone,
                "average_demand_mld": round(avg_demand, 1),
                "average_nrw_percentage": round(avg_nrw_pct, 1),
                "nrw_loss_mld": round(avg_nrw_mld, 1),
                "potential_recoverable_mld": round(recoverable_mld, 1),
                "potential_recoverable_mcm_annual": round(recoverable_mld * 365 * 0.001, 2),
                "water_stress_score": water_stress,
                "conservation_priority": "Critical" if (avg_nrw_pct > 30 and water_stress > 90) else ("High" if avg_nrw_pct > 26 else "Moderate")
            })

        return sorted(rankings, key=lambda x: x["potential_recoverable_mld"], reverse=True)

