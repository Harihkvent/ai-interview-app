import os
import json
import logging
from typing import Optional, Any
import redis.asyncio as redis
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Global instance
cache_manager = CacheManager()
