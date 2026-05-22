@echo off
title Fabric Agent - Start

echo.
echo ============================================
echo  [1/2] Starting Backend (FastAPI :8001)
echo ============================================
start "Backend :8001" cmd /k "cd /d "%~dp0backend" && if not exist .env copy .env.example .env && if not exist venv python -m venv venv && call venv\Scripts\activate && pip install -r requirements.txt -q && uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

timeout /t 3 /nobreak > nul

echo.
echo ============================================
echo  [2/2] Starting Frontend (React :3000)
echo ============================================
start "Frontend :3000" cmd /k "cd /d "%~dp0frontend" && npm install && npm start"

echo.
echo  Backend  : http://localhost:8001
echo  Frontend : http://localhost:3000
echo  API Docs : http://localhost:8001/docs
echo.
pause
