# CareerPath AI - Free Deployment Options

**Last Updated:** January 5, 2026  
**Total Cost:** $0/month (with limitations)

---

## 🎯 Overview

This guide provides **completely free** deployment options for CareerPath AI, suitable for:
- **MVP/Demo deployments**
- **Portfolio projects**
- **Low-traffic applications** (< 1000 users/month)
- **Development/staging environments**

---

## 📋 Free Tier Comparison

| Service | Free Tier | Limitations |
|---------|-----------|-------------|
| **MongoDB Atlas** | 512 MB storage | Shared cluster, 3 nodes max |
| **Render** | 750 hours/month | Spins down after 15 min inactivity |
| **Railway** | $5 credit/month | ~500 hours execution time |
| **Vercel** | Unlimited | 100 GB bandwidth/month |
| **Netlify** | Unlimited | 100 GB bandwidth/month |
| **Fly.io** | 3 VMs (256 MB each) | Shared CPU, limited bandwidth |
| **Koyeb** | 1 service | 512 MB RAM, spins down |
| **Cyclic** | Unlimited | Serverless, cold starts |

---

## 🚀 Option 1: Render + Vercel + MongoDB Atlas (Recommended)

**Best for:** Quick deployment with minimal configuration

### Architecture
- **Frontend:** Vercel (Static hosting)
- **Backend:** Render (Web service)
- **Worker:** Render (Background worker)
- **Database:** MongoDB Atlas (Free tier)
- **Cache:** Upstash Redis (Free tier)
- **Message Queue:** Upstash QStash (Free tier alternative)

### Cost: **$0/month**

### Limitations
- Backend spins down after 15 minutes of inactivity (cold starts ~30 seconds)
- 512 MB MongoDB storage
- 10,000 Redis commands/day
- Limited concurrent connections

---

## 📝 Step-by-Step: Render + Vercel Deployment

### Prerequisites

1. **Create Accounts:**
   - [Render](https://render.com) (Free)
   - [Vercel](https://vercel.com) (Free)
   - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free)
   - [Upstash](https://upstash.com) (Free)

2. **Push Code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/ai-interview-app.git
   git push -u origin main
   ```

---

### Part 1: MongoDB Atlas Setup

1. **Create Free Cluster:**
   - Go to MongoDB Atlas → Create → Shared (Free)
   - Choose cloud provider and region (closest to you)
   - Cluster name: `careerpath-free`

2. **Configure Security:**
   - Database Access → Add New User
   - Username: `careerpath_user`
   - Password: Generate secure password
   - Built-in Role: `Atlas admin`

3. **Network Access:**
   - Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)
   - (For production, restrict to specific IPs)

4. **Get Connection String:**
   - Connect → Drivers → Copy connection string
   - Replace `<password>` with your password
   - Example: `mongodb+srv://careerpath_user:PASSWORD@careerpath-free.xxxxx.mongodb.net/?retryWrites=true&w=majority`

---

### Part 2: Upstash Redis Setup

1. **Create Redis Database:**
   - Go to Upstash Console → Create Database
   - Name: `careerpath-redis`
   - Type: Regional
   - Region: Choose closest to your backend

2. **Get Connection Details:**
   - Copy `UPSTASH_REDIS_REST_URL`
   - Copy `UPSTASH_REDIS_REST_TOKEN`

3. **Alternative - Use Redis REST API:**
   ```python
   # Update backend/cache_service.py to use Upstash REST API
   import httpx
   
   class UpstashRedisCache:
       def __init__(self, url: str, token: str):
           self.url = url
           self.token = token
           self.headers = {"Authorization": f"Bearer {token}"}
       
       async def get(self, key: str):
           async with httpx.AsyncClient() as client:
               response = await client.get(f"{self.url}/get/{key}", headers=self.headers)
               return response.json().get("result")
       
       async def set(self, key: str, value: str, ex: int = None):
           async with httpx.AsyncClient() as client:
               url = f"{self.url}/set/{key}/{value}"
               if ex:
                   url += f"?EX={ex}"
               await client.get(url, headers=self.headers)
   ```

---

### Part 3: Backend Deployment on Render

#### 3.1 Prepare Backend for Render

Create `backend/render.yaml`:

```yaml
services:
  # Main API Service
  - type: web
    name: careerpath-backend
    env: python
    region: oregon
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: MONGODB_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: KRUTRIM_API_KEY
        sync: false
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: SERP_API_KEY
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: ENVIRONMENT
        value: production
      - key: ALLOWED_ORIGINS
        value: https://your-app.vercel.app

  # Worker Service (Optional - may exceed free tier)
  - type: worker
    name: careerpath-worker
    env: python
    region: oregon
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: python worker.py
    envVars:
      - key: MONGODB_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: KRUTRIM_API_KEY
        sync: false
```

#### 3.2 Deploy to Render

**Option A: Via Dashboard**

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name:** `careerpath-backend`
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free

4. Add Environment Variables:
   - `MONGODB_URL`: (from Atlas)
   - `REDIS_URL`: (from Upstash)
   - `KRUTRIM_API_KEY`: (your API key)
   - `JWT_SECRET_KEY`: (generate random string)
   - `SERP_API_KEY`: (your API key)
   - `GOOGLE_CLIENT_ID`: (from Google Console)
   - `GOOGLE_CLIENT_SECRET`: (from Google Console)
   - `ALLOWED_ORIGINS`: `https://your-app.vercel.app`

5. Click **Create Web Service**

**Option B: Via Blueprint (render.yaml)**

1. Push `render.yaml` to your repository
2. Render Dashboard → New → Blueprint
3. Connect repository
4. Render will auto-detect `render.yaml`
5. Add environment variables in dashboard

#### 3.3 Get Backend URL

After deployment completes:
- Your backend URL: `https://careerpath-backend.onrender.com`
- Test: `https://careerpath-backend.onrender.com/health`

---

### Part 4: Frontend Deployment on Vercel

#### 4.1 Update Frontend Configuration

Update `frontend/.env`:

```env
VITE_API_URL=https://careerpath-backend.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Update `frontend/src/api.ts` to use environment variable:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

#### 4.2 Deploy to Vercel

**Option A: Via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? careerpath-ai
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

**Option B: Via Vercel Dashboard**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New → Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add Environment Variables:
   - `VITE_API_URL`: `https://careerpath-backend.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID`: (your client ID)
6. Click **Deploy**

#### 4.3 Get Frontend URL

After deployment:
- Your frontend URL: `https://careerpath-ai.vercel.app`
- Custom domain: Add in Vercel settings (optional)

---

### Part 5: Update CORS Configuration

Update `backend/main.py` with your Vercel URL:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://careerpath-ai.vercel.app",
        "https://your-custom-domain.com",  # if using custom domain
        "http://localhost:5173",  # for local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit and push changes:

```bash
git add .
git commit -m "Update CORS for Vercel deployment"
git push
```

Render will auto-redeploy.

---

## 🚀 Option 2: Railway (Simplified All-in-One)

**Best for:** Easiest deployment with built-in database options

### Cost: **$5 free credit/month** (~500 hours)

### Steps:

1. **Sign Up:** [Railway.app](https://railway.app)

2. **Deploy from GitHub:**
   - New Project → Deploy from GitHub repo
   - Select your repository
   - Railway auto-detects services

3. **Add MongoDB:**
   - Add Plugin → MongoDB
   - Railway provisions free MongoDB instance
   - Connection string auto-added to environment

4. **Add Redis:**
   - Add Plugin → Redis
   - Auto-configured

5. **Configure Services:**
   - Backend: Auto-detected (Python)
   - Frontend: Add as separate service
   - Worker: Add as separate service

6. **Set Environment Variables:**
   - Railway auto-injects database URLs
   - Add API keys manually

7. **Deploy:**
   - Railway auto-deploys on git push
   - Get public URLs for frontend and backend

**Limitations:**
- $5 credit = ~500 execution hours
- After credit exhausted, services pause
- Shared resources

---

## 🚀 Option 3: Fly.io (Best Free Tier)

**Best for:** Maximum free resources, persistent storage

### Free Tier:
- 3 shared-cpu VMs (256 MB RAM each)
- 3 GB persistent storage
- 160 GB outbound data transfer

### Steps:

1. **Install Fly CLI:**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # Mac/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Sign Up:**
   ```bash
   fly auth signup
   ```

3. **Deploy Backend:**
   ```bash
   cd backend
   fly launch
   # Follow prompts, choose region
   # Fly creates fly.toml
   
   # Set secrets
   fly secrets set MONGODB_URL="your_mongodb_url"
   fly secrets set KRUTRIM_API_KEY="your_key"
   fly secrets set JWT_SECRET_KEY="random_secret"
   
   # Deploy
   fly deploy
   ```

4. **Deploy Frontend:**
   ```bash
   cd frontend
   npm run build
   fly launch
   fly deploy
   ```

5. **Add Redis:**
   ```bash
   fly redis create
   # Follow prompts
   # Connection URL auto-added
   ```

---

## 🚀 Option 4: Completely Serverless (Vercel + Serverless Functions)

**Best for:** Minimal backend, API-only deployment

### Architecture:
- **Frontend:** Vercel
- **Backend API:** Vercel Serverless Functions
- **Database:** MongoDB Atlas (Free)
- **Cache:** Vercel KV (Redis-compatible, free tier)

### Steps:

1. **Restructure Backend as Serverless Functions:**

Create `api/` directory in project root:

```
project/
├── api/
│   ├── auth.py
│   ├── interview.py
│   ├── jobs.py
│   └── roadmap.py
├── frontend/
└── backend/ (keep for shared code)
```

Example `api/auth.py`:

```python
from fastapi import FastAPI, Request
from mangum import Mangum
from backend.auth_routes import router

app = FastAPI()
app.include_router(router)

handler = Mangum(app)
```

2. **Deploy to Vercel:**
   - Vercel auto-detects Python functions in `api/`
   - Each file becomes a serverless endpoint
   - Configure in `vercel.json`

**Limitations:**
- 10-second execution timeout
- Limited for long-running tasks (ML inference)
- Cold starts

---

## 💡 Workarounds for Free Tier Limitations

### 1. Prevent Render Spin-Down

**Problem:** Free tier spins down after 15 minutes of inactivity

**Solution:** Use a free uptime monitor

```bash
# Use UptimeRobot (free)
# Add your backend URL: https://careerpath-backend.onrender.com/health
# Ping interval: 5 minutes
```

Free uptime monitors:
- [UptimeRobot](https://uptimerobot.com) - 50 monitors free
- [Freshping](https://www.freshworks.com/website-monitoring/) - 50 checks free
- [StatusCake](https://www.statuscake.com) - Unlimited free

### 2. Reduce MongoDB Storage Usage

**Problem:** 512 MB limit on free tier

**Solutions:**
- Delete old interview sessions after 30 days
- Store only essential data
- Use text compression for large fields
- Archive completed sessions to JSON files

Add cleanup script `backend/cleanup_old_data.py`:

```python
from datetime import datetime, timedelta
from models import InterviewSession

async def cleanup_old_sessions():
    """Delete sessions older than 30 days"""
    cutoff_date = datetime.utcnow() - timedelta(days=30)
    
    # Delete completed sessions
    result = await InterviewSession.find(
        InterviewSession.status == "completed",
        InterviewSession.completed_at < cutoff_date
    ).delete()
    
    print(f"Deleted {result.deleted_count} old sessions")
```

Run as cron job (GitHub Actions):

```yaml
# .github/workflows/cleanup.yml
name: Cleanup Old Data
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run cleanup
        run: python backend/cleanup_old_data.py
        env:
          MONGODB_URL: ${{ secrets.MONGODB_URL }}
```

### 3. Optimize Redis Usage

**Problem:** 10,000 commands/day limit on Upstash free tier

**Solutions:**
- Increase cache TTL (longer expiration)
- Cache only expensive operations
- Use local in-memory cache for frequently accessed data

```python
from functools import lru_cache

# In-memory cache for static data
@lru_cache(maxsize=100)
def get_job_embeddings():
    # Load job embeddings once, cache in memory
    return load_embeddings()
```

### 4. Handle Worker Process on Free Tier

**Problem:** Running separate worker exceeds free tier

**Solutions:**

**Option A:** Inline processing (no worker)
```python
# In routes.py, generate questions synchronously
@router.post("/start-round")
async def start_round(session_id: str, round_type: str):
    # Generate questions directly instead of queuing
    questions = await generate_questions(session_id, round_type)
    return questions
```

**Option B:** Use GitHub Actions as worker
```yaml
# .github/workflows/worker.yml
name: Question Generation Worker
on:
  repository_dispatch:
    types: [generate_questions]
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Generate questions
        run: python backend/worker.py
        env:
          MONGODB_URL: ${{ secrets.MONGODB_URL }}
          KRUTRIM_API_KEY: ${{ secrets.KRUTRIM_API_KEY }}
```

Trigger from backend:
```python
import httpx

async def trigger_worker(session_id: str):
    await httpx.post(
        "https://api.github.com/repos/user/repo/dispatches",
        headers={"Authorization": f"token {GITHUB_TOKEN}"},
        json={"event_type": "generate_questions", "client_payload": {"session_id": session_id}}
    )
```

---

## 📊 Free Tier Resource Limits Summary

| Resource | Free Limit | Optimization Strategy |
|----------|------------|----------------------|
| **MongoDB Storage** | 512 MB | Delete old data, compress text |
| **Redis Commands** | 10,000/day | Increase TTL, in-memory cache |
| **Render Compute** | 750 hours/month | Use uptime monitor |
| **Vercel Bandwidth** | 100 GB/month | Optimize images, enable compression |
| **Vercel Builds** | 100/day | Limit deployments |
| **API Calls (LLM)** | Varies | Cache aggressively |

---

## 🎯 Recommended Free Stack

For most users, I recommend:

```
Frontend:  Vercel (unlimited, fast CDN)
Backend:   Render (750 hours, auto-deploy)
Database:  MongoDB Atlas (512 MB)
Cache:     Upstash Redis (10k commands/day)
Worker:    Inline processing or GitHub Actions
Monitor:   UptimeRobot (prevent spin-down)
```

**Total Cost:** $0/month  
**Suitable for:** Up to 1,000 users/month

---

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "Initial" && git push

# 2. Deploy Backend to Render
# - Go to render.com → New Web Service → Connect repo
# - Add environment variables
# - Deploy

# 3. Deploy Frontend to Vercel
cd frontend
vercel --prod

# 4. Set up MongoDB Atlas
# - Create free cluster at mongodb.com/cloud/atlas
# - Get connection string
# - Add to Render environment variables

# 5. Done! 🎉
```

---

## 📝 Post-Deployment Checklist

- [ ] Test all features (auth, interview, job matching)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Configure custom domain (optional)
- [ ] Set up error tracking (Sentry free tier)
- [ ] Enable analytics (Google Analytics free)
- [ ] Add SSL certificate (auto on Vercel/Render)
- [ ] Test mobile responsiveness
- [ ] Share with users! 🚀

---

## 🔄 Upgrade Path

When you outgrow free tier:

1. **First upgrade:** Render Starter ($7/month) - No spin-down
2. **Second upgrade:** MongoDB M10 ($57/month) - Better performance
3. **Third upgrade:** Dedicated Redis ($10/month) - More commands
4. **Full production:** AWS/Azure/GCP (see main deployment plan)

---

## 🆘 Troubleshooting

### Backend keeps spinning down
- Add UptimeRobot monitor pinging `/health` every 5 minutes

### MongoDB connection errors
- Check IP whitelist (allow 0.0.0.0/0 for Render)
- Verify connection string format

### CORS errors
- Update `ALLOWED_ORIGINS` in backend to match Vercel URL
- Redeploy backend after changes

### Cold start too slow
- Optimize imports (lazy load heavy libraries)
- Reduce model size (use smaller Sentence Transformer)
- Consider Railway (no spin-down with credit)

### Out of MongoDB storage
- Run cleanup script to delete old sessions
- Compress resume text before storing
- Use external storage for PDFs (Cloudinary free tier)

---

## 🎓 Learning Resources

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas Tutorial](https://www.mongodb.com/docs/atlas/getting-started/)
- [Upstash Redis Docs](https://docs.upstash.com/redis)

---

**Ready to deploy for free? Start with Render + Vercel! 🚀**
