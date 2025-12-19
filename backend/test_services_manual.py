import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import init_db
from interview_service import create_new_session, activate_round, process_answer
from question_service import generate_questions
from auth_models import User

async def test_services():
    print("Starting Service Verification...")
    
    # Initialize DB
    await init_db()
    print("DB Initialized")
    
    # Mock User
    user = User(
        email="test_verifier@example.com",
        full_name="Test Verifier",
        hashed_password="hashed_secret"
    )
    # Don't save if exists, or just use a fake ID
    user.id = "600000000000000000000001" 
    
    print("\n1. Testing Session Creation...")
    session = await create_new_session(str(user.id))
    print(f"Session Created: {session.id}")
    
    # Mock Resume Content
    resume_text = "Experienced Python Developer with 5 years in FastAPI, React, and Machine Learning."
    
    print("\n2. Testing Round Activation (Aptitude)...")
    # This triggers Question Generation
    round_data = await activate_round(str(session.id), "aptitude", resume_text)
    print(f"Aptitude Round Activated: {round_data['round_id']}")
    print(f"   Questions Generated: {len(round_data['questions'])}")
    if round_data['questions']:
        print(f"   Sample Question: {round_data['questions'][0].question_text}")
    
    print("\n3. Testing Answer Submission (MCQ)...")
    if round_data['questions']:
        q = round_data['questions'][0]
        # Should be MCQ
        ans = q.options[0] if q.options else "Option A"
        result = await process_answer(str(q.id), ans, 15)
        print(f"Answer Submitted. Evaluation: {result['evaluation']['evaluation']}")
        print(f"   Score: {result['evaluation']['score']}")
        
    print("\n4. Testing Round Switch (Technical)...")
    tech_round = await activate_round(str(session.id), "technical", resume_text)
    print(f"Technical Round Activated. Questions: {len(tech_round['questions'])}")
    # Verify mix of MCQ and Descriptive
    mcqs = [q for q in tech_round['questions'] if q.question_type == 'mcq']
    descs = [q for q in tech_round['questions'] if q.question_type == 'descriptive']
    print(f"   MCQ Count: {len(mcqs)}")
    print(f"   Descriptive Count: {len(descs)}")
    
    if len(mcqs) > 0 and len(descs) > 0:
        print("SUCCESS: Technical round has mixed question types!")
    else:
        print("WARNING: Technical round might be missing types.")

    print("\nVerification Complete!")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_services())
