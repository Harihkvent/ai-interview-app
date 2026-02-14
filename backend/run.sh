#!/bin/bash

# Start the worker in the background
echo "Starting Background Worker..."
python worker.py &

# Start the Backend API
echo "Starting Backend API..."
uvicorn main:app --host 0.0.0.0 --port 8000
