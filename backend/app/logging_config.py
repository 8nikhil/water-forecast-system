"""
AquaPulse Production Logging Configuration
Configures structured, high-performance logging with timestamping, level filtering,
and clean format for cloud platforms (Render, AWS CloudWatch, Docker).
"""

import logging
import sys
import os

def setup_logging(log_level: str = "INFO"):
    """Configures root and application loggers."""
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    log_format = "%(asctime)s [%(levelname)s] [%(name)s]: %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    # Configure root logger
    logging.basicConfig(
        level=numeric_level,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    # Specific logger for AquaPulse
    logger = logging.getLogger("aquapulse")
    logger.setLevel(numeric_level)
    return logger

logger = setup_logging(os.getenv("LOG_LEVEL", "INFO"))

