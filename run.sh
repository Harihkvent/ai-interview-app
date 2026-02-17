#!/bin/bash

# AI Interview App - Startup Script for Linux/EC2
# This script mirrors the functionality of run.bat for Linux environments.

# Create logs directory if it doesn't exist
mkdir -p logs

echo "========================================"
echo "   Starting AI Interview App (Linux)"
echo "========================================"

# Check for virtual environment in the backend directory
if [ -d "backend/venv" ]; then
    VENV_PATH="backend/venv"
elif [ -d "backend/.venv" ]; then
    VENV_PATH="backend/.venv"
else
    VENV_PATH=""
fi

# Detect OS to use correct activation script path
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # This shouldn't normally happen if running via bash on Windows, 
    # but added for completeness.
    ACTIVATE_SCRIPT="$VENV_PATH/Scripts/activate"
else
    ACTIVATE_SCRIPT="$VENV_PATH/bin/activate"
fi

if [ -n "$VENV_PATH" ] && [ -f "$ACTIVATE_SCRIPT" ]; then
    echo "Using virtual environment: $VENV_PATH"
    source "$ACTIVATE_SCRIPT"
else
    echo "WARNING: Virtual environment not found or activation script missing."
    echo "Backend will run with system Python."
fi

# Start Background Worker
echo "[1/2] Starting Background Worker..."
cd backend
nohup python worker.py > ../logs/worker.log 2>&1 &
WORKER_PID=$!
cd ..
echo "Worker started with PID: $WORKER_PID (Logs: logs/worker.log)"

# Wait a moment for worker initialization
sleep 2

# Start Backend API
echo "[2/2] Starting Backend API..."
cd backend
# Using 0.0.0.0 to allow external access on EC2
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "Backend API started with PID: $BACKEND_PID (Logs: logs/backend.log)"

echo "========================================"
echo "   All services started in background!"
echo "========================================"
echo "Worker PID: $WORKER_PID"
echo "Backend PID: $BACKEND_PID"
echo ""
echo "To stop services, run: kill $WORKER_PID $BACKEND_PID"
echo "To view logs, run:"
echo "  tail -f logs/worker.log"
echo "  tail -f logs/backend.log"
echo "========================================"
