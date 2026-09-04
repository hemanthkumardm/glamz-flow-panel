@echo off
setlocal EnableExtensions
title S M Glamz Salon
echo.
echo  Starting S M Glamz Salon Management System
echo  ==========================================
echo.

set "DIR=%~dp0"
cd /d "%DIR%"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Run setup.bat after installing Node.js.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo First-time setup detected. Running setup.bat...
    call "%DIR%setup.bat"
    if errorlevel 1 exit /b 1
)

if not exist "backend\node_modules\" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy /Y "backend\.env.example" "backend\.env" >nul
        echo Created backend\.env - set your PostgreSQL password before continuing.
        notepad "backend\.env"
        pause
    ) else (
        echo [ERROR] backend\.env is missing. Run setup.bat first.
        pause
        exit /b 1
    )
)

if not exist "backend\dist\index.js" (
    echo Building backend...
    cd backend
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Backend build failed.
        pause
        exit /b 1
    )
    cd ..
)

if not exist "backend\public\index.html" (
    echo Building dashboard for production...
    call npm run build:webapp
    if errorlevel 1 (
        echo [ERROR] Dashboard build failed.
        pause
        exit /b 1
    )
)

cd backend
echo.
echo Server starting at http://localhost:4000
echo Keep this window open while using the salon panel.
echo.

start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:4000"
call npm start

echo.
echo Server stopped.
pause