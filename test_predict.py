"""
AquaPulse Inference Test Suite: test_predict.py
Validates predict.py under multiple production scenarios:
1. Single daily forecast with explicit inputs
2. Single daily forecast with auto-inferred profile defaults
3. Input validation & error handling (invalid city, invalid dates, physical violations)
4. Multi-day recursive daily horizon forecast
5. Monthly aggregated forecast (MLD-Days, MCM, Peak & Min demand)
6. Multi-month seasonal planning horizon
7. Batch CSV prediction
"""

import os
import sys
import pandas as pd
from predict import (
    WaterConsumptionPredictor,
    ValidationError,
    ModelLoadError
)

def run_all_tests():
    print("=" * 80)
    print("RUNNING AQUAPULSE PREDICTION ENGINE COMPREHENSIVE TEST SUITE")
    print("=" * 80)

    # Test 0: Model Loading
    print("\n[TEST 0] Initializing WaterConsumptionPredictor...")
    try:
        predictor = WaterConsumptionPredictor()
        print(f"  [PASS] Successfully loaded model bundle: '{predictor.model_name}'")
        print(f"  [PASS] Feature vector dimension: {len(predictor.encoded_features)} columns")
        print(f"  [PASS] Model expected RMSE: +/-{predictor.rmse:.2f} MLD")
    except Exception as e:
        print(f"  [FAIL] Model load failed: {e}")
        return False

    # Test 1: Daily Forecast with Explicit Inputs
    print("\n[TEST 1] Daily Forecast with Explicit Inputs (Bengaluru - Summer Day)...")
    res1 = predictor.predict_daily({
        "city": "BLR",
        "date": "2025-05-15",
        "max_temp_c": 34.0,
        "min_temp_c": 22.5,
        "precipitation_mm": 0.0,
        "solar_radiation_mj": 22.0,
        "demand_lag_1": 1520.0
    })
    print(f"  City: {res1['city_name']} ({res1['city_id']})")
    print(f"  Date: {res1['forecast_date']} ({res1['day_of_week']})")
    print(f"  Predicted Water Demand: {res1['predicted_demand_mld']:.2f} MLD")
    print(f"  95% Confidence Interval: [{res1['confidence_interval_95_mld']['lower']} MLD, {res1['confidence_interval_95_mld']['upper']} MLD]")
    print(f"  Equivalent Volume: {res1['equivalent_million_cubic_meters']} MCM / {res1['equivalent_billion_litres']} Billion Litres")
    assert res1["predicted_demand_mld"] > 0, "Predicted demand must be positive"
    assert res1["confidence_interval_95_mld"]["lower"] <= res1["predicted_demand_mld"] <= res1["confidence_interval_95_mld"]["upper"]
    print("  [PASS] Single explicit daily forecast validated successfully.")

    # Test 2: Daily Forecast with Minimal Inputs (Auto-Inferred Defaults)
    print("\n[TEST 2] Daily Forecast with Minimal Inputs (City Name & Future Date)...")
    res2 = predictor.predict_daily({
        "city": "Delhi",
        "date": "2025-06-01"
    })
    print(f"  City: {res2['city_name']} ({res2['city_id']})")
    print(f"  Date: {res2['forecast_date']} ({res2['day_of_week']})")
    print(f"  Predicted Water Demand: {res2['predicted_demand_mld']:.2f} MLD")
    print(f"  95% CI: [{res2['confidence_interval_95_mld']['lower']}, {res2['confidence_interval_95_mld']['upper']}] MLD")
    assert res2["predicted_demand_mld"] > 2000.0, "Delhi demand should reflect metropolitan scale (~2500-3200 MLD)"
    print("  [PASS] Auto-inference from city profile validated successfully.")

    # Test 3: Input Validation & Physics Boundary Checks
    print("\n[TEST 3] Input Validation & Error Handling Checks...")
    
    # 3a. Invalid City
    try:
        predictor.predict_daily({"city": "Atlantis", "date": "2025-05-15"})
        print("  [FAIL] Unrecognized city did not raise ValidationError")
        return False
    except ValidationError as ve:
        print(f"  [PASS] Caught expected invalid city error: {str(ve)[:60]}...")

    # 3b. Invalid Date
    try:
        predictor.predict_daily({"city": "DEL", "date": "not-a-valid-date"})
        print("  [FAIL] Invalid date did not raise ValidationError")
        return False
    except ValidationError as ve:
        print(f"  [PASS] Caught expected invalid date error: {str(ve)[:60]}...")

    # 3c. Physical Violation: Min Temp > Max Temp
    try:
        predictor.predict_daily({
            "city": "BOM",
            "date": "2025-05-15",
            "max_temp_c": 20.0,
            "min_temp_c": 35.0
        })
        print("  [FAIL] Physical temperature violation did not raise ValidationError")
        return False
    except ValidationError as ve:
        print(f"  [PASS] Caught expected physical temperature error: {str(ve)[:65]}...")

    # 3d. Negative Precipitation
    try:
        predictor.predict_daily({
            "city": "MAA",
            "date": "2025-05-15",
            "precipitation_mm": -10.0
        })
        print("  [FAIL] Negative precipitation did not raise ValidationError")
        return False
    except ValidationError as ve:
        print(f"  [PASS] Caught expected negative precipitation error: {str(ve)[:65]}...")

    # Test 4: Recursive Daily Multi-Day Horizon (14 Days for Jaipur)
    print("\n[TEST 4] Recursive Multi-Day Horizon Forecast (14 Days for Jaipur - JAI)...")
    df_14d = predictor.predict_daily_horizon(city="JAI", start_date="2025-06-01", days=14)
    print(f"  Generated {len(df_14d)} daily step forecasts:")
    print(df_14d[["date", "day_of_week", "predicted_demand_mld", "volume_mcm"]].head(5).to_string(index=False))
    assert len(df_14d) == 14, "Horizon length mismatch"
    assert not df_14d["predicted_demand_mld"].isna().any(), "No NaN values allowed"
    print("  [PASS] Recursive autoregressive 14-day horizon forecast validated successfully.")

    # Test 5: Monthly Forecast (Mumbai - May 2025)
    print("\n[TEST 5] Monthly Aggregated Water Consumption Forecast (Mumbai - May 2025)...")
    res_monthly = predictor.predict_month(city="BOM", year=2025, month=5)
    print(f"  Period: {res_monthly['forecast_period']} ({res_monthly['days_in_month']} days)")
    print(f"  Total Monthly Water Demand: {res_monthly['total_monthly_demand_mld_days']:,.2f} MLD-Days")
    print(f"  Total Monthly Volume: {res_monthly['total_monthly_volume_mcm']:,.3f} Million m³ (MCM)")
    print(f"  Total Monthly Volume: {res_monthly['total_monthly_billion_litres']:,.3f} Billion Litres")
    print(f"  Average Daily Consumption: {res_monthly['average_daily_demand_mld']:.2f} MLD")
    print(f"  Peak Day Demand: {res_monthly['peak_day']['demand_mld']:.2f} MLD on {res_monthly['peak_day']['date']}")
    print(f"  Minimum Day Demand: {res_monthly['minimum_day']['demand_mld']:.2f} MLD on {res_monthly['minimum_day']['date']}")
    print(f"  95% CI Range: [{res_monthly['confidence_interval_95']['total_mcm_lower']:.3f} MCM, {res_monthly['confidence_interval_95']['total_mcm_upper']:.3f} MCM]")
    assert res_monthly["total_monthly_demand_mld_days"] > 100000, "Mumbai monthly demand should exceed 100,000 MLD-Days"
    print("  [PASS] Full monthly forecast and volume conversion validated successfully.")

    # Test 6: Multi-Month Seasonal Planning Horizon (6 Months for Chennai - MAA)
    print("\n[TEST 6] Multi-Month Seasonal Planning Horizon (6 Months for Chennai)...")
    df_seasonal = predictor.predict_monthly_horizon(city="MAA", start_year=2025, start_month=6, num_months=6)
    print(df_seasonal[["period", "days", "total_volume_mcm", "total_billion_litres", "avg_daily_mld", "peak_day_mld"]].to_string(index=False))
    assert len(df_seasonal) == 6, "Expected 6 monthly projections"
    print("  [PASS] Multi-month seasonal planning forecast validated successfully.")

    # Test 7: Batch CSV Forecast
    print("\n[TEST 7] Batch Inference Test...")
    sample_df = pd.DataFrame([
        {"city_id": "BLR", "date": "2025-07-01", "max_temp_c": 31.0, "min_temp_c": 21.0, "precipitation_mm": 5.0},
        {"city_id": "DEL", "date": "2025-07-01", "max_temp_c": 38.0, "min_temp_c": 28.0, "precipitation_mm": 0.0},
        {"city_id": "HYD", "date": "2025-07-01", "max_temp_c": 33.0, "min_temp_c": 23.0, "precipitation_mm": 2.5},
        {"city_id": "CCU", "date": "2025-07-01", "max_temp_c": 34.0, "min_temp_c": 26.0, "precipitation_mm": 12.0},
        {"city_id": "PNQ", "date": "2025-07-01", "max_temp_c": 29.0, "min_temp_c": 22.0, "precipitation_mm": 8.0}
    ])
    temp_csv_in = "temp_test_batch_in.csv"
    temp_csv_out = "temp_test_batch_out.csv"
    sample_df.to_csv(temp_csv_in, index=False)

    df_out = predictor.predict_batch(temp_csv_in, temp_csv_out)
    print(f"  Batch processed {len(df_out)} records:")
    print(df_out[["city_id", "date", "predicted_demand_mld", "ci_lower_95_mld", "ci_upper_95_mld", "predicted_volume_mcm"]].to_string(index=False))
    assert not df_out["predicted_demand_mld"].isna().any(), "All batch records should have predictions"

    # Cleanup temporary test files
    if os.path.exists(temp_csv_in):
        os.remove(temp_csv_in)
    if os.path.exists(temp_csv_out):
        os.remove(temp_csv_out)
    print("  [PASS] Batch DataFrame/CSV inference validated successfully.")

    print("\n" + "=" * 80)
    print(" ALL 7 TEST SUITES PASSED PERFECTLY!")
    print("=" * 80)
    return True

if __name__ == "__main__":
    success = run_all_tests()
    if not success:
        sys.exit(1)

