# ==============================================================================
# AquaPulse Multi-Stage Production Dockerfile
# Stage 1: Build Optimized React SPA
# Stage 2: Python 3.11 Runtime with Scikit-Learn Model & FastAPI Backend
# ==============================================================================

# --- Stage 1: Frontend Build ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Backend Runtime ---
FROM python:3.11-slim AS backend-runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy prediction engine, ML model artifacts, datasets, and backend source
COPY predict.py ./predict.py
COPY ml_pipeline/ ./ml_pipeline/
COPY datasets/ ./datasets/
COPY backend/ ./backend/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Production environment configurations
ENV HOST=0.0.0.0
ENV PORT=8000
ENV PYTHONPATH=/app/backend:/app
ENV ENVIRONMENT=production

EXPOSE 8000

# Container Healthcheck (polls FastAPI health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:8000/api/health || exit 1

# Start Production Application
CMD ["python", "backend/run.py"]
