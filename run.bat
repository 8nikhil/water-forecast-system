@echo off
setlocal
title AquaPulse Water Forecast System - Launcher

echo ===================================================================
echo   AquaPulse - Smart Water Forecasting and Analytics Platform
echo ===================================================================
echo.

:: 1. Clear any zombie processes holding port 8000 or 5173
echo [1/4] Checking and clearing port conflicts...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    echo   Releasing occupied port 8000 [PID %%a]
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    echo   Releasing occupied port 5173 [PID %%a]
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Launch Backend in its own window
echo [2/4] Starting AquaPulse Backend [FastAPI + ML Engine]...
start "AquaPulse Backend (Port 8000)" "%~dp0run-backend.bat"

:: 3. Launch Frontend in its own window
echo [3/4] Starting AquaPulse Frontend [React + Vite]...
start "AquaPulse Frontend (Port 5173)" "%~dp0run-frontend.bat"

:: 4. Wait for services to initialize
echo [4/4] Waiting for services to come online...
ping 127.0.0.1 -n 4 >nul

:: Loop up to 10 seconds checking if backend is responding
set ATTEMPTS=0
:WAIT_LOOP
set /a ATTEMPTS+=1
curl.exe -s -o nul http://127.0.0.1:8000/api/health >nul 2>&1
if %errorlevel% EQU 0 goto LAUNCH_BROWSER

if %ATTEMPTS% LEQ 10 (
    ping 127.0.0.1 -n 2 >nul
    goto WAIT_LOOP
)

:LAUNCH_BROWSER
echo [OK] Services are online!
echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

cls
echo ===================================================================
echo     AquaPulse - Smart Water Forecasting and Analytics Platform
echo ===================================================================
echo.
echo   [ONLINE] Frontend Web UI:    http://localhost:5173
echo   [ONLINE] Backend REST API:   http://127.0.0.1:8000
echo   [ONLINE] Swagger API Docs:   http://127.0.0.1:8000/docs
echo   [ONLINE] Coverage:           21 Metropolitan Indian Water Grids
echo.
echo ===================================================================
echo   Website is now running and opened in your browser!
echo   Leave this launcher window open while using AquaPulse.
echo.
echo   To STOP all servers and exit, press any key in this window.
echo ===================================================================
echo.

pause >nul
echo.
echo Stopping AquaPulse services...
call "%~dp0stop.bat"
