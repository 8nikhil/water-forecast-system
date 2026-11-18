@echo off
setlocal enabledelayedexpansion
title AquaPulse Water Forecast System - Launcher

echo ===================================================================
echo   AquaPulse - Smart Water Forecasting and Analytics Platform
echo ===================================================================
echo.

:: 1. Clear any zombie processes holding port 8000, 5173, or 5174
echo [1/4] Checking and clearing port conflicts...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    echo   Releasing occupied port 8000 [PID %%a]
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    echo   Releasing occupied port 5173 [PID %%a]
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174 ^| findstr LISTENING 2^>nul') do (
    echo   Releasing occupied port 5174 [PID %%a]
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Launch Backend in its own window (cmd /k keeps it alive so it never blinks and closes)
echo [2/4] Starting AquaPulse Backend [FastAPI + ML Engine]...
start "AquaPulse Backend (Port 8000)" cmd /k "cd /d ""%~dp0"" && call run-backend.bat"

:: 3. Launch Frontend in its own window
echo [3/4] Starting AquaPulse Frontend [React + Vite]...
start "AquaPulse Frontend (Port 5173)" cmd /k "cd /d ""%~dp0"" && call run-frontend.bat"

:: 4. Wait for services to initialize
echo [4/4] Waiting for services to come online...
set ATTEMPTS=0
:WAIT_LOOP
set /a ATTEMPTS+=1
ping 127.0.0.1 -n 2 >nul

:: Check backend health
curl.exe -s -o nul http://127.0.0.1:8000/api/health >nul 2>&1
if %errorlevel% EQU 0 goto LAUNCH_BROWSER

if !ATTEMPTS! LEQ 15 (
    echo   Waiting for ML model engine to warm up (!ATTEMPTS!/15)...
    goto WAIT_LOOP
)

:LAUNCH_BROWSER
echo.
echo [OK] Services are online!
echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ===================================================================
echo     AquaPulse - Smart Water Forecasting and Analytics Platform
echo ===================================================================
echo.
echo   [ONLINE] Frontend Web UI:    http://localhost:5173
echo   [ONLINE] Backend REST API:   http://127.0.0.1:8000
echo   [ONLINE] Swagger API Docs:   http://127.0.0.1:8000/docs
echo   [ONLINE] Dataset:            Migsun Vilaasa (20 Households Baseline)
echo   [ONLINE] Model Benchmark:    97.14%% R2 Score (MAE: 17.60 L)
echo.
echo ===================================================================
echo   Website is now running!
echo   You can minimize this window.
echo.
echo   To STOP all servers when done, press [S] then Enter (or run stop.bat).
echo ===================================================================
echo.

:CHOICE_LOOP
set /p USER_CHOICE="Enter 's' to stop servers or 'r' to restart: "
if /i "!USER_CHOICE!"=="s" (
    echo.
    echo Stopping AquaPulse services...
    call "%~dp0stop.bat"
    exit /b 0
)
if /i "!USER_CHOICE!"=="r" (
    echo Restarting servers...
    call "%~dp0stop.bat"
    goto WAIT_LOOP
)
goto CHOICE_LOOP
