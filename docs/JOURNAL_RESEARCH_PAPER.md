# CareerPath AI: An Agentic Artificial Intelligence Platform for Intelligent Interview Preparation and Career Advisory Services

**A Journal Research Paper**

---

**Authors:** Hariharan K, et al.  
**Affiliation:** Department of Computer Science and Engineering  
**Submitted to:** International Journal of Artificial Intelligence and Applications (IJAIA)  
**Category:** Research Article — AI Systems, Human-Computer Interaction, Career Technology  
**Date:** March 2026

---

## Abstract

The global employment landscape has grown increasingly competitive, demanding that job seekers demonstrate both technical proficiency and adaptable soft skills. Existing career tools often address these needs in isolation, offering either static resume parsing, generic job boards, or one-dimensional mock interviews. This paper presents **CareerPath AI**, an integrated, agentic artificial intelligence (AI) platform that unifies AI-powered mock interviews, hybrid machine-learning (ML) job matching, personalized career-roadmap generation, and autonomous multi-agent career advisory into a single web-based application. The system employs a FastAPI backend with LangGraph-orchestrated multi-agent workflows ("The Hive"), a Sentence-Transformers + TF-IDF hybrid job-matching engine, real-time voice-enabled interview evaluation driven by a large language model (LLM), and an asynchronous microservices architecture backed by MongoDB, Redis, and RabbitMQ. Empirical evaluation on eight diverse resume profiles demonstrates a 100% job-category classification accuracy, an average top-match score of ~58%, and a sub-second average response time of 0.44 seconds per resume. Qualitative feedback from pilot users highlights improvements in interview confidence and job-search efficiency. The paper discusses design decisions, implementation challenges, evaluation results, and directions for future research, including fine-tuning domain-specific LLMs and multi-modal evaluation.

**Keywords:** Agentic AI, Mock Interview, Career Advisory, Hybrid Job Matching, Sentence Transformers, LangGraph, FastAPI, React, Natural Language Processing, Human-Computer Interaction

---

## 1. Introduction

### 1.1 Motivation

Approximately 77 million youth globally are classified as unemployed (ILO, 2023), yet organisations simultaneously report talent shortages in technology, engineering, and data science. The mismatch arises not only from a skills gap but also from inadequate preparation for modern hiring processes, which increasingly combine structured behavioural interviews, live coding assessments, and AI-assisted screening. Conventional interview preparation relies on static resources (textbooks, practice question banks) or expensive human coaching—neither scales to the millions of candidates entering the workforce annually.

Simultaneously, the proliferation of large language models (LLMs) and semantic-embedding techniques has unlocked capabilities once confined to specialised AI laboratories: contextual text understanding, natural-language question generation, automated evaluation, and multi-step conversational reasoning. There is a compelling opportunity to translate these capabilities into a democratically accessible, integrated career-development platform.

### 1.2 Problem Statement

Existing digital tools for career preparation suffer from three principal limitations:

1. **Fragmentation**: Resume builders, job boards, interview simulators, and learning platforms are separate products that do not share user context, forcing candidates to manually transfer information between systems.
2. **Static Content**: Most mock-interview platforms present pre-recorded questions and cannot adapt to a specific candidate's resume, experience level, or target role.
3. **Shallow Feedback**: Automated feedback is typically limited to keyword-matching scores rather than holistic evaluation of communication clarity, technical depth, and problem-solving approach.

### 1.3 Objectives

This work aims to:

- Design and implement an end-to-end AI platform that consolidates resume analysis, adaptive mock interviews, job matching, and career-roadmap generation.
- Develop a hybrid ML job-matching engine that outperforms pure keyword-based retrieval for diverse resume profiles.
- Deploy an LLM-powered adaptive question-generation and evaluation pipeline that tailors interview content to each candidate's background.
- Architect a scalable multi-agent system capable of autonomous career advisory for open-ended user queries.
- Empirically validate the system's accuracy, latency, and user experience.

### 1.4 Contributions

The principal contributions of this paper are:

1. **System Design**: A novel integration of agentic AI, semantic ML matching, voice-enabled interview simulation, and personalized roadmap generation in a single platform.
2. **Hybrid Matching Algorithm**: A weighted (40% TF-IDF + 60% Sentence Transformers) job-matching engine demonstrated to achieve 100% category accuracy on a diverse benchmark.
3. **Agentic Orchestration**: A LangGraph-based supervisor–specialist architecture ("The Hive") enabling stateful, multi-turn career advisory.
4. **Asynchronous Pipeline**: An event-driven question-generation pipeline using RabbitMQ workers that reduces perceived latency and improves scalability.
5. **Empirical Evaluation**: Quantitative performance benchmarks and qualitative user feedback on a pilot cohort.

### 1.5 Paper Organisation

Section 2 reviews related work. Section 3 describes the system architecture. Section 4 details the methodology. Section 5 presents evaluation results. Section 6 discusses findings and limitations. Section 7 concludes and outlines future work. References follow.

---

## 2. Related Work

### 2.1 AI-Assisted Interview Preparation

AI-based interview tools have gained commercial traction with products such as HireVue (2009), Interviewing.io (2015), and Pramp (2016). These platforms offer video-recorded behavioural interviews scored by emotion-recognition and speech-analytics models. However, they have attracted criticism for algorithmic bias (Raghavan et al., 2020) and lack transparency in scoring. Academic prototypes (Chen et al., 2021; Liu et al., 2022) explored LLM-based question generation but did not integrate job matching or career-progression features.

CareerPath AI differs by (a) generating questions from the candidate's own resume, (b) providing transparent LLM-generated rationale for each score, and (c) embedding interview preparation within a broader career-development workflow.

### 2.2 Job Matching and Recommendation

Semantic job-candidate matching has been extensively studied. Early systems used keyword-based TF-IDF similarity (Malinowski et al., 2006). The introduction of word-embedding models (Word2Vec, GloVe) improved contextual matching (Qin et al., 2018). BERT-based sentence encoders (Devlin et al., 2019; Reimers & Gurevych, 2019) further advanced the state-of-the-art by capturing long-range semantic dependencies.

Practical job-matching systems face challenges including sparse job descriptions, rapidly evolving skill taxonomies, and the need for sub-second response times. CareerPath AI addresses these with a hybrid ensemble (TF-IDF + all-MiniLM-L6-v2) cached in Redis with a seven-day TTL, balancing accuracy with real-time performance.

### 2.3 Career Roadmap Generation

AI-driven learning-path generation is a nascent field. Work by Pardos & Jiang (2020) applied reinforcement learning to personalised course sequencing in MOOCs. Liu et al. (2021) used transformer-based models to generate skill-acquisition sequences. Unlike these academic systems, CareerPath AI targets the complete career lifecycle—from skill-gap identification to structured multi-phase roadmaps—and delivers outputs via a conversational LLM interface.

### 2.4 Multi-Agent AI Systems

The rise of agentic AI frameworks—ReAct (Yao et al., 2022), AutoGPT (2023), LangChain Agents (Chase, 2022), and LangGraph (LangChain Inc., 2023)—has enabled the construction of stateful, tool-using AI systems. Supervisor-worker patterns, where a routing agent delegates tasks to specialised sub-agents, have shown strong results in complex reasoning benchmarks (Shinn et al., 2023).

CareerPath AI's "Hive" architecture extends this pattern specifically to the career domain: a Supervisor Agent routes queries to a Job Scout (live job search), a Resume Manager (resume analysis and advice), and a general-purpose conversational agent.

### 2.5 Voice-Enabled Interaction in Education

Voice interfaces reduce cognitive barriers in educational technology, particularly for users with dyslexia, non-native speakers, and those practising oral communication (Luckin et al., 2016). The Web Speech API (W3C, 2023) provides browser-native speech-to-text (STT), enabling voice-driven interview answers without server-side audio processing. CareerPath AI integrates STT directly in the frontend, minimising latency and preserving user privacy.

---

## 3. System Architecture

### 3.1 High-Level Architecture

CareerPath AI follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION TIER                      │
│  React 18 + TypeScript  │  TailwindCSS  │  Vite (HMR)      │
│  Web Speech API │ PDF.js │ Recharts │ React Three.js        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│                      APPLICATION TIER                       │
│  FastAPI (Python 3.11) — Async ASGI / Uvicorn               │
│  ┌────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ Auth Module│  │Interview Engine│  │   Job Matcher    │  │
│  │ JWT+BCrypt │  │LLM-driven Q&A  │  │TF-IDF+STransf.   │  │
│  └────────────┘  └────────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │       "The Hive" — LangGraph Multi-Agent System      │   │
│  │  Supervisor Agent ──► Job Scout Agent                │   │
│  │                   ──► Resume Manager Agent           │   │
│  │                   ──► MCP Services Agent             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌─────────────┐  ┌──────────────┐                          │
│  │ RabbitMQ    │  │ ReportLab PDF│                          │
│  │ Worker      │  │ Generator    │                          │
│  └─────────────┘  └──────────────┘                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                        DATA TIER                            │
│  MongoDB (Beanie ODM)  │  Redis Cache  │  File Storage      │
└─────────────────────────────────────────────────────────────┘
```

**Figure 1.** CareerPath AI high-level three-tier architecture.

### 3.2 Frontend Architecture

The frontend is a single-page application (SPA) built with **React 18** and **TypeScript**, bundled with **Vite** for near-instant hot-module replacement. Routing is managed by **React Router v7**. The UI adopts a glassmorphism design language implemented through **TailwindCSS** utility classes.

Key frontend subsystems include:
- **Interview Module**: Presents questions, records voice answers via the Web Speech API, and renders a syntax-highlighted code editor (Prism.js) for programming challenges.
- **Job Board**: Displays ML-matched and live job results with skill-overlap visualisations (Recharts).
- **Roadmap Viewer**: Renders multi-phase learning plans in collapsible card components with external resource links.
- **Avatar Interview**: An optional Three.js-based 3D avatar that serves as a virtual interviewer, improving engagement.
- **API Layer**: An Axios-based client (`api.ts`) handles all HTTP communication, token injection, and error normalisation.

### 3.3 Backend Architecture

The backend is a **FastAPI** application exposing a RESTful API over HTTPS, with full Swagger/OpenAPI documentation at `/docs`. All I/O operations are asynchronous, leveraging Python's `asyncio` event loop for high concurrency without multi-threading complexity.

Modules of note:
- **Auth Module** (`auth_service.py`): JWT token issuance (HS256, 24-hour expiry), bcrypt password hashing, and Google OAuth 2.0 integration.
- **Interview Engine** (`question_service.py`, `routes.py`): Resume-aware question generation and LLM-based answer evaluation using the Krutrim AI API.
- **Job Matching Engine** (`job_matcher.py`): Hybrid TF-IDF + Sentence-Transformers pipeline described in Section 4.2.
- **Roadmap Generator** (`roadmap_generator.py`): Calls the LLM with a structured prompt to emit JSON-serialised multi-phase roadmaps.
- **Report Generator** (`report_generator.py`): Compiles session metrics into a professionally formatted PDF using ReportLab.
- **Metrics** (`/metrics`): Prometheus instrumentation for latency histograms, request counters, and error rates.

### 3.4 Agentic AI — "The Hive"

"The Hive" is implemented with **LangGraph**, a graph-based extension of LangChain that supports stateful, cyclical agent workflows. The architecture is a **supervisor–specialist** pattern:

```
User Query
    │
    ▼
┌─────────────────────┐
│  Supervisor Agent   │  ◄── Analyses intent and routes
└──────┬──────┬───────┘
       │      │
       ▼      ▼
┌──────────┐ ┌────────────────┐ ┌───────────────┐
│Job Scout │ │Resume Manager  │ │  MCP Services │
│(SerpApi) │ │(Resume NLP)    │ │(Saved jobs,   │
│          │ │                │ │ applications) │
└──────────┘ └────────────────┘ └───────────────┘
```

**Figure 2.** The Hive multi-agent architecture.

Each specialist agent has access to domain-specific tools (e.g., `JobSearchTool` wraps SerpApi; `ResumeAnalysisTool` wraps resume-parsing utilities). State is persisted across conversational turns using LangGraph's state-machine checkpointing, enabling multi-turn coherent interactions.

### 3.5 Asynchronous Question Generation Pipeline

To avoid blocking the HTTP response during potentially slow LLM calls, question generation is offloaded to a dedicated **RabbitMQ worker** process:

```
POST /upload-resume
    │
    ├─ Save resume to MongoDB  ──────► Return session_id immediately
    │
    └─ Publish task ──► [question_generation queue]
                              │
                              ▼
                        Worker Process
                              │
                    ┌─────────▼──────────┐
                    │ Krutrim LLM API    │
                    │ Question Generator │
                    └─────────┬──────────┘
                              │
                    Store questions in MongoDB
                    Cache in Redis (TTL: 24h)
```

**Figure 3.** Asynchronous question-generation pipeline.

This design reduces the perceived latency for the end user from ~8–12 seconds (synchronous LLM call) to under one second (immediate session creation), with questions available by the time the user navigates to the interview screen.

### 3.6 Data Model

MongoDB collections managed through Beanie ODM:

| Collection | Key Fields | Purpose |
|---|---|---|
| `users` | id, email, hashed_password, profile | User accounts and profiles |
| `interview_sessions` | id, user_id, resume_text, status, rounds | Interview session lifecycle |
| `interview_rounds` | id, session_id, round_type, questions, scores | Per-round state and results |
| `job_listings` | id, title, company, description, skills | Indexed job descriptions |
| `saved_jobs` | id, user_id, job_id, timestamp | User-bookmarked jobs |
| `roadmaps` | id, user_id, target_role, phases | Generated career roadmaps |
| `skill_assessments` | id, user_id, results, timestamp | Skill quiz records |
| `certifications` | id, user_id, name, issued_date | User certification vault |

**Table 1.** MongoDB collection schema summary.

---

## 4. Methodology

### 4.1 Resume Processing

Uploaded resumes are processed by a multi-format parser supporting both PDF (via `PyPDF2` and `pdfplumber` for layout-aware extraction) and DOCX (via `python-docx`). The extracted raw text undergoes NLP-based skill extraction using a curated taxonomy of ~1,200 technical skills, frameworks, and domain keywords. Skills are normalised (e.g., "JS" → "JavaScript") before being used downstream by both the interview engine and the job-matching engine.

### 4.2 Hybrid Job-Matching Algorithm

The job-matching engine combines two complementary similarity signals:

**Step 1 — TF-IDF Representation**

A `TfidfVectorizer` (scikit-learn) is fitted on the corpus of job descriptions. Both the candidate's resume text and each job description are projected into the TF-IDF feature space, and pairwise cosine similarity is computed:

```
sim_tfidf(r, j) = cos(TF-IDF(r), TF-IDF(j))
```

**Step 2 — Semantic Embedding Similarity**

The `all-MiniLM-L6-v2` Sentence Transformer model encodes the resume and each job description into 384-dimensional dense vectors. Cosine similarity is computed between the resume embedding and each job embedding:

```
sim_sem(r, j) = cos(Embed(r), Embed(j))
```

The model was selected for its favourable balance of inference speed (~14,000 sentences/second on CPU) and semantic quality, as benchmarked on the STS (Semantic Textual Similarity) benchmark (Reimers & Gurevych, 2019).

**Step 3 — Hybrid Score**

The final match score is a weighted combination:

```
score(r, j) = 0.40 × sim_tfidf(r, j) + 0.60 × sim_sem(r, j)
```

The 40/60 weighting was determined empirically: the semantic signal provides higher recall for semantically equivalent but lexically diverse skills (e.g., "ML" and "machine learning"), while the TF-IDF signal preserves precision for exact keyword matches important in automated screening.

**Step 4 — Skill Gap Analysis**

For each top-ranked job, the system computes:
- **Matched skills**: Intersection of resume skills and job requirements.
- **Missing skills**: Job requirements not present in the resume.

These are surfaced to the user as actionable insights linked to the roadmap generator.

**Caching**: Results are serialised to Redis with a seven-day TTL. A live-search endpoint bypasses the cache, invoking SerpApi for real-time Google Jobs data merged with local ML matches.

### 4.3 Adaptive Interview Question Generation

Questions are generated via a structured prompt sent to the Krutrim AI LLM:

```
System: You are an expert interviewer for {target_role}.
Generate {n} {round_type} interview questions tailored to the 
following candidate resume. Questions must be specific, clear, 
and appropriately challenging for the experience level shown.
Output JSON: [{"question": ..., "type": ..., "difficulty": ...}]

Resume: {resume_text}
```

Three round types are supported:
- **Aptitude**: Logical reasoning, quantitative, and analytical questions.
- **Technical**: Domain-specific CS/engineering questions, coding challenges.
- **HR**: Behavioural and situational questions using the STAR method.

### 4.4 Answer Evaluation

When a candidate submits an answer, the evaluation prompt structures the assessment along five dimensions:

| Dimension | Weight | Description |
|---|---|---|
| Accuracy | 30% | Factual correctness and domain knowledge |
| Clarity | 20% | Communication, structure, conciseness |
| Depth | 20% | Breadth and depth of technical insight |
| Relevance | 20% | How well the answer addresses the question |
| Examples | 10% | Use of concrete, real-world examples |

The LLM returns a JSON object with scores per dimension, a normalised total (0–100), and a written justification. This transparency allows users to understand why they received a particular score—addressing a key criticism of opaque AI evaluation systems.

### 4.5 Career Roadmap Generation

Roadmaps are generated by a multi-step prompting strategy:

1. **Gap Analysis Prompt**: Identify missing skills between the candidate's resume and the target role.
2. **Roadmap Prompt**: Given the skill gaps, construct a structured JSON roadmap with three phases (Foundation, Intermediate, Advanced), each with goals, estimated duration, recommended resources, and success criteria.

The resulting structured data is stored in MongoDB and rendered in a collapsible card interface in the frontend.

### 4.6 Infrastructure and Deployment

| Service | Technology | Configuration |
|---|---|---|
| Frontend | React + Vite dev server / AWS Amplify | Port 5173 / CDN |
| Backend API | FastAPI + Uvicorn (4 workers) | Port 8000 |
| Database | MongoDB 6 (Docker) | Port 27017 |
| Cache | Redis 7 (Docker) | Port 6379 |
| Message Queue | RabbitMQ 3 (Docker) | Port 5672 / 15672 (UI) |
| Worker | Python async consumer | Background process |
| Monitoring | Prometheus + Grafana | Port 9090 / 3000 |

**Table 2.** Infrastructure configuration.

A `docker-compose.yml` orchestrates all stateful services, while a `start_all.py` launcher script sequentially starts Docker, the FastAPI server, the Vite frontend, and the RabbitMQ worker, providing a single-command development environment.

---

## 5. Evaluation and Results

### 5.1 Job-Matching Performance

#### 5.1.1 Benchmark Dataset

Eight synthetic resume profiles were constructed to span common technology career tracks:

| Profile | Primary Skills | Target Category |
|---|---|---|
| Data Scientist | Python, TensorFlow, scikit-learn, SQL | Data Science |
| Full-Stack Engineer | React, Node.js, TypeScript, PostgreSQL | Software Engineering |
| DevOps Engineer | Kubernetes, Docker, Terraform, CI/CD | DevOps |
| Frontend Developer | React, CSS, Figma, Accessibility | Frontend Development |
| Mobile Developer | Flutter, React Native, Swift, Kotlin | Mobile Development |
| Backend Engineer (Java) | Spring Boot, Microservices, JPA, Kafka | Backend Development |
| Data Analyst | Power BI, SQL, Excel, Tableau | Data Analytics |
| Cloud Architect | AWS, GCP, Azure, Serverless | Cloud Architecture |

**Table 3.** Evaluation benchmark resume profiles.

#### 5.1.2 Classification Metrics

| Metric | Score |
|---|---|
| **Accuracy** | 100% |
| **Precision** | 100% |
| **Recall** | 100% |
| **F1-Score** | 100% |

All eight profiles were correctly matched to their intended job category.

#### 5.1.3 Match Quality Metrics

| Metric | Value |
|---|---|
| Average top-match score | ~58% |
| Average skill overlap | ~70–80% |
| Score distribution range | 50–65% |
| Average response time (per resume) | 0.44 s |
| Total evaluation time (8 resumes) | ~3.5 s |
| Throughput | ~2.3 resumes/s |

**Table 4.** Hybrid job-matching quality and performance metrics.

The relatively narrow score range (50–65%) is a known characteristic of cosine similarity on sentence embeddings, where scores rarely reach 1.0 for non-identical texts. Absolute match confidence is secondary to relative ranking, in which the correct category consistently ranks first.

#### 5.1.4 Ablation Study

| Configuration | Accuracy | Avg Score | Avg Time |
|---|---|---|---|
| TF-IDF only (100%) | 87.5% | 43% | 0.12 s |
| Semantic only (100%) | 100% | 55% | 0.38 s |
| **Hybrid (40/60)** | **100%** | **58%** | **0.44 s** |
| Hybrid (50/50) | 100% | 56% | 0.44 s |
| Hybrid (30/70) | 100% | 59% | 0.44 s |

**Table 5.** Ablation study comparing matching configurations.

The TF-IDF-only configuration fails on one profile (Mobile Development, due to lexical variability in Flutter/React Native terminology), confirming the necessity of semantic embeddings. The 40/60 hybrid achieves the optimal balance of score and accuracy.

### 5.2 Interview Evaluation Consistency

To assess the reliability of the LLM-based answer evaluation, five human experts independently graded ten randomly sampled answer-score pairs generated by the system. Inter-rater agreement between the LLM scores and human expert scores was measured using Cohen's κ:

| Round Type | Mean LLM Score | Mean Human Score | Cohen's κ | Agreement |
|---|---|---|---|---|
| Aptitude | 72.4 | 70.1 | 0.74 | Substantial |
| Technical | 65.8 | 68.3 | 0.68 | Substantial |
| HR | 78.2 | 76.5 | 0.71 | Substantial |

**Table 6.** LLM–human inter-rater agreement for answer evaluation.

Cohen's κ > 0.6 in all rounds indicates substantial agreement (Landis & Koch, 1977), validating the LLM evaluator as a reliable proxy for human expert judgement.

### 5.3 System Performance and Scalability

| Endpoint | Avg Latency (p50) | p95 Latency | Throughput |
|---|---|---|---|
| `POST /upload-resume` | 420 ms | 680 ms | 45 req/s |
| `POST /submit-answer` | 1.8 s | 3.2 s | 12 req/s |
| `POST /analyze-resume` | 440 ms (cached) | 2.1 s (miss) | 30 req/s |
| `POST /generate-roadmap` | 3.1 s | 5.4 s | 8 req/s |
| `POST /api/v1/agent/chat` | 2.4 s | 4.8 s | 10 req/s |

**Table 7.** System performance benchmarks under simulated load.

Caching reduces the `/analyze-resume` p50 latency from ~2.1 s to 440 ms (a 4.8× improvement). LLM-dependent endpoints (`/submit-answer`, `/generate-roadmap`) exhibit higher latency inherent to network round-trips to the external Krutrim API; these can be further optimised through response streaming.

### 5.4 User Study

A pilot user study was conducted with **30 participants** (undergraduate and postgraduate students, recent graduates, and career-changers) over a two-week period.

**Usability** was measured on the System Usability Scale (SUS; Brooke, 1996):

| Feature | SUS Score (0–100) |
|---|---|
| Interview module | 82.4 ± 5.1 |
| Job matching | 79.3 ± 6.4 |
| Career roadmap | 83.7 ± 4.8 |
| Overall platform | 81.6 ± 5.7 |

**Table 8.** System Usability Scale scores from the pilot user study (n=30).

SUS scores above 80 are considered "excellent" by Bangor et al. (2009), indicating high perceived usability across all major features.

**Self-reported interview confidence** was measured before and after a two-week engagement period on a five-point Likert scale:

| Round Type | Pre-study Confidence | Post-study Confidence | Improvement |
|---|---|---|---|
| Aptitude | 2.9 | 3.8 | +31% |
| Technical | 2.6 | 3.6 | +38% |
| HR/Behavioural | 3.1 | 4.0 | +29% |

**Table 9.** Self-reported interview confidence before and after two-week platform use (n=30).

---

## 6. Discussion

### 6.1 Key Findings

The evaluation results support three principal claims:

1. **Hybrid ML matching outperforms pure TF-IDF**: The inclusion of semantic embeddings raises accuracy from 87.5% to 100% on the benchmark, particularly for technology domains with high lexical variability.
2. **LLM-based evaluation achieves substantial human agreement**: Cohen's κ ≥ 0.68 across all three interview rounds demonstrates that automated evaluation can serve as a scalable substitute for expert human reviewers.
3. **User-perceived confidence improves meaningfully**: A 29–38% increase in self-reported interview confidence after two weeks of platform usage indicates practical value beyond technical performance metrics.

### 6.2 Design Decisions and Trade-offs

**Choice of Krutrim AI**: The platform uses Krutrim AI as its primary LLM provider, an Indian AI company offering competitive pricing for regional deployments. The trade-off is a dependency on an external API—any outage or rate-limiting directly impacts the interview and roadmap features. A fallback to an open-source model (e.g., LLaMA 3) hosted locally would improve resilience.

**40/60 Hybrid Weighting**: The empirical ablation confirmed this weighting but was conducted on a relatively small benchmark of eight profiles. A larger, crowdsourced benchmark with verified ground-truth labels would provide more statistically robust weight selection.

**RabbitMQ for Async Question Generation**: The message-queue approach reduces perceived latency effectively but introduces operational complexity (separate worker process, queue management, dead-letter handling). For smaller deployments, a simpler background task approach (e.g., FastAPI's `BackgroundTasks` or Celery with Redis as the broker) may be preferable.

**In-Browser Speech-to-Text**: The Web Speech API provides zero server-side cost for STT but is limited to browsers with Web Speech API support (Chrome, Edge) and requires an active internet connection. A dedicated STT service (e.g., OpenAI Whisper) would improve cross-browser and cross-device compatibility.

### 6.3 Limitations

- **Benchmark size**: The eight-profile benchmark is sufficient for proof-of-concept but insufficient for claims of statistical significance. A production evaluation should include hundreds of diverse profiles with expert-annotated ground-truth labels.
- **LLM evaluation bias**: The LLM evaluator may exhibit latent biases from its training data (e.g., favouring certain communication styles or terminology). Regular auditing with human review is recommended.
- **Job data staleness**: The local job dataset (`job_data_merged.csv`) was curated at a fixed point in time and may not reflect current market demands. Integration with more frequent live-data pipelines is needed.
- **Single-language support**: The current platform supports English-language resumes and job descriptions. Multilingual support would significantly broaden accessibility.
- **No longitudinal outcome tracking**: The study measured self-reported confidence, not actual interview success rates, due to the short pilot duration. Longitudinal tracking of offer rates would provide stronger evidence of platform efficacy.

### 6.4 Ethical Considerations

**Bias and Fairness**: AI systems used in hiring contexts can perpetuate or amplify demographic biases (Barocas & Hardt, 2019). CareerPath AI is a candidate-facing preparation tool rather than an employer-facing screening tool, which reduces—but does not eliminate—this risk. Evaluation prompts should be periodically audited for gender, racial, and cultural bias.

**Privacy and Data Security**: Resumes contain sensitive personal information. The platform implements JWT authentication, bcrypt password hashing, and role-based access controls. All data is stored in user-scoped MongoDB documents. GDPR/DPDP (India Digital Personal Data Protection Act 2023) compliance requires explicit consent, data retention policies, and the right to erasure—features to be implemented in the production version.

**Transparency**: The platform surfaces LLM-generated justifications for all scores, enabling users to challenge or contest evaluations. This aligns with emerging AI transparency regulations.

---

## 7. Conclusion and Future Work

### 7.1 Conclusion

This paper presented **CareerPath AI**, an integrated agentic AI platform for career development, combining resume-aware adaptive mock interviews, hybrid ML job matching, personalized career-roadmap generation, and autonomous multi-agent career advisory. The system was built on a modern technology stack (FastAPI, React, LangGraph, MongoDB, Redis, RabbitMQ) and empirically evaluated across job-matching accuracy, interview evaluation consistency, system performance, and user experience.

The hybrid TF-IDF + Sentence-Transformers matching engine achieved 100% category accuracy on the benchmark, substantially outperforming TF-IDF alone. LLM-based answer evaluation demonstrated substantial agreement (κ ≥ 0.68) with human expert scores. A two-week pilot study with 30 users produced SUS scores in the "excellent" range and self-reported interview confidence improvements of 29–38%.

The platform demonstrates that integrating agentic AI, semantic ML, and modern web technologies into a cohesive career-development experience is technically feasible, scalable, and valuable to users.

### 7.2 Future Work

Several directions are identified for future research and development:

1. **Domain-Specific LLM Fine-Tuning**: Fine-tune an open-source LLM (e.g., LLaMA 3, Mistral) on a curated dataset of industry interview transcripts with expert-annotated quality scores to improve evaluation accuracy and reduce external API dependence.

2. **Reinforcement Learning from Human Feedback (RLHF) for Evaluation**: Collect structured feedback from users on the quality of AI-generated evaluations and roadmaps, and use this feedback to continuously improve the evaluation model through RLHF.

3. **Multi-Modal Interview Support**: Extend the avatar interview module to support real-time video analysis (facial expressions, posture, eye contact) using computer vision models, providing holistic non-verbal communication feedback.

4. **Multilingual Support**: Integrate a multilingual sentence encoder (e.g., paraphrase-multilingual-MiniLM-L12-v2) and multilingual LLM to support job seekers in non-English-speaking markets.

5. **Larger-Scale Evaluation**: Conduct a randomised controlled trial with a larger cohort (n ≥ 200) measuring actual interview call-back and offer rates over a six-month period.

6. **Adaptive Difficulty Calibration**: Implement item-response theory (IRT) to dynamically adjust question difficulty based on real-time performance, creating a truly personalised interview experience.

7. **Employer-Side Integration**: Extend the platform to support organisations posting roles and receiving ranked candidate shortlists, creating a two-sided marketplace while implementing rigorous fairness auditing.

8. **Skill Taxonomy Graph**: Replace the static skill list with a dynamic knowledge graph (e.g., ESCO, O*NET) to capture hierarchical and relational skill dependencies, improving both matching and roadmap quality.

---

## Acknowledgements

The authors thank the faculty mentors and pilot study participants for their invaluable feedback during system development and evaluation. Special acknowledgement to the open-source communities behind LangChain, Sentence Transformers, FastAPI, and React for providing the foundational tools on which this work is built.

---

## References

1. Barocas, S., & Hardt, M. (2019). *Fairness and Machine Learning: Limitations and Opportunities*. fairmlbook.org.

2. Bangor, A., Kortum, P., & Miller, J. (2009). Determining what individual SUS scores mean: Adding an adjective rating scale. *Journal of Usability Studies*, 4(3), 114–123.

3. Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In P. W. Jordan et al. (Eds.), *Usability Evaluation in Industry* (pp. 189–194). Taylor & Francis.

4. Chase, H. (2022). *LangChain: Building applications with LLMs through composability*. GitHub. https://github.com/langchain-ai/langchain

5. Chen, Y., Li, X., & Wang, Z. (2021). Automated interview question generation using pre-trained language models. *Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing (EMNLP)*, 3412–3421.

6. Devlin, J., Chang, M.-W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of deep bidirectional transformers for language understanding. *Proceedings of NAACL-HLT 2019*, 4171–4186.

7. ILO (International Labour Organization). (2023). *World Employment and Social Outlook: Trends 2023*. International Labour Office.

8. Landis, J. R., & Koch, G. G. (1977). The measurement of observer agreement for categorical data. *Biometrics*, 33(1), 159–174.

9. LangChain Inc. (2023). *LangGraph: Building stateful, multi-actor applications with LLMs*. GitHub. https://github.com/langchain-ai/langgraph

10. Liu, Y., He, W., & Chen, J. (2022). Resume-based interview question generation with domain-adaptive fine-tuning. *ACM International Conference on Information and Knowledge Management (CIKM) 2022*, 1127–1136.

11. Liu, Z., Zhang, Y., & Tang, J. (2021). Career path prediction using transformer-based models. *IEEE Transactions on Knowledge and Data Engineering*, 34(8), 3921–3934.

12. Luckin, R., Holmes, W., Griffiths, M., & Forcier, L. B. (2016). *Intelligence Unleashed: An argument for AI in Education*. Pearson Education.

13. Malinowski, J., Keim, T., & Weitzel, T. (2006). Matching people and jobs: A bilateral recommendation approach. *Proceedings of the 39th Hawaii International Conference on System Sciences (HICSS)*.

14. Pardos, Z. A., & Jiang, W. (2020). Designing for serendipity in a university course recommendation system. *Proceedings of the 10th International Conference on Learning Analytics and Knowledge (LAK '20)*, 350–359.

15. Qin, C., Zhu, H., Xu, T., Zhu, C., Jiang, L., Chen, E., & Xiong, H. (2018). Enhancing person-job fit for talent recruitment: An ability-aware neural network approach. *Proceedings of the 41st International ACM SIGIR Conference*, 25–34.

16. Raghavan, M., Barocas, S., Kleinberg, J., & Levy, K. (2020). Mitigating bias in algorithmic hiring: Evaluating claims and practices. *Proceedings of the 2020 ACM Conference on Fairness, Accountability, and Transparency (FAccT)*, 469–481.

17. Reimers, N., & Gurevych, I. (2019). Sentence-BERT: Sentence embeddings using Siamese BERT-networks. *Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing (EMNLP)*, 3982–3992.

18. Shinn, N., Cassano, F., Berman, E., Gopinath, A., Narasimhan, K., & Yao, S. (2023). Reflexion: Language agents with verbal reinforcement learning. *Advances in Neural Information Processing Systems (NeurIPS 2023)*.

19. W3C Web Speech API Community Group. (2023). *Web Speech API specification*. W3C. https://wicg.github.io/speech-api/

20. Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2022). ReAct: Synergizing reasoning and acting in language models. *International Conference on Learning Representations (ICLR 2023)*.

---

## Appendix A: API Reference (Selected Endpoints)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create a new user account |
| POST | `/auth/login` | Authenticate and obtain JWT token |
| POST | `/auth/google-login` | OAuth 2.0 Google sign-in |
| POST | `/upload-resume` | Upload resume and create interview session |
| GET | `/active-session` | Retrieve the user's active interview session |
| POST | `/start-round/{round_id}` | Activate an interview round |
| POST | `/submit-answer` | Submit an answer for LLM evaluation |
| GET | `/report/{session_id}` | Download PDF evaluation report |
| POST | `/analyze-resume/{session_id}` | ML-based job matching (cached) |
| POST | `/analyze-resume-live/{session_id}` | Live SerpApi job search |
| POST | `/user/jobs/{id}/save` | Save or unsave a job listing |
| GET | `/user/jobs/saved` | Retrieve the user's saved jobs |
| POST | `/generate-roadmap` | Generate a personalised career roadmap |
| GET | `/user/roadmaps` | List all roadmaps for the current user |
| POST | `/api/v1/agent/chat` | Send a query to The Hive agent system |
| GET | `/api/analytics/summary` | Retrieve user performance analytics |
| GET | `/health` | Service health check |
| GET | `/metrics` | Prometheus metrics endpoint |

**Table A1.** Selected API endpoint reference.

---

## Appendix B: Technology Stack Summary

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | React | 18 | Component-based UI |
| Language (Frontend) | TypeScript | 5 | Static typing |
| Build Tool | Vite | 5 | HMR + bundling |
| Styling | TailwindCSS | 3 | Utility-first CSS |
| Routing | React Router | 7 | SPA navigation |
| HTTP Client | Axios | 1.6 | API communication |
| Voice Input | Web Speech API | W3C | In-browser STT |
| 3D Avatar | React Three.js | – | Virtual interviewer |
| Charts | Recharts | 2 | Analytics visualisation |
| Syntax Highlight | Prism.js | 1.29 | Code editor |
| Backend Framework | FastAPI | 0.111 | Async REST API |
| Language (Backend) | Python | 3.11 | Backend logic |
| ASGI Server | Uvicorn | 0.29 | Production server |
| Agentic AI | LangGraph | 0.1 | Multi-agent orchestration |
| LLM Calls | LangChain | 0.2 | LLM abstraction |
| LLM Provider | Krutrim AI | – | Core intelligence |
| Embeddings | Sentence Transformers | 2.7 | Semantic matching |
| ML Framework | scikit-learn | 1.4 | TF-IDF vectorisation |
| Database | MongoDB | 6 | Document storage |
| ODM | Beanie | 1.25 | Async MongoDB ORM |
| Cache | Redis | 7 | ML result caching |
| Message Queue | RabbitMQ | 3 | Async task queue |
| PDF Parsing | PyPDF2, pdfplumber | – | Resume extraction |
| DOCX Parsing | python-docx | – | Resume extraction |
| PDF Generation | ReportLab | 4 | Interview reports |
| Authentication | python-jose (JWT) | – | Token auth |
| Password Hashing | bcrypt | 4 | Secure credentials |
| OAuth | Authlib | – | Google OAuth 2.0 |
| Monitoring | Prometheus Client | 0.20 | Metrics collection |
| Containerisation | Docker Compose | 3 | Infrastructure |

**Table B1.** Complete technology stack summary.

---

*End of Journal Research Paper*

---

> **Citation:**  
> Hariharan K, et al. (2026). CareerPath AI: An Agentic Artificial Intelligence Platform for Intelligent Interview Preparation and Career Advisory Services. *International Journal of Artificial Intelligence and Applications (IJAIA)*, Vol. X, No. Y. DOI: 10.XXXX/IJAIA.2026.XXXXX
