# CareerPath AI - Production Deployment Plan

**Version:** 1.0  
**Last Updated:** January 5, 2026  
**Estimated Deployment Time:** 3-5 days (depending on option chosen)

---

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Environment Configuration](#environment-configuration)
5. [Security Hardening](#security-hardening)
6. [Deployment Procedures](#deployment-procedures)
7. [Post-Deployment Tasks](#post-deployment-tasks)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Rollback Strategy](#rollback-strategy)
10. [Cost Estimation](#cost-estimation)

---

## Deployment Options

### Option 1: Cloud Platform (Recommended for Production)

**Best for:** Production deployment with high availability and scalability

#### Platform Choices

##### A. AWS (Amazon Web Services)
- **Frontend:** S3 + CloudFront (static hosting)
- **Backend:** ECS Fargate or EC2 with Auto Scaling
- **Database:** MongoDB Atlas (managed)
- **Cache:** ElastiCache for Redis
- **Message Queue:** Amazon MQ (RabbitMQ) or SQS
- **Storage:** S3 for resume files
- **Monitoring:** CloudWatch + Prometheus + Grafana

**Pros:** Mature ecosystem, excellent documentation, wide service offering  
**Cons:** Can be expensive, complex pricing model

##### B. Azure
- **Frontend:** Azure Static Web Apps or Blob Storage + CDN
- **Backend:** Azure Container Instances or App Service
- **Database:** MongoDB Atlas or Azure Cosmos DB
- **Cache:** Azure Cache for Redis
- **Message Queue:** Azure Service Bus
- **Storage:** Azure Blob Storage
- **Monitoring:** Azure Monitor + Application Insights

**Pros:** Good integration with Microsoft services, competitive pricing  
**Cons:** Steeper learning curve for some services

##### C. Google Cloud Platform (GCP)
- **Frontend:** Firebase Hosting or Cloud Storage + CDN
- **Backend:** Cloud Run or GKE
- **Database:** MongoDB Atlas or Firestore
- **Cache:** Memorystore for Redis
- **Message Queue:** Cloud Pub/Sub
- **Storage:** Cloud Storage
- **Monitoring:** Cloud Monitoring + Prometheus

**Pros:** Excellent for ML workloads, competitive pricing  
**Cons:** Smaller ecosystem than AWS

### Option 2: Containerized Deployment (Docker + Kubernetes)

**Best for:** Multi-cloud or hybrid deployments, maximum portability

- **Container Orchestration:** Kubernetes (EKS, AKS, or GKE)
- **Container Registry:** Docker Hub, ECR, ACR, or GCR
- **Ingress:** NGINX Ingress Controller
- **Database:** MongoDB Atlas (managed) or self-hosted MongoDB StatefulSet
- **Cache:** Redis StatefulSet
- **Message Queue:** RabbitMQ StatefulSet
- **Storage:** Persistent Volumes + Cloud Storage

**Pros:** Maximum portability, excellent for scaling  
**Cons:** Higher complexity, requires Kubernetes expertise

### Option 3: VPS Deployment (Budget-Friendly)

**Best for:** Small-scale deployments, MVP, or budget-constrained projects

- **Provider:** DigitalOcean, Linode, Vultr, or Hetzner
- **Setup:** Single VPS or multiple VPS instances
- **Reverse Proxy:** NGINX
- **SSL:** Let's Encrypt (Certbot)
- **Process Manager:** PM2 or systemd
- **Monitoring:** Self-hosted Prometheus + Grafana

**Pros:** Low cost, simple setup, full control  
**Cons:** Manual scaling, limited high availability

---

## Pre-Deployment Checklist

### Code Cleanup

- [ ] Remove duplicate dependencies from `requirements.txt`
- [ ] Move test files (`test_*.py`, `debug_*.py`, `evaluate_*.py`) to `tests/` directory
- [ ] Verify `credentials.json` is gitignored
- [ ] Add `JWT_SECRET_KEY` to `.env.example`
- [ ] Update CORS configuration to restrict origins
- [ ] Pin all Python package versions in `requirements.txt`

### Configuration Files to Create

- [ ] `Dockerfile` for backend
- [ ] `Dockerfile` for frontend
- [ ] `docker-compose.prod.yml` for production
- [ ] `.dockerignore` files
- [ ] `nginx.conf` for reverse proxy
- [ ] CI/CD pipeline configuration (GitHub Actions, GitLab CI, etc.)

### Environment Variables to Set

**Backend (.env)**
```env
# Required
KRUTRIM_API_KEY=<your_key>
KRUTRIM_API_URL=https://cloud.olakrutrim.com/v1/chat/completions
MONGODB_URL=<production_mongodb_url>
REDIS_URL=<production_redis_url>
RABBITMQ_URL=<production_rabbitmq_url>
JWT_SECRET_KEY=<strong_random_secret>
SERP_API_KEY=<your_serp_key>

# Google OAuth
GOOGLE_CLIENT_ID=<your_client_id>
GOOGLE_CLIENT_SECRET=<your_client_secret>

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your_email>
SMTP_PASSWORD=<app_password>
EMAIL_FROM=noreply@careerpath.ai

# Google Calendar (Optional)
GOOGLE_CALENDAR_CREDENTIALS_FILE=/app/credentials.json
GOOGLE_CALENDAR_TOKEN_FILE=/app/token.json

# Production Settings
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com

# File Storage (if using cloud)
AWS_ACCESS_KEY_ID=<your_key>
AWS_SECRET_ACCESS_KEY=<your_secret>
AWS_S3_BUCKET=careerpath-resumes
AWS_REGION=us-east-1
```

**Frontend (.env)**
```env
VITE_API_URL=https://api.your-domain.com
VITE_GOOGLE_CLIENT_ID=<your_client_id>
```

---

## Infrastructure Setup

### Option 1: AWS Deployment

#### Step 1: Set Up MongoDB Atlas

1. Create MongoDB Atlas account
2. Create a new cluster (M10 or higher for production)
3. Configure network access (whitelist application IPs)
4. Create database user with strong password
5. Get connection string

#### Step 2: Set Up AWS Services

**2.1 Create VPC and Subnets**
```bash
# Use AWS Console or Terraform to create:
# - VPC with CIDR 10.0.0.0/16
# - Public subnets (2 AZs) for load balancer
# - Private subnets (2 AZs) for application
```

**2.2 Set Up ElastiCache for Redis**
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id careerpath-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1
```

**2.3 Set Up Amazon MQ (RabbitMQ)**
```bash
# Create RabbitMQ broker
aws mq create-broker \
  --broker-name careerpath-rabbitmq \
  --engine-type RABBITMQ \
  --engine-version 3.11 \
  --host-instance-type mq.t3.micro \
  --deployment-mode SINGLE_INSTANCE
```

**2.4 Create S3 Bucket for Resumes**
```bash
aws s3 mb s3://careerpath-resumes
aws s3api put-bucket-versioning \
  --bucket careerpath-resumes \
  --versioning-configuration Status=Enabled
```

**2.5 Set Up ECR for Docker Images**
```bash
# Create repositories
aws ecr create-repository --repository-name careerpath-backend
aws ecr create-repository --repository-name careerpath-frontend
aws ecr create-repository --repository-name careerpath-worker
```

**2.6 Set Up ECS Cluster**
```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name careerpath-cluster

# Create task definitions (see Dockerfiles section)
```

**2.7 Set Up Application Load Balancer**
```bash
# Create ALB for backend
aws elbv2 create-load-balancer \
  --name careerpath-alb \
  --subnets <subnet-ids> \
  --security-groups <sg-id>

# Create target groups
aws elbv2 create-target-group \
  --name careerpath-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id <vpc-id>
```

**2.8 Set Up CloudFront for Frontend**
```bash
# Upload frontend build to S3
aws s3 sync frontend/dist s3://careerpath-frontend

# Create CloudFront distribution (via Console)
```

#### Step 3: Set Up Secrets Manager

```bash
# Store sensitive credentials
aws secretsmanager create-secret \
  --name careerpath/prod/env \
  --secret-string file://secrets.json
```

### Option 2: Docker + VPS Deployment

#### Step 1: Provision VPS

**Recommended Specs (Minimum):**
- **CPU:** 4 vCPUs
- **RAM:** 8 GB
- **Storage:** 80 GB SSD
- **OS:** Ubuntu 22.04 LTS

**Providers:**
- DigitalOcean: $48/month (4 vCPU, 8 GB RAM)
- Linode: $48/month (4 vCPU, 8 GB RAM)
- Hetzner: ~€20/month (4 vCPU, 8 GB RAM)

#### Step 2: Initial Server Setup

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Create non-root user
adduser deploy
usermod -aG sudo deploy
su - deploy

# Set up firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker deploy

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install NGINX
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

#### Step 3: Set Up MongoDB Atlas

(Same as Option 1, Step 1)

---

## Dockerfiles

### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
# Multi-stage build for smaller image size
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Set environment variables
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Worker Dockerfile

Create `backend/Dockerfile.worker`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run worker
CMD ["python", "worker.py"]
```

### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Frontend NGINX Configuration

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: careerpath-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URL=${MONGODB_URL}
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - KRUTRIM_API_KEY=${KRUTRIM_API_KEY}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - ENVIRONMENT=production
    depends_on:
      - redis
      - rabbitmq
    volumes:
      - ./backend/uploads:/app/uploads
    networks:
      - careerpath-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    container_name: careerpath-worker
    restart: unless-stopped
    environment:
      - MONGODB_URL=${MONGODB_URL}
      - REDIS_URL=redis://redis:6379
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - KRUTRIM_API_KEY=${KRUTRIM_API_KEY}
    depends_on:
      - redis
      - rabbitmq
      - backend
    networks:
      - careerpath-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: careerpath-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - careerpath-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: careerpath-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - careerpath-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: careerpath-rabbitmq
    restart: unless-stopped
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - careerpath-network
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  nginx:
    image: nginx:alpine
    container_name: careerpath-nginx
    restart: unless-stopped
    ports:
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot-data:/var/www/certbot
    depends_on:
      - backend
      - frontend
    networks:
      - careerpath-network

volumes:
  redis-data:
  rabbitmq-data:
  certbot-data:

networks:
  careerpath-network:
    driver: bridge
```

---

## Security Hardening

### 1. Update CORS Configuration

Edit `backend/main.py`:

```python
# Replace line 86-90
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.com",
        "https://www.your-frontend-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)
```

### 2. Add Rate Limiting

Install `slowapi`:

```bash
pip install slowapi
```

Update `backend/main.py`:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add to endpoints
@app.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, ...):
    ...
```

### 3. Enhance Health Check Endpoint

Update `backend/main.py`:

```python
@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }
    
    # Check MongoDB
    try:
        await User.find_one()
        health_status["services"]["mongodb"] = "healthy"
    except Exception as e:
        health_status["services"]["mongodb"] = "unhealthy"
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        await cache_manager.redis.ping()
        health_status["services"]["redis"] = "healthy"
    except Exception as e:
        health_status["services"]["redis"] = "unhealthy"
        health_status["status"] = "degraded"
    
    return health_status
```

### 4. Add File Size Limits

Update `backend/routes.py`:

```python
from fastapi import File, UploadFile

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    ...
):
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")
    
    # Reset file pointer
    await file.seek(0)
    ...
```

### 5. Add Database Indexes

Create `backend/init_indexes.py`:

```python
import asyncio
from database import init_db
from models import *

async def create_indexes():
    await init_db()
    
    # User indexes
    await User.find().create_index("email", unique=True)
    await User.find().create_index("username", unique=True)
    
    # Session indexes
    await InterviewSession.find().create_index("user_id")
    await InterviewSession.find().create_index("status")
    await InterviewSession.find().create_index([("user_id", 1), ("status", 1)])
    
    # Resume indexes
    await Resume.find().create_index("user_id")
    await Resume.find().create_index([("user_id", 1), ("is_primary", -1)])
    
    # Job matches indexes
    await JobMatch.find().create_index("user_id")
    await JobMatch.find().create_index([("user_id", 1), ("is_saved", 1)])
    
    # Roadmap indexes
    await CareerRoadmap.find().create_index("user_id")
    
    # Question cache TTL index (expire after 7 days)
    await QuestionCache.find().create_index("created_at", expireAfterSeconds=604800)
    
    print("✅ All indexes created successfully")

if __name__ == "__main__":
    asyncio.run(create_indexes())
```

---

## Deployment Procedures

### VPS Deployment (Step-by-Step)

#### Step 1: Prepare Code

```bash
# On local machine
git clone https://github.com/your-repo/ai-interview-app.git
cd ai-interview-app

# Clean up
rm -rf backend/test_*.py backend/debug_*.py backend/evaluate_*.py
rm -rf backend/__pycache__ backend/venv
rm -rf frontend/node_modules frontend/dist

# Create .dockerignore files
echo "venv\n__pycache__\n*.pyc\n.env\ntest_*.py\ndebug_*.py" > backend/.dockerignore
echo "node_modules\ndist\n.env" > frontend/.dockerignore
```

#### Step 2: Transfer Code to Server

```bash
# Create deployment package
tar -czf careerpath-app.tar.gz .

# Transfer to server
scp careerpath-app.tar.gz deploy@your-server-ip:/home/deploy/

# SSH into server
ssh deploy@your-server-ip

# Extract
cd /home/deploy
tar -xzf careerpath-app.tar.gz
cd ai-interview-app
```

#### Step 3: Set Up Environment Variables

```bash
# Create .env file
nano .env

# Paste production environment variables (see Environment Configuration section)
```

#### Step 4: Build and Run Docker Containers

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### Step 5: Set Up NGINX Reverse Proxy

Create `/etc/nginx/sites-available/careerpath`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Backend root endpoints
    location ~ ^/(auth|upload-resume|analyze-resume|start-round|submit-answer|report|health|metrics|docs) {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase upload size limit
    client_max_body_size 10M;
}
```

Enable site and reload NGINX:

```bash
sudo ln -s /etc/nginx/sites-available/careerpath /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 6: Set Up SSL with Let's Encrypt

```bash
# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

#### Step 7: Create Database Indexes

```bash
# Run index creation script
docker-compose -f docker-compose.prod.yml exec backend python init_indexes.py
```

#### Step 8: Verify Deployment

```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Test health endpoint
curl https://your-domain.com/health

# Test API
curl https://your-domain.com/api/health

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## Post-Deployment Tasks

### 1. Set Up Monitoring

#### Install Prometheus and Grafana

```bash
# Create monitoring directory
mkdir -p /home/deploy/monitoring
cd /home/deploy/monitoring

# Create docker-compose.yml for monitoring
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
EOF

# Create Prometheus configuration
cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'careerpath-backend'
    static_configs:
      - targets: ['host.docker.internal:8000']
    metrics_path: '/metrics'
EOF

# Start monitoring stack
docker-compose up -d
```

Access Grafana at `http://your-server-ip:3000` (default credentials: admin/admin)

### 2. Set Up Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/docker-containers

# Add:
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
```

### 3. Set Up Automated Backups

Create backup script `/home/deploy/backup.sh`:

```bash
#!/bin/bash

# Backup script for CareerPath AI
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB (if self-hosted)
# docker exec careerpath-mongodb mongodump --out /backup/$DATE

# Backup uploaded files
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /home/deploy/ai-interview-app/backend/uploads

# Backup environment files
cp /home/deploy/ai-interview-app/.env $BACKUP_DIR/.env_$DATE

# Delete backups older than 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

Make executable and add to cron:

```bash
chmod +x /home/deploy/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/deploy/backup.sh >> /home/deploy/backup.log 2>&1
```

### 4. Set Up Alerts

Configure Prometheus alerts in `prometheus.yml`:

```yaml
rule_files:
  - 'alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']
```

Create `alerts.yml`:

```yaml
groups:
  - name: careerpath_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/second"

      - alert: ServiceDown
        expr: up{job="careerpath-backend"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "CareerPath backend is not responding"
```

---

## Rollback Strategy

### Quick Rollback Procedure

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Restore previous version
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Verify
curl https://your-domain.com/health
```

### Database Rollback

```bash
# Restore MongoDB from backup (if needed)
# mongorestore --uri="mongodb://..." /path/to/backup

# Restore uploaded files
tar -xzf /home/deploy/backups/uploads_<timestamp>.tar.gz -C /
```

---

## Cost Estimation

### Option 1: AWS (Monthly Costs)

| Service | Configuration | Estimated Cost |
|---------|---------------|----------------|
| MongoDB Atlas | M10 (2 GB RAM) | $57 |
| ECS Fargate | 2 tasks (0.5 vCPU, 1 GB each) | $30 |
| ElastiCache Redis | cache.t3.micro | $15 |
| Amazon MQ | mq.t3.micro | $18 |
| S3 Storage | 50 GB | $1 |
| CloudFront | 100 GB transfer | $8.50 |
| Route 53 | Hosted zone | $0.50 |
| **Total** | | **~$130/month** |

### Option 2: VPS (Monthly Costs)

| Service | Configuration | Estimated Cost |
|---------|---------------|----------------|
| VPS | 4 vCPU, 8 GB RAM, 80 GB SSD | $48 |
| MongoDB Atlas | M10 (2 GB RAM) | $57 |
| Domain | .com domain | $12/year ($1/month) |
| **Total** | | **~$106/month** |

### Option 3: Budget VPS (Monthly Costs)

| Service | Configuration | Estimated Cost |
|---------|---------------|----------------|
| VPS | 2 vCPU, 4 GB RAM, 50 GB SSD | $24 |
| MongoDB Atlas | M0 (Free tier, 512 MB) | $0 |
| Domain | .com domain | $12/year ($1/month) |
| **Total** | | **~$25/month** |

---

## Maintenance Checklist

### Daily
- [ ] Check application logs for errors
- [ ] Monitor system resources (CPU, RAM, disk)
- [ ] Verify all services are running

### Weekly
- [ ] Review Grafana dashboards
- [ ] Check backup logs
- [ ] Review security logs
- [ ] Update dependencies (if needed)

### Monthly
- [ ] Review and optimize database queries
- [ ] Clean up old logs and backups
- [ ] Review and update SSL certificates
- [ ] Performance testing
- [ ] Security audit

### Quarterly
- [ ] Major dependency updates
- [ ] Infrastructure cost review
- [ ] Disaster recovery drill
- [ ] Security penetration testing

---

## Conclusion

This deployment plan provides three options for deploying CareerPath AI to production:

1. **AWS (Recommended):** Best for production with high availability and scalability
2. **VPS with Docker:** Good balance of cost and control
3. **Budget VPS:** Best for MVP or low-traffic deployments

**Recommended Path for Most Users:** Start with **Option 2 (VPS with Docker)** for initial launch, then migrate to **Option 1 (AWS)** as traffic grows.

**Timeline:**
- Pre-deployment cleanup: 1 day
- Infrastructure setup: 1-2 days
- Deployment and testing: 1 day
- Monitoring setup: 1 day
- **Total: 3-5 days**

**Next Steps:**
1. Choose deployment option
2. Complete pre-deployment checklist
3. Set up infrastructure
4. Deploy application
5. Configure monitoring
6. Test thoroughly
7. Go live! 🚀
