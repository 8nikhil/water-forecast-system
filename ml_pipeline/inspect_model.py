"""
AquaPulse: Machine Learning Model Inspector (.pkl reader)
Reads and displays the internal components, hyperparameters, features, and metrics
stored inside the serialized binary .pkl model bundle.
"""

import os
import sys
import joblib
import json

def inspect_pkl(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return

    print("=" * 75)
    print(f" INSPECTING BINARY MODEL FILE: {os.path.basename(file_path)}")
    print(f" File Size: {os.path.getsize(file_path):,} bytes ({os.path.getsize(file_path)/(1024*1024):.2f} MB)")
    print("=" * 75)

    data = joblib.load(file_path)

    if isinstance(data, dict):
        print("\n[Package Type]: Structured Model Bundle (Dictionary)")
        print(f"Bundle Keys: {list(data.keys())}\n")
        
        for key, val in data.items():
            if key == "model":
                print(f"--- MODEL ARCHITECTURE ---")
                print(f"  Class      : {val.__class__.__name__}")
                print(f"  Module     : {val.__class__.__module__}")
                if hasattr(val, "get_params"):
                    params = val.get_params()
                    print(f"  Key Params : n_estimators={params.get('n_estimators')}, max_depth={params.get('max_depth')}, random_state={params.get('random_state')}")
            elif key == "metrics":
                print(f"\n--- EVALUATION METRICS (TEST SET) ---")
                for m_k, m_v in val.items():
                    print(f"  * {m_k:<20}: {m_v}")
            elif key in ["encoded_features", "raw_feature_cols"]:
                print(f"\n--- {key.upper()} ({len(val)} items) ---")
                print("  " + ", ".join(val[:15]) + ("..." if len(val) > 15 else ""))
            elif key == "cities":
                print(f"\n--- SUPPORTED CITIES ({len(val)}) ---")
                print("  " + ", ".join(val))
            elif key == "benchmark_all":
                print(f"\n--- BENCHMARK COMPARISON TABLE ---")
                for mod_name, metrics in val.items():
                    print(f"  * {mod_name:<20}: MAE={metrics.get('MAE_mld')} MLD, RMSE={metrics.get('RMSE_mld')} MLD, R2={metrics.get('R2_Percentage')}%")
            else:
                print(f"\n--- {key.upper()} ---")
                print(f"  {val}")
    else:
        print("\n[Package Type]: Direct Scikit-Learn Model Object")
        print(f"Class : {data.__class__.__name__}")
        print(f"Module: {data.__class__.__module__}")
        if hasattr(data, "get_params"):
            print("Parameters:")
            for p, v in data.get_params().items():
                print(f"  - {p}: {v}")

    print("\n" + "=" * 75)
    print(" Inspection complete.")
    print("=" * 75)

if __name__ == "__main__":
    target_file = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "models", "best_water_consumption_model.pkl")
    inspect_pkl(target_file)

