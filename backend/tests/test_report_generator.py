import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime

# Mock motor and other dependencies
sys.modules["motor"] = MagicMock()
sys.modules["motor.motor_asyncio"] = MagicMock()
sys.modules["langchain_mcp_adapters"] = MagicMock()

# Mock reportlab as it's a binary/complex dependency
mock_reportlab = MagicMock()
sys.modules["reportlab"] = mock_reportlab
sys.modules["reportlab.lib"] = MagicMock()
sys.modules["reportlab.lib.pagesizes"] = MagicMock()
sys.modules["reportlab.lib.styles"] = MagicMock()
sys.modules["reportlab.lib.units"] = MagicMock()
sys.modules["reportlab.platypus"] = MagicMock()
sys.modules["reportlab.lib.colors"] = MagicMock()
sys.modules["reportlab.lib.enums"] = MagicMock()

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from report_generator import (
    format_time_display,
    calculate_overall_score,
    generate_final_report_data,
    generate_avatar_report_data
)

# Patch Beanie class attributes to avoid AttributeError during query construction in tests
from models import InterviewSession, InterviewRound, Question, Answer
from avatar_interview_models import AvatarInterviewSession, AvatarResponse, AvatarQuestion
InterviewRound.session_id = MagicMock()
Question.round_id = MagicMock()
Answer.question_id = MagicMock()
AvatarResponse.session_id = MagicMock()
AvatarQuestion.session_id = MagicMock()
InterviewSession.user_id = MagicMock()
AvatarInterviewSession.user_id = MagicMock()

def test_format_time_display():
    assert format_time_display(45) == "00:45"
    assert format_time_display(3661) == "01:01:01"

def test_calculate_overall_score():
    session_data = {
        'rounds': [
            {
                'questions_answers': [
                    {'score': 10},
                    {'score': 5}
                ]
            },
            {
                'questions_answers': [
                    {'score': 9}
                ]
            }
        ]
    }
    # (10 + 5 + 9) / 3 = 24 / 3 = 8.0
    assert calculate_overall_score(session_data) == 8.0

@pytest.mark.asyncio
async def test_generate_final_report_data():
    session_id = "sess123"
    now = datetime.utcnow()
    
    mock_session = MagicMock()
    mock_session.resume_id = "res123"
    mock_session.total_time_seconds = 100
    mock_session.created_at = now
    mock_session.completed_at = now
    
    mock_resume = MagicMock()
    mock_resume.candidate_name = "John Doe"
    mock_resume.candidate_email = "john@example.com"
    mock_resume.filename = "resume.pdf"
    
    mock_round = MagicMock()
    mock_round.id = "r1"
    mock_round.round_type = "hr"
    mock_round.status = "completed"
    mock_round.total_time_seconds = 60
    
    mock_q = MagicMock()
    mock_q.id = "q1"
    mock_q.question_text = "Q1"
    
    mock_a = MagicMock()
    mock_a.answer_text = "A1"
    mock_a.evaluation = "Good"
    mock_a.score = 8.0
    mock_a.time_taken_seconds = 60
    
    with patch('report_generator.InterviewSession.get', new_callable=AsyncMock) as mock_get_sess, \
         patch('report_generator.Resume.get', new_callable=AsyncMock) as mock_get_res, \
         patch('report_generator.InterviewRound.find') as mock_find_round, \
         patch('report_generator.Question.find') as mock_find_q, \
         patch('report_generator.Answer.find_one', new_callable=AsyncMock) as mock_get_a:
        
        mock_get_sess.return_value = mock_session
        mock_get_res.return_value = mock_resume
        mock_find_round.return_value.to_list = AsyncMock(return_value=[mock_round])
        mock_find_q.return_value.to_list = AsyncMock(return_value=[mock_q])
        mock_get_a.return_value = mock_a
        
        data = await generate_final_report_data(session_id)
        
        assert data["candidate_name"] == "John Doe"
        assert len(data["rounds"]) == 1
        assert data["rounds"][0]["round_type"] == "Hr"
        assert len(data["rounds"][0]["questions_answers"]) == 1

@pytest.mark.asyncio
async def test_generate_avatar_report_data():
    session_id = "sess123"
    now = datetime.utcnow()
    
    mock_session = MagicMock()
    mock_session.resume_id = "res123"
    mock_session.questions_answered = 1
    mock_session.total_score = 7.0
    mock_session.total_time_seconds = 60
    mock_session.created_at = now
    mock_session.completed_at = None
    
    mock_resume = MagicMock()
    mock_resume.candidate_name = "Jane Doe"
    
    mock_resp = MagicMock()
    mock_resp.question_id = "q1"
    mock_resp.answer_text = "A1"
    mock_resp.evaluation = "Eva1"
    mock_resp.score = 7.0
    mock_resp.time_taken_seconds = 60
    
    mock_q = MagicMock()
    mock_q.round_type = "technical"
    mock_q.question_text = "Q1"
    mock_q.is_followup = False
    
    with patch('report_generator.AvatarInterviewSession.get', new_callable=AsyncMock) as mock_get_sess, \
         patch('report_generator.Resume.get', new_callable=AsyncMock) as mock_get_res, \
         patch('report_generator.AvatarResponse.find') as mock_find_resp, \
         patch('report_generator.AvatarQuestion.get', new_callable=AsyncMock) as mock_get_q:
        
        mock_get_sess.return_value = mock_session
        mock_get_res.return_value = mock_resume
        mock_find_resp.return_value.to_list = AsyncMock(return_value=[mock_resp])
        mock_get_q.return_value = mock_q
        
        data = await generate_avatar_report_data(session_id)
        
        assert data["is_avatar"] is True
        assert len(data["rounds"]) == 1
        assert data["rounds"][0]["round_type"] == "Technical"
