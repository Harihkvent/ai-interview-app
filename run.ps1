# AI Interview App - Unified Startup Script (PowerShell)
# Run all services in separate terminal windows

Write-Host "Starting AI Interview App..." -ForegroundColor Cyan
Write-Host ""

# Get project paths
$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"
$venvActivate = Join-Path $backendPath "venv\Scripts\Activate.ps1"

# Check if paths exist
if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: Backend folder not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "ERROR: Frontend folder not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $venvActivate)) {
    Write-Host "WARNING: Virtual environment not found at backend\venv" -ForegroundColor Yellow
    Write-Host "Backend will run with system Python" -ForegroundColor Yellow
}

# Start Worker (Terminal 1)
Write-Host "[1/3] Starting Background Worker..." -ForegroundColor Yellow
if (Test-Path $venvActivate) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; .\venv\Scripts\Activate.ps1; python worker.py"
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python worker.py"
}

# Wait a moment
Start-Sleep -Seconds 1

# Start Backend API (Terminal 2)
Write-Host "[2/3] Starting Backend API..." -ForegroundColor Yellow
if (Test-Path $venvActivate) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; .\venv\Scripts\Activate.ps1; uvicorn main:app --reload"
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; uvicorn main:app --reload"
}

# Wait a moment
Start-Sleep -Seconds 2

# Start Frontend (Terminal 3)
Write-Host "[3/3] Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"

Write-Host ""
Write-Host "All services started in separate terminals!" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173"
Write-Host "   Backend:  http://localhost:8000/docs"
Write-Host ""
Write-Host "To stop: Close each terminal window or press Ctrl+C in each" -ForegroundColor Gray
