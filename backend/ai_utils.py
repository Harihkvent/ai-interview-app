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
            logger.error(f"Response Body: {e.response.text}")
        return ""

def clean_ai_json(response: str) -> str:
    """Aggressively clean AI response to extract valid JSON"""
    try:
        # If response is empty
        if not response:
            return "{}"

        # Try to parse directly first
        try:
            json.loads(response)
            return response
        except json.JSONDecodeError:
            pass

        cleaned = response.strip()
        
        # Clean markdown wrappers
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
            
        # Extract the first matching [...] or {...}
        # We start looking from the first [ or {
        start_idx = -1
        end_idx = -1
        
        first_brace = cleaned.find('{')
        first_bracket = cleaned.find('[')
        
        if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
            # Object detected
            start_idx = first_brace
            stack = 0
            for i, char in enumerate(cleaned[start_idx:], start=start_idx):
                if char == '{':
                    stack += 1
                elif char == '}':
                    stack -= 1
                    if stack == 0:
                        end_idx = i + 1
                        break
        elif first_bracket != -1:
            # Array detected
            start_idx = first_bracket
            stack = 0
            for i, char in enumerate(cleaned[start_idx:], start=start_idx):
                if char == '[':
                    stack += 1
                elif char == ']':
                    stack -= 1
                    if stack == 0:
                        end_idx = i + 1
                        break
                        
        if start_idx != -1 and end_idx != -1:
            cleaned = cleaned[start_idx:end_idx]
            
        # Remove trailing commas
        cleaned = re.sub(r',(\s*[}\]])', r'\1', cleaned)
        
        # Verify it parses
        json.loads(cleaned)
        return cleaned
        
    except Exception as e:
        logger.error(f"❌ JSON Clean Error: {str(e)}")
        logger.error(f"Raw Response: {response}")
        return "{}"
