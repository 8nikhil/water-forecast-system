from typing import List, Dict, Any
from ..config import settings

class ConservationRecommender:
    def __init__(self):
        self.water_rate_per_liter = settings.WATER_RATE_PER_CUBIC_METER / 1000.0

    def generate_recommendations(
        self,
        household_id: int,
        daily_average_liters: float,
        occupants: int,
        has_garden: bool,
        active_leaks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes consumption analytics, anomaly events, and property metadata
        into actionable, quantified water and monetary savings recommendations.
        """
        recs = []
        per_capita_daily = daily_average_liters / max(occupants, 1)

        # 1. Immediate Leak Remediation if active leak exists
        if active_leaks:
            top_leak = active_leaks[0]
            hourly_leak = top_leak.get("flow_rate_liters_per_hour", 12.0)
            monthly_leak_liters = hourly_leak * 24.0 * 30.0
            monthly_usd = monthly_leak_liters * self.water_rate_per_liter

            recs.append({
                "household_id": household_id,
                "title": "Repair Active Continuous Baseline Leak",
                "category": "leak_fix",
                "impact_level": "high",
                "difficulty": "easy",
                "potential_saving_liters_month": round(monthly_leak_liters, 0),
                "potential_saving_usd_month": round(monthly_usd, 2),
                "estimated_payback_days": 1,
                "status": "pending",
                "description": f"Smart meter anomaly detection flagged continuous night loss of {hourly_leak:.1f} L/h. Replacing a worn flapper valve or cartridge stops this loss immediately.",
                "action_steps": "1. Add 5 drops of food dye into the toilet tank; check if bowl turns blue without flushing.\n2. Inspect boiler pressure relief valve.\n3. Replace toilet flapper or tighten supply hose washer."
            })

        # 2. WaterSense Low-Flow Aerators & Showerheads
        if per_capita_daily > 110.0:
            fixture_liters_saved = per_capita_daily * 0.18 * occupants * 30.0
            fixture_usd_saved = fixture_liters_saved * self.water_rate_per_liter
            recs.append({
                "household_id": household_id,
                "title": "Install WaterSense 1.5 GPM Faucet Aerators & Showerheads",
                "category": "fixtures",
                "impact_level": "high",
                "difficulty": "easy",
                "potential_saving_liters_month": round(fixture_liters_saved, 0),
                "potential_saving_usd_month": round(fixture_usd_saved, 2),
                "estimated_payback_days": 28,
                "status": "pending",
                "description": "Standard fixtures run at 2.5 GPM. Ultra-efficient aerators maintain strong spray pressure while curtailing flow to 1.5 GPM, trimming indoor draw by 18%.",
                "action_steps": "1. Unscrew existing faucet tips using pliers with a cloth wrap.\n2. Screw on 1.5 GPM WaterSense aerators on bathroom and kitchen faucets.\n3. Swap primary showerhead with an EPA certified low-flow model."
            })

        # 3. Garden / Outdoor Irrigation Optimization
        if has_garden:
            irrigation_saved = daily_average_liters * 0.14 * 30.0
            irrigation_usd = irrigation_saved * self.water_rate_per_liter
            recs.append({
                "household_id": household_id,
                "title": "Shift Irrigation to 05:00 AM & Install Rain Delay Sensor",
                "category": "irrigation",
                "impact_level": "medium",
                "difficulty": "easy",
                "potential_saving_liters_month": round(irrigation_saved, 0),
                "potential_saving_usd_month": round(irrigation_usd, 2),
                "estimated_payback_days": 14,
                "status": "pending",
                "description": "Mid-day watering loses up to 35% of water directly to solar evaporation. Watering before dawn directs 90%+ moisture deep to root zones.",
                "action_steps": "1. Adjust sprinkler timer to run between 04:30 AM and 06:30 AM.\n2. Add a $25 smart soil moisture or rain cutoff switch.\n3. Apply 2-3 inches of organic wood mulch around planter beds."
            })

        # 4. High-Efficiency Washing Machine Full-Load Policy
        laundry_saved = occupants * 450.0 # ~450 L/month per occupant
        laundry_usd = laundry_saved * self.water_rate_per_liter
        recs.append({
            "household_id": household_id,
            "title": "Run Full Laundry Loads & Eco-Cycle",
            "category": "behavior",
            "impact_level": "medium",
            "difficulty": "easy",
            "potential_saving_liters_month": round(laundry_saved, 0),
            "potential_saving_usd_month": round(laundry_usd, 2),
            "estimated_payback_days": 0,
            "status": "pending",
            "description": "Washing machines consume 40 to 90 liters per wash regardless of weight. Consolidating into full loads reduces cycles by 2-3 times per week.",
            "action_steps": "1. Wait until laundry basket is 80% full before initiating cycle.\n2. Select Eco-Wash 30°C setting.\n3. Keep spin cycle high to decrease tumble dryer runtime."
        })

        # 5. Dual Flush Conversion
        toilet_saved = occupants * 600.0
        toilet_usd = toilet_saved * self.water_rate_per_liter
        recs.append({
            "household_id": household_id,
            "title": "Dual-Flush Toilet Valve Conversion",
            "category": "fixtures",
            "impact_level": "medium",
            "difficulty": "moderate",
            "potential_saving_liters_month": round(toilet_saved, 0),
            "potential_saving_usd_month": round(toilet_usd, 2),
            "estimated_payback_days": 45,
            "status": "pending",
            "description": "Retrofit existing standard single-flush toilets with a dual-flush conversion siphon, enabling a 3.5L half-flush for liquid waste.",
            "action_steps": "1. Shut off toilet shutoff angle stop and flush remaining water.\n2. Unclip standard siphon tube and install dual-flush drop-in valve.\n3. Calibrate half-flush buoyancy ring."
        })

        return recs

