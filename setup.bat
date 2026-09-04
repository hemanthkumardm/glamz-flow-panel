@echo off
setlocal EnableExtensions
title S M Glamz - Windows Setup
echo.
echo  S M Glamz Salon - First-Time Setup (Windows)
echo  =============================================
echo.
if exist "backend\.env" (
    echo  NOTE: backend\.env already exists.
    echo        If the salon is already running, use upgrade.bat instead.
    echo        setup.bat will NOT delete data, but upgrade.bat is safer.
    echo.
    choice /C YN /M "Continue with setup anyway"
    if errorlevel 2 exit /b 0
    echo.
)

set "DIR=%~dp0"
cd /d "%DIR%"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Download from https://nodejs.org and run this script again.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not available. Reinstall Node.js and try again.
    pause
    exit /b 1
)

echo [1/6] Installing frontend dependencies...
call npm install --legacy-peer-deps
if errorlevel 1 goto :failed

echo [2/6] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 goto :failed
cd ..

echo [3/6] Creating environment files...
if not exist ".env" (
    echo VITE_API_BASE_URL=http://localhost:4000> ".env"
    echo Created .env
)
if not exist "backend\.env" (
    copy /Y "backend\.env.example" "backend\.env" >nul
    echo Created backend\.env - edit DB_PASSWORD before first run.
)

echo [4/6] Building backend...
cd backend
call npm run build
if errorlevel 1 goto :failed
cd ..

echo [5/6] Building dashboard and copying to backend\public...
call npm run build:webapp
if errorlevel 1 goto :failed

echo [6/6] Database setup (optional)...
where psql >nul 2>&1
if errorlevel 1 (
    echo [SKIP] psql not found in PATH.
    echo        Install PostgreSQL for Windows, then run:
    echo          createdb glamz_db
    echo          psql -d glamz_db -f backend\src\db\migrations.sql
) else (
    for /f "usebackq tokens=1,* delims==" %%A in ("backend\.env") do (
        if /I "%%A"=="DB_NAME" set "DB_NAME=%%B"
        if /I "%%A"=="DB_USER" set "DB_USER=%%B"
    )
    if not defined DB_NAME set "DB_NAME=glamz_db"
    if not defined DB_USER set "DB_USER=postgres"
    echo Running SAFE migrations on database "%DB_NAME%"...
    echo (Adds new tables/columns only - does NOT delete customers or services.)
    psql -U %DB_USER% -d %DB_NAME% -f "backend\src\db\migrations.sql"
    if errorlevel 1 (
        echo [WARN] Migration failed. Create the database first, then rerun:
        echo        createdb %DB_NAME%
        echo        psql -U %DB_USER% -d %DB_NAME% -f backend\src\db\migrations.sql
    ) else (
        echo Database migrations applied. Existing salon data was kept.
    )
)

echo.
echo  Setup complete.
echo  Next: double-click start-app.bat to launch the salon panel.
echo.
pause
exit /b 0

:failed
echo.
echo [ERROR] Setup failed. Check the messages above.
pause
exit /b 1