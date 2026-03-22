# CareerPath AI — Project Documentation

**Version**: 1.0 | **Date**: March 2026 | **Repo**: [Harihkvent/ai-interview-app](https://github.com/Harihkvent/ai-interview-app)

---

## Objective

CareerPath AI helps students and job-seekers bridge the gap between their current skills and their target job role by providing ML-based job matching, AI-generated personalised career roadmaps, multi-round mock interviews (Aptitude, Technical, HR), and a downloadable PDF performance report — all in one platform.

---

## Domains

The platform spans four domains: **EdTech** (personalised career coaching), **HR & Talent Acquisition** (resume screening and interview simulation), **AI/ML** (NLP, TF-IDF, Sentence Transformers, Krutrim LLM), and **Career Development** (skill-gap analysis and structured learning paths).

---

## How the Solution Meets the Program Outcomes

- **PO1 – Computing Knowledge**: Uses FastAPI, async Python, MongoDB, and scikit-learn for scalable, data-driven career matching.
- **PO2 – System Design**: Implements a clean Client-Server-AI-Database architecture with decoupled frontend (React) and backend (FastAPI).
- **PO3 – Modern Tools**: Leverages React 19, Vite, TailwindCSS, Beanie ODM, Sentence Transformers, Krutrim AI, ReportLab, and Prometheus.
- **PO4 – Teamwork**: Frontend and backend are fully decoupled with externalised config, enabling parallel team development.
- **PO5 – Problem Analysis**: Decomposes the complex career-readiness problem into discrete, testable components — parsing, matching, roadmap, interview, report.
- **PO6 – Ethics & Security**: Passwords hashed with Bcrypt; JWT tokens expire in 24 h; file uploads validated; Pydantic prevents injection attacks.
- **PO7 – Communication**: Auto-generated Swagger docs (`/docs`), Mermaid sequence diagrams, Prometheus metrics, and this documentation file.
- **PO8 – Life-Long Learning**: AI roadmaps embed phase-wise skill targets, curated learning resources, and timelines that users can revisit as they grow.

---

## Engineering Solution

**Stack**: React 19 + TypeScript (frontend) → FastAPI Python (backend) → MongoDB with Beanie ODM (database) → Krutrim AI cloud API (LLM) + scikit-learn / Sentence Transformers (ML).

**Flow**: User uploads resume → PyPDF2/python-docx extracts text → TF-IDF + Semantic hybrid scoring matches against 63,764 job descriptions → top matches returned → user picks a role → Krutrim AI generates a phased roadmap → three interview rounds (Aptitude 5q, Technical 8q, HR 5q) with AI scoring (0–10) per answer → ReportLab compiles a PDF performance report.

**Auth**: Bcrypt password hashing + PyJWT (HS256, 24 h expiry) + Google OAuth 2.0.

**Monitoring**: 30+ Prometheus metrics covering session lifecycle, round durations, AI API latency, and HTTP request rates — exposed at `/metrics`.

---

## End Users / Stakeholders

**Primary users**: students preparing for placements, fresh graduates, career changers, and bootcamp/self-taught candidates who need structured, personalised interview prep.

**Stakeholders**: academic institutions deploying the platform for students; career counsellors using it as a scalable coaching assistant; recruiters who benefit from better-prepared candidates; platform administrators who rely on Prometheus metrics for operations; and open-source contributors who extend the modular FastAPI + React codebase.
