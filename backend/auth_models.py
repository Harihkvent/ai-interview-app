"""
User Authentication Models
"""

from beanie import Document
from pydantic import Field, EmailStr
from datetime import datetime
from typing import Optional
import bcrypt

class User(Document):
    """User model for authentication"""
    email: EmailStr
    username: str
    password_hash: Optional[str] = None  # Optional for OAuth users
    full_name: Optional[str] = None
    profile_picture_url: Optional[str] = None  # For OAuth profile pictures
    current_location: Optional[str] = None
    oauth_provider: Optional[str] = None  # e.g., "google", "email"
    oauth_user_id: Optional[str] = None  # Provider's unique user ID
    active_resume_id: Optional[str] = None # Currently selected resume context
    preferences_id: Optional[str] = None # Link to UserPreferences
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    is_active: bool = True
    
    class Settings:
        name = "users"
    
    def verify_password(self, password: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            self.password_hash.encode('utf-8')
        )
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(
            password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "johndoe",
                "full_name": "John Doe"
            }
        }
