import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from cache_service import CacheManager, generate_resume_hash

def test_generate_resume_hash():
    """Test that resume hashing is stable and normalizes input"""
    text1 = "  Python Developer with 5 years experience  "
    text2 = "python developer WITH 5 YEARS experience"
    
    hash1 = generate_resume_hash(text1)
    hash2 = generate_resume_hash(text2)
    
    assert hash1 == hash2
    assert len(hash1) == 64  # SHA256 length

@pytest.mark.asyncio
async def test_cache_manager_connect_failure():
    """Test that CacheManager handles connection failures gracefully"""
    manager = CacheManager()
    
    # Mock redis.from_url to raise an Exception
    with patch('redis.asyncio.from_url', side_effect=Exception("Connection refused")):
        await manager.connect()
        assert manager.enabled is False

@pytest.mark.asyncio
async def test_cache_manager_get_set():
    """Test basic get/set operations with a mocked Redis"""
    manager = CacheManager()
    manager.redis = AsyncMock()
    manager.enabled = True
    
    # 1. Test Set
    await manager.set("test_key", {"data": "value"}, expire_seconds=10)
    # verify it was called with JSON string
    manager.redis.set.assert_called_with("test_key", '{"data": "value"}', ex=10)
    
    # 2. Test Get
    manager.redis.get.return_value = '{"data": "value"}'
    result = await manager.get("test_key")
    assert result == {"data": "value"}
    
    # 3. Test Get Miss
    manager.redis.get.return_value = None
    result = await manager.get("non_existent")
    assert result is None

@pytest.mark.asyncio
async def test_skip_caching_for_rounds():
    """Verify that get_cached_questions skips for specific round types"""
    from cache_service import get_cached_questions, cache_questions
    
    # These should return None/None immediate because of the skip logic
    res = await get_cached_questions("text", "title", "aptitude")
    assert res is None
    
    res = await get_cached_questions("text", "title", "technical")
    assert res is None
