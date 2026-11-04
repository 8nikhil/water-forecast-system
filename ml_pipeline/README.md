# 🧠 AquaPulse Machine Learning & Predictive Analytics Pipeline

This directory contains the machine learning subsystem for **AquaPulse**, providing time-series water demand forecasting, climatic sensitivity modeling, and anomaly detection across 21 metropolitan grids in India.

---

## 📊 Overview

- **Algorithm:** 200-Tree Random Forest Regressor Ensemble (`best_water_consumption_model.pkl`)
- **Dataset:** 15,057 historical daily municipal records across 21 Indian metropolitan regions (2020–2024)
- **Features:** 52 engineered causal dimensions (autoregressive demand lags, climate elasticity, seasonal flags, calendar events)
- **Performance:**
  - **Holdout Test $R^2$ Score:** **0.9983 (99.83%)**
  - **Mean Absolute Error (MAE):** **20.78 MLD** (~1.2% mean percentage error)
  - **Root Mean Squared Error (RMSE):** **40.47 MLD**
  - **Inference Latency:** **< 60 ms** per forecast

---

## 📁 Directory Structure

```
ml_pipeline/
├── models/                           # Serialized model bundles and artifacts
│   ├── best_water_consumption_model.pkl # Production ensemble (72.9 MB)
│   ├── evaluation_metrics.json       # Quantitative performance matrix
│   ├── model_summary.txt             # Model metadata and hyperparameters
│   ├── random_forest.pkl             # Baseline Random Forest model
│   ├── gradient_boosting.pkl         # Gradient Boosting Regressor
│   ├── xgboost_regressor.pkl         # XGBoost Regressor
│   ├── ridge_regression.pkl          # Ridge Regression baseline
│   └── linear_regression.pkl         # OLS Linear Regression baseline
├── audit_reports/                    # Rigorous ML diagnostics and evaluations
│   └── metrics/                      # JSON audit metrics & residual tables
├── plots/                            # Diagnostic visual figures (kaTeX & matplotlib)
├── predict.py                        # Core production inference engine
├── train_and_evaluate.py             # 5-Model training & benchmarking script
├── run_model_audit.py                # Comprehensive 7-pillar model audit script
├── inspect_model.py                  # Model inspection utility
├── clean_data.py                     # Data cleaning & imputation script
├── generate_synthetic_data.py        # Synthetic test dataset generator
├── test_predict.py                   # 7-suite validation & unit test suite
├── requirements.txt                  # Python dependencies for ML pipeline
└── README.md                         # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd ml_pipeline
pip install -r requirements.txt
```

### 2. Run Test Suite
Validate the inference engine, physical boundary checks, and autoregressive forecasting:
```bash
python test_predict.py
```

### 3. Generate Single or Horizon Predictions
```bash
# Run CLI prediction demo
python predict.py
```

### 4. Train & Benchmark Models
Train all 5 baseline models from raw telemetry and output evaluation metrics:
```bash
python train_and_evaluate.py
```

### 5. Run Model Diagnostics Audit
Generate residual distributions, feature importance breakdowns, and train/test gap analysis:
```bash
python run_model_audit.py
```

---

## 🔬 Model Specifications

| Property | Value |
|---|---|
| **Primary Algorithm** | `RandomForestRegressor(n_estimators=200, max_depth=25, min_samples_split=4, random_state=42)` |
| **Target Variable** | `daily_consumption_mld` (Million Litres per Day) |
| **Input Features (52)** | Lag features (`lag_1`, `lag_7`, `lag_14`, `lag_30`), Rolling averages (7-day, 14-day), Meteorological covariates (`temp_max`, `temp_min`, `rainfall_mm`, `solar_rad`), Day-of-week, Month, Season, Festival indicators |
| **Output Metrics** | Daily forecasted MLD, 95% confidence ceiling/floor, Total MCM volume, Billion Litres |

