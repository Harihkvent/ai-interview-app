# CareerPath AI — Project Documentation

**Version**: 1.0  
**Date**: March 2026  
**Repository**: [Harihkvent/ai-interview-app](https://github.com/Harihkvent/ai-interview-app)

---

## Table of Contents

1. [Objective](#1-objective)
2. [Domains](#2-domains)
3. [How the Solution Meets the Program Outcomes](#3-how-the-solution-meets-the-program-outcomes)
4. [Engineering Solution](#4-engineering-solution)
5. [End Users and Stakeholders](#5-end-users-and-stakeholders)

---

## 1. Objective

### Problem Statement

Students and job-seekers face three compounding challenges when transitioning into the workforce:

| # | Gap | Description |
|---|-----|-------------|
| 1 | **Alignment Gap** | Job-seekers are unaware of which roles genuinely match their existing skill set, leading to low-quality applications and wasted effort. |
| 2 | **Skill Gap** | Once a target role is identified, there is no clear, personalised path to acquire missing competencies in a structured timeframe. |
| 3 | **Confidence Gap** | Generic, one-size-fits-all mock interviews fail to replicate the context-specific questions a candidate will actually face, leaving them underprepared. |

### Mission

> *"Empower every professional with AI-driven career insights, personalised guidance, and objective readiness assessment so they can achieve their career aspirations efficiently."*

### Goals

1. **Automated Resume Intelligence** — Parse and understand any resume (PDF/DOCX) and extract skills, experience, and candidate identity without manual effort.
2. **Data-Driven Job Matching** — Compare a candidate's profile against 63,000+ real job descriptions and rank the top matches with a transparent 0–100 % compatibility score.
3. **Personalised Career Roadmaps** — Generate a phased, resource-backed learning roadmap from the candidate's current skill level to their chosen target role.
4. **Context-Aware Mock Interviews** — Conduct three-round AI-powered mock interviews (Aptitude → Technical → HR) with questions derived directly from the candidate's resume and target role.
5. **Actionable Performance Reports** — Produce a downloadable PDF "Career Readiness Portfolio" that aggregates scores, AI feedback, time metrics, and improvement recommendations.

---

## 2. Domains

CareerPath AI operates across four intersecting knowledge domains:

### 2.1 EdTech (Educational Technology)
The platform acts as a personalised coaching system, filling the role of a career mentor and interview coach that is available 24 × 7. Learning milestones, recommended resources, and structured phases align directly with self-directed learning principles.

### 2.2 Human Resources & Talent Acquisition
By modelling job-matching logic on real-world job descriptions (63,764 roles) and standard hiring stages (aptitude, technical, HR), the platform mirrors the actual recruitment pipeline used by companies, giving candidates authentic preparation.

### 2.3 Artificial Intelligence & Machine Learning
The core intelligence of the platform is driven by:
- **Natural Language Processing (NLP)** for resume parsing and text analysis.
- **Machine Learning (TF-IDF + Cosine Similarity + Sentence Transformers)** for semantic job matching.
- **Large Language Models (Krutrim AI / OlaKrutrim)** for dynamic question generation, answer evaluation, and roadmap authoring.

### 2.4 Career Development & Counselling
The platform provides a holistic career-guidance workflow: self-assessment → goal setting → skill-gap analysis → learning plan → practice assessment → feedback — mirroring the model used by professional career counsellors.

---

## 3. How the Solution Meets the Program Outcomes

### PO1 — Apply Knowledge of Computing and Domain Expertise
The backend (FastAPI + Python) applies core computing principles: RESTful API design, asynchronous I/O, data modelling with Pydantic/Beanie, and statistical NLP via scikit-learn. Domain knowledge of career development is encoded in the three-round interview structure, the 63,000+ job dataset, and the skills taxonomy (38+ technical skills).

### PO2 — Design and Implement Software Systems
The system is designed as a layered Client-Server-AI-Database architecture:
- **Frontend** — React 19 + TypeScript + TailwindCSS (presentation layer).
- **Backend** — FastAPI with modular route, service, and model layers.
- **Data Layer** — MongoDB with Beanie ODM for async document persistence.
- **AI/ML Layer** — Pluggable services for ML matching and LLM integration.

### PO3 — Use Modern Tools and Frameworks
| Tool / Framework | Purpose |
|-----------------|---------|
| FastAPI | High-performance async REST API |
| React 19 + Vite | Modern component-based SPA |
| TailwindCSS | Utility-first responsive styling |
| MongoDB + Beanie | NoSQL async database layer |
| scikit-learn | TF-IDF vectorisation and cosine similarity |
| Sentence Transformers | Semantic embedding for job matching |
| Krutrim AI (OlaKrutrim) | LLM for question generation and evaluation |
| ReportLab | Professional PDF report generation |
| Prometheus | Real-time metrics and monitoring |
| JWT + Bcrypt + OAuth2 | Secure authentication |

### PO4 — Function Effectively as an Individual and in Teams
The codebase is structured for collaborative development: frontend and backend are completely decoupled, concerns are separated into individual modules (routes, services, models, utilities), and configuration is externalised into `.env` files, making parallel development straightforward.

### PO5 — Identify and Analyse Complex Problems
The platform solves the multi-dimensional problem of career readiness by decomposing it into: resume understanding → role discovery → skill analysis → guided learning → rehearsal → feedback. Each sub-problem is addressed with a dedicated, testable component.

### PO6 — Apply Ethics and Professional Standards
- Passwords are hashed with Bcrypt (never stored in plain text).
- JWT tokens expire after 24 hours to limit exposure.
- No resume content is shared with third parties beyond the Krutrim AI API call required for question generation.
- File uploads are validated (PDF/DOCX only, ≤ 5 MB) to prevent abuse.
- CORS and Pydantic request validation prevent injection and malformed-request attacks.

### PO7 — Communication and Documentation
- A comprehensive `README.md` provides setup, usage, and API reference.
- Inline API documentation is auto-generated by FastAPI (Swagger UI at `/docs`).
- Sequence diagrams (Mermaid `.mmd`) document the end-to-end data flow.
- Prometheus metrics expose operational telemetry for monitoring dashboards.

### PO8 — Life-Long Learning
The AI-generated career roadmaps explicitly embed life-long learning by providing phase-wise skill targets, curated resources (courses, certifications), and estimated timelines. Users can revisit and update their roadmaps as their skills evolve.

---

## 4. Engineering Solution

### 4.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                  Frontend  (Port 5173)                           │
│         React 19 + TypeScript + Vite + TailwindCSS              │
│  ┌──────────┐ ┌────────────┐ ┌──────────────┐ ┌─────────────┐  │
│  │ AuthPage │ │ Dashboard  │ │ JobMatches   │ │  Interview  │  │
│  └──────────┘ └────────────┘ └──────────────┘ └─────────────┘  │
│  ┌─────────────────────┐  ┌───────────────────────────────────┐ │
│  │   CareerRoadmap      │  │  SavedRoadmaps / RoadmapViewer   │ │
│  └─────────────────────┘  └───────────────────────────────────┘ │
└─────────────────────────────┬────────────────────────────────────┘
                              │ HTTPS / REST (JSON)
┌─────────────────────────────▼────────────────────────────────────┐
│                  Backend  (Port 8000)  FastAPI                   │
│  ┌───────────────┐ ┌────────────────┐ ┌────────────────────────┐ │
│  │  auth_routes  │ │  user_routes   │ │       routes           │ │
│  │  /auth/*      │ │  /user/*       │ │  /upload-resume        │ │
│  └───────────────┘ └────────────────┘ │  /analyze-resume       │ │
│                                       │  /job-matches          │ │
│                                       │  /generate-roadmap     │ │
│                                       │  /start-round          │ │
│                                       │  /submit-answer        │ │
│                                       │  /report               │ │
│                                       └────────────────────────┘ │
│  ┌────────────────┐ ┌──────────────┐ ┌──────────────────────────┐│
│  │  ml_job_matcher│ │  services    │ │   roadmap_generator      ││
│  │  (TF-IDF +     │ │  (Krutrim AI)│ │   (Krutrim AI)           ││
│  │   Semantic)    │ │              │ │                          ││
│  └────────────────┘ └──────────────┘ └──────────────────────────┘│
│  ┌──────────────────┐ ┌────────────┐ ┌───────────────────────────┐│
│  │  report_generator│ │  database  │ │   metrics (Prometheus)   ││
│  │  (ReportLab PDF) │ │  (MongoDB) │ │                          ││
│  └──────────────────┘ └────────────┘ └───────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                      │                │
            ┌─────────▼────┐   ┌───────▼──────────┐
            │  MongoDB     │   │  OlaKrutrim LLM  │
            │  (8 colls.)  │   │  Cloud API       │
            └──────────────┘   └──────────────────┘
                      │
            ┌─────────▼────────────┐
            │  job_title_des.csv   │
            │  (63,764 job roles)  │
            └──────────────────────┘
```

### 4.2 End-to-End User Flow

```
Register / Login
      │
      ▼
Upload Resume (PDF/DOCX)
      │  ← PyPDF2 / python-docx extract text
      ▼
ML Job Matching
      │  ← TF-IDF vectorise resume + 63,000+ jobs
      │  ← Cosine Similarity → rank top 10–50 matches
      ▼
Select Target Role  ──→  Skills Gap Analysis
                                │
                                ▼
                    AI Career Roadmap (Krutrim)
                    • Foundation / Intermediate / Advanced phases
                    • Learning resources & timelines
                                │
                         Save to Profile?
                                │
                                ▼
                  Start Mock Interview
                  ┌──────────────────────────┐
                  │  Round 1: Aptitude (5 Q) │
                  │  Round 2: Technical (8 Q)│
                  │  Round 3: HR (5 Q)       │
                  └──────────────────────────┘
                       (AI evaluates each answer: score 0–10 + feedback)
                                │
                                ▼
                    Download PDF Report
                    (Scores · Feedback · Recommendations · Time Analysis)
```

### 4.3 Machine Learning — Job Matching Engine

| Step | Component | Detail |
|------|-----------|--------|
| 1 | **Data Loading** | `job_title_des.csv` (63,764 rows) loaded into a pandas DataFrame at startup |
| 2 | **Text Preprocessing** | Lowercase, strip punctuation, remove English stopwords |
| 3 | **TF-IDF Vectorisation** | `TfidfVectorizer(max_features=5000, ngram_range=(1,2))` on combined job title + description |
| 4 | **Semantic Encoding** | `sentence-transformers/all-MiniLM-L6-v2` generates 384-dim embeddings for semantic similarity |
| 5 | **Hybrid Scoring** | `final_score = 0.6 × tfidf_cosine + 0.4 × semantic_cosine` |
| 6 | **Skills Extraction** | 38+ technical skill keywords matched in both resume and job description |
| 7 | **Output** | Top-N matches with `match_percentage`, `matched_skills[]`, `missing_skills[]` |

### 4.4 AI Integration — Krutrim LLM

The platform calls the OlaKrutrim Cloud API (`https://cloud.olakrutrim.com/v1/chat/completions`) for three distinct tasks:

| Task | Prompt Strategy | Output |
|------|----------------|--------|
| **Question Generation** | Resume text + round type + job context injected as system context | JSON list of contextual questions |
| **Answer Evaluation** | Question + candidate answer → AI acts as expert interviewer | Score (0–10) + constructive feedback |
| **Roadmap Generation** | Current skills + target role → structured prompt | JSON with phases, resources, timeline |

Graceful fallback logic is implemented in all three paths: if the LLM call fails or returns malformed JSON, the system returns pre-defined, high-quality fallback questions/roadmap structures so the user experience is never broken.

### 4.5 Authentication & Security

```
Client
  │  POST /auth/register  →  bcrypt.hash(password)  →  MongoDB users
  │  POST /auth/login     →  bcrypt.verify  →  JWT (HS256, 24 h)
  │  All protected routes →  HTTPBearer  →  PyJWT.decode
  │  POST /auth/google    →  Google OAuth 2.0 token exchange
```

- **Bcrypt** (12 salt rounds) for password storage.
- **PyJWT** (HS256) for stateless session tokens.
- **Google OAuth 2.0** as a social login provider.
- **Pydantic** request validation on every endpoint.
- File upload validation: MIME type + extension check, 5 MB size cap.

### 4.6 Database Schema (MongoDB — 8 Collections)

| Collection | Key Fields | Purpose |
|-----------|-----------|---------|
| `users` | `username`, `email`, `hashed_password`, `created_at` | Authentication & profile |
| `interview_sessions` | `user_id`, `status`, `total_score`, `created_at` | Session lifecycle |
| `resumes` | `session_id`, `content`, `candidate_name` | Resume storage |
| `interview_rounds` | `session_id`, `round_type`, `status`, `total_time_seconds` | Round state |
| `questions` | `round_id`, `question_text`, `question_number` | Question bank |
| `answers` | `question_id`, `answer_text`, `score`, `evaluation` | Candidate responses |
| `job_matches` | `session_id`, `job_title`, `match_percentage`, `matched_skills` | ML output |
| `career_roadmaps` | `user_id`, `target_role`, `milestones[]`, `skills_gap`, `is_saved` | Roadmap store |

### 4.7 Monitoring & Observability

Prometheus metrics are exposed at `/metrics` and cover:

- **Session lifecycle**: sessions created / active / completed.
- **Round metrics**: start/complete counts per round type, duration histograms.
- **AI API metrics**: call counts, latencies, and error rates per operation.
- **HTTP metrics**: request counts, durations by method/endpoint/status.

### 4.8 API Surface (Key Endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Authenticate, receive JWT |
| GET | `/auth/me` | Current user info |
| GET | `/user/dashboard` | Stats + recent activity |
| POST | `/upload-resume` | Upload & parse resume |
| POST | `/analyze-resume/{id}` | Trigger ML job matching |
| GET | `/job-matches/{id}` | Retrieve match results |
| POST | `/generate-roadmap` | Generate AI roadmap |
| POST | `/start-round/{id}` | Begin interview round |
| POST | `/submit-answer` | Evaluate candidate answer |
| GET | `/report/{id}` | Download PDF report |
| GET | `/metrics` | Prometheus telemetry |

### 4.9 Frontend Architecture

The React SPA uses a Context + Component pattern:

```
App.tsx  (routing, global state)
  ├─ AuthContext.tsx       (JWT token, user state, auto-login)
  ├─ Navbar.tsx            (persistent navigation)
  ├─ AuthPage.tsx          (login / register forms)
  ├─ Dashboard.tsx         (stats + activity feed)
  ├─ JobMatches.tsx        (ML results table)
  ├─ CareerRoadmap.tsx     (roadmap display + interview launcher)
  ├─ SavedRoadmaps.tsx     (list of saved roadmaps)
  └─ RoadmapViewer.tsx     (single roadmap detail)
```

All API communication is centralised in `api.ts` (Axios instance with JWT interceptor), ensuring consistent error handling and token refresh.

---

## 5. End Users and Stakeholders

### 5.1 Primary End Users

| User Group | Description | How They Benefit |
|-----------|-------------|-----------------|
| **Undergraduate & Postgraduate Students** | Final-year students preparing for campus placements or off-campus job hunts | Resume analysis, job matching, structured interview preparation, and roadmap guidance help bridge the gap between academia and industry. |
| **Fresh Graduates (0–2 years experience)** | Individuals entering the workforce without substantial interview experience | Context-aware mock interviews and AI feedback build confidence and real-world readiness. |
| **Career Changers** | Professionals seeking to transition into a new domain (e.g., from finance to data science) | Skills-gap analysis and phased roadmaps provide a clear, actionable path for domain switching. |
| **Self-Taught / Bootcamp Graduates** | Candidates with non-traditional educational backgrounds | ML-based job matching identifies which roles align with their actual skill set, even without a formal degree in the field. |

### 5.2 Secondary Stakeholders

| Stakeholder | Role | Interest |
|------------|------|----------|
| **Academic Institutions** | Universities and training institutes that deploy the platform for students | Improved placement rates; data-driven evidence of student readiness. |
| **Career Counsellors** | Professionals who advise students on career pathways | The platform acts as a scalable assistant, enabling counsellors to serve more students with richer data. |
| **Recruiters / HR Teams** | Talent acquisition professionals at companies | Better-prepared candidates reduce screening effort and improve hire quality. |
| **Platform Administrators** | Team responsible for deploying and maintaining CareerPath AI | Prometheus metrics, structured logging, and modular architecture facilitate efficient operations. |
| **Developers / Contributors** | Engineers extending or integrating the platform | Clean FastAPI + React architecture, `.env`-based configuration, and open-source stack lower the onboarding barrier. |

### 5.3 Stakeholder Impact Map

```
                        ┌─────────────────────┐
                        │   CareerPath AI     │
                        └──────────┬──────────┘
               ┌──────────────────┼─────────────────────┐
               ▼                  ▼                     ▼
       ┌───────────────┐  ┌───────────────┐   ┌───────────────────┐
       │   Students    │  │  Institutions │   │  Recruiters / HR  │
       │  (primary)    │  │  (deploy)     │   │  (indirect)       │
       └───────┬───────┘  └───────────────┘   └───────────────────┘
               │
       ┌───────▼────────┐
       │ Career         │
       │ Counsellors    │
       │ (augment)      │
       └────────────────┘
```

---

## Summary

CareerPath AI is a full-stack, AI-augmented career readiness platform that operates at the intersection of **EdTech**, **HR technology**, **NLP/ML**, and **career counselling**. By automating the most time-consuming parts of career preparation — resume analysis, job discovery, skill-gap planning, and interview rehearsal — the platform delivers measurable, personalised outcomes for students and professionals at every stage of their career journey.

The engineering solution is built on a robust, industry-standard stack (FastAPI · React · MongoDB · scikit-learn · Krutrim AI) with security, observability, and extensibility designed in from the ground up.
