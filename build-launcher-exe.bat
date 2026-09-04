@echo off
setlocal EnableExtensions
title S M Glamz - Build Launcher EXE
echo.
echo  Building GlamzLauncher.exe for Windows...
echo.

set "DIR=%~dp0"
cd /d "%DIR%"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is required to build the launcher.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install --legacy-peer-deps
)

echo Compiling launcher (downloads pkg on first run)...
call npx --yes @yao-pkg/pkg scripts/windows-launcher.cjs --targets node18-win-x64 --output GlamzLauncher.exe
if errorlevel 1 (
    echo [ERROR] Launcher build failed.
    pause
    exit /b 1
)

echo.
echo  GlamzLauncher.exe created in:
echo  %DIR%
echo.
echo  Next: double-click install-shortcut.bat to pin it to the Desktop.
echo.
pause