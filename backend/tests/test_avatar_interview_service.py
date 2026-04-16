import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime

# Mock motor and other dependencies
sys.modules["motor"] = MagicMock()
sys.modules["motor.motor_asyncio"] = MagicMock()
sys.modules["langchain_mcp_adapters"] = MagicMock()

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from avatar_interview_service import (
    create_avatar_session,
    get_avatar_greeting,
    start_avatar_round,
    process_avatar_answer,
    finalize_avatar_session,
    format_question_for_speech,
    should_ask_followup
)

# Patch Beanie class attributes to avoid AttributeError during query construction in tests
from avatar_interview_models import AvatarQuestion, AvatarInterviewSession, AvatarResponse
AvatarQuestion.session_id = MagicMock()
AvatarQuestion.round_type = MagicMock()
AvatarQuestion.question_number = MagicMock()
AvatarQuestion.is_followup = MagicMock()
AvatarInterviewSession.user_id = MagicMock()
AvatarResponse.session_id = MagicMock()

@pytest.mark.asyncio
async def test_create_avatar_session():
    user_id = "user123"
    resume_id = "res123"
    rounds = ["hr", "technical"]
    
    with patch('avatar_interview_service.AvatarInterviewSession') as MockSessionClass:
        mock_session_instance = MagicMock()
        mock_session_instance.insert = AsyncMock()
        MockSessionClass.return_value = mock_session_instance
        
        session = await create_avatar_session(user_id, resume_id, rounds)
        
        assert session == mock_session_instance
        MockSessionClass.assert_called()
        mock_session_instance.insert.assert_called()

@pytest.mark.asyncio
async def test_get_avatar_greeting():
    greeting = await get_avatar_greeting()
    assert isinstance(greeting, str)
    assert len(greeting) > 0

@pytest.mark.asyncio
async def test_start_avatar_round():
    session_id = "sess123"
    round_type = "hr"
    resume_content = "Resume text"
    
    mock_session = MagicMock()
    mock_session.save = AsyncMock()
    
    # Mock questions returned by question_service
    mock_questions = [{"question": "Q1", "type": "descriptive"}]
    
    with patch('avatar_interview_service.AvatarInterviewSession.get', new_callable=AsyncMock) as mock_get_sess, \
         patch('question_service._generate_descriptive', new_callable=AsyncMock) as mock_gen_desc, \
         patch('avatar_interview_service.AvatarQuestion') as MockQClass:
        
        mock_get_sess.return_value = mock_session
        mock_gen_desc.return_value = mock_questions
        mock_q_instance = MagicMock()
        mock_q_instance.id = "q1"
        mock_q_instance.question_text = "Q1"
        mock_q_instance.insert = AsyncMock()
        MockQClass.return_value = mock_q_instance
        
        result = await start_avatar_round(session_id, round_type, resume_content)
        
        assert result["round_type"] == "hr"
        assert result["total_questions"] == 1
        assert mock_session.current_round == "hr"
        assert mock_session.save.called
        assert mock_q_instance.insert.called

@pytest.mark.asyncio
async def test_process_avatar_answer_with_followup():
    session_id = "sess123"
    question_id = "q1"
    answer_text = "Detailed answer about my experience."
    time_taken = 30
    is_voice = True
    resume_content = "Resume text"
    
    mock_session = MagicMock()
    mock_session.transcript = []
    mock_session.total_score = 0.0
    mock_session.questions_answered = 0
    mock_session.total_time_seconds = 0
    mock_session.save = AsyncMock()
    
    mock_question = MagicMock()
    mock_question.question_text = "Tell me about yourself."
    mock_question.round_type = "hr"
    mock_question.is_followup = False
    mock_question.asked_at = None
    
    mock_eval = {"evaluation": "Good", "score": 6.0}
    
    with patch('avatar_interview_service.AvatarInterviewSession.get', new_callable=AsyncMock) as mock_get_sess, \
         patch('avatar_interview_service.AvatarQuestion.get', new_callable=AsyncMock) as mock_get_q, \
         patch('avatar_interview_service.evaluate_answer', new_callable=AsyncMock) as mock_evaluate, \
         patch('avatar_interview_service.AvatarResponse') as MockRespClass, \
         patch('avatar_interview_service.should_ask_followup', new_callable=AsyncMock) as mock_should_fu, \
         patch('avatar_interview_service.generate_followup_question', new_callable=AsyncMock) as mock_gen_fu, \
         patch('avatar_interview_service.get_acknowledgment') as mock_ack:
        
        mock_get_sess.return_value = mock_session
        mock_get_q.return_value = mock_question
        mock_evaluate.return_value = mock_eval
        mock_should_fu.return_value = True
        mock_ack.return_value = "Acknowledged."
        
        mock_fu_q = MagicMock()
        mock_fu_q.id = "fu_q1"
        mock_fu_q.question_text = "Can you elaborate?"
        mock_fu_q.voice_text = "Can you elaborate text?"
        mock_fu_q.question_type = "descriptive"
        mock_gen_fu.return_value = mock_fu_q
        
        mock_resp = MagicMock()
        mock_resp.insert = AsyncMock()
        MockRespClass.return_value = mock_resp
        
        result = await process_avatar_answer(session_id, question_id, answer_text, time_taken, is_voice, resume_content)
        
        assert result["has_followup"] is True
        assert result["next_question"]["text"] == "Can you elaborate?"
        assert mock_session.save.called
        assert mock_resp.insert.called

@pytest.mark.asyncio
async def test_should_ask_followup():
    mock_q = MagicMock()
    mock_q.is_followup = False
    
    # Too short
    assert await should_ask_followup(mock_q, "short", 5.0) is False
    
    # Already follow-up
    mock_fu_q = MagicMock()
    mock_fu_q.is_followup = True
    assert await should_ask_followup(mock_fu_q, "Long enough answer text here for followup.", 5.0) is False
    
    # Good candidate for follow-up
    with patch('random.random') as mock_random:
        mock_random.return_value = 0.1 # Below probability
        assert await should_ask_followup(mock_q, "Long enough answer text here for followup.", 5.0) is True

def test_format_question_for_speech():
    text = "**Helpful** #Question `about` Python."
    formatted = format_question_for_speech(text)
    assert "*" not in formatted
    assert "#" not in formatted
    assert "`" not in formatted

@pytest.mark.asyncio
async def test_finalize_avatar_session():
    session_id = "sess123"
    mock_session = MagicMock()
    mock_session.questions_answered = 2
    mock_session.total_score = 15.0 # Total of 2 questions
    mock_session.save = AsyncMock()
    mock_session.transcript = [{}, {}, {}, {}]
    mock_session.total_time_seconds = 60
    
    with patch('avatar_interview_service.AvatarInterviewSession.get', new_callable=AsyncMock) as mock_get_sess:
        mock_get_sess.return_value = mock_session
        
        result = await finalize_avatar_session(session_id)
        
        assert result["status"] == "completed"
        assert result["average_score"] == 7.5
        assert mock_session.save.called
