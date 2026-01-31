@echo off
REM AI Interview App - Unified Startup Script (Batch)
REM Run all services in separate terminal windows

echo.
echo ========================================
echo    Starting AI Interview App
echo ========================================
echo.

REM Check if venv exists
if exist "backend\venv\Scripts\activate.bat" (
    set USE_VENV=1
    echo Using virtual environment
) else (
    set USE_VENV=0
    echo WARNING: Virtual environment not found
    echo Backend will run with system Python
)

REM Start Worker (Terminal 1)
echo [1/3] Starting Background Worker...
if %USE_VENV%==1 (
    start "AI Worker" cmd /k "cd /d backend && venv\Scripts\activate.bat && python worker.py"
) else (
    start "AI Worker" cmd /k "cd /d backend && python worker.py"
)

REM Wait 1 second
timeout /t 1 /nobreak >nul

REM Start Backend API (Terminal 2)
echo [2/3] Starting Backend API...
if %USE_VENV%==1 (
    start "AI Backend" cmd /k "cd /d backend && venv\Scripts\activate.bat && uvicorn main:app --reload"
) else (
    start "AI Backend" cmd /k "cd /d backend && uvicorn main:app --reload"
)

REM Wait 2 seconds
timeout /t 2 /nobreak >nul

REM Start Frontend (Terminal 3)
echo [3/3] Starting Frontend...
start "AI Frontend" cmd /k "cd /d frontend && npm run dev"

echo.
echo ========================================
echo    All Services Started!
echo ========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000/docs
echo.
echo Close each terminal window to stop services
echo.
pause
