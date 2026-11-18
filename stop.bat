@echo off
title AquaPulse - Stop Servers
echo ===================================================================
echo   Stopping AquaPulse Services (Freeing Ports 8000 and 5173)...
echo ===================================================================

set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING 2^>nul') do (
    echo Stopping Backend on Port 8000 [PID %%a]
    taskkill /F /PID %%a >nul 2>&1
    set FOUND=1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    echo Stopping Frontend on Port 5173 [PID %%a]
    taskkill /F /PID %%a >nul 2>&1
    set FOUND=1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5174 ^| findstr LISTENING 2^>nul') do (
    echo Stopping Frontend on Port 5174 [PID %%a]
    taskkill /F /PID %%a >nul 2>&1
    set FOUND=1
)

if %FOUND% EQU 1 (
    echo [OK] All AquaPulse services stopped successfully.
) else (
    echo [INFO] No active AquaPulse services were found on ports 8000 or 5173.
)

ping 127.0.0.1 -n 3 >nul
