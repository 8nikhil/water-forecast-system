
import pandas as pd

# Load original dataset
df = pd.read_csv("flowless_website_data.csv")

print("Original dataset:", df.shape)

# Remove duplicate URLs
df = df.drop_duplicates(subset=["url"])

# Clean text columns
text_columns = ["title", "description", "headings", "content"]

for col in text_columns:
    df[col] = df[col].fillna("")
    df[col] = df[col].astype(str).str.strip()

# Remove completely empty records
df = df[
    (df["title"] != "") |
    (df["content"] != "")
]

# Save cleaned dataset
df.to_csv("cleaned_water_data.csv", index=False)

print("\nCleaning completed!")
print("Cleaned dataset:", df.shape)

print("\nMissing values:")
print(df.isnull().sum())

print("\nSaved: cleaned_water_data.csv")
