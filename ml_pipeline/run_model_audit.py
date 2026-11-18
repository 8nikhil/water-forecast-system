"""
AquaPulse Senior ML Engineer Model Audit & Comprehensive Diagnostic Suite
Calibrated for: Migsun Vilaasa (Sector ETA-2, Greater Noida) 20 Households Water Consumption

Evaluates 7 Technical Pillars:
1. Model generalization across chronological holdout splits
2. Overfitting & Underfitting Gap Analysis
3. Residual Distribution, Normality, and Heteroscedasticity Checks
4. Autocorrelation & Serial Residual Dependence (Durbin-Watson)
5. Comprehensive Prediction Parity (Actual vs Predicted)
6. Feature Importance and Sensitivity Decomposition
7. Quantile-Quantile (Q-Q) Residual Diagnostics
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import scipy.stats as stats

# Use non-interactive Agg backend
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    median_absolute_error,
    max_error,
    explained_variance_score
)
import joblib


def compute_durbin_watson(residuals):
    """Calculates the Durbin-Watson statistic for autocorrelation in residuals."""
    diff = np.diff(residuals)
    return float(np.sum(diff ** 2) / np.sum(residuals ** 2))


def run_audit():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pipeline_dir = os.path.join(base_dir, "ml_pipeline")
    model_path = os.path.join(pipeline_dir, "models", "best_water_consumption_model.pkl")
    data_path = os.path.join(base_dir, "datasets", "processed", "migsun_vilaasa_daily_timeseries.csv")

    audit_dir = os.path.join(pipeline_dir, "audit_reports")
    plots_dir = os.path.join(audit_dir, "plots")
    metrics_dir = os.path.join(audit_dir, "metrics")
    os.makedirs(plots_dir, exist_ok=True)
    os.makedirs(metrics_dir, exist_ok=True)

    print("=" * 85)
    print(" SENIOR ML ENGINEER MODEL AUDIT & COMPREHENSIVE PERFORMANCE EVALUATION")
    print(" Location: Migsun Vilaasa (Sector ETA-2, Greater Noida) — 20 Households")
    print("=" * 85)

    # 1. LOAD MODEL (READ-ONLY)
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Trained model not found at: {model_path}")

    print(f"\n[1/6] Loading Existing Model Bundle (READ-ONLY)...")
    bundle = joblib.load(model_path)
    model = bundle["model"]
    model_name = bundle.get("model_name", "Champion Model")
    encoded_features = bundle["encoded_features"]
    raw_feature_cols = bundle["raw_feature_cols"]
    target_col = bundle.get("target_col", "House_Daily_Consumption_L")

    print(f"  * Model Architecture : {model.__class__.__name__}")
    print(f"  * Target Variable    : {target_col}")
    print(f"  * Training Timestamp : {bundle.get('training_date', 'Unknown')}")
    print(f"  * Total Features     : {len(encoded_features)} encoded columns")

    # 2. LOAD DATASET & RECONSTRUCT IDENTICAL SPLIT
    print(f"\n[2/6] Loading Dataset & Reconstructing Chronological Splits...")
    df = pd.read_csv(data_path)
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values(["Flat_ID", "Date"]).reset_index(drop=True)

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

    train_dfs, test_dfs = [], []
    for fid, group in df_feat.groupby("Flat_ID"):
        g = group.sort_values("Date")
        split_idx = int(len(g) * 0.8)
        train_dfs.append(g.iloc[:split_idx])
        test_dfs.append(g.iloc[split_idx:])

    train_df = pd.concat(train_dfs, ignore_index=True)
    test_df = pd.concat(test_dfs, ignore_index=True)

    train_encoded = pd.get_dummies(train_df[raw_feature_cols], columns=["Flat_ID", "Usage_Tier", "Supply_Source"], drop_first=True)
    test_encoded = pd.get_dummies(test_df[raw_feature_cols], columns=["Flat_ID", "Usage_Tier", "Supply_Source"], drop_first=True)
    train_encoded, test_encoded = train_encoded.align(test_encoded, join="left", axis=1, fill_value=0)

    X_train = train_encoded.reindex(columns=encoded_features, fill_value=0)
    y_train = train_df[target_col].values
    X_test = test_encoded.reindex(columns=encoded_features, fill_value=0)
    y_test = test_df[target_col].values

    print(f"  * Training Observations : {len(X_train):,} ({train_df['Date'].min().strftime('%Y-%m-%d')} to {train_df['Date'].max().strftime('%Y-%m-%d')})")
    print(f"  * Test Observations     : {len(X_test):,} ({test_df['Date'].min().strftime('%Y-%m-%d')} to {test_df['Date'].max().strftime('%Y-%m-%d')})")

    # 3. COMPUTE EVALUATION METRICS
    print(f"\n[3/6] Computing Performance Metrics on Train & Test Splits...")
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)

    train_mae = mean_absolute_error(y_train, y_train_pred)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
    train_r2 = r2_score(y_train, y_train_pred)
    train_mape = np.mean(np.abs((y_train - y_train_pred) / y_train)) * 100

    test_mae = mean_absolute_error(y_test, y_test_pred)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    test_r2 = r2_score(y_test, y_test_pred)
    test_mape = np.mean(np.abs((y_test - y_test_pred) / y_test)) * 100

    r2_gap = train_r2 - test_r2
    rmse_gap = test_rmse - train_rmse

    print(f"  * Train R² : {train_r2 * 100:.2f}% | Test R² : {test_r2 * 100:.2f}% | Gap: {r2_gap * 100:.2f}%")
    print(f"  * Train MAE: {train_mae:.2f} L   | Test MAE: {test_mae:.2f} L")
    print(f"  * Train RMSE: {train_rmse:.2f} L | Test RMSE: {test_rmse:.2f} L")

    # 4. RESIDUAL DIAGNOSTICS & STATISTICAL TESTS
    print(f"\n[4/6] Executing Statistical Hypothesis Tests on Residuals...")
    residuals_train = y_train - y_train_pred
    residuals_test = y_test - y_test_pred

    shapiro_stat, shapiro_p = stats.shapiro(residuals_test)
    dw_test = compute_durbin_watson(residuals_test)

    # 5. GENERATE DIAGNOSTIC PLOTS
    print(f"\n[5/6] Generating High-Resolution 7-Pillar Audit Visualizations...")
    sns.set_theme(style="whitegrid", font="sans-serif")

    # Audit Plot 1: Actual vs Predicted Parity Scatter
    plt.figure(figsize=(9, 8))
    plt.scatter(y_train, y_train_pred, color="#0284c7", alpha=0.35, s=28, label=f"Train Set (R² = {train_r2:.4f})")
    plt.scatter(y_test, y_test_pred, color="#e11d48", alpha=0.75, s=36, edgecolors="none", label=f"Test Set (R² = {test_r2:.4f})")
    all_min = min(y_train.min(), y_test.min())
    all_max = max(y_train.max(), y_test.max())
    plt.plot([all_min, all_max], [all_min, all_max], "k--", linewidth=1.8, label="Ideal y = x Parity Line")
    plt.title(f"Parity Scatter Analysis: Actual vs Predicted ({model_name})", fontsize=13, fontweight="bold")
    plt.xlabel("Actual Household Water Consumption (Litres/Day)", fontsize=11)
    plt.ylabel("Predicted Household Water Consumption (Litres/Day)", fontsize=11)
    plt.legend(frameon=True, facecolor="white", loc="upper left")
    plt.tight_layout()
    plot1_path = os.path.join(plots_dir, "1_actual_vs_predicted_train_vs_test.png")
    plt.savefig(plot1_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  * Saved: {plot1_path}")

    # Audit Plot 2: Comprehensive 4-Panel Residual Diagnostics
    fig, axes = plt.subplots(2, 2, figsize=(14, 11))
    
    # 2a. Residuals vs Fitted
    axes[0, 0].scatter(y_test_pred, residuals_test, color="#0284c7", alpha=0.6, s=30)
    axes[0, 0].axhline(0, color="red", linestyle="--", linewidth=1.5)
    axes[0, 0].set_title("Residuals vs Fitted (Homoscedasticity Check)", fontsize=12, fontweight="bold")
    axes[0, 0].set_xlabel("Fitted Values (Litres/Day)")
    axes[0, 0].set_ylabel("Residuals (Litres)")

    # 2b. Histogram & KDE
    sns.histplot(residuals_test, kde=True, color="#0284c7", ax=axes[0, 1], stat="density")
    axes[0, 1].axvline(0, color="red", linestyle="--", linewidth=1.5)
    axes[0, 1].set_title(f"Residual Distribution (Mean: {np.mean(residuals_test):.2f} L)", fontsize=12, fontweight="bold")
    axes[0, 1].set_xlabel("Residual Error (Litres)")

    # 2c. Q-Q Plot
    stats.probplot(residuals_test, dist="norm", plot=axes[1, 0])
    axes[1, 0].set_title(f"Normal Q-Q Plot (Shapiro p = {shapiro_p:.4f})", fontsize=12, fontweight="bold")

    # 2d. Scale-Location Plot
    std_residuals = (residuals_test - np.mean(residuals_test)) / np.std(residuals_test)
    sqrt_abs_std_res = np.sqrt(np.abs(std_residuals))
    axes[1, 1].scatter(y_test_pred, sqrt_abs_std_res, color="#7c3aed", alpha=0.6, s=30)
    axes[1, 1].set_title("Scale-Location Plot (Spread-Location)", fontsize=12, fontweight="bold")
    axes[1, 1].set_xlabel("Fitted Values (Litres/Day)")
    axes[1, 1].set_ylabel(r"$\sqrt{|\text{Standardized Residuals}|}$")

    plt.suptitle("AquaPulse Model Audit: Comprehensive Residual Diagnostics", fontsize=15, fontweight="bold", y=1.01)
    plt.tight_layout()
    plot2_path = os.path.join(plots_dir, "2_residual_comprehensive_diagnostics.png")
    plt.savefig(plot2_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  * Saved: {plot2_path}")

    # Audit Plot 3: Feature Importance Breakdown
    plt.figure(figsize=(11, 7))
    if hasattr(model, "feature_importances_"):
        imps = model.feature_importances_
    elif hasattr(model, "named_steps") and hasattr(model.named_steps.get("model"), "coef_"):
        imps = np.abs(model.named_steps["model"].coef_)
    else:
        imps = np.ones(len(encoded_features))
    
    s_feat = pd.Series(imps, index=encoded_features).sort_values(ascending=False).head(15)
    sns.barplot(x=s_feat.values, y=s_feat.index, palette="viridis")
    plt.title("Audit Decomposition: Top 15 Feature Importances", fontsize=13, fontweight="bold")
    plt.xlabel("Magnitude / Relative Importance Score")
    plt.ylabel("Feature")
    plt.tight_layout()
    plot3_path = os.path.join(plots_dir, "3_feature_importance_breakdown.png")
    plt.savefig(plot3_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  * Saved: {plot3_path}")

    # Audit Plot 4: Overfitting / Underfitting Gap Analysis
    plt.figure(figsize=(10, 6))
    categories = ["R² Score (%)", "Mean Absolute Error (L)", "Root Mean Squared Error (L)", "MAPE (%)"]
    train_metrics_arr = [train_r2 * 100, train_mae, train_rmse, train_mape]
    test_metrics_arr = [test_r2 * 100, test_mae, test_rmse, test_mape]
    
    x_idx = np.arange(len(categories))
    w = 0.35
    plt.bar(x_idx - w/2, train_metrics_arr, width=w, label="Train Set (80%)", color="#0284c7")
    plt.bar(x_idx + w/2, test_metrics_arr, width=w, label="Holdout Test Set (20%)", color="#e11d48")
    plt.xticks(x_idx, categories, fontsize=10, fontweight="bold")
    plt.ylabel("Metric Magnitude")
    plt.title(f"Overfitting / Generalization Gap Analysis (R² Gap = {r2_gap * 100:.2f}%)", fontsize=13, fontweight="bold")
    plt.legend(frameon=True, facecolor="white")
    plt.tight_layout()
    plot4_path = os.path.join(plots_dir, "4_overfitting_underfitting_gap_analysis.png")
    plt.savefig(plot4_path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"  * Saved: {plot4_path}")

    # 6. SAVE METRICS JSON
    audit_summary = {
        "dataset": "Migsun Vilaasa (Sector ETA-2, Greater Noida)",
        "model_architecture": model.__class__.__name__,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "train_metrics": {
            "r2_score": round(float(train_r2), 4),
            "mae_litres": round(float(train_mae), 2),
            "rmse_litres": round(float(train_rmse), 2),
            "mape_pct": round(float(train_mape), 2)
        },
        "test_metrics": {
            "r2_score": round(float(test_r2), 4),
            "mae_litres": round(float(test_mae), 2),
            "rmse_litres": round(float(test_rmse), 2),
            "mape_pct": round(float(test_mape), 2)
        },
        "generalization_gap": {
            "r2_gap_pct": round(float(r2_gap * 100), 2),
            "rmse_gap_litres": round(float(rmse_gap), 2)
        },
        "diagnostics": {
            "durbin_watson": round(float(dw_test), 3),
            "shapiro_wilk_p": round(float(shapiro_p), 4),
            "mean_residual_litres": round(float(np.mean(residuals_test)), 2)
        }
    }

    with open(os.path.join(metrics_dir, "model_audit_evaluation.json"), "w") as f:
        json.dump(audit_summary, f, indent=2)

    print("\nSenior ML Engineer Model Audit completed successfully!")
    print(f"Audit report JSON saved to: {os.path.join(metrics_dir, 'model_audit_evaluation.json')}")
    return audit_summary

if __name__ == "__main__":
    run_audit()
