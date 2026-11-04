"""
AquaPulse Prediction Module (Root Bridge)
Delegates all prediction routines to the dedicated Machine Learning pipeline module.
"""

from ml_pipeline.predict import (
    WaterConsumptionPredictor,
    CITY_METADATA,
    MONTHLY_CLIMATOLOGY,
    CITY_NAME_TO_CODE,
    ValidationError,
    ModelLoadError,
    main
)

if __name__ == "__main__":
    main()
