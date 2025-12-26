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
            try:
                # Safely log snippet
                logger.error(f"Raw Response snippet: {e.response.text[:500]}")
            except:
                pass
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
        
        # Clean markdown wrappers (standard)
        if "```json" in cleaned:
            # Handle potential multiple blocks or weird formatting
            parts = cleaned.split("```json")
            if len(parts) > 1:
                cleaned = parts[1].split("```")[0].strip()
        elif "```" in cleaned:
             parts = cleaned.split("```")
             if len(parts) > 1:
                 cleaned = parts[1].strip()
            
        # Aggressive extraction: find first [ or { and last ] or }
        first_brace = cleaned.find('{')
        first_bracket = cleaned.find('[')
        
        start_idx = -1
        end_idx = -1
        is_array = False
        
        # Determine if we are looking for an object or array based on what comes first
        if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
            start_idx = first_brace
            # Find matching closing brace by counting stack
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
            start_idx = first_bracket
            is_array = True
            # Find matching closing bracket
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
        elif start_idx != -1:
            # If we found a start but no valid end with stack counting, 
            # try naively the last matching character
            last_char = ']' if is_array else '}'
            last_idx = cleaned.rfind(last_char)
            if last_idx > start_idx:
                cleaned = cleaned[start_idx:last_idx+1]
            
        # Remove trailing commas which are common syntax errors in LLM JSON
        cleaned = re.sub(r',(\s*[}\]])', r'\1', cleaned)
        
        # Verify it parses
        json.loads(cleaned)
        return cleaned
        
    except Exception as e:
        logger.error(f"❌ JSON Clean Error: {str(e)}")
        try:
             logger.error(f"Raw Response snippet: {response[:500]}")
        except:
             pass
        
        # Last Resort: Try to parse numbered list format using Regex
        # Matches: "1. Question... \n - Opt1..."
        try:
            logger.info("Attempting regex fallback for numbered list...")
            questions = []
            
            # Split by numbered items like "1. ", "2. "
            # We look for \d+\. at start of line
            import re
            items = re.split(r'\n\d+\.\s+', '\n' + response.strip())
            
            # First item is usually empty or intro text
            for item in items[1:]:
                # Extract question (first line)
                lines = item.strip().split('\n')
                if not lines: continue
                
                q_text = lines[0].strip()
                
                # Extract options (lines starting with - or a letter)
                options = []
                for line in lines[1:]:
                    line = line.strip()
                    if line.startswith('- ') or line.startswith('* '):
                        options.append(line[2:].strip())
                    elif re.match(r'^[A-D]\)', line):
                         options.append(line.split(')', 1)[1].strip())
                         
                # If we found options, it's MCQ, else Descriptive (maybe)
                if options:
                    questions.append({
                        "question": q_text,
                        "options": options,
                        "type": "mcq",
                        "answer": options[0] if options else "" # We can't easily parse the answer from text without more regex
                    })
                else:
                    questions.append({
                        "question": q_text,
                        "type": "descriptive"
                    })
            
            if questions:
                return json.dumps(questions)
        except Exception as regex_err:
             logger.error(f"Regex Fallback Failed: {regex_err}")

        return "{}"
