import pytest
import sys
import os
import json
from unittest.mock import MagicMock, AsyncMock, patch

# Mock motor and other dependencies before importing question_service
sys.modules["motor"] = MagicMock()
sys.modules["motor.motor_asyncio"] = MagicMock()
sys.modules["langchain_mcp_adapters"] = MagicMock()

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock metrics to avoid prometheus errors in tests
mock_metrics = MagicMock()
sys.modules["metrics"] = mock_metrics

from question_service import (
    generate_questions, 
    evaluate_answer, 
    _generate_mcqs,
    _generate_descriptive,
    _generate_coding,
    parse_json_questions,
    validate_and_fix_mcq
)

@pytest.mark.asyncio
async def test_generate_questions_aptitude_batching():
    """Test generating aptitude questions which triggers batching (count >= 8)"""
    resume_text = "Resume text"
    round_type = "aptitude"
    
    # Mock ROUND_CONFIG to require 10 MCQs for aptitude in this test
    with patch('question_service.ROUND_CONFIG', {"aptitude": {"mcq": 10, "descriptive": 0}}):
        mock_response_1 = json.dumps([
            {"question": f"Q{i}", "options": ["A", "B", "C", "D"], "answer": "A", "type": "mcq"} for i in range(5)
        ])
        mock_response_2 = json.dumps([
            {"question": f"Q{i+5}", "options": ["A", "B", "C", "D"], "answer": "A", "type": "mcq"} for i in range(5)
        ])
        
        with patch('question_service.call_krutrim_api', new_callable=AsyncMock) as mock_api, \
             patch('question_service.get_cached_questions', new_callable=AsyncMock) as mock_cache_get, \
             patch('question_service.cache_questions', new_callable=AsyncMock) as mock_cache_set, \
             patch('question_service.save_questions_to_bank', new_callable=AsyncMock) as mock_save_bank:
            
            mock_cache_get.return_value = None
            mock_api.side_effect = [mock_response_1, mock_response_2]
            
            questions = await generate_questions(resume_text, round_type)
            
            assert len(questions) == 10
            assert mock_api.call_count == 2
            assert all(q["type"] == "mcq" for q in questions)

@pytest.mark.asyncio
async def test_generate_questions_technical():
    """Test generating technical questions (MCQ + Descriptive + Coding)"""
    resume_text = "Resume text"
    round_type = "technical"
    
    with patch('question_service.ROUND_CONFIG', {"technical": {"mcq": 1, "descriptive": 1, "coding": 1}}):
        mock_mcq_resp = json.dumps([{"question": "MCQ1", "options": ["A", "B", "C", "D"], "answer": "A", "type": "mcq"}])
        mock_desc_resp = json.dumps([{"question": "DESC1", "type": "descriptive"}])
        mock_coding_resp = json.dumps([{
            "question": "CODE1", 
            "starter_code": "def f(): pass", 
            "test_cases": [], 
            "language": "python", 
            "type": "coding"
        }])
        
        with patch('question_service.call_krutrim_api', new_callable=AsyncMock) as mock_api, \
             patch('question_service.get_cached_questions', new_callable=AsyncMock) as mock_cache_get:
            
            mock_cache_get.return_value = None
            mock_api.side_effect = [mock_mcq_resp, mock_desc_resp, mock_coding_resp]
            
            questions = await generate_questions(resume_text, round_type)
            
            assert len(questions) == 3
            types = [q["type"] for q in questions]
            assert "mcq" in types
            assert "descriptive" in types
            assert "coding" in types

@pytest.mark.asyncio
async def test_evaluate_answer():
    """Test answer evaluation logic"""
    question = "What is Python?"
    answer = "A programming language"
    resume = "Skills: Python"
    
    mock_resp = json.dumps({"score": 8.5, "evaluation": "Great answer!"})
    
    with patch('question_service.call_krutrim_api', new_callable=AsyncMock) as mock_api:
        mock_api.return_value = mock_resp
        
        result = await evaluate_answer(question, answer, resume)
        
        assert result["score"] == 8.5
        assert result["evaluation"] == "Great answer!"
        assert mock_api.called

def test_parse_json_questions_various_formats():
    """Test JSON parsing with different AI output styles"""
    # Standard array
    res1 = '[{"question": "Q1"}]'
    parsed1 = parse_json_questions(res1, 1, "mcq")
    assert len(parsed1) == 1
    assert parsed1[0]["question"] == "Q1"
    
    # Wrapped in dict
    res2 = '{"questions": [{"question": "Q2"}]}'
    parsed2 = parse_json_questions(res2, 1, "mcq")
    assert len(parsed2) == 1
    assert parsed2[0]["question"] == "Q2"
    
    # No JSON markers
    res3 = '{"question": "Q3"}'
    parsed3 = parse_json_questions(res3, 1, "mcq")
    assert len(parsed3) == 1
    assert parsed3[0]["question"] == "Q3"

def test_validate_and_fix_mcq():
    """Test MCQ validation and fixing logic"""
    # Valid
    q1 = {"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"}
    assert validate_and_fix_mcq(q1) is True
    
    # Missing option
    q2 = {"question": "Q", "options": ["A", "B", "C"], "answer": "A"}
    assert validate_and_fix_mcq(q2) is False
    
    # Answer not in options (partial match)
    q3 = {"question": "Q", "options": ["Apple", "Banana", "Cherry", "Date"], "answer": "apple"}
    assert validate_and_fix_mcq(q3) is True
    assert q3["answer"] == "Apple"
    
    # Answer not in options (fallback to first)
    q4 = {"question": "Q", "options": ["A", "B", "C", "D"], "answer": "X"}
    assert validate_and_fix_mcq(q4) is True
    assert q4["answer"] == "A"

@pytest.mark.asyncio
async def test_generate_questions_fallback():
    """Test fallback to DB when AI fails"""
    with patch('question_service.call_krutrim_api', new_callable=AsyncMock) as mock_api, \
         patch('question_service.get_db_fallback_questions', new_callable=AsyncMock) as mock_fallback:
        
        mock_api.return_value = None # AI Fails
        mock_fallback.return_value = [{"question": "FB1", "type": "mcq"}]
        
        questions = await _generate_mcqs("resume", "technical", 1)
        
        assert len(questions) == 1
        assert questions[0]["question"] == "FB1"
        assert mock_fallback.called
