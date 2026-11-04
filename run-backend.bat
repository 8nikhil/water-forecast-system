@echo off
title AquaPulse Backend (FastAPI + ML Engine)
set "PYTHON_CMD=python"

if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
) else if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Python\bin\python.exe"
)

echo =================================================================
echo  Starting AquaPulse Backend (FastAPI + Machine Learning Engine)
echo  Using Python: %PYTHON_CMD%
echo =================================================================
cd /d "%~dp0backend"
"%PYTHON_CMD%" run.py
pause
