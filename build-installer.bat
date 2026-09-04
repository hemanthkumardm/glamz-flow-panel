@echo off
setlocal EnableExtensions
title S M Glamz - Build Windows Installer
echo.
echo  S M Glamz - Windows Installer Builder
echo  =====================================
echo.

set "DIR=%~dp0"
cd /d "%DIR%"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is required.
    pause
    exit /b 1
)

echo [1/4] Installing dependencies and building app...
call npm install --legacy-peer-deps
if errorlevel 1 exit /b 1
cd backend
call npm install
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1
cd ..
call npm run build:webapp
if errorlevel 1 exit /b 1

echo.
echo [2/4] Building GlamzLauncher.exe...
call npx --yes @yao-pkg/pkg scripts/windows-launcher.cjs --targets node18-win-x64 --output GlamzLauncher.exe
if errorlevel 1 (
    echo [ERROR] Launcher build failed.
    pause
    exit /b 1
)

echo.
echo [3/4] Looking for Inno Setup...
set "ISCC="
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"

if defined ISCC (
    echo Found Inno Setup. Building GlamzSetup.exe...
    "%ISCC%" "installer\glamz-installer.iss"
    if errorlevel 1 (
        echo [ERROR] Inno Setup compile failed.
        pause
        exit /b 1
    )
    echo.
    echo  Installer ready:
    echo  %DIR%installer\output\GlamzSetup.exe
    echo.
    echo  Copy GlamzSetup.exe to the salon PC and run it once.
) else (
    echo [SKIP] Inno Setup 6 not installed.
    echo        Download: https://jrsoftware.org/isdl.php
    echo        Then run this script again to create GlamzSetup.exe
    echo.
    echo  You can still use on this PC:
    echo    - GlamzLauncher.exe
    echo    - install-shortcut.bat
)

echo.
echo [4/4] Creating Desktop shortcut on this PC...
powershell -NoProfile -ExecutionPolicy Bypass -File "%DIR%scripts\create-shortcuts.ps1" -AppDir "%DIR%" -Target "%DIR%GlamzLauncher.exe" -Icon "%DIR%public\favicon.ico"

echo.
echo  Build complete.
pause
exit /b 0