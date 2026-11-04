
import pandas as pd
import numpy as np
from pathlib import Path

# 1. Set random seed for reproducibility
np.random.seed(42)

# 2. Define project directories
BASE_DIR = Path(__file__).resolve().parent.parent

OUTPUT_DIR = BASE_DIR / "datasets" / "synthetic"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 3. Generate dates for one year
dates = pd.date_range(
    start="2025-01-01",
    end="2025-12-31",
    freq="D"
)

# 4. Define locations
locations = ["Delhi", "Noida", "Gurugram"]

records = []

# 5. Generate synthetic water consumption data
for location in locations:

    for date in dates:

        month = date.month

        # Generate temperature based on season
        temperature = (
            25
            + 10 * np.sin((month - 3) * np.pi / 6)
            + np.random.normal(0, 2)
        )

        # Generate rainfall
        if month in [7, 8, 9]:
            rainfall = np.random.gamma(1.5, 3)
        else:
            rainfall = np.random.gamma(0.8, 1)

        rainfall = max(0, rainfall)

        # Base daily consumption (litres)
        base_consumption = 50000

        # Higher temperature increases demand
        seasonal_factor = 1 + (
            max(temperature - 25, 0) * 0.015
        )

        # Calculate water consumption
        consumption = (
            base_consumption * seasonal_factor
            - rainfall * 100
            + np.random.normal(0, 2500)
        )

        consumption = max(consumption, 1000)

        # Store record
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "location": location,
            "consumption_liters": round(consumption, 2),
            "rainfall_mm": round(rainfall, 2),
            "temperature_c": round(temperature, 2),
            "source_type": "synthetic"
        })

# 6. Convert records into DataFrame
df = pd.DataFrame(records)

# 7. Save dataset as CSV
output_file = OUTPUT_DIR / "synthetic_water_consumption.csv"

df.to_csv(output_file, index=False)

# 8. Display results
print("\n===================================")
print(" SYNTHETIC DATA GENERATED SUCCESSFULLY")
print("===================================")

print("Total records:", len(df))
print("Total locations:", df["location"].nunique())
print("Output file:", output_file)

print("\nFirst 5 records:")
print(df.head())

print("\nDataset information:")
print(df.info())
