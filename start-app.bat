@echo off
title S M Glamz Salon
echo Starting S M Glamz Salon Management System...
echo ==============================================

:: Get the directory of the script
set "DIR=%~dp0"
cd /d "%DIR%"

:: 1. Check and install frontend dependencies if missing
IF NOT EXIST "node_modules\" (
    echo [First Time Setup] Installing core application files... Please wait.
    call npm install
)

:: 2. Check and install backend dependencies if missing
IF NOT EXIST "backend\node_modules\" (
    echo [First Time Setup] Installing server files... Please wait.
    cd backend
    call npm install
    cd ..
)

:: 3. Build the frontend dashboard if missing
IF NOT EXIST "dist\" (
    echo [First Time Setup] Building the dashboard for production... Please wait.
    call npm run build
)

:: 4. Start the Application
cd backend
echo.
echo Starting the server! Opening browser shortly...
start "" "http://localhost:4000"
npm start

pause
