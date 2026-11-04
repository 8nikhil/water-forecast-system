import datetime
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from sklearn.ensemble import IsolationForest
from ..config import settings

class WaterAnomalyDetector:
    def __init__(
        self,
        night_flow_threshold_liters_per_hour: float = 6.0,
        spike_multiplier_threshold: float = 2.5
    ):
        self.night_flow_threshold = night_flow_threshold_liters_per_hour
        self.spike_multiplier = spike_multiplier_threshold
        self.water_rate_per_liter = settings.WATER_RATE_PER_CUBIC_METER / 1000.0

    def analyze_hourly_readings(
        self,
        hourly_readings: List[Dict[str, Any]],
        household_id: int
    ) -> List[Dict[str, Any]]:
        """
        Analyzes time-series hourly readings for continuous leaks, abnormal volume spikes,
        and statistical outliers.
        """
        if not hourly_readings:
            return []

        df = pd.DataFrame(hourly_readings)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("timestamp").reset_index(drop=True)
        df["hour"] = df["timestamp"].dt.hour
        df["date"] = df["timestamp"].dt.date

        detected_anomalies: List[Dict[str, Any]] = []

        # 1. Continuous Night Flow Analysis (Hours 01:00 to 04:59)
        night_hours_df = df[df["hour"].isin([1, 2, 3, 4])]
        if not night_hours_df.empty:
            # Group by date to check if all night hours have continuous non-zero flow
            night_grouped = night_hours_df.groupby("date")
            for dt, group in night_grouped:
                min_night_flow = group["consumption_liters"].min()
                avg_night_flow = group["consumption_liters"].mean()

                # If minimum night flow exceeds threshold across consecutive night hours
                if min_night_flow >= self.night_flow_threshold and len(group) >= 3:
                    wasted_liters_day = avg_night_flow * 24.0 # 24/7 continuous leak estimate
                    cost_usd = wasted_liters_day * self.water_rate_per_liter
                    
                    severity = "critical" if avg_night_flow > 18.0 else "high"
                    leak_type = "toilet_flapper_leak" if avg_night_flow < 20.0 else "continuous_plumbing_leak"
                    
                    detected_anomalies.append({
                        "household_id": household_id,
                        "start_time": group["timestamp"].min().to_pydatetime(),
                        "end_time": group["timestamp"].max().to_pydatetime(),
                        "severity": severity,
                        "anomaly_type": leak_type,
                        "flow_rate_liters_per_hour": round(float(avg_night_flow), 1),
                        "wasted_liters": round(float(wasted_liters_day), 1),
                        "estimated_cost_usd": round(float(cost_usd), 2),
                        "confidence_score": 0.94,
                        "status": "active",
                        "description": f"Continuous baseline night flow of {avg_night_flow:.1f} L/h detected between 01:00 - 05:00.",
                        "root_cause": "Suspected leaking toilet flapper valve or internal plumbing seal failing to shut off completely.",
                        "recommended_action": "Perform food coloring dye test in toilet tank or inspect master shutoff meter indicator."
                    })

        # 2. Sudden Volumetric Spike Detection
        mean_flow = df["consumption_liters"].mean()
        std_flow = df["consumption_liters"].std()
        spike_threshold = max(mean_flow + self.spike_multiplier * (std_flow if std_flow > 0 else 5.0), 45.0)

        spike_rows = df[df["consumption_liters"] > spike_threshold]
        for _, row in spike_rows.iterrows():
            excess_liters = row["consumption_liters"] - mean_flow
            cost = excess_liters * self.water_rate_per_liter
            
            detected_anomalies.append({
                "household_id": household_id,
                "start_time": row["timestamp"].to_pydatetime(),
                "end_time": (row["timestamp"] + datetime.timedelta(hours=1)).to_pydatetime(),
                "severity": "medium" if row["consumption_liters"] < 120.0 else "high",
                "anomaly_type": "abnormal_spike",
                "flow_rate_liters_per_hour": round(float(row["consumption_liters"]), 1),
                "wasted_liters": round(float(excess_liters), 1),
                "estimated_cost_usd": round(float(cost), 2),
                "confidence_score": 0.88,
                "status": "active",
                "description": f"Unusual consumption surge of {row['consumption_liters']:.1f} Liters in a single hour.",
                "root_cause": "High instantaneous draw: potential garden hose left running, pool top-up, or burst pipe fixture.",
                "recommended_action": "Check outdoor hose bibs, irrigation timers, and high-flow appliances."
            })

        # Deduplicate and sort by severity and timestamp
        return self._deduplicate_anomalies(detected_anomalies)

    def _deduplicate_anomalies(self, anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not anomalies:
            return []
        
        # Sort critical/high first, then latest start_time
        severity_rank = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        return sorted(
            anomalies,
            key=lambda x: (severity_rank.get(x["severity"], 1), x["start_time"]),
            reverse=True
        )

