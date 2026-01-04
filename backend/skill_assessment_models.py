from typing import Optional, List, Dict
from beanie import Document
from pydantic import Field
from datetime import datetime

class SkillTest(Document):
    """Predefined skill test template"""
    skill_name: str
    category: str  # programming, soft-skills, domain-knowledge, tools
    difficulty: str = "medium"  # easy, medium, hard
    
    # Test configuration
    total_questions: int = 10
    duration_minutes: int = 30
    passing_score: float = 70.0  # Percentage
    
    description: str
    tags: List[str] = []
    
    # Question IDs (references to SkillTestQuestion)
    question_ids: List[str] = []
    
    # Metadata
    is_active: bool = True
    created_by: str = "system"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "skill_tests"
        indexes = ["skill_name", "category", "difficulty"]


class SkillTestAttempt(Document):
    """User's attempt at a skill test"""
    user_id: str
    skill_test_id: str
    
    # Status
    status: str = "in-progress"  # in-progress, completed, abandoned
    
    # Results
    score: float = 0.0  # Percentage
    total_questions: int = 0
    correct_answers: int = 0
    
    # Answers: [{question_id, answer, is_correct, time_taken}]
    answers: List[Dict] = []
    
    # Timing
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    time_taken_seconds: int = 0
    
    # Feedback
    passed: bool = False
    proficiency_level: Optional[str] = None  # beginner, intermediate, advanced, expert
    recommendations: List[str] = []
    
    class Settings:
        name = "skill_test_attempts"
        indexes = ["user_id", "skill_test_id", "status"]


class SkillTestQuestion(Document):
    """Question for skill tests"""
    skill_name: str
    category: str
    
    question_text: str
    question_type: str = "mcq"  # mcq, descriptive, coding
    
    # For MCQ
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    
    # For coding
    starter_code: Optional[str] = None
    test_cases: Optional[List[Dict]] = None
    language: Optional[str] = "python"
    
    difficulty: str = "medium"
    explanation: Optional[str] = None  # Explanation for correct answer
    
    # Metadata
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "skill_test_questions"
        indexes = ["skill_name", "category", "difficulty"]
