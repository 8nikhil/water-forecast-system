@echo off
title AquaPulse Frontend (React + Vite - Port 5173)
cd /d "%~dp0frontend"
echo =================================================================
echo  AquaPulse Frontend (React + Vite)
echo =================================================================
npm run dev
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend failed to start or crashed.
    pause
)
