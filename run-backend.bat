@echo off
title AquaPulse Backend (FastAPI + ML Engine - Port 8000)

:: Detect Python environment
set "PYTHON_CMD="
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_CMD=%~dp0.venv\Scripts\python.exe"
) else if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
) else if exist "C:\Users\ASUS\AppData\Local\Python\pythoncore-3.14-64\python.exe" (
    set "PYTHON_CMD=C:\Users\ASUS\AppData\Local\Python\pythoncore-3.14-64\python.exe"
) else if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Python\bin\python.exe"
) else if exist "C:\Users\ASUS\AppData\Local\Python\bin\python.exe" (
    set "PYTHON_CMD=C:\Users\ASUS\AppData\Local\Python\bin\python.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
) else (
    set "PYTHON_CMD=python"
)

echo =================================================================
echo  AquaPulse Backend (FastAPI + ML Prediction Engine)
echo  Using Python: %PYTHON_CMD%
echo =================================================================
cd /d "%~dp0backend"
"%PYTHON_CMD%" run.py
if errorlevel 1 (
    echo.
    echo [ERROR] Backend crashed or exited with an error.
    pause
)
