
import asyncio
import os
import sys

# Ensure backend directory is in path so we can import modules directly
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
print(f"Loading .env from: {env_path}")
load_dotenv(env_path)
print(f"MONGODB_URL from env: {os.getenv('MONGODB_URL')}")
print(f"All env keys: {[k for k in os.environ.keys() if 'MONGO' in k or 'DB' in k]}")


# Mocking call_krutrim_api to simulate failure
import question_service as qs
from unittest.mock import MagicMock

# Original function to restore later if needed
original_call = qs.call_krutrim_api

async def mock_fail_api(*args, **kwargs):
    print("Mock API called - simulating failure")
    return None # Return None to trigger empty response error

async def test_fallback():
    # Setup database
    from motor.motor_asyncio import AsyncIOMotorClient
    from beanie import init_beanie
    from models import QuestionBank
    
    conn_str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    if not conn_str:
        print("Error: MONGODB_URL not found and no default set")
        return

    client = AsyncIOMotorClient(conn_str)
    await init_beanie(database=client.ai_interview_db, document_models=[QuestionBank])
    
    # Inject Mock
    qs.call_krutrim_api = mock_fail_api
    
    print("\n--- Testing Technical MCQ Fallback ---")
    mq_questions = await qs.generate_questions("dummy resume", "technical")
    print(f"Received {len(mq_questions)} questions")
    for q in mq_questions:
        print(f"[{q['type']}] {q['question']}")
        
    # Check if we got fallbacks (look for known text or generic nature if DB empty, 
    # but we expect DB questions now)
    
    print("\n--- Testing HR Descriptive Fallback ---")
    hr_questions = await qs.generate_questions("dummy resume", "hr")
    for q in hr_questions:
        print(f"[{q['type']}] {q['question']}")

if __name__ == "__main__":
    asyncio.run(test_fallback())
