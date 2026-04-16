import pytest
import sys
import os
import json
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timedelta

# Mock motor and other dependencies
sys.modules["motor"] = MagicMock()
sys.modules["motor.motor_asyncio"] = MagicMock()
sys.modules["langchain_mcp_adapters"] = MagicMock()

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from skill_assessment_service import (
    get_available_tests,
    start_skill_test,
    submit_test_answer,
    complete_skill_test,
    generate_skill_questions,
    get_test_results
)

# Patch Beanie class attributes to avoid AttributeError during query construction in tests
from skill_assessment_models import SkillTest, SkillTestAttempt, SkillTestQuestion
SkillTest.is_active = MagicMock()
SkillTest.created_by = MagicMock()
SkillTestAttempt.user_id = MagicMock()
SkillTestQuestion.skill_name = MagicMock()

@pytest.mark.asyncio
async def test_get_available_tests():
    user_id = "user123"
    mock_tests = [MagicMock(), MagicMock()]
    
    with patch('skill_assessment_service.SkillTest.find') as mock_find:
        # Mocking the Beanie find chain: SkillTest.find(...).to_list()
        mock_find.return_value.find.return_value.to_list = AsyncMock(return_value=mock_tests)
        # Handle the case where Or is used
        mock_find.return_value.to_list = AsyncMock(return_value=mock_tests)
        
        tests = await get_available_tests(user_id)
        
        assert len(tests) == 2
        assert mock_find.called

@pytest.mark.asyncio
async def test_start_skill_test():
    user_id = "user123"
    test_id = "test123"
    
    mock_test = MagicMock()
    mock_test.total_questions = 10
    
    with patch('skill_assessment_service.SkillTest.get', new_callable=AsyncMock) as mock_get_test, \
         patch('skill_assessment_service.SkillTestAttempt') as MockAttemptClass:
        
        mock_get_test.return_value = mock_test
        mock_attempt_instance = MagicMock()
        mock_attempt_instance.insert = AsyncMock()
        MockAttemptClass.return_value = mock_attempt_instance
        
        attempt = await start_skill_test(user_id, test_id)
        
        assert attempt == mock_attempt_instance
        # Verification that fields were set correctly
        kwargs = MockAttemptClass.call_args[1]
        assert kwargs["user_id"] == user_id
        assert kwargs["skill_test_id"] == test_id
        assert kwargs["total_questions"] == 10

@pytest.mark.asyncio
async def test_submit_test_answer_mcq_correct():
    attempt_id = "att123"
    question_id = "q123"
    answer = "A. Option A"
    time_taken = 30
    
    mock_attempt = MagicMock()
    mock_attempt.status = "in-progress"
    mock_attempt.answers = []
    mock_attempt.correct_answers = 0
    mock_attempt.save = AsyncMock()
    
    mock_question = MagicMock()
    mock_question.question_type = "mcq"
    mock_question.correct_answer = "A"
    
    with patch('skill_assessment_service.SkillTestAttempt.get', new_callable=AsyncMock) as mock_get_att, \
         patch('skill_assessment_service.SkillTestQuestion.get', new_callable=AsyncMock) as mock_get_q:
        
        mock_get_att.return_value = mock_attempt
        mock_get_q.return_value = mock_question
        
        result = await submit_test_answer(attempt_id, question_id, answer, time_taken)
        
        assert result["is_correct"] is True
        assert mock_attempt.correct_answers == 1
        assert len(mock_attempt.answers) == 1
        assert mock_attempt.answers[0]["is_correct"] is True

@pytest.mark.asyncio
async def test_complete_skill_test():
    attempt_id = "att123"
    
    mock_attempt = MagicMock()
    mock_attempt.total_questions = 10
    mock_attempt.skipped_count = 0
    mock_attempt.correct_answers = 8
    mock_attempt.skill_test_id = "test123"
    mock_attempt.started_at = datetime.utcnow() - timedelta(minutes=10)
    mock_attempt.save = AsyncMock()
    
    mock_test = MagicMock()
    mock_test.passing_score = 70.0
    mock_test.skill_name = "Python"
    
    with patch('skill_assessment_service.SkillTestAttempt.get', new_callable=AsyncMock) as mock_get_att, \
         patch('skill_assessment_service.SkillTest.get', new_callable=AsyncMock) as mock_get_test:
        
        mock_get_att.return_value = mock_attempt
        mock_get_test.return_value = mock_test
        
        result = await complete_skill_test(attempt_id)
        
        assert result["score"] == 80.0
        assert result["passed"] is True
        assert result["proficiency_level"] == "advanced"
        assert mock_attempt.status == "completed"

@pytest.mark.asyncio
async def test_generate_skill_questions_success():
    skill_name = "Python"
    category = "programming"
    
    mock_json = json.dumps([
        {
            "question": "What is Python?",
            "options": ["A. Language", "B. Snake", "C. Car", "D. Tool"],
            "correct_answer": "A",
            "explanation": "Python is a programming language."
        }
    ])
    
    with patch('skill_assessment_service.call_krutrim_api', new_callable=AsyncMock) as mock_api, \
         patch('skill_assessment_service.SkillTestQuestion') as MockQClass:
        
        mock_api.return_value = mock_json
        mock_q_instance = MagicMock()
        mock_q_instance.id = "q_new_123"
        mock_q_instance.insert = AsyncMock()
        MockQClass.return_value = mock_q_instance
        
        q_ids = await generate_skill_questions(skill_name, category, count=1)
        
        assert len(q_ids) == 1
        assert q_ids[0] == "q_new_123"
        assert MockQClass.called
        assert mock_q_instance.insert.called

@pytest.mark.asyncio
async def test_get_test_results():
    attempt_id = "att123"
    
    mock_attempt = MagicMock()
    mock_attempt.skill_test_id = "test123"
    mock_attempt.total_questions = 1
    mock_attempt.skipped_count = 0
    mock_attempt.answers = [{"question_id": "q1", "answer": "A", "is_correct": True, "time_taken": 10}]
    
    mock_test = MagicMock()
    mock_test.skill_name = "Python"
    
    mock_question = MagicMock()
    mock_question.question_text = "What is Python?"
    mock_question.correct_answer = "A"
    mock_question.explanation = "It's a language"
    
    with patch('skill_assessment_service.SkillTestAttempt.get', new_callable=AsyncMock) as mock_get_att, \
         patch('skill_assessment_service.SkillTest.get', new_callable=AsyncMock) as mock_get_test, \
         patch('skill_assessment_service.SkillTestQuestion.get', new_callable=AsyncMock) as mock_get_q:
        
        mock_get_att.return_value = mock_attempt
        mock_get_test.return_value = mock_test
        mock_get_q.return_value = mock_question
        
        results = await get_test_results(attempt_id)
        
        assert results["test_name"] == "Python"
        assert len(results["detailed_answers"]) == 1
        assert results["detailed_answers"][0]["question_text"] == "What is Python?"
