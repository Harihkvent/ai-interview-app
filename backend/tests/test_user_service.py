import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from user_service import calculate_skill_points, get_global_rank, get_user_performance_summary

@pytest.mark.asyncio
async def test_calculate_skill_points():
    user_id = "user123"
    
    # Mock InterviewSession objects
    mock_session1 = MagicMock()
    mock_session1.total_score = 8.0
    mock_session2 = MagicMock()
    mock_session2.total_score = 7.0
    mock_sessions = [mock_session1, mock_session2]
    
    # Mock SkillTestAttempt objects
    mock_attempt1 = MagicMock()
    mock_attempt1.score = 85.0
    mock_attempt2 = MagicMock()
    mock_attempt2.score = 90.0
    mock_attempts = [mock_attempt1, mock_attempt2]
    
    with patch('models.InterviewSession.find') as mock_find_sessions, \
         patch('models.InterviewSession.user_id', create=True), \
         patch('models.InterviewSession.status', create=True), \
         patch('skill_assessment_models.SkillTestAttempt.find') as mock_find_attempts, \
         patch('skill_assessment_models.SkillTestAttempt.user_id', create=True), \
         patch('skill_assessment_models.SkillTestAttempt.status', create=True):
        
        # Setup session mock chain: InterviewSession.find(...).to_list()
        mock_find_sessions.return_value.to_list = AsyncMock(return_value=mock_sessions)
        
        # Setup attempt mock chain: SkillTestAttempt.find(...).to_list()
        mock_find_attempts.return_value.to_list = AsyncMock(return_value=mock_attempts)
        
        points = await calculate_skill_points(user_id)
        
        # Calculation: (8+7)*10 + (85+90) = 150 + 175 = 325
        assert points == 325

@pytest.mark.asyncio
async def test_get_global_rank():
    user_id = "user1"
    
    # Mock users
    mock_user1 = MagicMock()
    mock_user1.id = "user1"
    mock_user2 = MagicMock()
    mock_user2.id = "user2"
    mock_user3 = MagicMock()
    mock_user3.id = "user3"
    mock_users = [mock_user1, mock_user2, mock_user3]
    
    with patch('auth_models.User.find_all') as mock_find_all, \
         patch('user_service.calculate_skill_points') as mock_calc:
        
        mock_find_all.return_value.to_list = AsyncMock(return_value=mock_users)
        
        # user1 has 100 points, user2 has 200, user3 has 50
        async def side_effect(uid):
            if uid == "user1": return 100
            if uid == "user2": return 200
            if uid == "user3": return 50
            return 0
        
        mock_calc.side_effect = side_effect
        
        rank_info = await get_global_rank(user_id)
        
        # Sorted points: user2 (200), user1 (100), user3 (50)
        # user1 is rank 2
        assert rank_info["rank"] == 2
        assert rank_info["total_users"] == 3
        # Percentile: ((3 - (2-1)) / 3) * 100 = (2/3) * 100 = 66.666... -> 66.7
        assert rank_info["percentile"] == 66.7

@pytest.mark.asyncio
async def test_get_user_performance_summary():
    user_id = "user1"
    
    with patch('user_service.calculate_skill_points', new_callable=AsyncMock) as mock_calc, \
         patch('user_service.get_global_rank', new_callable=AsyncMock) as mock_rank:
        
        mock_calc.return_value = 123
        mock_rank.return_value = {"rank": 5, "percentile": 80.0, "total_users": 25}
        
        summary = await get_user_performance_summary(user_id)
        
        assert summary["skill_points"] == 123
        assert summary["global_rank"] == 5
        assert summary["percentile"] == 80.0
        assert summary["total_users"] == 25
