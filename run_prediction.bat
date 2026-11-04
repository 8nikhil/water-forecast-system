@echo off
set PYTHON_EXE=C:\Users\ASUS\AppData\Local\Python\bin\python.exe
if not exist "%PYTHON_EXE%" set PYTHON_EXE=python

echo =================================================================
echo  AquaPulse Machine Learning Prediction Engine
echo =================================================================
echo Running daily forecast for Bengaluru (BLR)...
"%PYTHON_EXE%" predict.py --mode daily --city BLR --date 2025-05-15 --max-temp 33.5 --min-temp 22.0

echo.
echo Running monthly forecast for Delhi (DEL - June 2025)...
"%PYTHON_EXE%" predict.py --mode monthly --city DEL --year 2025 --month 6

pause

