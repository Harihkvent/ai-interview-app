from typing import Optional, List
from beanie import Document
from pydantic import Field
from datetime import datetime

class Certification(Document):
    """Available certifications database"""
    name: str
    provider: str  # AWS, Google, Microsoft, CompTIA, etc.
    category: str  # cloud, security, programming, data, project-management, etc.
    
    difficulty: str = "intermediate"  # beginner, intermediate, advanced, expert
    
    # Prerequisites
    prerequisites: List[str] = []  # List of certification names or skills
    
    # Validity
    validity_months: Optional[int] = None  # None = lifetime, else months until expiry
    
    # Cost and resources
    cost_range: str = "Free"  # Free, $100-$300, $300-$500, etc.
    official_url: Optional[str] = None
    
    description: str
    
    # Recommendations
    recommended_for_roles: List[str] = []  # Job titles this cert is good for
    skill_tags: List[str] = []  # Skills covered
    
    # Popularity metrics
    popularity_score: float = 0.0  # 0-100
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "certifications"
        indexes = ["category", "provider", "difficulty"]


class UserCertification(Document):
    """User's certifications"""
    user_id: str
    certification_id: str  # Reference to Certification
    
    # Certification details (denormalized for quick access)
    certification_name: str
    provider: str
    
    # Status
    status: str = "planning"  # planning, in-progress, completed, expired
    
    # Dates
    obtained_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    
    # Credentials
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    
    # Reminders
    expiry_reminder_sent: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "user_certifications"
        indexes = ["user_id", "status", "expiry_date"]
