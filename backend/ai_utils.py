import os
import httpx
import json
import re
import time
from dotenv import load_dotenv
from metrics import (
    track_krutrim_call,
    krutrim_api_calls,
    krutrim_api_duration,
    krutrim_api_errors
)

import logging

logger = logging.getLogger("ai_utils")

load_dotenv()

KRUTRIM_API_KEY = os.getenv("KRUTRIM_API_KEY")
KRUTRIM_API_URL = os.getenv("KRUTRIM_API_URL", "https://cloud.olakrutrim.com/v1/chat/completions")

from ai_engine.krutrim_adapter import KrutrimLLM
from pydantic import SecretStr

def get_agent_llm(temperature: float = 0.7) -> KrutrimLLM:
    """Get a configured LangChain LLM instance for Agents"""
    if not KRUTRIM_API_KEY:
        logger.error("KRUTRIM_API_KEY missing")
        raise ValueError("KRUTRIM_API_KEY not set")
        
    return KrutrimLLM(
        api_key=SecretStr(KRUTRIM_API_KEY),
        api_url=KRUTRIM_API_URL,
        temperature=temperature
    )

async def call_krutrim_api(messages: list, temperature: float = 0.7, max_tokens: int = 1000, operation: str = "general") -> str:
    """Helper to call Krutrim API with consistent error handling and metrics"""
    if not KRUTRIM_API_KEY:
        logger.error("⚠️ KRUTRIM_API_KEY not found in environment")
        return ""
        
    start_time = time.time()
    
    headers = {
        "Authorization": f"Bearer {KRUTRIM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "Krutrim-spectre-v2",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    try:
        logger.info(f"Calling Krutrim API - Operation: {operation}")
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(KRUTRIM_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            
            duration = time.time() - start_time
            krutrim_api_calls.labels(operation=operation, status='success').inc()
            krutrim_api_duration.labels(operation=operation).observe(duration)
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            logger.info(f"Krutrim API Success ({operation}) - Duration: {duration:.2f}s")
            return content
            
    except Exception as e:
        krutrim_api_calls.labels(operation=operation, status='error').inc()
        krutrim_api_errors.labels(operation=operation, error_type=type(e).__name__).inc()
        logger.error(f"❌ Krutrim API Error ({operation}): {str(e)}")
        if hasattr(e, 'response') and e.response:
            logger.error(f"Status Code: {e.response.status_code}")
            try:
                # Safely log snippet
                logger.error(f"Raw Response snippet: {e.response.text[:500]}")
            except:
                pass
        return ""

def clean_ai_json(response: str) -> str:
    """
    Aggressively clean AI response to extract valid JSON string.
    Does not make assumptions about the data structure (list vs object).
    """
    if not response:
        return "{}"

    cleaned = response.strip()
    
    # 1. Handle Markdown Blocks
    if "```json" in cleaned:
        parts = cleaned.split("```json")
        if len(parts) > 1:
            cleaned = parts[1].split("```")[0].strip()
    elif "```" in cleaned:
         parts = cleaned.split("```")
         if len(parts) > 1:
             cleaned = parts[1].strip()
        
    # 2. Extract structural block
    first_brace = cleaned.find('{')
    first_bracket = cleaned.find('[')
    
    start_idx = -1
    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        start_idx = first_brace
    elif first_bracket != -1:
        start_idx = first_bracket

    if start_idx != -1:
        # Find the last matching closing character
        last_brace = cleaned.rfind('}')
        last_bracket = cleaned.rfind(']')
        end_idx = max(last_brace, last_bracket)
        if end_idx > start_idx:
            cleaned = cleaned[start_idx:end_idx+1]

    # 3. Basic cleanup of common LLM errors
    # Remove trailing commas before closing braces/brackets
    cleaned = re.sub(r',(\s*[}\]])', r'\1', cleaned)
    
    # Handle unescaped control characters like newlines inside strings
    # We'll replace problematic newlines that aren't part of JSON structure
    # This is a best-effort approach
    try:
        json.loads(cleaned)
        return cleaned
    except json.JSONDecodeError:
        # Try to fix unescaped newlines and tabs
        # Replace actual newlines with \n literal
        fixed = cleaned.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
        
        # However, we might have just escaped the actual structure newlines. 
        # Most JSON parsers handle \n outside strings fine, but not literal newlines inside strings.
        # Let's try a safer approach: replace literal newlines with spaces if they aren't preceded by structural chars
        # But for now, let's try to just use strict=False in the caller or here if we use a different loader
        
        # Attempt to remove all real newlines that aren't preceded by a comma or colon or brace
        # This is getting complex. Let's try simple replacement first.
        try:
            # Maybe the AI returned " ... " instead of \" ... \" inside strings
            # We can't easily fix that without a full state machine parser.
            return cleaned 
        except:
            return cleaned

def extract_questions_fallback(response: str) -> list:
    """
    Specific fallback for when JSON cleaning fails for question generation.
    Parses numbered lists using regex.
    """
    questions = []
    try:
        # Split items by "1. ", "2. " etc at start of lines
        items = re.split(r'\n\s*\d+[.)]\s+', '\n' + response.strip())
        
        for item in items[1:]:
            lines = item.strip().split('\n')
            if not lines: continue
            
            raw_q = lines[0].strip()
            q_text = re.sub(r'^Question:\s*', '', raw_q).strip()
            
            options = []
            starter_code = ""
            test_cases = []
            q_type = "descriptive"
            
            for line in lines[1:]:
                line = line.strip()
                if not line: continue
                # Check for MCQs
                if line.startswith('- ') or line.startswith('* '):
                    options.append(line[2:].strip())
                    q_type = "mcq"
                elif re.match(r'^[A-D][).]\s*', line):
                    options.append(re.sub(r'^[A-D][).]\s*', '', line).strip())
                    q_type = "mcq"
                elif line.startswith('Options:'):
                    opts = line.replace('Options:', '').split(',')
                    options.extend([o.strip() for o in opts if o.strip()])
                    q_type = "mcq"
                elif "Starter Code:" in line:
                    starter_code = line.split("Starter Code:", 1)[1].strip()
                    q_type = "coding"
                elif "Test Cases:" in line:
                    try:
                        tc_str = line.split("Test Cases:", 1)[1].strip()
                        test_cases = json.loads(tc_str)
                        q_type = "coding"
                    except: pass
            
            if q_text:
                questions.append({
                    "question": q_text,
                    "options": options if options else None,
                    "type": q_type,
                    "answer": options[0] if options else None,
                    "starter_code": starter_code if starter_code else None,
                    "test_cases": test_cases if test_cases else None
                })
        return questions
    except Exception as e:
        logger.error(f"Error in extract_questions_fallback: {e}")
        return []
