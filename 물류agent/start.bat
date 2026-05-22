@echo off
chcp 65001 >nul
title 물류회사 AI Agent

echo.
echo  ================================
echo   물류회사 AI Agent 시작
echo  ================================
echo.

:: 백엔드 실행 (새 창)
echo  [1/2] 백엔드 서버 시작 (port 8001)...
start "물류Agent - Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --reload --port 8001"

:: 잠깐 대기 후 프론트엔드 실행 (새 창)
timeout /t 2 /nobreak >nul
echo  [2/2] 프론트엔드 서버 시작 (port 3000)...
start "물류Agent - Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo  ================================
echo   서버 시작 완료!
echo   백엔드:     http://localhost:8001
echo   프론트엔드: http://localhost:3000
echo   API 문서:   http://localhost:8001/docs
echo  ================================
echo.
echo  창을 닫으면 이 런처는 종료됩니다.
echo  (백엔드/프론트엔드 창은 별도로 닫으세요)
pause
