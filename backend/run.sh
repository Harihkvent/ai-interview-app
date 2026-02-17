#!/bin/bash

# Use the PORT environment variable if provided, default to 8000
PORT=${PORT:-8000}

# Start the worker in the background
echo "Starting Background Worker..."
python worker.py &

# Start the Backend API
echo "Starting Backend API on port $PORT..."
uvicorn main:app --host 0.0.0.0 --port $PORT
