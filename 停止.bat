@echo off
chcp 65001 >nul
title DDL 小管家 - 停止服务
echo 正在停止 DDL 小管家（端口 3000）...
set "found="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set "found=1"
    taskkill /f /pid %%a >nul 2>nul
)
if defined found (
    echo 已停止。
) else (
    echo 没有检测到正在运行的服务。
)
pause
