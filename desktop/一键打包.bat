@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   DDL Helper - Desktop Build
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 goto no_node

rem Mirrors for CN network
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
set "ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/"

if exist "node_modules\electron" goto deps_ok

echo [1/2] Installing dependencies (first run: 5-10 min, about 200 MB)...
echo.
call npm install --registry=https://registry.npmmirror.com --no-audit --no-fund
if errorlevel 1 goto dep_fail
goto build

:deps_ok
echo [1/2] Dependencies already installed, skipped.

:build
echo.
echo [2/2] Building...
call npm run dist
if errorlevel 1 goto build_fail

echo.
echo ============================================
echo   Done! Output folder: release
echo   Installer produced (see the exe below)
echo ============================================
dir /b "release\*.exe"
if exist "release" start "" "%~dp0release"
pause
exit /b 0

:no_node
echo [ERROR] Node.js not found. Install it from https://nodejs.org
pause
exit /b 1

:dep_fail
echo.
echo [ERROR] npm install failed. Check your network and try again.
pause
exit /b 1

:build_fail
echo.
echo [ERROR] Build failed. Please send the error text above.
pause
exit /b 1
