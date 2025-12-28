import hashlib
import logging
from typing import List, Optional
from models import QuestionCache

logger = logging.getLogger("cache_service")

def generate_resume_hash(resume_text: str) -> str:
    """Generate a stable hash for resume text"""
    # Normalize text: strip whitespace and convert to lowercase for better cache hit rate
    normalized = resume_text.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()

async def get_cached_questions(resume_text: str, job_title: str, round_type: str) -> Optional[List[dict]]:
    """Retrieve cached questions if they exist"""
    try:
        resume_hash = generate_resume_hash(resume_text)
        cache_entry = await QuestionCache.find_one(
            QuestionCache.resume_hash == resume_hash,
            QuestionCache.job_title == job_title,
            QuestionCache.round_type == round_type
        )
        
        if cache_entry:
            logger.info(f"Cache Hit: Found questions for {job_title} - {round_type}")
            return cache_entry.questions
            
        logger.info(f"Cache Miss: No questions found for {job_title} - {round_type}")
        return None
    except Exception as e:
        logger.error(f"Error in get_cached_questions: {e}")
        return None

async def cache_questions(resume_text: str, job_title: str, round_type: str, questions: List[dict]):
    """Store questions in cache"""
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
            logger.info(f"Cache Updated: {job_title} - {round_type}")
        else:
            new_entry = QuestionCache(
                resume_hash=resume_hash,
                job_title=job_title,
                round_type=round_type,
                questions=questions
            )
            await new_entry.insert()
            logger.info(f"Cache Created: {job_title} - {round_type}")
            
    except Exception as e:
        logger.error(f"Error in cache_questions: {e}")
