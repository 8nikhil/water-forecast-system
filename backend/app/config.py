import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Intelligent Water Consumption Forecasting and Conservation System"
    VERSION: str = "2.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production").lower()
    API_V1_PREFIX: str = "/api"

    # Server Binding
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Allowed CORS Origins (comma-separated for cloud deployments)
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
    )

    # Database Engine Selection: 'sqlite' | 'mysql' | 'postgresql'
    DB_ENGINE: str = os.getenv("DB_ENGINE", "sqlite").lower()

    # MySQL Configuration Parameters
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "aquapulse_water_db")
    MYSQL_POOL_SIZE: int = int(os.getenv("MYSQL_POOL_SIZE", "10"))
    MYSQL_MAX_OVERFLOW: int = int(os.getenv("MYSQL_MAX_OVERFLOW", "20"))
    MYSQL_POOL_RECYCLE: int = int(os.getenv("MYSQL_POOL_RECYCLE", "3600"))

    # Database URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./water_system.db")

    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-water-forecasting-jwt-key-2026-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # ML Model directory
    MODEL_DIR: str = os.getenv("MODEL_DIR", "./backend/ml_models")

    # Utility default water tariff ($ per 1,000 Liters / 1 cubic meter)
    WATER_RATE_PER_CUBIC_METER: float = 3.65  # $0.00365 per Liter

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    def get_effective_database_url(self) -> str:
        """
        Constructs canonical database URL based on configured engine.
        Defaults to SQLite if MySQL is not explicitly configured or unreachable.
        """
        if self.DB_ENGINE == "mysql" or self.DATABASE_URL.startswith("mysql"):
            # If explicit DATABASE_URL provided, use it
            if self.DATABASE_URL.startswith("mysql"):
                return self.DATABASE_URL
            # Build MySQL URL using pymysql driver
            pwd_part = f":{self.MYSQL_PASSWORD}" if self.MYSQL_PASSWORD else ""
            return f"mysql+pymysql://{self.MYSQL_USER}{pwd_part}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}?charset=utf8mb4"
        return self.DATABASE_URL

    def get_cors_origins(self) -> list[str]:
        """Parses comma-separated CORS origins."""
        return [orig.strip() for orig in self.CORS_ORIGINS.split(",") if orig.strip()]


settings = Settings()
