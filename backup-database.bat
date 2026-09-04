@echo off
setlocal EnableExtensions
title S M Glamz - Backup Database
echo.
echo  Backing up salon database before upgrade...
echo.

set "DIR=%~dp0"
cd /d "%DIR%"

if not exist "backend\.env" (
    echo [ERROR] backend\.env not found.
    pause
    exit /b 1
)

where pg_dump >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pg_dump not found. Install PostgreSQL client tools.
    echo         Or copy the backups\ folder from your current install instead.
    pause
    exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("backend\.env") do (
    if /I "%%A"=="DB_NAME" set "DB_NAME=%%B"
    if /I "%%A"=="DB_USER" set "DB_USER=%%B"
)
if not defined DB_NAME set "DB_NAME=glamz_db"
if not defined DB_USER set "DB_USER=postgres"

if not exist "backups" mkdir "backups"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
set "OUT=backups\glamz_db_%STAMP%.sql"

echo Dumping "%DB_NAME%" to %OUT% ...
pg_dump -U %DB_USER% -d %DB_NAME% -f "%OUT%"
if errorlevel 1 (
    echo [ERROR] Backup failed. Check DB password and PostgreSQL service.
    pause
    exit /b 1
)

echo.
echo  Backup saved: %OUT%
echo  Keep this file safe before installing the new version.
echo.
pause