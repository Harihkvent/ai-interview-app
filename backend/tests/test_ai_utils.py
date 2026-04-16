import pytest
import sys
import os
import json

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ai_utils import clean_ai_json, extract_questions_fallback

def test_clean_ai_json_basic():
    """Test cleaning a simple JSON string"""
    raw = '{"key": "value"}'
    assert clean_ai_json(raw) == '{"key": "value"}'

def test_clean_ai_json_markdown():
    """Test cleaning a JSON block from markdown"""
    raw = """
    Here is the JSON:
    ```json
    {"key": "value"}
    ```
    I hope this helps!
    """
    assert clean_ai_json(raw) == '{"key": "value"}'

def test_clean_ai_json_think_block():
    """Test cleaning a JSON block from DeepSeek think blocks"""
    raw = """
    <think>
    Thinking about the user request...
    </think>
    ```json
    {"key": "value"}
    ```
    """
    assert clean_ai_json(raw) == '{"key": "value"}'

def test_clean_ai_json_trailing_comma():
    """Test cleaning JSON with a trailing comma (common LLM error)"""
    raw = '{"key": "value",}'
    assert clean_ai_json(raw) == '{"key": "value"}'
    
    raw_array = '[1, 2, 3,]'
    assert clean_ai_json(raw_array) == '[1, 2, 3]'

def test_clean_ai_json_empty():
    """Test cleaning empty response"""
    assert clean_ai_json("") == "[]"
    assert clean_ai_json(None) == "[]"

def test_extract_questions_fallback_numbered_list():
    """Test fallback extraction from a numbered list"""
    response = """
    1. Question: What is Python?
       Options: A language, A snake, A car, A bird
    2. Question: What is 2+2?
       A) 3
       B) 4
       C) 5
       D) 6
    """
    questions = extract_questions_fallback(response)
    assert len(questions) == 2
    assert questions[0]["question"] == "What is Python?"
    assert questions[0]["type"] == "mcq"
    assert len(questions[0]["options"]) == 4
    
    assert questions[1]["question"] == "What is 2+2?"
    assert questions[1]["type"] == "mcq"
    assert "4" in questions[1]["options"]

def test_extract_questions_fallback_coding():
    """Test fallback extraction for a coding question"""
    response = """
    1. Question: Write a function to add two numbers.
       Starter Code: def add(a, b): pass
       Test Cases: [{"input": [1, 2], "expected": 3}]
    """
    questions = extract_questions_fallback(response)
    assert len(questions) == 1
    assert questions[0]["question"] == "Write a function to add two numbers."
    assert questions[0]["type"] == "coding"
    assert questions[0]["starter_code"] == "def add(a, b): pass"
    assert questions[0]["test_cases"] == [{"input": [1, 2], "expected": 3}]
