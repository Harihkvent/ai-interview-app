# AI Interview Application

An AI-driven interview application built with **FastAPI** (backend) and **React + Vite** (frontend), powered by **Krutrim AI**.

## Features

- 📄 **Resume Upload** - Upload your resume (PDF/DOCX) to personalize the interview
- 🎯 **Multi-Round Interviews** - Aptitude, Technical, and HR rounds
- 🤖 **AI-Powered Questions** - Resume-based question generation using Krutrim AI
- ⏱️ **Time Tracking** - Track time spent on each question and overall interview
- 📊 **Real-Time Evaluation** - Instant feedback and scoring for each answer
- 📈 **Performance Analytics** - Comprehensive PDF reports with AI-generated insights
- 🎨 **Modern UI** - Glassmorphism design with smooth animations

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLModel** - SQL database ORM
- **Krutrim AI** - LLM provider for questions, evaluation, and reports
- **SQLite** - Database
- **ReportLab** - PDF generation
- **PyPDF2 & python-docx** - Resume parsing

### Frontend
- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Axios** - HTTP client

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
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

4. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

5. Add your Krutrim API key to `.env`:
```
KRUTRIM_API_KEY=your_actual_api_key_here
KRUTRIM_API_URL=https://cloud.olakrutrim.com/v1/chat/completions
```

6. Run the backend server:
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

## Usage

### Complete Interview Flow

1. **Upload Resume**
   - Drag and drop or browse to upload your resume (PDF/DOCX)
   - System extracts text and creates interview session

2. **Aptitude Round** (5 questions)
   - AI generates logical reasoning questions
   - Answer each question with timer tracking
   - Receive instant evaluation and score

3. **Technical Round** (8 questions)
   - Questions based on skills mentioned in your resume
   - Detailed technical assessment
   - Real-time feedback

4. **HR Round** (5 questions)
   - Behavioral and soft skills questions
   - Cultural fit assessment
   - Career goals discussion

5. **Download Report**
   - Comprehensive PDF report with AI-generated insights
   - Performance analysis for each round
   - Strengths, weaknesses, and recommendations
   - Time management analysis

## API Endpoints

### New Interview Flow
- `POST /upload-resume` - Upload resume and create session
- `POST /start-round/{session_id}?round_type={type}` - Start a specific round
- `POST /submit-answer` - Submit answer with time tracking
- `GET /next-round/{session_id}` - Get next pending round
- `GET /report/{session_id}` - Download PDF report
- `GET /session/{session_id}` - Get session statistics

### Legacy Endpoints
- `POST /start` - Start a new interview session (legacy)
- `POST /chat` - Send a message and get AI response (legacy)
- `GET /history/{session_id}` - Get interview history (legacy)
- `POST /end/{session_id}` - End an interview session (legacy)

## Project Structure

```
ai-interview-app/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # Database models (Session, Resume, Round, Question, Answer)
│   ├── routes.py            # API routes
│   ├── services.py          # AI service integration (Krutrim)
│   ├── file_handler.py      # Resume upload and parsing
│   ├── report_generator.py  # PDF report generation
│   ├── database.py          # Database configuration
│   ├── requirements.txt     # Python dependencies
│   └── uploads/             # Uploaded resume files
└── frontend/
    ├── src/
    │   ├── App.tsx          # Main React component (multi-stage interview flow)
    │   ├── api.ts           # API service layer
    │   ├── index.css        # Tailwind styles
    │   └── main.tsx         # Entry point
    └── package.json         # Node dependencies
```

## Interview Rounds Configuration

Default question counts (configurable in `backend/services.py`):
- **Aptitude**: 5 questions
- **Technical**: 8 questions
- **HR**: 5 questions

## Features in Detail

### Resume-Based Question Generation
Questions are tailored to your resume using Krutrim AI, analyzing:
- Technical skills and technologies
- Experience level
- Educational background
- Project details

### Real-Time Evaluation
Each answer is evaluated by Krutrim AI considering:
- Relevance to the question
- Technical accuracy
- Depth of knowledge
- Communication clarity

### AI-Generated Reports
Comprehensive PDF reports include:
- Executive summary
- Round-by-round performance analysis
- Detailed Q&A with evaluations
- Strengths and improvement areas
- Time management insights
- Overall recommendations

### Timer Tracking
- Per-question timer
- Round-wise total time
- Overall interview duration
- Time statistics in final report

## License

MIT

