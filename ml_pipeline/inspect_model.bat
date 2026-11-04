@echo off
title AquaPulse Model Inspector
echo ===================================================================
echo  AquaPulse Machine Learning Model Bundle Inspector (.pkl)
echo ===================================================================

set "PYTHON_CMD=python"
where python >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
        set "PYTHON_CMD=%LOCALAPPDATA%\Python\bin\python.exe"
    )
)

"%PYTHON_CMD%" "%~dp0inspect_model.py" "%~dp0models\best_water_consumption_model.pkl"
echo.
pause

