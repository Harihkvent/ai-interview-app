# AI Interview Application

An AI-driven interview application built with **FastAPI** (backend) and **React + Vite** (frontend), powered by **Krutrim AI**.

## Features

- 🤖 AI-powered interview questions and responses
- 💬 Real-time chat interface
- 🎨 Modern glassmorphism UI design
- 📊 Session management and history tracking
- 🔄 Persistent conversation storage

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLModel** - SQL database ORM
- **Krutrim AI** - LLM provider
- **SQLite** - Database

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

1. Start both the backend and frontend servers
2. Open your browser to `http://localhost:5173`
3. Click "Start Interview" to begin
4. Answer the AI interviewer's questions
5. Your conversation is automatically saved

## API Endpoints

- `POST /start` - Start a new interview session
- `POST /chat` - Send a message and get AI response
- `GET /history/{session_id}` - Get interview history
- `POST /end/{session_id}` - End an interview session

## Project Structure

```
ai-interview-app/
├── backend/
│   ├── main.py           # FastAPI app entry point
│   ├── models.py         # Database models
│   ├── routes.py         # API routes
│   ├── services.py       # AI service integration
│   ├── database.py       # Database configuration
│   └── requirements.txt  # Python dependencies
└── frontend/
    ├── src/
    │   ├── App.tsx       # Main React component
    │   ├── api.ts        # API service layer
    │   ├── index.css     # Tailwind styles
    │   └── main.tsx      # Entry point
    └── package.json      # Node dependencies
```

## License

MIT
