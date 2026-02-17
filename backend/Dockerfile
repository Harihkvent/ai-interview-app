# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIP_DEFAULT_TIMEOUT=100
ENV PIP_RETRIES=10
# Limit ML library parallelism to save memory on free tier
ENV OMP_NUM_THREADS=1
ENV MKL_NUM_THREADS=1

# Set work directory
WORKDIR /app

# Install system dependencies and clean up in same layer
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY backend/ .

# Make run.sh executable
RUN chmod +x run.sh

# Create uploads directory
RUN mkdir -p uploads

# The port is dynamic in cloud environments, so we don't hardcode EXPOSE 8000 here
# although it's fine to leave it as documentation.
EXPOSE 8000

# Command to run the application using the startup script
CMD ["./run.sh"]
