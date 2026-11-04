import os
import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

Base = declarative_base()

def _initialize_engine():
    """
    Initializes SQLAlchemy Engine with support for MySQL (PyMySQL) and SQLite fallback.
    Applies connection pooling, auto-reconnect, and health pre-ping.
    """
    target_url = settings.get_effective_database_url()
    is_mysql = target_url.startswith("mysql")
    is_sqlite = target_url.startswith("sqlite")

    if is_mysql:
        try:
            mysql_engine = create_engine(
                target_url,
                pool_size=settings.MYSQL_POOL_SIZE,
                max_overflow=settings.MYSQL_MAX_OVERFLOW,
                pool_recycle=settings.MYSQL_POOL_RECYCLE,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 3},
                echo=False
            )
            # Test connectivity
            with mysql_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"[Database] Successfully connected to MySQL at: {settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DATABASE}")
            return mysql_engine, "mysql", target_url
        except Exception as e:
            print(f"[Database WARNING] Could not connect to MySQL ({e}).")
            print("[Database] Gracefully falling back to local SQLite engine (water_system.db).")

    # Fallback / Default SQLite engine
    sqlite_url = "sqlite:///./water_system.db"
    sqlite_engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        echo=False
    )
    return sqlite_engine, "sqlite", sqlite_url


engine, active_dialect, active_url = _initialize_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI Dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_database_status():
    """Returns real-time status of database engine and connection pool."""
    is_connected = False
    latency_ms = None
    t0 = time.time()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        is_connected = True
        latency_ms = round((time.time() - t0) * 1000.0, 2)
    except Exception as e:
        is_connected = False

    return {
        "active_dialect": active_dialect,
        "connected": is_connected,
        "latency_ms": latency_ms,
        "database_url_masked": active_url.split("@")[-1] if "@" in active_url else active_url,
        "configured_engine": settings.DB_ENGINE,
        "mysql_config": {
            "host": settings.MYSQL_HOST,
            "port": settings.MYSQL_PORT,
            "database": settings.MYSQL_DATABASE,
            "user": settings.MYSQL_USER,
            "pool_size": settings.MYSQL_POOL_SIZE
        }
    }
