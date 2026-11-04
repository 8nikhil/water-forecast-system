
import pandas as pd
from pathlib import Path

# Project paths
BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    BASE_DIR / "datasets" / "synthetic"
    / "synthetic_water_consumption.csv"
)

OUTPUT_DIR = BASE_DIR / "datasets" / "processed"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "cleaned_water_consumption.csv"

# Load dataset
print("Loading dataset...")

df = pd.read_csv(INPUT_FILE)

print("Original records:", len(df))

# Convert date column
df["date"] = pd.to_datetime(df["date"], errors="coerce")

# Convert numerical columns
numeric_columns = [
    "consumption_liters",
    "rainfall_mm",
    "temperature_c"
]

for column in numeric_columns:
    df[column] = pd.to_numeric(df[column], errors="coerce")

# Remove duplicate records
df = df.drop_duplicates()

# Remove rows with invalid dates
df = df.dropna(subset=["date", "location"])

# Handle missing numerical values
for column in numeric_columns:
    df[column] = df[column].fillna(df[column].median())

# Validate numerical values
df = df[
    (df["consumption_liters"] > 0) &
    (df["rainfall_mm"] >= 0)
]

# Sort dataset
df = df.sort_values(["location", "date"])

# Save processed dataset
df.to_csv(OUTPUT_FILE, index=False)

print("\nData cleaning completed!")
print("Final records:", len(df))
print("Missing values:", df.isnull().sum().sum())
print("Saved file:", OUTPUT_FILE)

print("\nFirst five cleaned records:")
print(df.head())
