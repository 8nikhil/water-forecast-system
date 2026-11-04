import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from .config import settings
from .logging_config import logger
from .database import engine, Base
from .routers import (
    auth,
    readings,
    analytics,
    forecasting,
    anomalies,
    recommendations,
    benchmarks,
    admin,
    reports,
    weather,
    ml_forecast,
    mysql_db,
    conservation
)
from .seed import seed_database
from .services.water_ml_service import WaterMLService, PredictValidationError

# Create database tables
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown events."""
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    try:
        seed_database()
        logger.info("[Startup] Database tables and initial seed verified.")
    except Exception as e:
        logger.error(f"[Startup] Error seeding database: {e}")
    # Pre-warm ML singleton service
    try:
        service = WaterMLService()
        if service.model_loaded:
            logger.info(f"[Startup] ML Service Online: {service.predictor.model_name} (52 features, 99.83% R2)")
    except Exception as e:
        logger.error(f"[Startup] Error initializing WaterMLService: {e}")
    yield


app = FastAPI(
    title="AquaPulse Intelligent Water Consumption Forecasting & Conservation Analytics Platform",
    version="2.0.0",
    description=(
        "Production-grade REST API powering predictive data analytics for municipal and residential water consumption. "
        "Integrates the Pan-India Machine Learning ensemble model (Random Forest, 99.83% R², 20.78 MLD MAE) "
        "with real-time telemetry, automated anomaly detection, What-If conservation scenario simulation, "
        "and Swagger API documentation."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Request duration & access logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000.0
    if not request.url.path.startswith("/assets"):
        logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms:.1f}ms)")
    return response

# CORS configuration with explicit origins and cloud regex
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.onrender\.com|.*\.amazonaws\.com)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global validation error handler for prediction physics checks
@app.exception_handler(PredictValidationError)
async def validation_exception_handler(request: Request, exc: PredictValidationError):
    return JSONResponse(
        status_code=400,
        content={"error": "ValidationError", "detail": str(exc)}
    )

# Register API routers
app.include_router(ml_forecast.router, prefix=settings.API_V1_PREFIX)
app.include_router(mysql_db.router, prefix=settings.API_V1_PREFIX)
app.include_router(conservation.router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(readings.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(forecasting.router, prefix=settings.API_V1_PREFIX)
app.include_router(anomalies.router, prefix=settings.API_V1_PREFIX)
app.include_router(recommendations.router, prefix=settings.API_V1_PREFIX)
app.include_router(benchmarks.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(weather.router, prefix=settings.API_V1_PREFIX)


@app.get("/api/health", tags=["Health & Diagnostics"], summary="System & ML Model Health Check")
def health_check():
    """Returns comprehensive system health status, model loading diagnostics, and database connectivity."""
    ml_service = WaterMLService()
    return ml_service.get_health_status()


# Mount frontend production build if available
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api" or full_path.startswith("docs") or full_path.startswith("redoc") or full_path == "openapi.json":
            return {"error": "Not Found"}
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "title": "AquaPulse Intelligent Water Consumption Forecasting Platform",
            "version": "2.0.0",
            "status": "operational",
            "model_architecture": "RandomForestRegressor (99.83% R2, 20.78 MLD MAE)",
            "docs_url": "/docs",
            "redoc_url": "/redoc"
        }
