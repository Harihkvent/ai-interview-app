# docs/images/ — Figure Image Files

This folder stores all figures (PNG images) referenced in `docs/PROJECT_REPORT.md`.

## How to Generate and Save Images

Follow the steps below for each figure. Once an image is saved here, update the corresponding section in `PROJECT_REPORT.md` to replace the `> 📌 [Figure ...]` placeholder text with a proper markdown image:

```markdown
![Figure 3.1 — System Architecture Block Diagram](images/fig_3_1_system_architecture.png)
```

---

## Required Images Checklist

### Chapter 2 — System Study and Analysis

| File | Figure | How to Create |
|------|--------|--------------|
| `fig_2_1_comparison.png` | Figure 2.1 — Traditional vs AI Interview Systems | Screenshot comparison: Naukri/LinkedIn (left) vs CareerPath AI Dashboard (right). Use PowerPoint or Canva to compose side-by-side. |
| `fig_2_2_tech_stack.png` | Figure 2.2 — Technology Stack Overview | Draw a layered diagram in draw.io: Browser → Amplify → EC2 (NGINX → FastAPI → MongoDB/Redis/RabbitMQ) → External APIs. Export as PNG. |

### Chapter 3 — System Design

| File | Figure | How to Create |
|------|--------|--------------|
| `fig_3_1_system_architecture.png` | Figure 3.1 — System Architecture Block Diagram | Render the Mermaid diagram from Section 3.1 at https://mermaid.live. Export as PNG at 1200px width. |
| `fig_3_2_process_flow.png` | Figure 3.2 — Process Flow Chart | Render the Mermaid flowchart from Section 3.2 at https://mermaid.live. Export as PNG at 1200px width. |
| `fig_3_3_hive_architecture.png` | Figure 3.3 — Agentic AI ("The Hive") Architecture | Render the Mermaid diagram from Section 3.1 (Hive sub-diagram) at https://mermaid.live. |
| `fig_3_4_erd.png` | Figure 3.4 — Database Entity Relationship Diagram | Create ERD in https://dbdiagram.io or draw.io showing: User → Resume, User → InterviewSession → InterviewRound → Question → Answer, User → JobMatch, User → CareerRoadmap. |
| `fig_3_5_deployment.png` | Figure 3.5 — Deployment Architecture (EC2 + Amplify) | Re-draw the ASCII diagram from `DEPLOYMENT_EC2_AMPLIFY.md` Section 1 using draw.io. Show Amplify (frontend), EC2 with Docker services, and external APIs. |

### Chapter 4 — Code Module

| File | Figure | How to Create |
|------|--------|--------------|
| `fig_4_1_job_dataset.png` | Figure 4.1 — Snapshot of Job Dataset | Open `backend/job_data_merged.csv` in Excel or VS Code with CSV preview. Screenshot the first 10 rows with column headers visible. |
| `fig_4_2_aptitude_dataset.png` | Figure 4.2 — Snapshot of Aptitude Question Bank | Open `backend/data/aptitude_questions.csv` in Excel. Screenshot the first 8 rows with all columns visible. |

### Chapter 5 — Testing (UI Screenshots)

Run the app locally: `python start_all.py`  
Frontend: `http://localhost:5173` | Backend API: `http://localhost:8000/docs`

| File | Figure | How to Capture |
|------|--------|---------------|
| `fig_5_1_dashboard.png` | Figure 5.1 — User Dashboard | Log in → Dashboard page. Show stats panel, recent activity, quick action buttons. |
| `fig_5_2_interview_session.png` | Figure 5.2 — Interview Session (Technical Round) | Upload resume → Start Technical round → Show active question with text area, timer, sidebar. |
| `fig_5_3_avatar_interview.png` | Figure 5.3 — Avatar Interview Interface | Navigate to Avatar Interview → Start session → Screenshot 3D avatar with voice visualization. |
| `fig_5_4_job_matching.png` | Figure 5.4 — Job Matching Results | Job Matcher → Upload resume → View top 10 results with match %, matched skills, missing skills. |
| `fig_5_5_roadmap.png` | Figure 5.5 — Career Roadmap Viewer | Career Roadmap → Enter current/target role → Generate → Screenshot phase-wise roadmap. |
| `fig_5_6_analytics.png` | Figure 5.6 — Analytics Dashboard | After completing 2-3 sessions → Analytics page → Show Recharts performance graph + breakdown. |
| `fig_5_7_pdf_report.png` | Figure 5.7 — PDF Interview Report Sample | Complete full interview → Download Report → Open PDF → Screenshot pages 1-2. |
| `fig_5_8_skill_test.png` | Figure 5.8 — Skill Assessment Test | Skill Tests → Start Python Fundamentals → Screenshot active MCQ question with timer. |
| `fig_5_9_admin.png` | Figure 5.9 — Admin Dashboard | Log in as admin → Admin Dashboard → Screenshot user table, stats, system health panels. |

---

## Recommended Tools

| Tool | Use Case | URL |
|------|----------|-----|
| **Mermaid Live** | Render Mermaid diagrams as PNG | https://mermaid.live |
| **draw.io** | Create architecture and ER diagrams | https://draw.io |
| **dbdiagram.io** | Create ERDs from schema | https://dbdiagram.io |
| **Canva** | Design comparison graphics | https://canva.com |
| **Snagit / Lightshot** | Screenshot tool with annotations | Any OS screenshot tool |

---

## Image Specifications

- **Format**: PNG preferred (JPG acceptable for screenshots)
- **Width**: Minimum 800px, recommended 1200px for diagrams
- **Resolution**: 96 DPI minimum, 150 DPI recommended for printed reports
- **File naming**: Use the exact file names listed above (lowercase, underscores)
