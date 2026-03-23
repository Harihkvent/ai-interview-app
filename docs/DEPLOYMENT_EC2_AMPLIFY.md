# CareerPath AI — Deployment Guide

## Backend: AWS EC2 (Docker) + Frontend: AWS Amplify

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Backend Deployment — AWS EC2 with Docker](#3-backend-deployment--aws-ec2-with-docker)
   - 3.1 [Launch EC2 Instance](#31-launch-ec2-instance)
   - 3.2 [Connect and Prepare the Server](#32-connect-and-prepare-the-server)
   - 3.3 [Enable Swap (Critical for t2.micro)](#33-enable-swap-critical-for-t2micro)
   - 3.4 [Clone Repository and Configure Environment](#34-clone-repository-and-configure-environment)
   - 3.5 [Start All Services with Docker Compose](#35-start-all-services-with-docker-compose)
   - 3.6 [Configure Security Group (Firewall)](#36-configure-security-group-firewall)
   - 3.7 [Set Up NGINX Reverse Proxy with SSL](#37-set-up-nginx-reverse-proxy-with-ssl)
   - 3.8 [Verify Services Running](#38-verify-services-running)
4. [Frontend Deployment — AWS Amplify](#4-frontend-deployment--aws-amplify)
   - 4.1 [Create Amplify App](#41-create-amplify-app)
   - 4.2 [Configure Build Settings](#42-configure-build-settings)
   - 4.3 [Set Environment Variables](#43-set-environment-variables)
   - 4.4 [Deploy and Verify](#44-deploy-and-verify)
5. [Docker Services Reference](#5-docker-services-reference)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Monitoring and Maintenance](#7-monitoring-and-maintenance)
8. [Troubleshooting](#8-troubleshooting)
9. [Cost Estimation (AWS Free Tier)](#9-cost-estimation-aws-free-tier)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ARCHITECTURE                         │
│                                                                         │
│  ┌────────────────┐      HTTPS       ┌──────────────────────────────┐   │
│  │  AWS Amplify   │◄────────────────►│     AWS EC2 Instance         │   │
│  │  (Frontend)    │                  │  ┌───────────────────────┐   │   │
│  │                │                  │  │  NGINX Reverse Proxy  │   │   │
│  │  React + Vite  │                  │  │  (SSL Termination)    │   │   │
│  │  TypeScript    │                  │  └──────────┬────────────┘   │   │
│  │  TailwindCSS   │                  │             │ Port 8000      │   │
│  │                │                  │  ┌──────────▼────────────┐   │   │
│  │  CI/CD:        │                  │  │  Docker Network       │   │   │
│  │  Auto-deploy   │                  │  │                       │   │   │
│  │  on git push   │                  │  │  ┌─────────────────┐  │   │   │
│  └────────────────┘                  │  │  │  FastAPI App    │  │   │   │
│                                      │  │  │  (Port 8000)    │  │   │   │
│                                      │  │  └────────┬────────┘  │   │   │
│                                      │  │           │            │   │   │
│                                      │  │  ┌────────▼────────┐  │   │   │
│                                      │  │  │  RabbitMQ Worker│  │   │   │
│                                      │  │  │  (Async Tasks)  │  │   │   │
│                                      │  │  └─────────────────┘  │   │   │
│                                      │  │                       │   │   │
│                                      │  │  ┌─────┐ ┌─────┐ ┌───┴┐  │   │
│                                      │  │  │Mongo│ │Redis│ │ MQ │  │   │
│                                      │  │  │27017│ │6379 │ │5672│  │   │
│                                      │  │  └─────┘ └─────┘ └────┘  │   │
│                                      │  └───────────────────────────┘   │
│                                      │                                  │
│                                      │  EBS Volume: MongoDB Data        │
│                                      └──────────────────────────────────┘
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    EXTERNAL SERVICES                             │    │
│  │  Krutrim AI API │ SerpApi │ Google OAuth │ Google Calendar │SMTP│    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Summary:**
| Component | Service | Notes |
|-----------|---------|-------|
| Frontend | AWS Amplify | CI/CD, CDN, HTTPS auto-managed |
| Backend API | AWS EC2 + Docker (FastAPI) | Port 8000, behind NGINX |
| Database | AWS EC2 + Docker (MongoDB) | Port 27017, internal only |
| Cache | AWS EC2 + Docker (Redis) | Port 6379, internal only |
| Message Queue | AWS EC2 + Docker (RabbitMQ) | Port 5672, internal only |
| Async Worker | AWS EC2 + Docker (worker.py) | Consumes RabbitMQ queues |

---

## 2. Prerequisites

Before deploying, ensure you have:

- [ ] AWS account with IAM user (AdministratorAccess or specific EC2/Amplify permissions)
- [ ] AWS CLI installed locally (`aws --version`)
- [ ] EC2 key pair created and `.pem` file saved locally
- [ ] GitHub repository with the CareerPath AI code
- [ ] All API keys ready:
  - Krutrim AI API key
  - Google OAuth 2.0 Client ID and Secret
  - SerpApi API key
  - Gmail App Password (for SMTP)
- [ ] Domain name (optional, for custom domain with SSL)

---

## 3. Backend Deployment — AWS EC2 with Docker

### 3.1 Launch EC2 Instance

1. **Go to AWS Console → EC2 → Launch Instance**

2. **Configure instance:**
   | Setting | Recommended Value |
   |---------|------------------|
   | AMI | Ubuntu 22.04 LTS (64-bit x86) |
   | Instance type | `t3.small` (2 vCPU, 2 GB RAM) — preferred |
   | Instance type (free tier) | `t2.micro` (1 vCPU, 1 GB RAM) — requires swap |
   | Storage | 20 GB gp3 EBS |
   | Key pair | Select your `.pem` key pair |
   | Security Group | Create new (configure in step 3.6) |

3. **Launch the instance** and note the **Public IPv4 address** or **Elastic IP**.

> **💡 Tip:** Assign an Elastic IP to the EC2 instance to prevent the IP from changing on restart.
> AWS Console → EC2 → Elastic IPs → Allocate → Associate with your instance.

---

### 3.2 Connect and Prepare the Server

```bash
# Connect via SSH (replace <EC2_IP> and <key.pem> with your values)
ssh -i ~/.ssh/your-key.pem ubuntu@<EC2_IP>

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group (avoid sudo for every docker command)
sudo usermod -aG docker ubuntu

# Install Docker Compose v2
sudo apt install docker-compose-plugin -y

# Verify installations
docker --version
docker compose version

# Log out and log back in for group changes to take effect
exit
ssh -i ~/.ssh/your-key.pem ubuntu@<EC2_IP>
```

---

### 3.3 Enable Swap (Critical for t2.micro)

> ⚠️ **Required for t2.micro (1 GB RAM).** Without swap, Docker builds will crash due to out-of-memory errors. Skip this step only if using t3.small or larger.

```bash
# Create a 2 GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap persistent across reboots
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify swap is active
free -h
# Expected output shows: Swap: 2.0G
```

---

### 3.4 Clone Repository and Configure Environment

```bash
# Clone the repository
git clone https://github.com/Harihkvent/ai-interview-app.git
cd ai-interview-app

# Create the environment file
cp .env.example .env
nano .env
```

**Fill in all required values in `.env`:**

```bash
# MongoDB (Docker internal)
MONGODB_URL=mongodb://mongodb:27017

# Redis (Docker internal)
REDIS_URL=redis://redis:6379

# RabbitMQ (Docker internal)
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/

# Krutrim AI LLM
KRUTRIM_API_KEY=your_krutrim_api_key_here
KRUTRIM_API_URL=https://cloud.olakrutrim.com/v1/chat/completions

# JWT Authentication
JWT_SECRET_KEY=generate_a_random_32_char_string_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret

# Email (Gmail with App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=noreply@careerpath.ai

# Optional: Google Calendar
GOOGLE_CALENDAR_CREDENTIALS_FILE=credentials.json
GOOGLE_CALENDAR_TOKEN_FILE=token.json

# Optional: SerpApi for live job search
SERPAPI_API_KEY=your_serpapi_key_here
```

> **🔐 Security:** Never commit `.env` to Git. It is already in `.gitignore`.
> 
> Generate a secure JWT secret: `python3 -c "import secrets; print(secrets.token_hex(32))"`

---

### 3.5 Start All Services with Docker Compose

```bash
# Build and start all services (detached mode)
docker compose up -d --build

# Monitor build progress (takes 3-10 minutes first time)
docker compose logs -f

# After build completes, check all services are running
docker compose ps
```

**Expected output of `docker compose ps`:**

```
NAME                    IMAGE                   COMMAND                  STATUS          PORTS
interview-mongodb       mongo:latest            "docker-entrypoint.s…"   Up              0.0.0.0:27017->27017/tcp
ai-interview-app-redis  redis:alpine            "docker-entrypoint.s…"   Up              6379/tcp
ai-interview-app-rabbitmq rabbitmq:3-alpine     "docker-entrypoint.s…"   Up              4369/tcp, 5672/tcp, 15672/tcp
ai-interview-app-fastapi ai-interview-backend   "uvicorn main:app --…"   Up              0.0.0.0:8000->8000/tcp
ai-interview-app-worker  ai-interview-backend   "python worker.py"       Up
```

**Verify the API is live:**
```bash
curl http://localhost:8000/docs
# Should return HTML for the Swagger UI
```

---

### 3.6 Configure Security Group (Firewall)

Go to AWS Console → EC2 → Security Groups → Select the group attached to your instance → Edit Inbound Rules:

| Type | Protocol | Port | Source | Purpose |
|------|----------|------|--------|---------|
| SSH | TCP | 22 | Your IP only | Server access |
| HTTP | TCP | 80 | 0.0.0.0/0, ::/0 | HTTP (redirect to HTTPS) |
| HTTPS | TCP | 443 | 0.0.0.0/0, ::/0 | HTTPS API access |
| Custom TCP | TCP | 8000 | 0.0.0.0/0 | FastAPI (if not using NGINX) |

> ⚠️ **Do NOT open ports 27017 (MongoDB), 6379 (Redis), 5672 (RabbitMQ) to the internet.** These are internal Docker services and must remain private.

---

### 3.7 Set Up NGINX Reverse Proxy with SSL

```bash
# Install NGINX
sudo apt install nginx -y

# Install Certbot for free Let's Encrypt SSL
sudo apt install certbot python3-certbot-nginx -y

# Create NGINX config for the API
sudo nano /etc/nginx/sites-available/careerpath-api
```

Paste the following configuration (replace `api.yourdomain.com`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for AI inference
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        
        # Max upload size for resume files
        client_max_body_size 10M;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/careerpath-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain SSL certificate (requires domain DNS to point to EC2 IP)
sudo certbot --nginx -d api.yourdomain.com

# Certbot auto-modifies NGINX config for HTTPS
# Test renewal
sudo certbot renew --dry-run
```

> **📝 Note:** If you don't have a domain name, you can use the EC2 IP directly with port 8000 (HTTP only). Update `VITE_API_URL` in Amplify to use `http://<EC2_IP>:8000`.

---

### 3.8 Verify Services Running

```bash
# Check all Docker containers
docker compose ps

# Check FastAPI health
curl http://localhost:8000/docs

# Check MongoDB
docker exec -it interview-mongodb mongosh --eval "db.adminCommand('ping')"

# Check Redis
docker exec -it $(docker ps -qf "ancestor=redis:alpine") redis-cli ping
# Expected: PONG

# Check RabbitMQ management (port 15672 is NOT exposed externally by default)
docker exec -it $(docker ps -qf "ancestor=rabbitmq:3-alpine") rabbitmqctl status

# View live logs
docker compose logs --tail=50 -f fastapi
docker compose logs --tail=50 -f worker
```

---

## 4. Frontend Deployment — AWS Amplify

AWS Amplify provides free static hosting with automatic CI/CD. Every push to the connected Git branch automatically rebuilds and redeploys the frontend.

### 4.1 Create Amplify App

1. **Go to AWS Console → AWS Amplify → Create new app**
2. Select **"Host web app"**
3. Choose **GitHub** as source provider
4. Authorize AWS Amplify to access your GitHub account
5. Select repository: `Harihkvent/ai-interview-app`
6. Select branch: `main` (or your production branch)
7. Click **Next**

---

### 4.2 Configure Build Settings

Amplify will detect the `frontend/` folder. Verify the auto-detected build settings or manually enter:

```yaml
version: 1
applications:
  - appRoot: frontend
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

---

### 4.3 Set Environment Variables

In the Amplify console → App settings → Environment variables, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://api.yourdomain.com` | Your EC2 API URL (HTTPS) |
| `VITE_GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` | Google OAuth Client ID |

> **Important:** In Google Cloud Console → APIs & Services → OAuth 2.0 Clients:
> - Add your Amplify URL to **Authorized JavaScript origins**: `https://main.xxxxxx.amplifyapp.com`
> - Add your Amplify URL to **Authorized redirect URIs**: `https://main.xxxxxx.amplifyapp.com`

---

### 4.4 Deploy and Verify

1. Click **Save and deploy** in Amplify console
2. Monitor the build logs in real-time
3. Once deployed (typically 3-5 minutes), Amplify provides a URL: `https://main.xxxxxx.amplifyapp.com`
4. Open the URL in your browser
5. Test the full user flow:
   - Register a new account
   - Upload a resume
   - Start a mock interview

**Custom Domain (Optional):**
- In Amplify Console → Domain management → Add domain
- Follow DNS configuration instructions (CNAME records)
- Amplify auto-provisions SSL certificate via ACM

---

## 5. Docker Services Reference

The `docker-compose.yml` at the root of the repository defines all backend services:

```yaml
services:
  mongodb:
    image: mongo:latest
    container_name: interview-mongodb
    ports:
      - "27017:27017"            # Only expose if needed for external access
    volumes:
      - mongodb_data:/data/db    # Persistent data volume
    restart: always

  redis:
    image: redis:alpine
    restart: always
    # Port 6379 is NOT exposed externally (internal Docker network only)

  rabbitmq:
    image: rabbitmq:3-alpine
    restart: always
    # Port 5672 (AMQP) and 15672 (Management UI) are internal only

  fastapi:
    build:
      context: .
      dockerfile: backend/Dockerfile
    image: ai-interview-backend
    command: uvicorn main:app --host 0.0.0.0 --port 8000
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URL=${MONGODB_URL}
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
      - KRUTRIM_API_KEY=${KRUTRIM_API_KEY}
    depends_on:
      - mongodb
      - redis
      - rabbitmq
    restart: always

  worker:
    build:
      context: .
      dockerfile: backend/Dockerfile
    image: ai-interview-backend
    command: python worker.py        # Async question generation worker
    environment:
      - MONGODB_URL=${MONGODB_URL}
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
      - KRUTRIM_API_KEY=${KRUTRIM_API_KEY}
    depends_on:
      - mongodb
      - redis
      - rabbitmq
    restart: always

volumes:
  mongodb_data:    # Named volume: persists MongoDB data across container restarts
```

---

## 6. Environment Variables Reference

### Backend `.env` (on EC2)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URL` | ✅ | MongoDB connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `RABBITMQ_URL` | ✅ | RabbitMQ AMQP URL |
| `KRUTRIM_API_KEY` | ✅ | Krutrim AI LLM API key |
| `KRUTRIM_API_URL` | ✅ | Krutrim AI endpoint URL |
| `JWT_SECRET_KEY` | ✅ | JWT signing secret (min 32 chars) |
| `JWT_ALGORITHM` | ✅ | JWT algorithm (`HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ | Token expiry in minutes |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth 2.0 Client Secret |
| `SMTP_HOST` | Optional | Email SMTP host |
| `SMTP_PORT` | Optional | SMTP port (587) |
| `SMTP_USER` | Optional | SMTP username |
| `SMTP_PASSWORD` | Optional | SMTP app password |
| `SERPAPI_API_KEY` | Optional | SerpApi key for live job search |

### Frontend (Amplify Environment Variables)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend API URL (EC2 endpoint) |
| `VITE_GOOGLE_CLIENT_ID` | ✅ | Google OAuth Client ID |

---

## 7. Monitoring and Maintenance

### View Running Services

```bash
# All services status
docker compose ps

# Live logs from all services
docker compose logs -f

# Live logs from specific service
docker compose logs -f fastapi
docker compose logs -f worker

# Resource usage
docker stats
```

### Application Metrics

CareerPath AI exposes Prometheus metrics at `/metrics`:

```bash
curl http://localhost:8000/metrics
```

Key metrics tracked:
- `interview_sessions_total` — Total sessions created
- `interview_sessions_active` — Currently active sessions
- `interview_sessions_completed` — Completed sessions
- `interview_round_duration_seconds` — Time per round
- `answer_submission_total` — Total answers submitted

### MongoDB Backup

```bash
# Manual backup
docker exec interview-mongodb mongodump \
  --out /tmp/backup_$(date +%Y%m%d)

# Copy backup to host
docker cp interview-mongodb:/tmp/backup_$(date +%Y%m%d) ./backups/

# Restore from backup
docker exec interview-mongodb mongorestore /tmp/backup_YYYYMMDD/
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart services
docker compose up -d --build

# Check logs after update
docker compose logs -f fastapi
```

### Auto-restart on Server Reboot

All Docker services are configured with `restart: always` in `docker-compose.yml`. They automatically restart when the EC2 instance reboots.

To ensure Docker itself starts on boot:
```bash
sudo systemctl enable docker
```

---

## 8. Troubleshooting

### Container keeps restarting

```bash
# Check error logs
docker compose logs --tail=100 fastapi

# Common causes:
# 1. Missing .env variables → verify all required vars are set
# 2. MongoDB not ready → check mongodb container logs
# 3. Port already in use → run: sudo lsof -i :8000
```

### Build fails / Out of Memory

```bash
# Check memory
free -h

# If swap is not active, add it (see Section 3.3)
sudo swapon /swapfile

# Prune Docker to free disk space
docker system prune -f

# Build individual service to isolate the issue
docker compose build fastapi
```

### API not accessible from Amplify frontend

1. **Check CORS**: Verify the `VITE_API_URL` in Amplify matches the EC2 URL exactly (including `https://`)
2. **Check Security Group**: Port 443 (or 8000) must be open for `0.0.0.0/0`
3. **Check NGINX**: `sudo nginx -t && sudo systemctl status nginx`
4. **Check HTTPS**: Run `curl https://api.yourdomain.com/docs`

### MongoDB data lost after restart

Data should be persisted via the named volume `mongodb_data`. Verify:
```bash
docker volume ls | grep mongodb_data
docker volume inspect ai-interview-app_mongodb_data
```

### Worker not processing messages

```bash
# Check RabbitMQ queue status
docker exec -it $(docker ps -qf "ancestor=rabbitmq:3-alpine") \
  rabbitmqctl list_queues name messages

# Restart worker
docker compose restart worker
```

---

## 9. Cost Estimation (AWS Free Tier)

| Service | Free Tier Limit | After Free Tier |
|---------|----------------|-----------------|
| EC2 `t2.micro` | 750 hours/month (12 months) | ~$8.50/month |
| EC2 `t3.small` | Not free tier | ~$15/month |
| EBS Storage (20 GB) | 30 GB/month free (12 months) | ~$1.60/month |
| Amplify Build | 1,000 build minutes/month | $0.01/minute |
| Amplify Hosting | 15 GB serving/month | $0.15/GB |
| Data Transfer Out | 15 GB/month | $0.09/GB |
| **Total (estimated)** | **Free for 12 months** | **~$20-25/month** |

> **Cost optimization tips:**
> 1. Use EC2 Reserved Instances for 1-year commitment (up to 40% discount)
> 2. Stop the EC2 instance when not in use (development only)
> 3. Use MongoDB Atlas free tier (512 MB) instead of self-hosted MongoDB to reduce EC2 RAM requirements
> 4. Enable Amplify's built-in CDN caching to reduce origin requests

---

*Deployment Guide for CareerPath AI | Version 1.0 | AWS EC2 (Docker) + AWS Amplify*
