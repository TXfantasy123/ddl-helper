@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('未检测到 Node.js。' + [char]10 + [char]10 + '请先安装 Node.js 18+：https://nodejs.org', 'DDL 小管家')" >nul 2>nul
    exit /b 1
)

rem 通过 VBS 静默启动（无控制台窗口），随后本窗口立即关闭
start "" wscript.exe //nologo "%~dp0启动.vbs"
exit
