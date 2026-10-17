@echo off
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Node.js not found. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
cd /d "%~dp0"
echo ============================================
echo   DDL XiaoGuanJia is starting...
echo   Keep this window open while using.
echo ============================================
start /b node server.js
timeout /t 2 >nul
start "" http://localhost:3000/
echo.
echo Browser opened: http://localhost:3000/
echo Close this window to stop the service.
pause
