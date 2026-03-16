@echo off
cd /d "C:\Users\Harry\source\repos\VisionBoard"

:: Check if the dev server is already listening on port 51414
netstat -ano | find "51414" | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo VisionBoard already running — opening browser...
) else (
    echo Starting VisionBoard dev server...
    start "VisionBoard Dev Server" /min cmd /c "npm run dev"
    :: Wait for the server to be ready (4-second buffer)
    ping -n 5 127.0.0.1 >nul
)

start "" "http://localhost:51414"
