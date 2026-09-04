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
cd backend
call node scripts/init-db.js
if errorlevel 1 (
    echo [WARN] Could not run SQL migrations automatically.
) else (
    echo Database updated safely. No customer or service data was removed.
)
cd ..

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