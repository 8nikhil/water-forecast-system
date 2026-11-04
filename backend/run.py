import uvicorn
import os
import sys

# Ensure backend root and workspace root are on sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)

for path in [backend_dir, root_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

from app.config import settings
from app.logging_config import logger

if __name__ == "__main__":
    host = os.getenv("HOST", settings.HOST)
    port = int(os.getenv("PORT", settings.PORT))

    logger.info("=" * 65)
    logger.info(" AquaPulse Water Forecasting & Conservation Platform (v2.0.0)")
    logger.info(f" Environment: {settings.ENVIRONMENT.upper()}")
    logger.info(f" Database Engine: {settings.DB_ENGINE.upper()}")
    logger.info(f" Server binding: http://{host}:{port}")
    logger.info(f" Swagger Documentation: http://{host}:{port}/docs")
    logger.info("=" * 65)

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=False,
        access_log=True
    )

