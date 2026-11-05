@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    powershell -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Node.js not found.' + [char]10 + [char]10 + 'Please install Node.js 18+ from https://nodejs.org', 'DDL Helper')" >nul 2>nul
    exit /b 1
)

rem Launch silently through the VBS launcher, then close this window.
rem Use a wildcard so this .bat contains no non-ASCII bytes (cmd parses it as GBK).
for %%f in ("%~dp0*.vbs") do start "" wscript.exe //nologo "%%~ff"
exit
