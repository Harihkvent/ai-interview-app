from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("database")

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "ai_interview_db"

async def init_db():
    """Initialize MongoDB connection and Beanie ODM"""
    from models import InterviewSession, Resume, InterviewRound, Question, Answer, Message, JobMatch, CareerRoadmap, QuestionBank, QuestionCache, UserPreferences
    from auth_models import User
    
    client = AsyncIOMotorClient(MONGODB_URL)
    database = client[DATABASE_NAME]
    
    await init_beanie(
        database=database,
        document_models=[
            User,  # Authentication
            InterviewSession,
            Resume,
            InterviewRound,
            Question,
            Answer,
            Message,
            JobMatch,
            CareerRoadmap,
            QuestionBank,
            QuestionCache,
            UserPreferences
        ]
    )
    
    logger.info("✅ Database initialized with all models (including User)")
    return database

# For dependency injection (not used with Beanie, but kept for compatibility)
async def get_session():
    """Placeholder for compatibility - Beanie doesn't need session injection"""
    yield None
