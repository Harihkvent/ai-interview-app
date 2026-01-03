import os
import json
import hashlib
import logging
from typing import List, Optional, Any
import redis.asyncio as redis
from dotenv import load_dotenv
from models import QuestionCache

load_dotenv()

# Setup logging
logger = logging.getLogger("cache_service")

class CacheManager:
    """
    Handles caching of AI responses and other expensive computations using Redis.
    """
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis = None
        self.enabled = False

    async def connect(self):
        """Initialize Redis connection"""
        try:
            self.redis = redis.from_url(self.redis_url, decode_responses=True)
            # Test connection
            await self.redis.ping()
            self.enabled = True
            logger.info(f"Connected to Redis at {self.redis_url}")
        except Exception as e:
            self.enabled = False
            logger.warning(f"Failed to connect to Redis: {e}. Caching will be disabled.")

    async def disconnect(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve value from cache"""
        if not self.enabled or not self.redis:
            return None
        
        try:
            data = await self.redis.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Error getting from cache: {e}")
        return None

    async def set(self, key: str, value: Any, expire_seconds: int = 3600):
        """Store value in cache with expiration"""
        if not self.enabled or not self.redis:
            return
        
        try:
            serialized = json.dumps(value)
            await self.redis.set(key, serialized, ex=expire_seconds)
        except Exception as e:
            logger.error(f"Error setting cache: {e}")

    async def delete(self, key: str):
        """Remove value from cache"""
        if not self.enabled or not self.redis:
            return
            
        try:
            await self.redis.delete(key)
        except Exception as e:
            logger.error(f"Error deleting cache: {e}")

# Global instance for Redis caching
cache_manager = CacheManager()

# ============= MongoDB Question Caching =============

def generate_resume_hash(resume_text: str) -> str:
    """Generate a stable hash for resume text"""
    # Normalize text: strip whitespace and convert to lowercase for better cache hit rate
    normalized = resume_text.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()

async def get_cached_questions(resume_text: str, job_title: str, round_type: str) -> Optional[List[dict]]:
    """Retrieve cached questions if they exist in MongoDB"""
    try:
        resume_hash = generate_resume_hash(resume_text)
        cache_entry = await QuestionCache.find_one(
            QuestionCache.resume_hash == resume_hash,
            QuestionCache.job_title == job_title,
            QuestionCache.round_type == round_type
        )
        
        if cache_entry:
            logger.info(f"DB Cache Hit: Found questions for {job_title} - {round_type}")
            return cache_entry.questions
            
        logger.info(f"DB Cache Miss: No questions found for {job_title} - {round_type}")
        return None
    except Exception as e:
        logger.error(f"Error in get_cached_questions: {e}")
        return None

async def cache_questions(resume_text: str, job_title: str, round_type: str, questions: List[dict]):
    """Store questions in MongoDB cache"""
    try:
        resume_hash = generate_resume_hash(resume_text)
        
        # Upsert: Update if exists, otherwise insert
        cache_entry = await QuestionCache.find_one(
            QuestionCache.resume_hash == resume_hash,
            QuestionCache.job_title == job_title,
            QuestionCache.round_type == round_type
        )
        
        if cache_entry:
            cache_entry.questions = questions
            await cache_entry.save()
            logger.info(f"DB Cache Updated: {job_title} - {round_type}")
        else:
            new_entry = QuestionCache(
                resume_hash=resume_hash,
                job_title=job_title,
                round_type=round_type,
                questions=questions
            )
            await new_entry.insert()
            logger.info(f"DB Cache Created: {job_title} - {round_type}")
            
    except Exception as e:
        logger.error(f"Error in cache_questions: {e}")
