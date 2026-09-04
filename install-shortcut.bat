@echo off
setlocal EnableExtensions
title S M Glamz - Install Desktop Shortcut
echo.
echo  Installing S M Glamz Salon shortcuts...
echo.

set "DIR=%~dp0"
cd /d "%DIR%"

set "ICON=%DIR%public\favicon.ico"
if not exist "%ICON%" set "ICON=%DIR%smg.png"

set "LAUNCHER=%DIR%GlamzLauncher.exe"
if not exist "%LAUNCHER%" set "LAUNCHER=%DIR%GlamzLauncher.vbs"
if not exist "%LAUNCHER%" set "LAUNCHER=%DIR%start-app.bat"

powershell -NoProfile -ExecutionPolicy Bypass -File "%DIR%scripts\create-shortcuts.ps1" -AppDir "%DIR%" -Target "%LAUNCHER%" -Icon "%ICON%"
if errorlevel 1 (
    echo [ERROR] Could not create shortcuts.
    pause
    exit /b 1
)

echo.
echo  Done. Look for "S M Glamz Salon" on your Desktop.
echo.
pause