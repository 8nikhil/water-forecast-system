@echo off
setlocal EnableDelayedExpansion
title AquaPulse Water Forecast System - Launcher

echo ===================================================================
echo   AquaPulse - Smart Water Forecasting & Analytics Platform
echo ===================================================================
echo.

:: 1. Detect Python Executable
set "PYTHON_CMD="
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_CMD=%~dp0.venv\Scripts\python.exe"
) else if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
) else if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Python\bin\python.exe"
) else (
    where python >nul 2>&1
    if !errorlevel! EQU 0 (
        set "PYTHON_CMD=python"
    ) else (
        where py >nul 2>&1
        if !errorlevel! EQU 0 (
            set "PYTHON_CMD=py"
        )
    )
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python was not found on your system!
    echo Please install Python 3.10+ or add it to your PATH.
    echo.
    pause
    exit /b 1
)

:: 2. Check Node & npm
where npm >nul 2>&1
if !errorlevel! NEQ 0 (
    echo [WARNING] npm was not found in your PATH!
    echo If Node.js is installed, please ensure it is added to PATH.
    echo.
)

:: 3. Clear Stale Ports (8000 and 5173) if already in use
echo [1/4] Checking and clearing port conflicts...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    echo   Releasing occupied port 8000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    echo   Releasing occupied port 5173 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: 4. Launch Backend Server in its own window
echo [2/4] Starting AquaPulse Backend (FastAPI + ML Engine)...
start "AquaPulse Backend (FastAPI - Port 8000)" cmd /k "cd /d "%~dp0backend" && "%PYTHON_CMD%" run.py"

:: 5. Launch Frontend Server in its own window
echo [3/4] Starting AquaPulse Frontend (React + Vite)...
start "AquaPulse Frontend (Vite - Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: 6. Wait for Backend & Frontend to Initialize
echo [4/4] Waiting for services to come online...
set /a ATTEMPTS=0
:WAIT_LOOP
set /a ATTEMPTS+=1
ping 127.0.0.1 -n 2 >nul

curl.exe -s -o nul http://127.0.0.1:8000/api/health >nul 2>&1
if !errorlevel! EQU 0 goto READY

if !ATTEMPTS! LEQ 15 (
    <nul set /p=.
    goto WAIT_LOOP
)

:READY
echo.
echo [OK] Services are online!
echo.
echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

cls
echo ===================================================================
echo     AquaPulse - Smart Water Forecasting & Analytics Platform
echo ===================================================================
echo.
echo   [ONLINE] Frontend Web UI:    http://localhost:5173
echo   [ONLINE] Backend REST API:   http://127.0.0.1:8000
echo   [ONLINE] Swagger API Docs:   http://127.0.0.1:8000/docs
echo   [ONLINE] ML Model Engine:    52-Feature Random Forest (99.83%% R2)
echo   [ONLINE] Coverage:           21 Metropolitan Indian Water Grids
echo.
echo ===================================================================
echo   Website is now running and opened in your browser!
echo   Leave this window open while using AquaPulse.
echo.
echo   To STOP all servers at once, press [Q] or [X] on this window.
echo ===================================================================
echo.

set /p USER_CHOICE="Press Q and Enter to stop all servers (or leave running): "
if /i "%USER_CHOICE%"=="Q" (
    echo Stopping AquaPulse services...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
    echo [OK] All AquaPulse services stopped cleanly.
    ping 127.0.0.1 -n 2 >nul
)
