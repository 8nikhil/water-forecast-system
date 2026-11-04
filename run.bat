@echo off
title AquaPulse Water Forecast System
echo ===================================================================
echo  Starting AquaPulse Water Forecasting & Conservation Platform
echo ===================================================================

:: Detect Python executable
set "PYTHON_CMD=python"
if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
) else if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Python\bin\python.exe"
)

echo [1/2] Starting Backend (FastAPI + ML Engine) on http://127.0.0.1:8000 ...
start "AquaPulse Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && "%PYTHON_CMD%" run.py"

echo [2/2] Starting Frontend (React + Vite) on http://localhost:5173 ...
start "AquaPulse Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Waiting for services to initialize...
timeout /t 3 >nul

echo Launching browser...
start http://localhost:5173

echo ===================================================================
echo  AquaPulse is running!
echo  - Frontend: http://localhost:5173
echo  - Backend API: http://127.0.0.1:8000
echo  - Swagger Docs: http://127.0.0.1:8000/docs
echo ===================================================================
