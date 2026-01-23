@echo off
title SageFlow Accounting
echo =====================================
echo   SageFlow Accounting - Starting...
echo =====================================
echo.

cd /d "%~dp0standalone"

if not exist "server.js" (
    echo ERROR: standalone\server.js not found!
    echo Please run 'pnpm build' first.
    pause
    exit /b 1
)

set PORT=3000
set HOSTNAME=localhost
set NODE_ENV=production

echo Starting server on http://localhost:%PORT%
echo.
echo Press Ctrl+C to stop the server
echo.

start "" http://localhost:%PORT%
node server.js
