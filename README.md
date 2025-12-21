# CareerPath AI - Intelligent Career Advisory Platform

An AI-driven career advisory and interview platform built with **FastAPI** (backend), **React + Vite** (frontend), and **MongoDB**, powered by **Krutrim AI**.

## 🌟 Features

### 🔐 Authentication & User Management

- **User Registration & Login** - Secure JWT-based authentication
- **User Dashboard** - Personalized dashboard with stats and activity
- **Session Persistence** - Auto-login with token management
- **Profile Management** - Update user information

### 📄 Resume Analysis & Job Matching

- **Resume Upload** - Upload your resume (PDF/DOCX)
- **ML-Based Job Matching** - AI analyzes your resume against 63,000+ job roles
- **Match Percentage** - See how well you match each role
- **Skills Gap Analysis** - Identify matched and missing skills

### 🗺️ Career Roadmap Generation

- **AI-Generated Roadmaps** - Personalized learning paths for target roles
- **Learning Milestones** - Phase-wise goals, resources, and success criteria
- **Save & Manage Roadmaps** - Save roadmaps to your account
- **View Saved Roadmaps** - Access your career development plans anytime

### 🎤 AI-Powered Mock Interviews

- **Multi-Round Interviews** - Aptitude, Technical, and HR rounds
- **Resume-Based Questions** - Questions tailored to your background
- **Real-Time Evaluation** - Instant AI feedback and scoring
- **Time Tracking** - Track time spent on each question
- **Round Switching** - Navigate between rounds freely

### 📊 Reports & Analytics

- **Performance Dashboard** - View interview stats and history
- **PDF Reports** - Comprehensive interview reports with AI insights
- **Progress Tracking** - Monitor your career development journey

### 🎨 Modern UI

- **Glassmorphism Design** - Beautiful, modern interface
- **Responsive Layout** - Works on all devices
- **Global Navigation** - Consistent navbar across all pages
- **Smooth Animations** - Enhanced user experience

## 🛠️ Tech Stack

### Backend

- **FastAPI** - Modern Python web framework
- **MongoDB + Beanie ODM** - NoSQL database with async support
- **JWT Authentication** - Secure token-based auth
- **Bcrypt** - Password hashing
- **Krutrim AI** - LLM for questions, evaluation, and roadmaps
- **ReportLab** - PDF generation
- **PyPDF2 & python-docx** - Resume parsing
- **Prometheus** - Metrics and monitoring

### Frontend

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first styling
- **Axios** - HTTP client with interceptors
- **Context API** - Global state management

## 📋 Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB (local or Atlas)
- Krutrim API key

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file:

```env
KRUTRIM_API_KEY=your_krutrim_api_key
KRUTRIM_API_URL=https://cloud.olakrutrim.com/v1/chat/completions
MONGODB_URL=mongodb://localhost:27017
JWT_SECRET_KEY=your_secret_key_here_change_in_production
```

5. Run the backend server:

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🚀 Usage

### Complete Application Flow

1. **Register/Login**

   - Create a new account or sign in
   - JWT token stored for session persistence

2. **Dashboard**

   - View your stats (interviews, roadmaps)
   - See recent activity
   - Quick actions to start new interview or view roadmaps

3. **Start New Interview**

   - Upload your resume (PDF/DOCX)
   - AI analyzes resume and extracts skills

4. **Job Matching**

   - View ML-generated job role suggestions
   - See match percentages and skill gaps
   - Select target role for roadmap

5. **Career Roadmap**

   - AI generates personalized learning path
   - View milestones, goals, and resources
   - **Save roadmap** to your account
   - Proceed to mock interview

6. **Mock Interview Rounds**

   - **Aptitude Round** (5 questions) - Logical reasoning
   - **Technical Round** (8 questions) - Skills assessment
   - **HR Round** (5 questions) - Behavioral questions
   - Switch between rounds anytime
   - Real-time AI evaluation

7. **Download Report**

   - Comprehensive PDF with performance analysis
   - Strengths, weaknesses, and recommendations
   - Time management insights

8. **My Roadmaps**
   - View all saved career roadmaps
   - Click to view full roadmap details
   - Delete roadmaps you no longer need

## 📡 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info
- `PUT /auth/profile` - Update user profile
- `POST /auth/logout` - Logout user

### User Dashboard

- `GET /user/dashboard` - Get user stats and recent activity
- `GET /user/interviews` - Get interview history
- `GET /user/roadmaps` - Get user's roadmaps
- `POST /user/roadmaps/{id}/save` - Save a roadmap
- `DELETE /user/roadmaps/{id}` - Delete/unsave roadmap
- `GET /user/roadmaps/{id}` - Get specific roadmap details

### Interview Flow

- `POST /upload-resume` - Upload resume and create session
- `POST /analyze-resume/{session_id}` - Analyze resume for job matching
- `POST /generate-roadmap` - Generate career roadmap
- `POST /api/interview/start-round` - Start or resume an interview round (Body: session_id, round_type)
- `POST /api/interview/submit-answer` - Submit answer with evaluation (Body: question_id, answer_text)
- `POST /api/interview/switch-round` - Switch to different round (Body: session_id)
- `GET /rounds-status/{session_id}` - Get all rounds status
- `GET /report/{session_id}` - Download PDF report

## 📁 Project Structure

```
ai-interview-app/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── auth_models.py          # User authentication models
│   ├── auth_routes.py          # Authentication endpoints
│   ├── user_routes.py          # User dashboard & roadmap management
│   ├── models.py               # Data models
│   ├── routes.py               # Core application routes
│   ├── interview_router.py     # Modular interview flow endpoints
│   ├── interview_service.py    # Interview logic and state management
│   ├── question_service.py     # Question generation service
│   ├── services.py             # External AI service integration (Krutrim)
│   ├── file_handler.py         # Resume upload and parsing
│   ├── report_generator.py    # PDF report generation
│   ├── ml_job_matcher.py       # Hybrid ML job matching logic
│   ├── database.py             # MongoDB configuration
│   ├── metrics.py              # Prometheus metrics
│   ├── requirements.txt        # Python dependencies
│   └── uploads/                # Uploaded resume files
└── frontend/
    ├── src/
    │   ├── App.tsx             # Main app with routing
    │   ├── api.ts              # API client with auth interceptor
    │   ├── contexts/
    │   │   └── AuthContext.tsx # Authentication context
    │   ├── components/
    │   │   ├── AuthPage.tsx    # Login/Register page
    │   │   ├── Dashboard.tsx   # User dashboard
    │   │   ├── Navbar.tsx      # Global navigation
    │   │   ├── JobMatches.tsx  # Job matching results
    │   │   ├── CareerRoadmap.tsx # Roadmap display
    │   │   ├── SavedRoadmaps.tsx # Saved roadmaps list
    │   │   └── RoadmapViewer.tsx # View specific roadmap
    │   ├── index.css           # Tailwind styles
    │   └── main.tsx            # Entry point
    └── package.json            # Node dependencies
```

## 🎯 Interview Configuration

Default question counts (configurable in `backend/services.py`):

- **Aptitude**: 5 questions
- **Technical**: 8 questions
- **HR**: 5 questions

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth with 24-hour expiration
- **Password Hashing** - Bcrypt for secure password storage
- **Protected Routes** - All user data endpoints require authentication
- **CORS Configuration** - Proper cross-origin resource sharing
- **Input Validation** - Pydantic models for request validation

## 📊 Monitoring

- **Prometheus Metrics** - Available at `/metrics`
- **Request Tracking** - Monitor API performance
- **Interview Analytics** - Track session lifecycle

## 🎨 UI Features

- **Glassmorphism Design** - Modern, translucent UI elements
- **Responsive Layout** - Mobile-friendly interface
- **Dark Theme** - Easy on the eyes
- **Loading States** - Smooth transitions and feedback
- **Error Handling** - User-friendly error messages

## 🔄 State Management

- **React Context** - Global authentication state
- **Local Storage** - Token persistence
- **Auto-login** - Seamless user experience
- **Session Management** - Automatic token refresh

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

## 📚 Full API Reference

### Authentication (`/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/google` - Google OAuth login
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user profile
- `PUT /auth/profile` - Update user profile

### User Management (`/user`)
- `GET /user/dashboard` - Get dashboard statistics
- `GET /user/resumes` - List saved resumes
- `POST /user/resumes` - Upload new resume
- `DELETE /user/resumes/{resume_id}` - Delete a resume
- `GET /user/interviews` - List interview history
- `DELETE /user/interviews/{session_id}` - Delete interview session
- `GET /user/roadmaps` - List career roadmaps (Optional: `?saved_only=true`)
- `GET /user/roadmaps/{roadmap_id}` - Get roadmap details
- `POST /user/roadmaps/{roadmap_id}/save` - Save a roadmap
- `DELETE /user/roadmaps/{roadmap_id}` - Delete/Unsave roadmap

### Interview Core (`/api/interview`)
- `POST /api/interview/start-round` - Start or resume an interview round
- `POST /api/interview/submit-answer` - Submit answer for evaluation
- `POST /api/interview/switch-round` - Switch to a different round dynamically

### Application Routes (Root)
#### Session & Resume
- `POST /upload-resume` - Upload resume and create session
- `POST /analyze-saved-resume/{resume_id}` - Start session from saved resume
- `GET /active-session` - Get current active session
- `POST /start-interview-from-role` - Start interview for specific role
- `GET /session/{session_id}` - Get full session info

#### Round Management
- `POST /start-round/{session_id}` - Start specific round (Query param: `round_type`)
- `GET /next-round/{session_id}` - Get next pending round
- `POST /switch-round/{session_id}` - Switch round (Query param: `round_type`)
- `GET /rounds-status/{session_id}` - Get status of all rounds

#### Interview Actions
- `POST /submit-answer` - Submit answer (Legacy/Direct)
- `POST /generate-questions-only` - Generate questions without session
- `GET /report/{session_id}` - Download PDF report

#### Legacy / Chat
- `POST /start` - Start variable interview
- `POST /chat` - Chat interactions
- `GET /history/{session_id}` - Get chat history
- `POST /end/{session_id}` - End interview

### System
- `GET /` - API Root & Version
- `GET /health` - Health Check
- `GET /metrics` - Prometheus Metrics
