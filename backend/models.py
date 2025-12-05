from typing import Optional, List
from beanie import Document, Link
from pydantic import Field
from datetime import datetime

class InterviewSession(Document):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str = "active"  # active, completed
    current_round_id: Optional[str] = None
    resume_id: Optional[str] = None
    total_score: float = 0.0
    total_time_seconds: int = 0
    
    class Settings:
        name = "interview_sessions"

class Resume(Document):
    session_id: str
    filename: str
    content: str  # Extracted text from resume
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "resumes"

class InterviewRound(Document):
    session_id: str
    round_type: str  # aptitude, technical, hr
    status: str = "pending"  # pending, active, completed
    current_question_index: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_time_seconds: int = 0
    
    class Settings:
        name = "interview_rounds"

class Question(Document):
    round_id: str
    question_text: str
    question_number: int  # 1-based index within the round
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "questions"

class Answer(Document):
    question_id: str
    answer_text: str
    evaluation: str  # Krutrim's evaluation feedback
    score: float  # Score for this answer (e.g., 0-10)
    time_taken_seconds: int  # Time taken to answer this question
    answered_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "answers"

class Message(Document):
    session_id: str
    role: str  # user, assistant, system
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "messages"
