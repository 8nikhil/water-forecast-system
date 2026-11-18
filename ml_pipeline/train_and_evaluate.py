"""
Intelligent Water Consumption Forecasting Platform
Full Reproducible Training, Validation & Evaluation Pipeline
Calibrated for: Migsun Vilaasa (Sector ETA-2, Greater Noida) 20 Households Water Consumption

Trains, compares, and evaluates:
- Linear Regression (OLS)
- Ridge Regression (L2 Regularized)
- Random Forest Regressor (200 Trees)
- Gradient Boosting Regressor (GBDT)
- XGBoost Regressor (if installed)

Outputs:
- Serialized champion model bundle (.pkl)
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
import joblib

try:
    import xgboost as xgb
except ImportError:
    xgb = None


def run_pipeline():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Dataset path: Migsun Vilaasa 30-Day Time-Series
    data_path = os.path.join(base_dir, "datasets", "processed", "migsun_vilaasa_daily_timeseries.csv")
    if not os.path.exists(data_path):
        # Auto-clean from raw if processed file not found
        from ml_pipeline.clean_data import clean_and_process
        clean_and_process()

    pipeline_dir = os.path.join(base_dir, "ml_pipeline")
    models_dir = os.path.join(pipeline_dir, "models")
    plots_dir = os.path.join(pipeline_dir, "plots")
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(plots_dir, exist_ok=True)

    print("=" * 80)
    print("AQUAPULSE: ML TRAINING & EVALUATION PIPELINE (MIGSUN VILAASA)")
    print("=" * 80)
    print(f"Loading dataset: {data_path}")

    df = pd.read_csv(data_path)
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values(["Flat_ID", "Date"]).reset_index(drop=True)

    print(f"Dataset shape: {df.shape[0]:,} rows × {df.shape[1]} columns across {df['Flat_ID'].nunique()} Migsun Vilaasa flats.")

    # [1/4] Feature Engineering: Lags & Trailing Rolling Statistics per flat
    print("\n[1/4] Feature Engineering (Lags, Trailing Moving Averages, Cyclical Calendar, Weather Indices)...")
    flat_dfs = []
    for fid, group in df.groupby("Flat_ID"):
        g = group.copy().sort_values("Date")
        
        g["demand_lag_1"] = g["House_Daily_Consumption_L"].shift(1)
        g["demand_lag_2"] = g["House_Daily_Consumption_L"].shift(2)
        g["demand_lag_3"] = g["House_Daily_Consumption_L"].shift(3)
        g["demand_lag_7"] = g["House_Daily_Consumption_L"].shift(7)
        
        g["rolling_mean_7"] = g["House_Daily_Consumption_L"].shift(1).rolling(7).mean()
        g["rolling_std_7"] = g["House_Daily_Consumption_L"].shift(1).rolling(7).std().fillna(0)
        g["rolling_min_7"] = g["House_Daily_Consumption_L"].shift(1).rolling(7).min()
        g["rolling_max_7"] = g["House_Daily_Consumption_L"].shift(1).rolling(7).max()
        g["ratio_to_7d_mean"] = g["demand_lag_1"] / (g["rolling_mean_7"] + 1e-5)
        
        dow = g["Date"].dt.day_of_week
        g["day_of_week_num"] = dow
        g["is_weekend"] = (dow >= 5).astype(int)
        g["sin_dow"] = np.sin(2 * np.pi * dow / 7)
        g["cos_dow"] = np.cos(2 * np.pi * dow / 7)
        
        flat_dfs.append(g)

    df_feat = pd.concat(flat_dfs, ignore_index=True).dropna().reset_index(drop=True)
    print(f"Clean samples after 7-day lag/rolling creation: {len(df_feat):,} records.")

    # [2/4] Chronological Train-Test Split (80% Train, 20% Test)
    print("\n[2/4] Chronological Train-Test Splitting (Zero Lookahead Leakage)...")
    train_dfs, test_dfs = [], []
    for fid, group in df_feat.groupby("Flat_ID"):
        g = group.sort_values("Date")
        split_idx = int(len(g) * 0.8)
        train_dfs.append(g.iloc[:split_idx])
        test_dfs.append(g.iloc[split_idx:])

    train_df = pd.concat(train_dfs, ignore_index=True)
    test_df = pd.concat(test_dfs, ignore_index=True)

    print(f"  * Train set : {len(train_df):,} samples ({train_df['Date'].min().strftime('%Y-%m-%d')} to {train_df['Date'].max().strftime('%Y-%m-%d')})")
    print(f"  * Test set  : {len(test_df):,} samples ({test_df['Date'].min().strftime('%Y-%m-%d')} to {test_df['Date'].max().strftime('%Y-%m-%d')})")

    feature_cols = [
        "Occupants", "Temperature_C", "Rainfall_mm", "Meter_Start_L", "Leak_Flag",
        "is_weekend", "sin_dow", "cos_dow",
        "demand_lag_1", "demand_lag_2", "demand_lag_3", "demand_lag_7",
        "rolling_mean_7", "rolling_std_7", "rolling_min_7", "rolling_max_7", "ratio_to_7d_mean",
        "Flat_ID", "Usage_Tier", "Supply_Source"
    ]
    target_col = "House_Daily_Consumption_L"

    train_encoded = pd.get_dummies(train_df[feature_cols], columns=["Flat_ID", "Usage_Tier", "Supply_Source"], drop_first=True)
    test_encoded = pd.get_dummies(test_df[feature_cols], columns=["Flat_ID", "Usage_Tier", "Supply_Source"], drop_first=True)
    train_encoded, test_encoded = train_encoded.align(test_encoded, join="left", axis=1, fill_value=0)

    encoded_features = train_encoded.columns.tolist()
    X_train, y_train = train_encoded, train_df[target_col]
    X_test, y_test = test_encoded, test_df[target_col]

    # Models definition
    models = {
        "Ridge Regression": Pipeline([("scaler", StandardScaler()), ("model", Ridge(alpha=10.0))]),
        "Linear Regression": Pipeline([("scaler", StandardScaler()), ("model", LinearRegression())]),
        "Random Forest": RandomForestRegressor(n_estimators=250, max_depth=16, min_samples_split=3, min_samples_leaf=1, random_state=42, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, max_depth=4, subsample=0.85, random_state=42)
    }
    if xgb is not None:
        models["XGBoost Regressor"] = xgb.XGBRegressor(n_estimators=200, learning_rate=0.05, max_depth=4, subsample=0.85, random_state=42, n_jobs=-1)

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
            "algorithm": name,
            "MAE_litres": round(float(mae), 2),
            "RMSE_litres": round(float(rmse), 2),
            "mae_mld": round(float(mae) / 1000.0, 5),
            "rmse_mld": round(float(rmse) / 1000.0, 5),
            "MAE_mld": round(float(mae) / 1000.0, 5),
            "RMSE_mld": round(float(rmse) / 1000.0, 5),
            "MSE": round(float(mse), 2),
            "mse": round(float(mse), 2),
            "R2_Score": round(float(r2), 4),
            "r2_score": round(float(r2), 4),
            "R2_Percentage": round(float(r2 * 100.0), 2),
            "r2_percentage": round(float(r2 * 100.0), 2),
            "MAPE_pct": round(mape, 2),
            "mape_pct": round(mape, 2),
            "Training_Time_sec": round(float(fit_time), 3),
            "training_time_sec": round(float(fit_time), 3),
            "is_champion": False
        }
        
        mod_filename = os.path.join(models_dir, f"{name.lower().replace(' ', '_')}.pkl")
        joblib.dump(model, mod_filename)

    # Determine best champion model (highest R2)
    best_name = max(results, key=lambda k: results[k]["R2_Score"])
    results[best_name]["is_champion"] = True
    
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
        "dataset_name": "Migsun Vilaasa (Sector ETA-2, Greater Noida)",
        "design_lpcd": 86.0,
        "flats": sorted(df["Flat_ID"].unique().tolist())
    }
    best_bundle_path = os.path.join(models_dir, "best_water_consumption_model.pkl")
    joblib.dump(best_bundle, best_bundle_path)

    with open(os.path.join(models_dir, "evaluation_metrics.json"), "w") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 90)
    print(f"{'Model':<22} | {'MAE (Litres)':<13} | {'RMSE (Litres)':<14} | {'R² (%)':<10} | {'MAPE (%)':<9}")
    print("=" * 90)
    for name, m in results.items():
        flag = " [CHAMPION]" if name == best_name else ""
        print(f"{name + flag:<22} | {m['MAE_litres']:<13.2f} | {m['RMSE_litres']:<14.2f} | {m['R2_Percentage']:<10.2f} | {m['MAPE_pct']:<9.2f}")
    print("=" * 90)

    # [4/4] Generating Production-Quality Evaluation Visualizations
    print("\n[4/4] Generating High-Resolution Model Visualizations...")
    sns.set_theme(style="whitegrid", font="sans-serif")
    palette = sns.color_palette("mako", len(models))

    # Plot 1: Model Accuracy Metrics Comparison
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    model_names = list(results.keys())
    
    # R2 Score
    r2_vals = [results[m]["R2_Percentage"] for m in model_names]
    sns.barplot(x=r2_vals, y=model_names, ax=axes[0, 0], palette="crest")
    axes[0, 0].set_title("Test R² Score (%) — Higher is Better", fontsize=12, fontweight="bold")
    axes[0, 0].set_xlim(85, 100)
    for i, v in enumerate(r2_vals):
        axes[0, 0].text(v - 2.5, i, f"{v:.2f}%", va="center", color="white", fontweight="bold")

    # MAE
    mae_vals = [results[m]["MAE_litres"] for m in model_names]
    sns.barplot(x=mae_vals, y=model_names, ax=axes[0, 1], palette="flare")
    axes[0, 1].set_title("Mean Absolute Error (Litres/Day) — Lower is Better", fontsize=12, fontweight="bold")
    for i, v in enumerate(mae_vals):
        axes[0, 1].text(v + 0.5, i, f"{v:.2f} L", va="center", color="#333", fontweight="bold")

    # RMSE
    rmse_vals = [results[m]["RMSE_litres"] for m in model_names]
    sns.barplot(x=rmse_vals, y=model_names, ax=axes[1, 0], palette="magma")
    axes[1, 0].set_title("Root Mean Squared Error (Litres/Day) — Lower is Better", fontsize=12, fontweight="bold")
    for i, v in enumerate(rmse_vals):
        axes[1, 0].text(v + 0.5, i, f"{v:.2f} L", va="center", color="#333", fontweight="bold")

    # MAPE
    mape_vals = [results[m]["MAPE_pct"] for m in model_names]
    sns.barplot(x=mape_vals, y=model_names, ax=axes[1, 1], palette="viridis")
    axes[1, 1].set_title("Mean Absolute Percentage Error (MAPE %) — Lower is Better", fontsize=12, fontweight="bold")
    for i, v in enumerate(mape_vals):
        axes[1, 1].text(v + 0.2, i, f"{v:.2f}%", va="center", color="#333", fontweight="bold")

    plt.suptitle("AquaPulse Model Benchmark: Migsun Vilaasa 20 Households", fontsize=15, fontweight="bold", y=1.02)
    plt.tight_layout()
    plot1_path = os.path.join(plots_dir, "model_accuracy_metrics_comparison.png")
    plt.savefig(plot1_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  * Saved: {plot1_path}")

    # Plot 2: Actual vs Predicted Time-Series Tracking
    plt.figure(figsize=(14, 6))
    best_preds = preds_dict[best_name]
    sample_eval_df = test_df.copy()
    sample_eval_df["Predicted"] = best_preds

    # Aggregate daily across all flats for a clean macro timeline
    daily_agg = sample_eval_df.groupby("Date")[["House_Daily_Consumption_L", "Predicted"]].sum().reset_index()

    plt.plot(daily_agg["Date"], daily_agg["House_Daily_Consumption_L"], "o-", label="Actual Daily Consumption (Litres)", color="#0284c7", linewidth=2.5, markersize=6)
    plt.plot(daily_agg["Date"], daily_agg["Predicted"], "s--", label=f"Predicted ({best_name})", color="#e11d48", linewidth=2.2, markersize=5)
    plt.title(f"Migsun Vilaasa Holdout Evaluation: Actual vs Predicted Aggregate Consumption ({best_name})", fontsize=13, fontweight="bold")
    plt.xlabel("Holdout Date (October 2026)", fontsize=11)
    plt.ylabel("Total Consumption across Test Flats (Litres)", fontsize=11)
    plt.legend(frameon=True, facecolor="white", loc="best")
    plt.tight_layout()
    plot2_path = os.path.join(plots_dir, "actual_vs_predicted_consumption.png")
    plt.savefig(plot2_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  * Saved: {plot2_path}")

    # Plot 3: Feature Importance Breakdown
    plt.figure(figsize=(12, 8))
    rf_model = models["Random Forest"]
    importances = rf_model.feature_importances_
    feat_series = pd.Series(importances, index=encoded_features).sort_values(ascending=False).head(15)

    sns.barplot(x=feat_series.values, y=feat_series.index, palette="mako")
    plt.title("Top 15 Predictive Features (Random Forest Feature Importance)", fontsize=13, fontweight="bold")
    plt.xlabel("Relative Feature Importance (Gini Impurity Reduction)", fontsize=11)
    plt.ylabel("Predictive Feature Dimension", fontsize=11)
    for i, v in enumerate(feat_series.values):
        plt.text(v + 0.005, i, f"{v:.3f}", va="center", color="#333", fontsize=9, fontweight="bold")
    plt.tight_layout()
    plot3_path = os.path.join(plots_dir, "feature_importance.png")
    plt.savefig(plot3_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  * Saved: {plot3_path}")

    # Plot 4: Residual Distribution Analysis
    plt.figure(figsize=(10, 6))
    residuals = y_test - best_preds
    sns.histplot(residuals, kde=True, color="#0284c7", bins=25, stat="density", alpha=0.6)
    
    mu, std = float(np.mean(residuals)), float(np.std(residuals))
    xmin, xmax = plt.xlim()
    x = np.linspace(xmin, xmax, 100)
    p = (1 / (std * np.sqrt(2 * np.pi))) * np.exp(-0.5 * ((x - mu) / std) ** 2)
    plt.plot(x, p, "k--", linewidth=2, label=rf"Gaussian Fit ($\mu={mu:.2f}$, $\sigma={std:.2f}$)")

    plt.axvline(0, color="red", linestyle=":", linewidth=1.5, label="Zero Bias Line")
    plt.title(f"Prediction Residual Distribution ({best_name} on Migsun Vilaasa)", fontsize=13, fontweight="bold")
    plt.xlabel("Prediction Residual Error (Actual - Predicted, Litres)", fontsize=11)
    plt.ylabel("Density", fontsize=11)
    plt.legend(frameon=True, facecolor="white")
    plt.tight_layout()
    plot4_path = os.path.join(plots_dir, "residual_distribution_analysis.png")
    plt.savefig(plot4_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  * Saved: {plot4_path}")

    print("\nTraining and evaluation pipeline completed successfully!")
    print(f"Champion Model : {best_name} (R²: {results[best_name]['R2_Percentage']}%, MAE: {results[best_name]['MAE_litres']} L)")
    return results

if __name__ == "__main__":
    run_pipeline()
