@echo off
echo Starting TennisCourt System...

start "Backend Server" cmd /k "cd /d "%~dp0backend" && npm start"
timeout /t 3 /nobreak > nul
start "Frontend Server" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo Both servers are starting...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo DO NOT close the two black windows that opened.
pause
