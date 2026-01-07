# CareerPath AI - Agentic Career Advisory Platform

An AI-driven career advisory ecosystem built with **FastAPI** (backend), **React + Vite** (frontend), and **MongoDB**. Powered by an **Agentic Architecture** ("The Hive") using **LangGraph** and **RabbitMQ** for autonomous task orchestration.

## 🌟 Key Features

### 🤖 Agentic AI Ecosystem ("The Hive")

- **Supervisor Agent** - Intelligent orchestrator that routes user queries to specialized agents.
- **Job Scout Agent** - Autonomously researches and fetches live job opportunities.
- **Resume Manager** - Maintains context of your active resume for tailored advice.
- **Microservices Architecture** - Asynchronous task processing via RabbitMQ workers.

### 🔐 Authentication & User Management

- **User Registration & Login** - Secure JWT-based authentication.
- **Google OAuth Integration** - Seamless social login.
- **User Dashboard** - Personalized overview with stats, recent activity, and interview history.
- **Profile Management** - Update user information and settings.

### 📄 Intelligent Resume Processing

- **File System Storage** - Scalable resume storage.
- **Multi-Format Support** - Parse and analyze PDF and DOCX resumes.
- **Standalone Question Generator** - Quickly generate interview questions from any resume text.

### 🎯 Job Matching & Live Search

- **Hybrid Matching Engine** - Combines **Semantic Search** (Sentence Transformers) with **Agentic Live Search**.
- **Real-Time Live Jobs** - Fetch global openings from Google Jobs via SerpApi.
- **Quick Apply & Save** - Jump directly to job applications or save opportunities for later.

### 🗺️ Career Roadmap Generation

- **AI-Generated Roadmaps** - Tailored learning paths based on your target role and current skills.
- **Milestone Tracking** - Phase-wise goals with resources and success criteria.

### 🎤 AI-Powered Mock Interviews

- **Voice-to-Text (STT)** - Dictate your answers using the integrated Web Speech API.
- **Resume-Based Questions** - Dynamically generated questions specific to your background.
- **Multi-Round Flow** - Dedicated Aptitude, Technical, and HR rounds.
- **Real-Time Evaluation** - Instant AI-driven feedback and persistent scoring.

### 📊 Reports & Analytics

- **Final Interview Reports** - Comprehensive PDF evaluations with AI insights.
- **Score Persistence** - Historical performance tracking.

## 🛠️ Tech Stack

### Backend & AI
- **FastAPI** - High-performance Python web framework.
- **LangGraph & LangChain** - Agentic orchestration and state management.
- **Krutrim AI (LLM)** - Core intelligence for agents and analysis.
- **Sentence Transformers** - Semantic similarity for ML job matching.
- **RabbitMQ (Pika)** - Distributed message queue for async workers.
- **MongoDB + Beanie ODM** - Async NoSQL database management.
- **Redis** - High-speed caching.

### Frontend
- **React 18 + Vite** - Lightning-fast UI.
- **TypeScript** - Full-stack type safety.
- **TailwindCSS** - Premium Glassmorphism design system.
- **React Router v6** - Declarative navigation.
- **Web Speech API** - Real-time Voice-to-Text.

## 📋 Setup Instructions

### 🚀 Unified Startup (Recommended)
If you want to start everything with a single command from the root folder:

```powershell
python start_all.py
```

---

### 🚀 Unified Startup (Local Dev)
If you prefer running locally (better for hot-reloading code) but want a single command:

```powershell
python start_all.py
```

---

### Manual Setup
If you prefer running terminals separately, follow these steps:

#### 1. Infrastructure Setup
The application uses Docker for database and caching services (MongoDB, Redis, RabbitMQ).

```bash
docker-compose up -d
```

This will start:
- **MongoDB** on port `27017`
- **Redis** on port `6379`
- **RabbitMQ** on ports `5672` (AMQP) and `15672` (Management UI)

#### 2. Backend Setup

1. Navigate to `backend/` and create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure `.env` file in the `backend/` directory:
   ```env
   # AI Configuration
   KRUTRIM_API_KEY=your_krutrim_api_key_here
   KRUTRIM_API_URL=https://cloud.olakrutrim.com/v1/chat/completions
   
   # Database Configuration
   MONGODB_URL=mongodb://localhost:27017
   
   # Cache Configuration
   REDIS_URL=redis://localhost:6379
   
   # Message Queue Configuration
   RABBITMQ_URL=amqp://guest:guest@localhost:5672/
   
   # Authentication
   JWT_SECRET_KEY=your-secret-key-change-in-production
   
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # Email Configuration (for interview scheduling)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   EMAIL_FROM=noreply@careerpath.ai
   
   # Google Calendar API (optional)
   GOOGLE_CALENDAR_CREDENTIALS_FILE=credentials.json
   GOOGLE_CALENDAR_TOKEN_FILE=token.json
   
   # Analytics Configuration
   ANALYTICS_SNAPSHOT_INTERVAL_DAYS=7
   ```

4. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```
   
   The API will be available at `http://localhost:8000`

#### 3. Worker Setup (Background Task Processing)

In a **separate terminal**, start the RabbitMQ worker for asynchronous question generation:

```bash
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
python worker.py
```

The worker will process tasks from the `question_generation` queue.

#### 4. Frontend Setup

1. Navigate to `frontend/`:
   ```bash
   cd frontend
   npm install
   ```

2. Configure `.env` file in the `frontend/` directory (if needed):
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   
   The frontend will be available at `http://localhost:5173`

#### 5. Verify All Services

Once all services are running, you should have:
- ✅ **Frontend**: http://localhost:5173
- ✅ **Backend API**: http://localhost:8000/docs (Swagger UI)
- ✅ **Backend Health**: http://localhost:8000/health
- ✅ **Prometheus Metrics**: http://localhost:8000/metrics
- ✅ **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- ✅ **Worker**: Running in terminal, processing tasks

## 📡 Key API Endpoints

### Interview & Analysis
- `POST /analyze-resume/{session_id}` - Hybrid ML job matching (cached).
- `POST /analyze-resume-live/{session_id}` - Real-time SerpApi job search.
- `GET /report/{session_id}` - Generate and download PDF evaluation.
- `GET /active-session` - Retrieve the current user's active interview.

### Job Management
- `POST /user/jobs/{id}/save` - Toggle saved status for a job match.
- `GET /user/jobs/saved` - Retrieve all user-saved opportunities.

### Career Management
- `POST /generate-roadmap` - AI-generated career path.
- `GET /user/roadmaps` - List all saved roadmaps.

## 📁 Project Structure highlights
- `backend/session_service.py` - Core interview logic and state management.
- `backend/cache_manager.py` - Redis integration and caching logic.
- `frontend/src/components/InterviewSession.tsx` - Interactive interview with STT.
- `frontend/src/components/LiveJobs.tsx` - Search, Apply, and Save jobs.

## 🔒 Security
- **JWT Auth**: Session-based security with 24-hour tokens.
- **Bcrypt**: Industrial-strength password hashing.
- **File Validation**: Secure handling and sandboxing of uploaded resumes.

---
**CareerPath AI** | Empowering your professional journey with Intelligence.
