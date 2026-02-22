from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional, Dict

class TokenUsage(Document):
    """Tracks LLM token consumption per user/session"""
    user_id: str
    session_id: Optional[str] = None
    operation: str  # e.g., "generate_questions", "evaluate_answer"
    model_name: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "token_usage"
        indexes = ["user_id", "session_id", "timestamp"]

class AdminActivity(Document):
    """Audit log for administrative actions"""
    admin_id: str
    action: str  # e.g., "block_user", "update_role", "clear_cache"
    target_user_id: Optional[str] = None
    details: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "admin_activity"
        indexes = ["admin_id", "timestamp"]

class AppConfig(Document):
    """Global application settings manageable by admin"""
    key: str  # e.g., "interview_config", "ai_params"
    value: Dict
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: str  # admin_id

    class Settings:
        name = "app_config"
        indexes = ["key"]
