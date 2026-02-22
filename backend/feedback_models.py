from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional

class Feedback(Document):
    """User feedback and bug reports"""
    user_id: str
    category: str  # "bug", "suggestion", "compliment", "other"
    message: str
    status: str = "open"  # "open", "in_progress", "closed"
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "feedback"
        indexes = ["user_id", "status", "created_at"]
