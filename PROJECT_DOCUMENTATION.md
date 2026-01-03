# CareerPath AI - Comprehensive Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Design Patterns](#architecture--design-patterns)
3. [Technology Stack](#technology-stack)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [Features & Capabilities](#features--capabilities)
8. [API Endpoints](#api-endpoints)
9. [Infrastructure & DevOps](#infrastructure--devops)
10. [Security & Authentication](#security--authentication)

---

## Project Overview

**CareerPath AI** is an advanced AI-driven career advisory platform that combines intelligent interview preparation, job matching, and career guidance. The system leverages a sophisticated **Agentic Architecture** (nicknamed "The Hive") built with LangGraph to provide autonomous, context-aware career assistance.

### Core Value Proposition
- **AI-Powered Mock Interviews**: Multi-round interviews with real-time evaluation
- **Intelligent Job Matching**: Hybrid ML approach combining semantic search and live job data
- **Career Roadmap Generation**: Personalized learning paths based on skills gap analysis
- **Agentic AI Assistance**: Autonomous agents for job search, resume management, and career advice

---

## Architecture & Design Patterns

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React + Vite SPA]
        B[TailwindCSS UI]
        C[Web Speech API]
    end
    
    subgraph "API Gateway"
        D[FastAPI Server]
        E[CORS Middleware]
        F[JWT Auth]
    end
    
    subgraph "Agentic AI Layer - The Hive"
        G[Supervisor Agent]
        H[Job Scout Agent]
        I[Resume Manager Agent]
        J[MCP Server]
    end
    
    subgraph "Core Services"
        K[Interview Service]
        L[Question Service]
        M[ML Job Matcher]
        N[Roadmap Generator]
        O[Report Generator]
    end
    
    subgraph "Data Layer"
        P[(MongoDB)]
        Q[(Redis Cache)]
        R[File Storage]
    end
    
    subgraph "External Services"
        S[Krutrim AI LLM]
        T[SerpApi Jobs]
        U[Sentence Transformers]
    end
    
    A --> D
    D --> F
    F --> G
    G --> H
    G --> I
    G --> J
    D --> K
    D --> L
    D --> M
    D --> N
    K --> P
    L --> P
    M --> Q
    M --> U
    H --> T
    I --> P
    G --> S
    K --> R
```

### Design Patterns Implemented

#### 1. **Agentic Architecture (LangGraph State Machines)**
- **Supervisor Pattern**: Central orchestrator routes queries to specialized agents
- **State Management**: TypedDict-based state for each agent workflow
- **Graph-based Execution**: Nodes represent tasks, edges define flow

```python
# Example: Supervisor Agent Flow
SupervisorState = TypedDict({
    'user_query': str,
    'user_id': str,
    'next_agent': Literal["job_scout", "general_chat", "mcp_services"],
    'final_response': Optional[str]
})
```

#### 2. **Microservices with Message Queue**
- **RabbitMQ Integration**: Asynchronous question generation via worker processes
- **Decoupled Services**: Interview API publishes tasks, worker consumes and processes
- **Scalability**: Multiple workers can process tasks in parallel

#### 3. **Repository Pattern (Beanie ODM)**
- **Document Models**: MongoDB collections as Python classes
- **Async Operations**: Motor-based async database operations
- **Type Safety**: Pydantic validation for all data models

#### 4. **Caching Strategy**
- **Redis Layer**: Cache ML embeddings, job matches, and question banks
- **TTL-based Expiration**: Configurable cache lifetimes
- **Cache Invalidation**: Smart invalidation on data updates

#### 5. **Hybrid ML Approach**
- **TF-IDF + Semantic Embeddings**: Combines keyword matching with contextual understanding
- **Weighted Scoring**: 40% TF-IDF + 60% Semantic similarity
- **Skill Extraction**: NLP-based technical skill identification

---

## Technology Stack

### Backend Technologies

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Web Framework** | FastAPI | High-performance async API server |
| **AI Orchestration** | LangGraph + LangChain | Agentic workflow management |
| **LLM Provider** | Krutrim AI | Core intelligence for agents and analysis |
| **ML/NLP** | Sentence Transformers | Semantic similarity for job matching |
| **ML/NLP** | scikit-learn | TF-IDF vectorization and cosine similarity |
| **Database** | MongoDB + Beanie ODM | Async NoSQL document storage |
| **Caching** | Redis (aioredis) | High-speed in-memory cache |
| **Message Queue** | RabbitMQ (Pika) | Async task processing |
| **Authentication** | JWT + BCrypt | Secure token-based auth |
| **OAuth** | Google OAuth 2.0 | Social login integration |
| **File Processing** | PyPDF2, python-docx, pdfplumber | Resume parsing |
| **Report Generation** | ReportLab | PDF report creation |
| **Monitoring** | Prometheus | Metrics and observability |
| **MCP Integration** | FastMCP | Model Context Protocol server |

### Frontend Technologies

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | React 18 | Component-based UI library |
| **Build Tool** | Vite | Lightning-fast dev server and bundler |
| **Language** | TypeScript | Type-safe JavaScript |
| **Styling** | TailwindCSS | Utility-first CSS framework |
| **Design System** | Glassmorphism | Premium modern UI aesthetic |
| **Routing** | React Router v6 | Declarative client-side routing |
| **HTTP Client** | Axios | Promise-based HTTP requests |
| **OAuth** | @react-oauth/google | Google sign-in integration |
| **Code Editor** | react-simple-code-editor + Prism.js | Syntax-highlighted code input |
| **PDF Viewer** | pdfjs-dist | Client-side PDF rendering |
| **Voice Input** | Web Speech API | Browser-native speech-to-text |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Containerization** | Docker Compose | Local development environment |
| **Database** | MongoDB (Docker) | Document storage |
| **Cache** | Redis (Docker) | In-memory cache |
| **Message Broker** | RabbitMQ (Docker) | Task queue |

---

## Backend Architecture

### Directory Structure

```
backend/
├── ai_engine/                  # Agentic AI System
│   ├── agents/
│   │   ├── supervisor.py       # Main orchestrator agent
│   │   ├── job_scout.py        # Job search specialist
│   │   └── resume_manager.py   # Resume analysis agent
│   ├── krutrim_adapter.py      # LLM integration
│   ├── mcp_integration.py      # MCP client
│   └── mongo_memory.py         # Agent memory persistence
├── tools/
│   └── search_tool.py          # Job search tool for agents
├── models.py                   # MongoDB document models
├── auth_models.py              # User authentication models
├── database.py                 # Database initialization
├── main.py                     # FastAPI application entry
├── routes.py                   # Main API endpoints
├── auth_routes.py              # Authentication endpoints
├── user_routes.py              # User management endpoints
├── profile_routes.py           # Profile & resume management
├── agent_routes.py             # Agent communication endpoints
├── interview_router.py         # Modular interview routes
├── session_service.py          # Interview session logic
├── question_service.py         # Question generation & caching
├── ml_job_matcher.py           # Hybrid ML job matching
├── roadmap_generator.py        # Career roadmap AI
├── report_generator.py         # PDF report creation
├── cache_service.py            # Redis caching layer
├── mcp_server.py               # MCP tool server
├── worker.py                   # RabbitMQ worker process
├── ai_utils.py                 # AI helper functions
├── file_handler.py             # File upload/storage
├── resume_parser.py            # Resume text extraction
├── serp_api_service.py         # Live job search API
├── metrics.py                  # Prometheus metrics
└── requirements.txt            # Python dependencies
```

### Core Backend Components

#### 1. **Agentic AI System ("The Hive")**

##### Supervisor Agent (`ai_engine/agents/supervisor.py`)
- **Role**: Central orchestrator and router
- **Responsibilities**:
  - Analyzes user queries using LLM
  - Routes to appropriate specialist agent
  - Manages conversation context
- **Routing Logic**:
  - `job_scout`: New job searches
  - `mcp_services`: Saved jobs, applications
  - `general_chat`: Career advice, resume tips

```python
# Routing Decision Flow
async def supervisor_node(state: SupervisorState):
    # 1. Keyword heuristics for reliability
    # 2. LLM-based intent classification
    # 3. Fallback to general_chat
    return {"next_agent": decision}
```

##### Job Scout Agent (`ai_engine/agents/job_scout.py`)
- **Role**: Job search specialist
- **Workflow**:
  1. Load resume context (if available)
  2. Execute job search via SerpApi
  3. Rank results using ML
  4. Synthesize conversational response
- **Integration**: Uses `JobSearchTool` for external API calls

##### Resume Manager Agent (`ai_engine/agents/resume_manager.py`)
- **Role**: Resume analysis and enhancement
- **Workflow**:
  1. **Parser Node**: Extract structured data (name, email, skills, experience)
  2. **Analyzer Node**: Generate professional summary and improvement suggestions
  3. **Saver Node**: Persist to MongoDB
- **AI Prompts**: Carefully crafted to avoid placeholder text and ensure personalization

#### 2. **Interview System**

##### Session Service (`session_service.py`)
- **Session Lifecycle Management**:
  - Create new interview sessions
  - Track active rounds (Aptitude, Technical, HR)
  - Manage pause/resume functionality
  - Calculate total scores and time
- **State Transitions**: `active` → `paused` → `completed` → `verification`

##### Question Service (`question_service.py`)
- **Question Generation**:
  - Resume-based personalized questions
  - Job title-specific questions
  - Fallback to question bank
- **Caching Strategy**:
  - Cache key: `hash(resume_text) + job_title + round_type`
  - Reduces LLM API calls by ~80%
- **Question Types**:
  - **MCQ**: Multiple choice with correct answer
  - **Descriptive**: Open-ended text responses
  - **Coding**: Code editor with test cases

##### Answer Evaluation
- **Real-time AI Evaluation**: Krutrim LLM analyzes answers
- **Scoring**: 0-10 scale per question
- **Feedback**: Detailed evaluation text
- **Persistence**: All answers stored with timestamps

#### 3. **ML Job Matching Engine**

##### Hybrid Approach (`ml_job_matcher.py`)

```python
# Scoring Formula
hybrid_score = (0.4 * tfidf_score) + (0.6 * semantic_score)
```

**Components**:
1. **TF-IDF Vectorizer**:
   - Keyword-based matching
   - Fast and interpretable
   - Good for exact skill matches

2. **Sentence Transformers** (`all-MiniLM-L6-v2`):
   - Contextual semantic similarity
   - Understands synonyms and related concepts
   - 384-dimensional embeddings

3. **Skill Extraction**:
   - Regex-based technical skill detection
   - 50+ predefined skill keywords
   - Used for matched/missing skill analysis

**Performance Optimizations**:
- Pre-computed job embeddings (cached in `job_embeddings.pkl`)
- Redis caching for match results
- Warm-up on server startup

#### 4. **Career Roadmap Generator**

##### AI-Powered Roadmap Creation (`roadmap_generator.py`)
- **Input**: Current skills, target role, resume context
- **Output**: Structured JSON with:
  - **Milestones**: Phase-wise learning goals
  - **Skills Gap**: Matched vs. missing skills
  - **Timeline**: Estimated duration
  - **Resources**: Learning materials per phase
- **Persistence**: Saved roadmaps linked to user

#### 5. **MCP Server Integration**

##### FastMCP Server (`mcp_server.py`)
- **Purpose**: Expose internal tools to agents via Model Context Protocol
- **Tools**:
  - `list_saved_jobs(user_id)`: Retrieve user's saved jobs
  - `get_application_info(job_id)`: Get job application details
- **Integration**: Supervisor agent calls MCP tools for user-specific data

---

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── components/
│   ├── AgentOverlay.tsx        # Floating AI assistant chat
│   ├── AiInsightsPage.tsx      # Resume insights dashboard
│   ├── AuthPage.tsx            # Login/Register UI
│   ├── CareerRoadmap.tsx       # Roadmap generation interface
│   ├── CodeEditor.tsx          # Coding question editor
│   ├── Dashboard.tsx           # User dashboard
│   ├── InterviewSession.tsx    # Main interview interface
│   ├── JobMatcher.tsx          # ML job matching UI
│   ├── JobMatches.tsx          # Job match results
│   ├── Layout.tsx              # App layout wrapper
│   ├── LiveJobs.tsx            # Live job search
│   ├── Navbar.tsx              # Top navigation
│   ├── ProfilePage.tsx         # User profile management
│   ├── QuestionGenerator.tsx   # Standalone question tool
│   ├── QuestionSidebar.tsx     # Interview navigation
│   ├── RoadmapViewer.tsx       # Roadmap display
│   ├── SavedJobs.tsx           # Saved jobs list
│   ├── SavedRoadmaps.tsx       # Saved roadmaps list
│   └── Sidebar.tsx             # Side navigation
├── contexts/
│   └── AuthContext.tsx         # Global auth state
├── services/
│   └── cacheService.ts         # Client-side caching
├── api.ts                      # API client functions
├── App.tsx                     # Main app component
├── main.tsx                    # React entry point
└── index.css                   # Global styles + design system
```

### Key Frontend Components

#### 1. **Authentication System**

##### AuthContext (`contexts/AuthContext.tsx`)
- **Global State Management**: User authentication state
- **Features**:
  - JWT token storage (localStorage)
  - Google OAuth integration
  - Auto-login on page load
  - Protected route handling

##### AuthPage (`components/AuthPage.tsx`)
- **Dual Mode**: Login / Register
- **Features**:
  - Email/password authentication
  - Google Sign-In button
  - Form validation
  - Error handling

#### 2. **Interview Interface**

##### InterviewSession (`components/InterviewSession.tsx`)
- **Multi-Round Flow**:
  - Aptitude → Technical → HR
  - Dynamic round switching
  - Progress tracking
- **Features**:
  - **Voice-to-Text**: Web Speech API integration
  - **Real-time Evaluation**: Submit answers, get instant feedback
  - **Code Editor**: Syntax highlighting for coding questions
  - **Timer**: Track time per question
  - **Pause/Resume**: Interrupt and continue later
- **State Management**: Local state + API sync

##### QuestionSidebar (`components/QuestionSidebar.tsx`)
- **Navigation**: Jump to any question
- **Status Indicators**: Answered, current, unanswered
- **Round Switcher**: Toggle between rounds

#### 3. **Job Matching System**

##### JobMatcher (`components/JobMatcher.tsx`)
- **ML-Based Matching**: Upload resume → Get top 10 matches
- **Display**:
  - Match percentage
  - Matched skills (green badges)
  - Missing skills (red badges)
  - Company, location, description
- **Actions**: Save job, view details

##### LiveJobs (`components/LiveJobs.tsx`)
- **Real-time Search**: SerpApi integration
- **Filters**: Location, job type
- **Features**:
  - Quick apply links
  - Save for later
  - Thumbnail images

#### 4. **Career Roadmap**

##### CareerRoadmap (`components/CareerRoadmap.tsx`)
- **Input Form**: Target role, current skills
- **AI Generation**: Calls `/generate-roadmap` endpoint
- **Visualization**:
  - Timeline view
  - Milestone cards
  - Skills gap analysis
  - Resource links

##### RoadmapViewer (`components/RoadmapViewer.tsx`)
- **Display**: Rendered markdown roadmap
- **Features**:
  - Save roadmap
  - Export as PDF (future)
  - Share link (future)

#### 5. **Agent Overlay**

##### AgentOverlay (`components/AgentOverlay.tsx`)
- **Floating Action Button**: Always accessible AI assistant
- **Chat Panel**: Slide-in conversation interface
- **Features**:
  - Context-aware responses
  - Job search queries
  - Resume advice
  - Saved jobs management
- **Integration**: Calls `/api/v1/agent/chat` endpoint

#### 6. **Dashboard**

##### Dashboard (`components/Dashboard.tsx`)
- **Overview Cards**:
  - Total interviews
  - Average score
  - Jobs matched
  - Roadmaps created
- **Recent Activity**: Latest interviews, matches
- **Quick Actions**: Start interview, search jobs, generate roadmap
- **AI Insights**: Resume summary and improvements (if available)

#### 7. **Profile Management**

##### ProfilePage (`components/ProfilePage.tsx`)
- **Tabs**:
  - **Profile**: Edit name, email, username
  - **Resumes**: Upload, manage, set primary
  - **Preferences**: Target role, salary, locations
- **Features**:
  - Multiple resume support
  - Resume analysis on upload
  - Delete resumes

---

## Database Schema

### MongoDB Collections

#### 1. **users**
```javascript
{
  _id: ObjectId,
  email: String (unique),
  username: String (unique),
  full_name: String,
  password_hash: String,  // BCrypt hashed
  google_id: String (optional),
  created_at: DateTime,
  last_login: DateTime
}
```

#### 2. **interview_sessions**
```javascript
{
  _id: ObjectId,
  user_id: String,
  resume_id: String,
  session_type: String,  // "interview", "job_match", "live_trend"
  job_title: String,
  status: String,  // "active", "completed", "paused", "verification"
  current_round_id: String,
  current_question_id: String,
  total_score: Float,
  total_time_seconds: Int,
  total_paused_time: Int,
  is_paused: Boolean,
  last_pause_at: DateTime,
  created_at: DateTime,
  started_at: DateTime,
  completed_at: DateTime
}
```

#### 3. **resumes**
```javascript
{
  _id: ObjectId,
  user_id: String,
  name: String,  // User-friendly name
  filename: String,
  content: String,  // Extracted text
  file_path: String,
  parsed_skills: [String],
  summary: String,  // AI-generated
  improvements: [String],  // AI suggestions
  candidate_name: String,
  candidate_email: String,
  is_primary: Boolean,
  uploaded_at: DateTime
}
```

#### 4. **interview_rounds**
```javascript
{
  _id: ObjectId,
  session_id: String,
  round_type: String,  // "aptitude", "technical", "hr"
  status: String,  // "pending", "active", "completed"
  current_question_index: Int,
  total_time_seconds: Int,
  started_at: DateTime,
  completed_at: DateTime,
  last_accessed_at: DateTime
}
```

#### 5. **questions**
```javascript
{
  _id: ObjectId,
  round_id: String,
  question_text: String,
  question_type: String,  // "mcq", "descriptive", "coding"
  question_number: Int,
  options: [String],  // For MCQ
  correct_answer: String,  // For MCQ
  starter_code: String,  // For coding
  test_cases: [{input: String, output: String}],  // For coding
  language: String,  // For coding
  generated_at: DateTime
}
```

#### 6. **answers**
```javascript
{
  _id: ObjectId,
  question_id: String,
  answer_text: String,
  draft_text: String,  // Auto-save
  evaluation: String,  // AI feedback
  score: Float,  // 0-10
  time_taken_seconds: Int,
  status: String,  // "submitted", "drafted", "skipped"
  answered_at: DateTime
}
```

#### 7. **job_matches**
```javascript
{
  _id: ObjectId,
  user_id: String,
  session_id: String,
  job_title: String,
  job_description: String,
  company_name: String,
  location: String,
  match_percentage: Float,  // 0-100
  matched_skills: [String],
  missing_skills: [String],
  rank: Int,  // 1-10
  apply_link: String,
  thumbnail: String,
  via: String,  // Source platform
  job_id: String,
  is_live: Boolean,  // SerpApi vs ML
  is_saved: Boolean,
  created_at: DateTime
}
```

#### 8. **career_roadmaps**
```javascript
{
  _id: ObjectId,
  user_id: String,
  session_id: String,
  current_role: String,
  target_role: String,
  roadmap_content: String,  // Markdown
  milestones: [{
    phase: String,
    duration: String,
    goals: [String],
    resources: [String]
  }],
  skills_gap: {
    matched: [String],
    missing: [String],
    to_improve: [String]
  },
  estimated_timeline: String,
  is_saved: Boolean,
  created_at: DateTime
}
```

#### 9. **question_bank**
```javascript
{
  _id: ObjectId,
  category: String,  // "aptitude", "technical", "hr"
  question_text: String,
  question_type: String,
  options: [String],
  correct_answer: String,
  difficulty: String,  // "easy", "medium", "hard"
  tags: [String],
  created_at: DateTime
}
```

#### 10. **question_cache**
```javascript
{
  _id: ObjectId,
  resume_hash: String,
  job_title: String,
  round_type: String,
  questions: [Object],  // Cached question data
  created_at: DateTime
}
// Indexes: resume_hash, job_title, round_type
```

#### 11. **user_preferences**
```javascript
{
  _id: ObjectId,
  user_id: String,
  target_role: String,
  target_salary: String,
  preferred_locations: [String],
  created_at: DateTime
}
```

---

## Features & Capabilities

### 1. **Authentication & User Management**
- ✅ Email/password registration and login
- ✅ Google OAuth 2.0 integration
- ✅ JWT-based session management (24-hour tokens)
- ✅ BCrypt password hashing
- ✅ User profile editing
- ✅ User preferences management

### 2. **Resume Management**
- ✅ Multi-format support (PDF, DOCX)
- ✅ File system storage with metadata in MongoDB
- ✅ AI-powered resume parsing (name, email, skills extraction)
- ✅ AI-generated professional summaries
- ✅ Personalized improvement suggestions
- ✅ Multiple resume support per user
- ✅ Primary resume designation
- ✅ Resume deletion

### 3. **AI-Powered Mock Interviews**
- ✅ Multi-round structure (Aptitude, Technical, HR)
- ✅ Resume-based personalized questions
- ✅ Job title-specific questions
- ✅ Question types: MCQ, Descriptive, Coding
- ✅ Real-time AI evaluation and feedback
- ✅ Score tracking (0-10 per question)
- ✅ Time tracking per question and round
- ✅ Pause/Resume functionality
- ✅ Dynamic round switching
- ✅ Question navigation (jump to any question)
- ✅ Voice-to-text answer input (Web Speech API)
- ✅ Code editor with syntax highlighting
- ✅ Final PDF report generation

### 4. **Job Matching System**
- ✅ **ML-Based Matching**:
  - Hybrid TF-IDF + Sentence Transformer approach
  - Match percentage calculation
  - Matched/missing skills analysis
  - Top 10 ranked results
  - Redis caching for performance
- ✅ **Live Job Search**:
  - SerpApi integration for real-time jobs
  - Location-based filtering
  - Quick apply links
  - Job thumbnails and metadata
- ✅ **Job Management**:
  - Save jobs for later
  - View saved jobs
  - Remove saved jobs

### 5. **Career Roadmap Generation**
- ✅ AI-generated personalized learning paths
- ✅ Skills gap analysis
- ✅ Phase-wise milestones with timelines
- ✅ Resource recommendations per phase
- ✅ Save roadmaps
- ✅ View saved roadmaps
- ✅ Markdown-formatted output

### 6. **Agentic AI Assistant ("The Hive")**
- ✅ **Supervisor Agent**: Intelligent query routing
- ✅ **Job Scout Agent**: Autonomous job search
- ✅ **Resume Manager Agent**: Resume analysis workflow
- ✅ **MCP Integration**: Access to internal tools
- ✅ **Conversational Interface**: Floating chat overlay
- ✅ **Context Awareness**: Resume and user context

### 7. **Standalone Tools**
- ✅ **Question Generator**: Generate questions from any resume text
- ✅ **Resume Analyzer**: Upload and analyze without starting interview

### 8. **Performance & Monitoring**
- ✅ Redis caching for ML embeddings and matches
- ✅ Question caching to reduce LLM calls
- ✅ Prometheus metrics endpoint
- ✅ Request/response logging
- ✅ Error tracking and handling

### 9. **User Experience**
- ✅ Glassmorphism design system
- ✅ Dark mode UI
- ✅ Responsive layout
- ✅ Loading states and error handling
- ✅ Toast notifications (implicit in UI)
- ✅ Smooth animations and transitions

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/google` | Google OAuth login | No |
| GET | `/auth/me` | Get current user info | Yes |

### Interview Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload-resume` | Upload resume and create session | Yes |
| POST | `/analyze-saved-resume/{resume_id}` | Start session from existing resume | Yes |
| GET | `/active-session` | Get active interview session | Yes |
| POST | `/start-interview-from-role` | Start interview for specific role | Yes |
| POST | `/start-round` | Start a specific round | No |
| POST | `/submit-answer` | Submit answer and get evaluation | No |
| GET | `/next-round/{session_id}` | Get next pending round | No |
| POST | `/switch-round` | Switch to different round | No |
| GET | `/rounds-status/{session_id}` | Get all rounds status | No |
| GET | `/session-info/{session_id}` | Get session details | No |
| GET | `/report/{session_id}` | Download PDF report | No |

### Job Matching Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/analyze-resume/{session_id}` | ML-based job matching | No |
| POST | `/analyze-resume-live/{session_id}` | Live job search via SerpApi | No |
| POST | `/user/jobs/{job_id}/save` | Toggle save status | Yes |
| GET | `/user/jobs/saved` | Get saved jobs | Yes |

### Career Roadmap Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/generate-roadmap` | Generate AI roadmap | No |
| GET | `/user/roadmaps` | Get saved roadmaps | Yes |

### User Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/user/dashboard` | Get dashboard data | Yes |
| GET | `/user/profile` | Get user profile | Yes |
| PUT | `/user/profile` | Update user profile | Yes |
| GET | `/user/preferences` | Get user preferences | Yes |
| PUT | `/user/preferences` | Update preferences | Yes |

### Profile & Resume Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/profile/resumes` | List user's resumes | Yes |
| POST | `/profile/resumes/upload` | Upload new resume | Yes |
| DELETE | `/profile/resumes/{resume_id}` | Delete resume | Yes |
| PUT | `/profile/resumes/{resume_id}/primary` | Set primary resume | Yes |

### Agent Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/agent/chat` | Chat with AI agent | Yes |

### Utility Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/generate-questions-only` | Generate questions from text | No |
| POST | `/save-generated-session` | Save generated questions | No |
| GET | `/health` | Health check | No |
| GET | `/metrics` | Prometheus metrics | No |

---

## Infrastructure & DevOps

### Docker Compose Setup

```yaml
services:
  mongodb:
    image: mongo:latest
    ports: ["27017:27017"]
    volumes: [mongodb_data:/data/db]
    
  redis:
    image: redis:latest
    ports: ["6379:6379"]
    
  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672", "15672:15672"]
```

### Environment Variables

#### Backend `.env`
```env
# AI Services
KRUTRIM_API_KEY=your_key
KRUTRIM_API_URL=https://cloud.olakrutrim.com/v1/chat/completions
SERP_API_KEY=your_serp_key

# Database
MONGODB_URL=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET_KEY=your_secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
```

#### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_client_id
```

### Running the Application

#### Option 1: Unified Startup (Recommended)
```powershell
python start_all.py
```

#### Option 2: Manual Startup

**1. Start Infrastructure**
```bash
docker-compose up -d
```

**2. Start Backend**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**3. Start Worker (Optional)**
```bash
cd backend
.\venv\Scripts\python worker.py
```

**4. Start MCP Server (Optional)**
```bash
cd backend
.\venv\Scripts\python mcp_server.py
```

**5. Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

### Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend API | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |
| MongoDB | 27017 | mongodb://localhost:27017 |
| Redis | 6379 | redis://localhost:6379 |
| RabbitMQ | 5672 | amqp://localhost:5672 |
| RabbitMQ Management | 15672 | http://localhost:15672 |
| Prometheus Metrics | 8000 | http://localhost:8000/metrics |

---

## Security & Authentication

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant MongoDB
    
    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /auth/login
    Backend->>MongoDB: Verify user
    MongoDB-->>Backend: User data
    Backend->>Backend: Generate JWT
    Backend-->>Frontend: JWT token
    Frontend->>Frontend: Store in localStorage
    Frontend->>Backend: API calls with Authorization header
    Backend->>Backend: Verify JWT
    Backend-->>Frontend: Protected resource
```

### Security Features

#### 1. **Password Security**
- BCrypt hashing with salt rounds
- No plain-text password storage
- Password strength validation (frontend)

#### 2. **JWT Tokens**
- HS256 algorithm
- 24-hour expiration
- Payload: `{user_id, email, exp}`
- Stored in localStorage (frontend)

#### 3. **OAuth 2.0**
- Google Sign-In integration
- Server-side token verification
- Auto-create user on first login

#### 4. **API Security**
- CORS middleware (configurable origins)
- JWT verification on protected routes
- Request validation (Pydantic)
- Error sanitization (no sensitive data in errors)

#### 5. **File Upload Security**
- File type validation (PDF, DOCX only)
- File size limits
- Secure file storage (outside web root)
- Filename sanitization

#### 6. **Database Security**
- No SQL injection (Beanie ODM)
- Input validation on all models
- Unique constraints on email/username

---

## Performance Optimizations

### Backend Optimizations

1. **Caching Strategy**:
   - Redis cache for ML embeddings (persistent)
   - Question cache (resume hash-based)
   - Job match cache (TTL: 1 hour)

2. **Model Warm-up**:
   - Pre-load Sentence Transformer on startup
   - Pre-compute job embeddings
   - Initialize TF-IDF vectorizer

3. **Async Operations**:
   - All database operations async (Motor)
   - Async LLM calls
   - Concurrent question generation

4. **Message Queue**:
   - Offload heavy tasks to worker
   - Non-blocking question generation

### Frontend Optimizations

1. **Code Splitting**:
   - React.lazy for route-based splitting
   - Dynamic imports for heavy components

2. **Caching**:
   - Client-side cache service
   - API response caching

3. **Build Optimization**:
   - Vite's fast HMR
   - Tree-shaking
   - Minification

---

## Known Issues & Future Enhancements

### Known Issues (from `knownbugs.txt`)
1. Resume analysis sometimes produces generic summaries
2. Worker process occasionally doesn't trigger question generation
3. Roadmap rendering edge cases with empty milestones

### Future Enhancements
1. **Real-time Collaboration**: Multi-user interview sessions
2. **Video Interviews**: Webcam integration with facial analysis
3. **Advanced Analytics**: Detailed performance dashboards
4. **Mobile App**: React Native version
5. **Interview Scheduling**: Calendar integration
6. **Peer Interviews**: Practice with other users
7. **Company-specific Prep**: Targeted interview questions
8. **Skill Assessments**: Standalone skill tests
9. **Certification Tracking**: Track and recommend certifications
10. **Mentorship Matching**: Connect with industry mentors

---

## Conclusion

**CareerPath AI** represents a sophisticated integration of modern web technologies, AI/ML capabilities, and agentic architecture to deliver a comprehensive career advisory platform. The system's modular design, robust caching, and intelligent agent orchestration make it scalable and maintainable while providing users with a premium, AI-powered career development experience.

### Key Strengths
- ✅ **Agentic Architecture**: Autonomous, specialized agents for different tasks
- ✅ **Hybrid ML Approach**: Best of keyword and semantic matching
- ✅ **Real-time AI Evaluation**: Instant feedback on interview answers
- ✅ **Premium UX**: Glassmorphism design with smooth interactions
- ✅ **Scalable Infrastructure**: Docker, Redis, RabbitMQ for production-ready deployment
- ✅ **Type Safety**: TypeScript frontend + Pydantic backend
- ✅ **Comprehensive Features**: End-to-end career advisory ecosystem

### Technology Highlights
- **Backend**: FastAPI + LangGraph + MongoDB + Redis + RabbitMQ
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS
- **AI/ML**: Krutrim LLM + Sentence Transformers + scikit-learn
- **Architecture**: Microservices + Agentic AI + Hybrid ML

---

**Last Updated**: January 3, 2026  
**Version**: 1.0.0  
**Author**: AI Interview App Team
