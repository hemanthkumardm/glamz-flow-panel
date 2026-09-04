@echo off
setlocal EnableExtensions
title S M Glamz - Safe Upgrade
echo.
echo  S M Glamz - Upgrade (keeps your existing data)
echo  ==============================================
echo.
echo  This updates the app only. It does NOT delete:
echo    - Customers
echo    - Services
echo    - Plans
echo    - Bills / transactions
echo    - Wallet balances
echo    - Staff accounts
echo.
echo  Your data lives in PostgreSQL. As long as backend\.env
echo  points to the SAME database as before, everything stays.
echo.

set "DIR=%~dp0"
cd /d "%DIR%"

if not exist "backend\.env" (
    echo [ERROR] backend\.env not found.
    echo         Copy your OLD backend\.env from the previous install first.
    echo         That file tells the app which database has your salon data.
    pause
    exit /b 1
)

echo Keeping your existing backend\.env unchanged.
if not exist ".env" echo VITE_API_BASE_URL=http://localhost:4000> ".env"

echo.
echo [1/5] Installing updated dependencies...
call npm install --legacy-peer-deps
if errorlevel 1 goto :failed
cd backend
call npm install
if errorlevel 1 goto :failed

echo [2/5] Building backend...
call npm run build
if errorlevel 1 goto :failed
cd ..

echo [3/5] Building dashboard...
call npm run build:webapp
if errorlevel 1 goto :failed

echo [4/5] Applying safe database updates (adds new columns only)...
where psql >nul 2>&1
if errorlevel 1 (
    echo [SKIP] psql not in PATH. Start the app once; the server applies updates on boot.
) else (
    for /f "usebackq tokens=1,* delims==" %%A in ("backend\.env") do (
        if /I "%%A"=="DB_NAME" set "DB_NAME=%%B"
        if /I "%%A"=="DB_USER" set "DB_USER=%%B"
    )
    if not defined DB_NAME set "DB_NAME=glamz_db"
    if not defined DB_USER set "DB_USER=postgres"
    psql -U %DB_USER% -d %DB_NAME% -f "backend\src\db\migrations.sql"
    if errorlevel 1 (
        echo [WARN] Could not run SQL migrations now. The app will try again on startup.
    ) else (
        echo Database updated safely. No customer or service data was removed.
    )
)

echo [5/5] Optional backup...
if exist "backups\customers.csv" (
    echo CSV backups folder found: backups\
) else (
    echo Tip: after upgrade, your app still auto-saves backups to backups\
)

echo.
echo  Upgrade complete. Run start-app.bat or GlamzLauncher.exe.
echo.
pause
exit /b 0

:failed
echo.
echo [ERROR] Upgrade failed. Your database was not touched by this script.
pause
exit /b 1