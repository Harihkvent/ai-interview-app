from typing import Optional, List
from beanie import Document
from pydantic import Field
from datetime import datetime

class ScheduledInterview(Document):
    """Scheduled interview session"""
    user_id: str
    title: str
    description: Optional[str] = None
    scheduled_time: datetime
    duration_minutes: int = 60
    
    # Calendar integration
    calendar_event_id: Optional[str] = None
    calendar_link: Optional[str] = None
    
    # Notifications
    notification_sent: bool = False
    reminder_times: List[int] = [15, 60, 1440]  # Minutes before (15min, 1hr, 1day)
    reminders_sent: List[int] = []  # Track which reminders were sent
    
    # Status tracking
    status: str = "scheduled"  # scheduled, completed, cancelled, missed
    
    # Link to actual interview session (when started)
    session_id: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "scheduled_interviews"
        indexes = ["user_id", "scheduled_time", "status"]


class NotificationPreference(Document):
    """User's notification preferences for scheduled interviews"""
    user_id: str
    
    # Email notifications
    email_enabled: bool = True
    email_address: Optional[str] = None  # Override user's primary email
    
    # Reminder intervals (minutes before interview)
    reminder_intervals: List[int] = [15, 60, 1440]  # 15min, 1hr, 1day
    
    # Calendar sync
    calendar_sync_enabled: bool = False
    calendar_type: str = "google"  # google, outlook, ical
    
    # Timezone
    timezone: str = "UTC"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "notification_preferences"
        indexes = ["user_id"]
