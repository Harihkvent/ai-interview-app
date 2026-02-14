# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIP_DEFAULT_TIMEOUT=100
ENV PIP_RETRIES=10

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies in stages to reduce memory pressure (for AWS Free Tier)
COPY backend/requirements.txt .
# Install all dependencies in one single layer to avoid redundant downloads and keep image lean
RUN pip install --no-cache-dir \
    -r requirements.txt \
    torch --extra-index-url https://download.pytorch.org/whl/cpu

# Copy the rest of the backend code
COPY backend/ .

# Ensure the job data CSV is available for the ML matcher
# We now Copy from the root context
COPY job_data_merged.csv /app/job_data_merged.csv

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
