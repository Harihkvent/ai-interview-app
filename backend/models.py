from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime

class InterviewSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="active") # active, completed
    messages: List["Message"] = Relationship(back_populates="session")

class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: Optional[int] = Field(default=None, foreign_key="interviewsession.id")
    role: str # user, assistant, system
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    session: Optional[InterviewSession] = Relationship(back_populates="messages")
