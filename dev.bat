@echo off
setlocal EnableExtensions
title S M Glamz - Dev Mode
echo.
echo  S M Glamz - Development Mode (Windows)
echo  Frontend: http://localhost:8080
echo  Backend:  http://localhost:4000
echo.

set "DIR=%~dp0"
cd /d "%DIR%"

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed.
    pause
    exit /b 1
)

if not exist "node_modules\" call npm install --legacy-peer-deps
if not exist "backend\node_modules\" (
    cd backend
    call npm install
    cd ..
)

if not exist ".env" echo VITE_API_BASE_URL=http://localhost:4000> ".env"
if not exist "backend\.env" copy /Y "backend\.env.example" "backend\.env" >nul

call npm run dev:all

pause