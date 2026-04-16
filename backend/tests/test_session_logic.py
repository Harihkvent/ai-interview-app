import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock models before importing session_service
with patch('models.InterviewSession') as MockSession:
    # We need to import inside the patch or use a more sophisticated way to mock beanie
    pass

from session_service import toggle_session_pause

@pytest.mark.asyncio
async def test_toggle_session_pause_logic():
    """Test the logic of pausing and resuming a session"""
    
    # Create a mock session object
    mock_session = MagicMock()
    mock_session.is_paused = False
    mock_session.status = "active"
    mock_session.last_pause_at = None
    mock_session.total_paused_time = 0
    mock_session.save = AsyncMock()
    
    # Patch InterviewSession.get
    with patch('models.InterviewSession.get', return_value=mock_session):
        # 1. Test Pausing
        result = await toggle_session_pause("some_id")
        
        assert mock_session.is_paused is True
        assert mock_session.status == "paused"
        assert mock_session.last_pause_at is not None
        assert result["is_paused"] is True
        mock_session.save.assert_awaited_once()
        
        # 2. Test Resuming
        # Setup for resume: make it look like it's been paused for 10 seconds
        fixed_now = datetime.utcnow()
        mock_session.last_pause_at = fixed_now - timedelta(seconds=10)
        mock_session.save.reset_mock()
        
        result = await toggle_session_pause("some_id")
        
        assert mock_session.is_paused is False
        assert mock_session.status == "active"
        assert mock_session.last_pause_at is None
        # total_paused_time should be around 10
        assert mock_session.total_paused_time >= 10
        assert result["is_paused"] is False
        mock_session.save.assert_awaited_once()

def test_placeholder():
    """Simple test to ensure pytest runs"""
    assert True
