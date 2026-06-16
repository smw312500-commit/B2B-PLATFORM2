@echo off
title BL Parser Service

echo  [1/3] Checking Python packages...
cd /d "%~dp0parser"
if not exist "venv\Scripts\python.exe" (
    python -m venv venv
)
call venv\Scripts\pip.exe install -r requirements.txt -q
if errorlevel 1 ( echo [ERROR] pip install failed & pause & exit /b 1 )

echo  [2/3] Generating sample BL PDFs (if not present)...
if not exist "%~dp0samples\bl_fabric_cotton_poly.pdf" (
    cd /d "%~dp0samples"
    pip install reportlab -q
    python generate_samples.py
)

echo  [3/3] Starting BL Parser (http://localhost:8010)...
cd /d "%~dp0parser"
start "BL Parser" cmd /k "venv\Scripts\python.exe -m uvicorn main:app --reload --port 8010"

timeout /t 2 /nobreak >nul

echo.
echo  ================================
echo   BL Parser : http://localhost:8010
echo   API Docs  : http://localhost:8010/docs
echo  ================================
