"""
Intelligent Water Consumption Forecasting Platform
Module: clean_data.py - Data Cleaning & Validation Pipeline
Calibrated for: Migsun Vilaasa (Sector ETA-2, Greater Noida) 20 Households Dataset
"""

import os
import io
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATASETS_DIR = BASE_DIR / "datasets"
PROCESSED_DIR = DATASETS_DIR / "processed"
SYNTHETIC_DIR = DATASETS_DIR / "synthetic"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
SYNTHETIC_DIR.mkdir(parents=True, exist_ok=True)

RAW_FILE = DATASETS_DIR / "migsun_vilaasa_water_consumption.csv"
OUTPUT_TS_FILE = PROCESSED_DIR / "migsun_vilaasa_daily_timeseries.csv"
OUTPUT_BASELINE_FILE = PROCESSED_DIR / "migsun_vilaasa_baseline_end_use.csv"
OUTPUT_BENCHMARK_FILE = PROCESSED_DIR / "migsun_vilaasa_benchmarks.csv"
OUTPUT_CLEANED_COMPAT = PROCESSED_DIR / "cleaned_water_consumption.csv"
OUTPUT_SYNTHETIC_COMPAT = SYNTHETIC_DIR / "synthetic_water_consumption.csv"

def clean_and_process():
    print("=" * 80)
    print("AQUAPULSE: MIGSUN VILAASA DATA CLEANING & VALIDATION PIPELINE")
    print("=" * 80)

    if not RAW_FILE.exists():
        raise FileNotFoundError(f"Raw dataset not found at: {RAW_FILE}")

    print(f"Reading raw dataset from: {RAW_FILE}")
    with open(RAW_FILE, "r", encoding="utf-8") as f:
        lines = f.readlines()

    print(f"Total lines in file: {len(lines)}")

    ts_start = None
    bm_start = None
    for i, l in enumerate(lines):
        if l.startswith("Date,Day_of_Week"):
            ts_start = i
        if l.startswith("Parameter / Scenario"):
            bm_start = i

    # 1. Baseline Household End-Use Data (20 Flats)
    baseline_csv = lines[3] + "".join([l for l in lines[4:ts_start] if l.strip() and not l.startswith("TOTAL") and not l.startswith("30-Day") and not l.startswith('"Structured') and not l.strip() == ",,,,,,,,,,,,,,"])
    df_baseline = pd.read_csv(io.StringIO(baseline_csv))
    df_baseline = df_baseline.dropna(subset=["Flat_ID"]).reset_index(drop=True)
    df_baseline.to_csv(OUTPUT_BASELINE_FILE, index=False)
    print(f"[1/3] Processed 20 Households Baseline: {len(df_baseline)} flats saved to {OUTPUT_BASELINE_FILE.name}")

    # 2. 30-Day Daily Time-Series Data (20 Flats × 30 Days = 600 records)
    ts_csv = lines[ts_start] + "".join([l for l in lines[ts_start+1:bm_start] if l.strip() and not l.startswith("Report") and not l.strip() == ",,,,"])
    df_ts = pd.read_csv(io.StringIO(ts_csv))
    df_ts["Date"] = pd.to_datetime(df_ts["Date"], errors="coerce")
    df_ts = df_ts.dropna(subset=["Date", "Flat_ID", "House_Daily_Consumption_L"]).reset_index(drop=True)
    df_ts["Date"] = df_ts["Date"].dt.strftime("%Y-%m-%d")
    df_ts.to_csv(OUTPUT_TS_FILE, index=False)
    print(f"[2/3] Processed 30-Day Time Series: {len(df_ts)} records across {df_ts['Flat_ID'].nunique()} flats saved to {OUTPUT_TS_FILE.name}")

    # 3. Report Benchmarks & Regulatory Scenarios
    bm_csv = lines[bm_start] + "".join([l for l in lines[bm_start+1:] if l.strip()])
    df_bm = pd.read_csv(io.StringIO(bm_csv))
    df_bm.to_csv(OUTPUT_BENCHMARK_FILE, index=False)
    print(f"[3/3] Processed Reference Benchmarks: {len(df_bm)} scenarios saved to {OUTPUT_BENCHMARK_FILE.name}")

    # 4. Standard Compatibility Data
    df_compat = df_ts.copy()
    df_compat["date"] = df_compat["Date"]
    df_compat["location"] = "Migsun Vilaasa - " + df_compat["Flat_ID"]
    df_compat["consumption_liters"] = df_compat["House_Daily_Consumption_L"]
    df_compat["rainfall_mm"] = df_compat["Rainfall_mm"]
    df_compat["temperature_c"] = df_compat["Temperature_C"]
    df_compat["source_type"] = "migsun_vilaasa_baseline"
    compat_cols = ["date", "location", "consumption_liters", "rainfall_mm", "temperature_c", "source_type"]
    df_compat[compat_cols].to_csv(OUTPUT_CLEANED_COMPAT, index=False)
    df_compat[compat_cols].to_csv(OUTPUT_SYNTHETIC_COMPAT, index=False)
    print(f"Generated backwards-compatible mirrors in {OUTPUT_CLEANED_COMPAT.name} and {OUTPUT_SYNTHETIC_COMPAT.name}")

    print("\nData cleaning & validation completed successfully!")
    print(f"Time-series date span : {df_ts['Date'].min()} to {df_ts['Date'].max()}")
    print(f"Daily household demand : Mean = {df_ts['House_Daily_Consumption_L'].mean():.2f} L, Min = {df_ts['House_Daily_Consumption_L'].min():.2f} L, Max = {df_ts['House_Daily_Consumption_L'].max():.2f} L")
    print(f"Per-head consumption  : Mean = {df_ts['Per_Head_Consumption_L (LPCD)'].mean():.2f} LPCD (Form-1A Design: 86 LPCD)")
    return df_ts

if __name__ == "__main__":
    clean_and_process()
