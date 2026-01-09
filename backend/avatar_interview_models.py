from typing import Optional, List
from beanie import Document
from pydantic import Field
from datetime import datetime

class AvatarInterviewSession(Document):
    """
    Avatar Interview Session - separate from regular Mock Interview
    Supports voice-based interaction with AI avatar
    """
    user_id: str
    resume_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str = "active"  # active, completed, paused
    
    # Session configuration
    rounds: List[str] = ["hr", "technical"]  # Only HR and Technical for avatar
    current_round: Optional[str] = None
    current_question_id: Optional[str] = None
    
    # Voice settings
    voice_enabled: bool = True
    auto_detection_enabled: bool = True
    
    # Transcript and conversation history
    transcript: List[dict] = []  # [{role: 'avatar'|'user', text: str, timestamp: datetime}]
    
    # Performance tracking
    total_score: float = 0.0
    total_time_seconds: int = 0
    questions_answered: int = 0
    followups_asked: int = 0
    
    # Pause tracking
    is_paused: bool = False
    last_pause_at: Optional[datetime] = None
    total_paused_time: int = 0
    
    class Settings:
        name = "avatar_interview_sessions"


class AvatarQuestion(Document):
    """
    Question for avatar interview with voice-optimized formatting
    """
    session_id: str
    round_type: str  # hr, technical
    question_text: str  # Original question
    voice_text: str  # Voice-optimized version for TTS
    question_type: str = "descriptive"  # mcq, descriptive
    question_number: int  # Sequential number in the interview
    
    # For MCQs
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    
    # Follow-up tracking
    is_followup: bool = False
    parent_question_id: Optional[str] = None  # If this is a follow-up
    followup_reason: Optional[str] = None  # Why this follow-up was generated
    
    # Metadata
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    asked_at: Optional[datetime] = None
    
    class Settings:
        name = "avatar_questions"


class AvatarResponse(Document):
    """
    User's response to avatar interview question
    """
    session_id: str
    question_id: str
    
    # Response content
    answer_text: str
    is_voice_input: bool = True  # Whether user used voice or typed
    
    # Evaluation
    evaluation: Optional[str] = None
    score: float = 0.0  # 0-10
    
    # Follow-up decision
    needs_followup: bool = False
    followup_generated: bool = False
    
    # Timing
    time_taken_seconds: int = 0
    answered_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Status
    status: str = "submitted"  # submitted, skipped
    
    class Settings:
        name = "avatar_responses"
