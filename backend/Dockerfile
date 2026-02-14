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
COPY requirements.txt .
# Install all dependencies in one single layer to avoid redundant downloads and keep image lean
# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt


# Copy the rest of the backend code
COPY . .

# Make run.sh executable
RUN chmod +x run.sh

# Ensure the job data CSV is available for the ML matcher
# We now Copy from the root context if possible, or assume it's in the context
# Note: If building from root, use: docker build -f backend/Dockerfile .
# If building from backend, the file must be there or in parent
# For now, we assume it's copied or handled by compose
# COPY job_data_merged.csv /app/job_data_merged.csv

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Command to run the application using the startup script
CMD ["./run.sh"]
