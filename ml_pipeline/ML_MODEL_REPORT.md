# Machine Learning Engineering Technical Report
## Project: Intelligent Water Consumption Forecasting and Conservation Analytics Platform Using Predictive Data Analytics

---

## 1. Executive Summary & Objective

This technical report details the development, cross-validation, and production serialization of the machine learning demand forecasting engine for **AquaPulse** (*Intelligent Water Consumption Forecasting and Conservation Analytics Platform*). 

The platform leverages multi-year empirical telemetry across **21 flagship municipal water boards** across India to forecast daily urban water demand ($\text{MLD}$ — Million Litres per Day). The models integrate autoregressive demand dynamics, climatic elasticity (ambient heat waves, monsoonal rainfall suppression), calendar seasonality, and cultural festival consumption surges.

---

## 2. Dataset Architecture & Inspection Audit

### 2.1 File Specification & Dataset Provenance
* **Source Dataset**: `pan_india_daily_municipal_water.csv`
* **Geographic Coverage**: 21 Flagship Cities across 20 Indian States/UTs (*Delhi, Mumbai, Bengaluru, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad, Surat, Jaipur, Lucknow, Indore, Bhopal, Patna, Kochi, Visakhapatnam, Ludhiana, Gurugram, Bhubaneswar, Guwahati, Dehradun*).
* **Observation Count**: **15,351 total daily records** (731 continuous days per city).
* **Temporal Horizon**: **2023-01-01 to 2024-12-31** (2 full calendar years).
* **Feature Dimensionality**: 27 raw attributes.

### 2.2 Data Integrity, Missing Values & Duplicate Audit
| Audit Check | Status | Verification Detail |
| :--- | :--- | :--- |
| **Missing Values (NaN/Null)** | **0 (0.00%)** | All 27 columns are 100% complete without imputed or missing cells. |
| **Duplicate Records** | **0 (0.00%)** | Zero duplicate rows; unique primary composite index `(city_id, record_date)`. |
| **Data Types** | **Validated** | Datetime strings converted to `Timestamp`; numerical metrics parsed to `float64`/`int64`. |

### 2.3 Target Variable Identification: `actual_demand_mld`
The identified primary target variable is **`actual_demand_mld`** (Actual Daily Municipal Water Demand in Million Litres per Day).
* **Why not `bulk_supply_mld` or `billed_consumption_mld`?**  
  In water utility operations, supply is constrained by reservoir limits and pumping schedules, while billed consumption lags due to meter billing cycles. `actual_demand_mld` reflects true hydraulic consumption demand, which the utility must plan for and balance.

### 2.4 Statistical Distribution & Outlier Analysis
* **Mean Demand**: $995.63\text{ MLD}$
* **Median Demand**: $490.67\text{ MLD}$
* **Standard Deviation**: $1009.97\text{ MLD}$
* **Minimum Value**: $112.09\text{ MLD}$ (Dehradun, winter baseline)
* **Maximum Value**: $5469.79\text{ MLD}$ (Mumbai, peak summer heatwave)
* **Interquartile Range (IQR)**: $\text{Q1} = 301.71\text{ MLD}$, $\text{Q3} = 1361.55\text{ MLD}$ ($\text{IQR} = 1059.84\text{ MLD}$).
* **Outlier Interpretation**: Global statistical IQR checks flag ~6.55% of points at the high end. Crucially, these are **not measurement errors or corrupted records**; rather, they reflect the demographic population difference between mega-cities (Mumbai: 12.5M population, 4015 MLD mean) and mountain valley municipalities (Dehradun: 680k population, 138 MLD mean). City-specific variance within each municipality shows normal Gaussian distributions.

---

## 3. Data Preprocessing & Feature Engineering

To capture physical water consumption behavior without introducing data leakage, features were computed **strictly within each city's temporal series**:

1. **Autoregressive Lag Features**:
   * `demand_lag_1` ($t-1$ demand): Captures immediate prior-day persistence.
   * `demand_lag_2` ($t-2$ demand) & `demand_lag_3` ($t-3$ demand): Short-term momentum.
   * `demand_lag_7` ($t-7$ demand): Captures strict weekly cyclicality (e.g., Sunday household washing peak).
   * `demand_lag_14` ($t-14$ demand): Bi-weekly baseline persistence.

2. **Trailing Rolling Statistics (Strictly Shifted by 1 Day)**:
   * To prevent lookahead leakage, all rolling statistics use $t-1$ as their anchor:
   * `rolling_mean_7`: 7-day trailing moving average.
   * `rolling_std_7`: 7-day trailing demand volatility.
   * `rolling_min_7` & `rolling_max_7`: 7-day trailing demand bounds.
   * `rolling_mean_14`: 14-day trailing smoothed baseline.
   * `ratio_to_7d_mean`: Normalized surge index ($t-1 / \text{mean}_{7d}$).

3. **Climatic Elasticity Interactions**:
   * `temp_range_c`: Diurnal temperature variation ($\text{max\_temp} - \text{min\_temp}$).
   * `heat_index_proxy`: Combined heat stress index ($\text{max\_temp} \times [1.0 + \text{solar} / 30.0]$).
   * `precipitation_mm`: Quantifies rainfall suppression on municipal and garden demand.

4. **Cyclical Calendar Encodings**:
   * Sine and Cosine harmonic transforms for `month` ($1\dots12$) and `day_of_week` ($0\dots6$) to represent continuous cyclical time.
   * Binary `is_weekend` and `is_festival` (major surges during Holi, Diwali, Pongal, Durga Puja).

5. **Categorical City & Zone Encoding**:
   * One-hot dummy encoding for 21 cities and 7 geographical zones.

---

## 4. Chronological Train-Test Split (Zero Lookahead Leakage)

Unlike random K-Fold splits which cause catastrophic data leakage in time series (predicting the past using future information), we implemented strict **Chronological Holdout Splitting**:

* **Training Set (80%)**: **12,033 daily records**  
  * Horizon: **2023-01-15 to 2024-08-09** (~19 continuous months).
* **Holdout Test Set (20%)**: **3,024 daily records**  
  * Horizon: **2024-08-10 to 2024-12-31** (~5 continuous months).
  * Evaluates post-monsoon and winter demand across all 21 cities.

---

## 5. Model Benchmarking & Performance Comparison

Five algorithms were trained and cross-validated under identical conditions:
1. **Linear Regression** (with StandardScaler pipeline)
2. **Ridge Regression** (L2 regularized, $\alpha=10.0$)
3. **Random Forest Regressor** ($200\text{ trees}$, $\text{max\_depth}=16$)
4. **Gradient Boosting Regressor** ($250\text{ estimators}$, $\text{learning\_rate}=0.05$, $\text{max\_depth}=5$)
5. **XGBoost Regressor** ($250\text{ estimators}$, $\text{learning\_rate}=0.04$, $\text{max\_depth}=5$)

### 5.1 Comparative Benchmark Matrix

| Model Algorithm | MAE (MLD) | RMSE (MLD) | MSE | R² Score (%) | MAPE (%) | Train Time |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Random Forest [CHAMPION]** | **20.788** | **40.471** | **1,637.89** | **99.833%** | **2.00%** | **2.89s** |
| **Gradient Boosting** | 22.377 | 40.273 | 1,621.92 | 99.834% | 2.46% | 14.42s |
| **XGBoost Regressor** | 23.195 | 41.374 | 1,711.82 | 99.825% | 2.64% | 2.01s |
| **Linear Regression** | 40.398 | 70.957 | 5,034.94 | 99.486% | 6.39% | 0.13s |
| **Ridge Regression** | 40.365 | 71.132 | 5,059.83 | 99.483% | 6.29% | 0.03s |

### 5.2 Key Takeaways & Champion Selection
* **Champion Model**: **Random Forest Regressor** achieved the lowest Mean Absolute Error (**20.788 MLD** across an average city demand of ~1,000 MLD) and an exceptional **MAPE of 2.00%**.
* Non-linear ensemble trees significantly out-performed regularized linear regression (cutting MAE by **48.5%** from 40.39 MLD down to 20.78 MLD).
* Gradient Boosting and Random Forest both explain **>99.8% of the total variance**, confirming that the engineered feature set fully captures diurnal, seasonal, and demographic dynamics.

---

## 6. Feature Importance & Interpretability

Based on Gini impurity reduction from the champion ensemble model:

1. **7-Day Trailing Moving Average (`rolling_mean_7`)** (38.4%): The dominant operational baseline.
2. **Prior Day Demand (`demand_lag_1`)** (26.7%): Strong autoregressive daily continuity.
3. **14-Day Trailing Moving Average (`rolling_mean_14`)** (14.2%): Long-term seasonal inertia.
4. **Same-Day Last Week (`demand_lag_7`)** (6.8%): Day-of-week household routines.
5. **City Demographics (Mumbai, Delhi, Kolkata, Bengaluru)** (5.9%): Baseline scale offsets.
6. **Climatic Heat Index & Ambient Temperature** (3.4%): Summer cooling & evaporative surge.
7. **Festival Surges (`is_festival`)** (1.8%): Distinct holiday demand shifts.

---

## 7. Generated Visualizations & Artifacts

All charts were rendered at 300 DPI and saved directly in `ml_pipeline/plots/`:
1. `model_accuracy_metrics_comparison.png`: 4-panel comparison of MAE, RMSE, MSE, and R² scores across all models.
2. `actual_vs_predicted_consumption.png`: Chronological time series tracking across flagship cities + scatter correlation plot ($N=3,024$).
3. `feature_importance.png`: Horizontal importance ranking of the top 15 driving features.
4. `residual_distribution_analysis.png`: Residual histogram and homoscedasticity scatter confirming zero-mean Gaussian errors.

---

## 8. Production Serialization & Inference Usage

### 8.1 Model Files
* Champion Bundle: `ml_pipeline/models/best_water_consumption_model.pkl` (contains model, feature columns, scaler metadata, and cities dictionary).
* Metrics JSON: `ml_pipeline/models/evaluation_metrics.json`.

### 8.2 Standalone Prediction Script (`predict.py`)
A production-ready CLI and Python module has been created at `ml_pipeline/predict.py`.

#### Single-Day Prediction
```bash
python ml_pipeline/predict.py --city BLR --date 2025-06-01 --max-temp 33.0 --min-temp 21.5 --lag1 1520.0
```

#### Multi-Day Recursive Horizon Forecasting (e.g., 14 Days)
```bash
python ml_pipeline/predict.py --horizon --city DEL --days 14 --output-csv forecast_delhi_14d.csv
```

#### Batch Inference on CSV
```bash
python ml_pipeline/predict.py --batch --input-csv sample_inputs.csv --output-csv predictions.csv
```

#### Programmatic Python API
```python
from ml_pipeline.predict import WaterDemandForecaster

forecaster = WaterDemandForecaster()
forecast = forecaster.predict_single({
    "city_id": "BLR",
    "date": "2025-06-01",
    "max_temp_c": 32.5,
    "min_temp_c": 21.0,
    "precipitation_mm": 0.0,
    "demand_lag_1": 1540.0
})
print("Forecast (MLD):", forecast["predicted_demand_mld"])
print("95% Confidence Interval:", forecast["confidence_interval_95_mld"])
```

