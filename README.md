# CareerPath AI - Intelligent Career Advisory Platform

An AI-driven career advisory and interview platform built with **FastAPI** (backend), **React + Vite** (frontend), and **MongoDB**, powered by **Krutrim AI** and enhanced with **Redis Caching** and **Voice-to-Text** capabilities.

## 🌟 Key Features

### 🔐 Authentication & User Management

- **User Registration & Login** - Secure JWT-based authentication.
- **Google OAuth Integration** - Seamless social login.
- **User Dashboard** - Personalized overview with stats, recent activity, and interview history.
- **Profile Management** - Update user information and settings.

### 📄 Intelligent Resume Processing

- **File System Storage** - Scalable resume storage on the local file system (migrated from DB).
- **Multi-Format Support** - Parse and analyze PDF and DOCX resumes.
- **Standalone Question Generator** - Quickly generate interview questions from any resume text.

### 🎯 Job Matching & Live Search

- **Hybrid ML Job Matching** - Advanced matching using TF-IDF and Sentence Transformers.
- **Real-Time Live Jobs** - Fetch global openings from Google Jobs via SerpApi.
- **Quick Apply & Save** - Jump directly to job applications or save opportunities for later.
- **Dedicated Saved Jobs View** - Manage and track your tagged opportunities.

### 🗺️ Career Roadmap Generation

- **AI-Generated Roadmaps** - Tailored learning paths based on your target role and current skills.
- **Milestone Tracking** - Phase-wise goals with resources and success criteria.
- **Persistence** - Save roadmaps and view them anytime in the "My Roadmaps" section.

### 🎤 AI-Powered Mock Interviews

- **Voice-to-Text (STT)** - Dictate your answers using the integrated Web Speech API.
- **Resume-Based Questions** - Dynamically generated questions specific to your background.
- **Multi-Round Flow** - Dedicated Aptitude, Technical, and HR rounds.
- **Real-Time Evaluation** - Instant AI-driven feedback and persistent scoring.
- **Multi-Turn Chat** - Interactive follow-up questions and conversational interface.

### 📊 Reports & Analytics

- **Final Interview Reports** - Comprehensive PDF evaluations with AI insights.
- **Score Persistence** - Historical performance tracking with total score synchronization.

## 🛠️ Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework.
- **MongoDB + Beanie ODM** - Async NoSQL database management.
- **Redis & redis.asyncio** - Strategic caching for job matches and AI analysis.
- **Krutrim AI (LLM)** - Core intelligence for roadmaps, questions, and evaluation.
- **Sentence Transformers** - Semantic similarity for ML job matching.
- **ReportLab** - Dynamic PDF report generation.
- **PyPDF2 & python-docx** - Robust resume parsing.

### Frontend
- **React 18** - Component-based UI library.
- **TypeScript** - Full-stack type safety.
- **React Router v6** - Declarative navigation and URL-based state management.
- **Vite** - Lightning-fast build tool.
- **TailwindCSS** - Premium Glassmorphism design system.
- **Web Speech API** - Real-time Voice-to-Text transcription.

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
If you prefer running terminals separately:

#### Infrastructure Setup
The application uses Docker for database and caching services.
```bash
docker-compose up -d
```

### Backend Setup
1. Navigate to `backend/` and create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate # Windows
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure `.env`:
   ```env
   KRUTRIM_API_KEY=your_key
   KRUTRIM_API_URL=https://cloud.olakrutrim.com/v1/chat/completions
   SERP_API_KEY=your_serp_key
   REDIS_URL=redis://localhost:6379
   MONGODB_URL=mongodb://localhost:27017
   JWT_SECRET_KEY=your_secret
   ```
4. Run server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to `frontend/`:
   ```bash
   cd frontend
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```

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
