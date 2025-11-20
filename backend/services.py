import os
import httpx
from dotenv import load_dotenv

load_dotenv()

KRUTRIM_API_KEY = os.getenv("KRUTRIM_API_KEY")
KRUTRIM_API_URL = os.getenv("KRUTRIM_API_URL", "https://cloud.olakrutrim.com/v1/chat/completions")

SYSTEM_PROMPT = """You are an AI interviewer conducting a professional job interview. 
Your role is to:
1. Ask relevant technical and behavioral questions
2. Follow up on candidate responses
3. Provide constructive feedback
4. Maintain a professional yet friendly tone
5. Adapt questions based on the candidate's experience level

Start by greeting the candidate and asking them to introduce themselves."""

async def generate_ai_response(messages: list) -> str:
    """
    Generate AI response using Krutrim API
    messages: list of dicts with 'role' and 'content'
    """
    try:
        # Prepare messages with system prompt
        api_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                KRUTRIM_API_URL,
                headers={
                    "Authorization": f"Bearer {KRUTRIM_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "Krutrim-spectre-v2",
                    "messages": api_messages,
                    "temperature": 0.7,
                    "max_tokens": 500
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Error calling Krutrim API: {e}")
        return "I apologize, but I'm having trouble processing your response. Could you please try again?"
