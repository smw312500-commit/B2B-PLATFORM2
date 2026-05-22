@echo off
chcp 65001 >nul
title 물류회사 AI Agent - 초기 설치

echo.
echo  ================================
echo   초기 설치 시작
echo  ================================
echo.

:: .env 파일 생성
if not exist "%~dp0backend\.env" (
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
    echo  [완료] .env 파일 생성됨
    echo         backend\.env 파일을 열어 DB 정보와 API 키를 입력하세요.
) else (
    echo  [건너뜀] .env 파일 이미 존재
)

echo.
echo  [1/3] Python 패키지 설치 중...
cd /d "%~dp0backend"
pip install -r requirements.txt
if errorlevel 1 (
    echo  [오류] pip install 실패. Python 환경을 확인하세요.
    pause
    exit /b 1
)

echo.
echo  [2/3] DB 테이블 초기화 중...
python init_db.py
if errorlevel 1 (
    echo  [경고] DB 연결 실패. backend\.env 의 DB 정보를 확인하세요.
)

echo.
echo  [3/3] Node.js 패키지 설치 중...
cd /d "%~dp0frontend"
npm install
if errorlevel 1 (
    echo  [오류] npm install 실패. Node.js 설치를 확인하세요.
    pause
    exit /b 1
)

echo.
echo  ================================
echo   설치 완료!
echo   이제 start.bat 을 실행하세요.
echo  ================================
echo.
pause
