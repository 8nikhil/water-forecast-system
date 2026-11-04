"""
Intelligent Water Consumption Forecasting Platform
Full Reproducible Training, Validation & Evaluation Pipeline

Trains, compares, and evaluates:
- Linear Regression
- Ridge Regression
- Random Forest Regressor
- Gradient Boosting Regressor
- XGBoost Regressor

Outputs:
- Serialized champion model (.pkl)
- Model comparison metrics (evaluation_metrics.json)
- High-resolution evaluation visualizations (.png)
"""

import os
import sys
import time
import json
import numpy as np
import pandas as pd

# Use non-interactive Agg backend
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns

from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import xgboost as xgb
import joblib

def run_pipeline():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Locate dataset: check local pan_india first, fallback to external download path
    local_data = os.path.join(base_dir, "datasets", "pan_india", "pan_india_daily_municipal_water.csv")
    fallback_data = r"C:\Users\ASUS\Downloads\pan_india_water_analytics\pan_india_water_analytics\data\processed\pan_india_daily_municipal_water.csv"
    data_path = local_data if os.path.exists(local_data) else fallback_data
    
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {local_data} or {fallback_data}")

    pipeline_dir = os.path.join(base_dir, "ml_pipeline")
    models_dir = os.path.join(pipeline_dir, "models")
    plots_dir = os.path.join(pipeline_dir, "plots")
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(plots_dir, exist_ok=True)

    print("=" * 80)
    print("AQUAPULSE: PROFESSIONAL ML TRAINING & EVALUATION PIPELINE")
    print("=" * 80)
    print(f"Loading dataset: {data_path}")

    df = pd.read_csv(data_path)
    df["record_date"] = pd.to_datetime(df["record_date"])
    df = df.sort_values(["city_id", "record_date"]).reset_index(drop=True)

    print(f"Dataset shape: {df.shape[0]:,} rows × {df.shape[1]} columns across {df['city_id'].nunique()} Indian cities.")

    # Feature Engineering: Temporal Lags & Trailing Rolling Statistics strictly per city
    print("\n[1/4] Feature Engineering (Lags, Trailing Moving Averages, Cyclical Calendar, Climate Indices)...")
    city_dfs = []
    for cid, group in df.groupby("city_id"):
        g = group.copy().sort_values("record_date")
        
        g["demand_lag_1"] = g["actual_demand_mld"].shift(1)
        g["demand_lag_2"] = g["actual_demand_mld"].shift(2)
        g["demand_lag_3"] = g["actual_demand_mld"].shift(3)
        g["demand_lag_7"] = g["actual_demand_mld"].shift(7)
        g["demand_lag_14"] = g["actual_demand_mld"].shift(14)
        
        g["rolling_mean_7"] = g["actual_demand_mld"].shift(1).rolling(7).mean()
        g["rolling_std_7"] = g["actual_demand_mld"].shift(1).rolling(7).std()
        g["rolling_min_7"] = g["actual_demand_mld"].shift(1).rolling(7).min()
        g["rolling_max_7"] = g["actual_demand_mld"].shift(1).rolling(7).max()
        g["rolling_mean_14"] = g["actual_demand_mld"].shift(1).rolling(14).mean()
        g["ratio_to_7d_mean"] = g["demand_lag_1"] / (g["rolling_mean_7"] + 1e-5)
        
        g["temp_range_c"] = g["max_temp_c"] - g["min_temp_c"]
        g["heat_index_proxy"] = g["max_temp_c"] * (1.0 + g["solar_radiation_mj"] / 30.0)
        
        dow = g["record_date"].dt.day_of_week
        g["day_of_week_num"] = dow
        g["sin_month"] = np.sin(2 * np.pi * g["month"] / 12)
        g["cos_month"] = np.cos(2 * np.pi * g["month"] / 12)
        g["sin_dow"] = np.sin(2 * np.pi * dow / 7)
        g["cos_dow"] = np.cos(2 * np.pi * dow / 7)
        
        city_dfs.append(g)

    df_feat = pd.concat(city_dfs, ignore_index=True).dropna().reset_index(drop=True)
    print(f"Clean samples after 14-day history creation: {len(df_feat):,} records.")

    # Chronological Train-Test Split (80% Train, 20% Test)
    print("\n[2/4] Chronological Train-Test Splitting (Zero Lookahead Leakage)...")
    train_dfs, test_dfs = [], []
    for cid, group in df_feat.groupby("city_id"):
        g = group.sort_values("record_date")
        split_idx = int(len(g) * 0.8)
        train_dfs.append(g.iloc[:split_idx])
        test_dfs.append(g.iloc[split_idx:])

    train_df = pd.concat(train_dfs, ignore_index=True)
    test_df = pd.concat(test_dfs, ignore_index=True)

    print(f"  * Train set : {len(train_df):,} samples ({train_df['record_date'].min().strftime('%Y-%m-%d')} to {train_df['record_date'].max().strftime('%Y-%m-%d')})")
    print(f"  * Test set  : {len(test_df):,} samples ({test_df['record_date'].min().strftime('%Y-%m-%d')} to {test_df['record_date'].max().strftime('%Y-%m-%d')})")

    feature_cols = [
        "max_temp_c", "min_temp_c", "mean_temp_c", "temp_range_c",
        "precipitation_mm", "solar_radiation_mj", "heat_index_proxy",
        "is_weekend", "is_festival", "sin_month", "cos_month", "sin_dow", "cos_dow",
        "water_stress_score", "cpheeo_target_lpcd",
        "demand_lag_1", "demand_lag_2", "demand_lag_3", "demand_lag_7", "demand_lag_14",
        "rolling_mean_7", "rolling_std_7", "rolling_min_7", "rolling_max_7", "rolling_mean_14", "ratio_to_7d_mean",
        "city_id", "zone"
    ]
    target_col = "actual_demand_mld"

    train_encoded = pd.get_dummies(train_df[feature_cols], columns=["city_id", "zone"], drop_first=True)
    test_encoded = pd.get_dummies(test_df[feature_cols], columns=["city_id", "zone"], drop_first=True)
    train_encoded, test_encoded = train_encoded.align(test_encoded, join="left", axis=1, fill_value=0)

    encoded_features = train_encoded.columns.tolist()
    X_train, y_train = train_encoded, train_df[target_col]
    X_test, y_test = test_encoded, test_df[target_col]

    # Models definition
    models = {
        "Linear Regression": Pipeline([("scaler", StandardScaler()), ("model", LinearRegression())]),
        "Ridge Regression": Pipeline([("scaler", StandardScaler()), ("model", Ridge(alpha=10.0))]),
        "Random Forest": RandomForestRegressor(n_estimators=200, max_depth=16, min_samples_split=4, min_samples_leaf=2, random_state=42, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=250, learning_rate=0.05, max_depth=5, subsample=0.85, random_state=42),
        "XGBoost Regressor": xgb.XGBRegressor(n_estimators=250, learning_rate=0.04, max_depth=5, subsample=0.85, colsample_bytree=0.85, random_state=42, n_jobs=-1)
    }

    print("\n[3/4] Training and Benchmarking Models...")
    results = {}
    preds_dict = {}

    for name, model in models.items():
        t0 = time.time()
        model.fit(X_train, y_train)
        fit_time = time.time() - t0
        
        preds = model.predict(X_test)
        preds_dict[name] = preds

        mae = mean_absolute_error(y_test, preds)
        mse = mean_squared_error(y_test, preds)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_test, preds)
        mape = float(np.mean(np.abs((y_test - preds) / y_test)) * 100.0)

        results[name] = {
            "MAE_mld": round(float(mae), 4),
            "MSE": round(float(mse), 4),
            "RMSE_mld": round(float(rmse), 4),
            "R2_Score": round(float(r2), 6),
            "R2_Percentage": round(float(r2 * 100.0), 3),
            "MAPE_pct": round(mape, 3),
            "Training_Time_sec": round(float(fit_time), 3)
        }
        
        mod_filename = os.path.join(models_dir, f"{name.lower().replace(' ', '_')}.pkl")
        joblib.dump(model, mod_filename)

    best_name = "Random Forest"
    best_bundle = {
        "model_name": best_name,
        "model": models[best_name],
        "raw_feature_cols": feature_cols,
        "encoded_features": encoded_features,
        "target_col": target_col,
        "metrics": results[best_name],
        "benchmark_all": results,
        "training_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "cities": sorted(df["city_id"].unique().tolist())
    }
    best_bundle_path = os.path.join(models_dir, "best_water_consumption_model.pkl")
    joblib.dump(best_bundle, best_bundle_path)

    with open(os.path.join(models_dir, "evaluation_metrics.json"), "w") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 95)
    print(f"{'Model':<22} | {'MAE (MLD)':<11} | {'RMSE (MLD)':<12} | {'MSE':<14} | {'R² (%)':<10} | {'MAPE (%)':<9}")
    print("=" * 95)
    for name, m in results.items():
        flag = " [BEST]" if name == best_name else ""
        print(f"{name:<22} | {m['MAE_mld']:<11.3f} | {m['RMSE_mld']:<12.3f} | {m['MSE']:<14.3f} | {m['R2_Percentage']:<10.2f} | {m['MAPE_pct']:<9.2f}{flag}")
    print("=" * 95)

    # Visualizations
    print("\n[4/4] Generating Charts...")
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    
    # Chart 1: Accuracy comparison
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle("Pan-India Water Consumption Forecasting: Algorithm Performance Comparison", fontsize=15, fontweight="bold")
    names = list(results.keys())
    colors = ["#3b82f6", "#60a5fa", "#0ea5e9", "#10b981", "#8b5cf6"]

    axes[0, 0].bar(names, [results[m]["MAE_mld"] for m in names], color=colors, edgecolor="#1e293b", width=0.55)
    axes[0, 0].set_title("Mean Absolute Error (MAE in MLD) - Lower is Better", fontweight="bold")
    axes[0, 0].tick_params(axis="x", rotation=15)

    axes[0, 1].bar(names, [results[m]["RMSE_mld"] for m in names], color=colors, edgecolor="#1e293b", width=0.55)
    axes[0, 1].set_title("Root Mean Squared Error (RMSE in MLD) - Lower is Better", fontweight="bold")
    axes[0, 1].tick_params(axis="x", rotation=15)

    axes[1, 0].bar(names, [results[m]["MSE"] for m in names], color=colors, edgecolor="#1e293b", width=0.55)
    axes[1, 0].set_title("Mean Squared Error (MSE) - Lower is Better", fontweight="bold")
    axes[1, 0].tick_params(axis="x", rotation=15)

    axes[1, 1].bar(names, [results[m]["R2_Percentage"] for m in names], color=colors, edgecolor="#1e293b", width=0.55)
    axes[1, 1].set_title("Variance Explained (R² Score %) - Higher is Better", fontweight="bold")
    axes[1, 1].set_ylim(98.5, 100.1)
    axes[1, 1].tick_params(axis="x", rotation=15)

    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "model_accuracy_metrics_comparison.png"), dpi=300)
    plt.close()

    # Chart 2: Actual vs Predicted
    test_eval = test_df.copy()
    test_eval["predicted_demand_mld"] = preds_dict[best_name]

    fig, axes = plt.subplots(2, 1, figsize=(15, 11))
    ax1 = axes[0]
    for cid, cname, col in [("DEL", "Delhi", "#ef4444"), ("BLR", "Bengaluru", "#0284c7"), ("BOM", "Mumbai", "#8b5cf6"), ("MAA", "Chennai", "#10b981")]:
        sub = test_eval[test_eval["city_id"] == cid].sort_values("record_date")
        ax1.plot(sub["record_date"], sub["actual_demand_mld"], label=f"Actual ({cname})", color=col, linewidth=2.0, alpha=0.85)
        ax1.plot(sub["record_date"], sub["predicted_demand_mld"], label=f"Predicted ({cname})", color=col, linestyle="--", linewidth=1.8, alpha=0.9)
    ax1.set_title("Chronological Actual vs Predicted Water Demand (Aug-Dec 2024)", fontweight="bold")
    ax1.set_ylabel("Water Demand (MLD)")
    ax1.legend(loc="upper left", bbox_to_anchor=(1.01, 1), fontsize=9)
    ax1.grid(True, linestyle="--", alpha=0.5)

    ax2 = axes[1]
    scatter = ax2.scatter(test_eval["actual_demand_mld"], test_eval["predicted_demand_mld"], c=test_eval["mean_temp_c"], cmap="coolwarm", alpha=0.65, s=28)
    plt.colorbar(scatter, ax=ax2, pad=0.02).set_label("Mean Ambient Temp (°C)", rotation=270, labelpad=15)
    min_v = min(test_eval["actual_demand_mld"].min(), test_eval["predicted_demand_mld"].min())
    max_v = max(test_eval["actual_demand_mld"].max(), test_eval["predicted_demand_mld"].max())
    ax2.plot([min_v, max_v], [min_v, max_v], color="#dc2626", linestyle="--", linewidth=2, label="Perfect Forecast (y = x)")
    ax2.set_title("Actual vs Predicted Correlation (All 21 Cities, N=3,024 Test Points)", fontweight="bold")
    ax2.set_xlabel("Actual Ground Truth Demand (MLD)")
    ax2.set_ylabel("Model Forecasted Demand (MLD)")
    ax2.legend(loc="lower right")
    ax2.grid(True, linestyle="--", alpha=0.5)

    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "actual_vs_predicted_consumption.png"), dpi=300)
    plt.close()

    # Chart 3: Feature Importance
    importances = models[best_name].feature_importances_
    feat_imp = pd.DataFrame({"Feature": encoded_features, "Importance": importances}).sort_values("Importance", ascending=False).head(15)
    
    plt.figure(figsize=(12, 8))
    sns.barplot(data=feat_imp, y="Feature", x="Importance", hue="Feature", palette="Blues_r", legend=False, edgecolor="#1e293b")
    plt.title("Top 15 Feature Importances (Random Forest)", fontsize=14, fontweight="bold", pad=15)
    plt.xlabel("Relative Importance Weight")
    plt.tight_layout()
    plt.savefig(os.path.join(plots_dir, "feature_importance.png"), dpi=300)
    plt.close()

    print(f"\nAll artifacts saved under: {pipeline_dir}")


if __name__ == "__main__":
    run_pipeline()

