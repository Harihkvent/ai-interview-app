# AWS Free Tier Deployment Guide

This guide contains critical steps for a stable deployment on AWS `t2.micro` or `t3.micro` instances (1GB RAM).

## 1. Enable Swap Space (CRITICAL)
Before running `docker-compose up`, run these commands on your AWS instance to prevent the server from crashing during builds:

```bash
# Create a 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make the swap permanent (survives reboots)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify it's working
free -h
```

## 2. Updated Deployment Process

### STEP 1 — Setup Environment
Follow the instructions in the project to clone the repo and create your `.env` file.

### STEP 2 — Deploy
Use the optimized build command:
```bash
docker-compose up -d --build
```
The `Dockerfile` has been split into stages to keep memory usage low.

## 3. Troubleshooting

### If the build still crashes:
- **Check RAM**: Run `htop` in another terminal to see memory usage.
- **Prune Docker**: If you run out of disk space, run `docker system prune -f`.
- **Individual Build**: Try building the backend alone first: `docker-compose build fastapi`.

### If containers restart:
- Check logs: `docker-compose logs --tail=50 -f`
