@echo off
title DDL Helper - Stop Server
setlocal
set "found="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set "found=1"
    taskkill /f /pid %%a >nul 2>nul
)
if defined found (
    echo Stopped.
) else (
    echo No running service found on port 3000.
)
timeout /t 1 >nul
exit
