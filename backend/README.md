# ⚙️ AquaPulse FastAPI Backend & Analytics Server

High-performance, asynchronous REST API powering the **AquaPulse** Water Consumption Monitoring and Forecasting Platform.

---

## ⚡ Key Capabilities

- **Unified Fast API Server:** Direct integration with scikit-learn ML inference engine.
- **Dual Database Architecture:** High-speed SQLite for local development; MySQL/PostgreSQL for production.
- **Role-Based Access Control (RBAC):** JWT authentication distinguishing between `Resident` and `Utility Admin`.
- **Automated Physical Validation:** Rejects unphysical meteorological or hydrological values before inference.
- **Live Static Serving:** Unified delivery of pre-compiled React distribution bundle at root route.

---

## 📁 Directory Structure

```
backend/
├── app/
│   ├── auth/                 # JWT token generation, password hashing & security
│   ├── crud/                 # Database CRUD operations
│   ├── models/               # SQLAlchemy ORM database schemas
│   ├── routers/              # Modular API endpoints
│   │   ├── admin.py          # Administrative controls & sensor management
│   │   ├── analytics.py      # Hourly diurnal, end-use, & benchmark analytics
│   │   ├── conservation.py   # Anomaly detection, NRW loss & recommendations
│   │   ├── forecasting.py    # Time-series demand forecasting (ML-powered)
│   │   ├── ml_forecast.py    # Specialized ML inference endpoints
│   │   ├── mysql_db.py       # Enterprise MySQL database bridge
│   │   ├── reports.py        # PDF/CSV audit reports & data export
│   │   └── weather.py        # Weather elasticity & precipitation decoupling
│   ├── schemas/              # Pydantic validation & response contracts
│   ├── services/             # Core business logic & ML predictor singleton
│   ├── config.py             # App environment variables & settings
│   ├── database.py           # Database connection & session factory
│   └── main.py               # FastAPI application entrypoint & middleware
├── database/                 # Migration scripts & database seeding routines
├── tests/                    # Comprehensive pytest test suite (58 tests)
├── requirements.txt          # Python dependencies
├── run.py                    # Server launch script
└── README.md                 # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

### 3. Run the Server
```bash
python run.py
```
The server will start on `http://127.0.0.1:8000`.

- **Interactive API Docs (Swagger):** `http://127.0.0.1:8000/docs`
- **Alternative Docs (ReDoc):** `http://127.0.0.1:8000/redoc`

### 4. Execute Backend Tests
```bash
pytest tests/
```
*(Runs all 58 unit, integration, and database tests with 100% pass rate).*

