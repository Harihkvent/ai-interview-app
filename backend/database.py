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
    from analytics_models import PerformanceMetrics, AnalyticsSnapshot
    from scheduling_models import ScheduledInterview, NotificationPreference, CalendarToken
    from skill_assessment_models import SkillTest, SkillTestAttempt, SkillTestQuestion
    from certification_models import Certification, UserCertification
    from avatar_interview_models import AvatarInterviewSession, AvatarQuestion, AvatarResponse
    from admin_models import TokenUsage, AdminActivity, AppConfig
    from feedback_models import Feedback
    
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
            UserPreferences,
            # New feature models
            PerformanceMetrics,
            AnalyticsSnapshot,
            ScheduledInterview,
            NotificationPreference,
            CalendarToken,
            SkillTest,
            SkillTestAttempt,
            SkillTestQuestion,
            Certification,
            UserCertification,
            # Avatar Interview models
            AvatarInterviewSession,
            AvatarQuestion,
            AvatarResponse,
            TokenUsage,
            AdminActivity,
            AppConfig,
            Feedback
        ]
    )
    
    # Seed default admin user
    await seed_admin_user()
    
    logger.info("✅ Database initialized with all models (including User)")
    return database

async def seed_admin_user():
    """Ensure a default admin user exists on startup"""
    from auth_models import User
    
    admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "harikiran926@gmail.com")
    admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
    
    user = await User.find_one(User.email == admin_email)
    
    if user:
        if user.role != "admin":
            user.role = "admin"
            await user.save()
            logger.info(f"👤 User {admin_email} promoted to admin")
        else:
            logger.info(f"👤 Admin user {admin_email} already exists")
    else:
        # Create new admin user
        new_admin = User(
            email=admin_email,
            username=admin_email.split('@')[0],
            password_hash=User.hash_password(admin_password),
            role="admin",
            full_name="Default Admin"
        )
        await new_admin.insert()
        logger.info(f"👤 Default admin user {admin_email} created")

# For dependency injection (not used with Beanie, but kept for compatibility)
async def get_session():
    """Placeholder for compatibility - Beanie doesn't need session injection"""
    yield None
