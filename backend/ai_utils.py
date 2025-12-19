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

load_dotenv()

KRUTRIM_API_KEY = os.getenv("KRUTRIM_API_KEY")
KRUTRIM_API_URL = os.getenv("KRUTRIM_API_URL", "https://cloud.olakrutrim.com/v1/chat/completions")

async def call_krutrim_api(messages: list, temperature: float = 0.7, max_tokens: int = 1000, operation: str = "general") -> str:
    """Helper to call Krutrim API with consistent error handling and metrics"""
    if not KRUTRIM_API_KEY:
        print("⚠️ KRUTRIM_API_KEY not found in environment")
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
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(KRUTRIM_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            
            duration = time.time() - start_time
            krutrim_api_calls.labels(operation=operation, status='success').inc()
            krutrim_api_duration.labels(operation=operation).observe(duration)
            
            result = response.json()
            return result['choices'][0]['message']['content']
            
    except Exception as e:
        krutrim_api_calls.labels(operation=operation, status='error').inc()
        krutrim_api_errors.labels(operation=operation, error_type=type(e).__name__).inc()
        print(f"❌ Krutrim API Error ({operation}): {e}")
        return ""

def clean_ai_json(response: str) -> str:
    """Aggressively clean AI response to extract valid JSON"""
    response = response.strip()
    
    # Clean markdown wrappers
    if "```json" in response:
        response = response.split("```json")[1].split("```")[0].strip()
    elif "```" in response:
        response = response.split("```")[1].split("```")[0].strip()
        
    # Extract the first matching [...] or {...}
    array_match = re.search(r'\[.*\]', response, re.DOTALL)
    object_match = re.search(r'\{.*\}', response, re.DOTALL)
    
    if array_match and (not object_match or array_match.start() < object_match.start()):
        response = array_match.group(0)
    elif object_match:
        response = object_match.group(0)
        
    # Remove trailing commas before closing brackets
    response = re.sub(r',\s*\]', ']', response)
    response = re.sub(r',\s*\}', '}', response)
    
    return response
