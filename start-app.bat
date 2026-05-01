@echo off
title S M Glamz Backend
echo Starting S M Glamz Salon Management System...

:: Get the directory of the script
set "DIR=%~dp0"
cd /d "%DIR%backend"

:: Start the backend in the current window
:: Open the browser in 3 seconds (gives the server time to boot)
start "" "http://localhost:4000"
npm start

pause
