@echo off
setlocal EnableExtensions
title S M Glamz - Admin Password Reset
echo.
echo  S M Glamz - Admin Password Recovery
echo  ====================================
echo.

set "DIR=%~dp0"
cd /d "%DIR%backend"

if not exist ".env" (
    echo [ERROR] backend\.env not found. Make sure the app is set up first.
    pause
    exit /b 1
)

if exist "dist\scripts\reset-admin.js" (
    node dist\scripts\reset-admin.js %*
) else (
    npx tsx src\scripts\reset-admin.ts %*
)

if errorlevel 1 (
    echo.
    echo [ERROR] Password reset encountered an issue.
)

echo.
pause
