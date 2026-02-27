import asyncio
import os
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, Document
from typing import List, Optional

# Add backend to path
sys.path.insert(0, os.path.abspath("backend"))

from models import QuestionBank, InterviewSession, InterviewRound, Question, Resume, Answer, Message, JobMatch, CareerRoadmap, QuestionCache
from question_service import generate_questions
from session_service import get_previous_questions

async def setup_db():
    MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(MONGO_URL)
    await init_beanie(database=client["ai_interview_db"], document_models=[
        InterviewSession, Resume, InterviewRound, Question, Answer, Message, JobMatch, CareerRoadmap, QuestionBank, QuestionCache
    ])
    return client

async def test_variety():
    print("Setting up test...")
    await setup_db()
    
    test_user_id = "test_user_variety_123"
    job_title = "Software Engineer"
    resume_text = "Python developer with experience in AI."
    
    # 1. Ensure we have plenty of questions in DB
    count = await QuestionBank.find(QuestionBank.category == "aptitude").count()
    print(f"Current aptitude questions in DB: {count}")
    
    # 2. Start First Session
    print("\n--- Session 1 ---")
    s1 = InterviewSession(user_id=test_user_id, job_title=job_title)
    await s1.insert()
    
    # Create aptitude round
    r1 = InterviewRound(session_id=str(s1.id), round_type="aptitude", status="active")
    await r1.insert()
    
    # Fetch previous questions (should be empty)
    prev_qs = await get_previous_questions(test_user_id, "aptitude")
    print(f"Previous questions count: {len(prev_qs)}")
    
    # Generate questions for Session 1
    # We'll request 5 questions to leave room for variety from the 50+ in CSV
    gen_qs1 = await generate_questions(resume_text, "aptitude", job_title, exclude_questions=prev_qs)
    print(f"Generated {len(gen_qs1)} questions for Session 1")
    
    # Save these questions to DB so they are counted as "previously asked"
    for i, q in enumerate(gen_qs1, 1):
        await Question(round_id=str(r1.id), question_text=q["question"], question_number=i).insert()
        
    q_texts1 = [q["question"] for q in gen_qs1]
    
    # 3. Start Second Session
    print("\n--- Session 2 ---")
    s2 = InterviewSession(user_id=test_user_id, job_title=job_title)
    await s2.insert()
    
    # Create aptitude round
    r2 = InterviewRound(session_id=str(s2.id), round_type="aptitude", status="active")
    await r2.insert()
    
    # Fetch previous questions (should have 5 from session 1)
    prev_qs2 = await get_previous_questions(test_user_id, "aptitude")
    print(f"Previous questions count: {len(prev_qs2)}")
    if len(prev_qs2) != 5:
        print(f"Error: Expected 5 previous questions, got {len(prev_qs2)}")
        
    # Generate questions for Session 2
    gen_qs2 = await generate_questions(resume_text, "aptitude", job_title, exclude_questions=prev_qs2)
    print(f"Generated {len(gen_qs2)} questions for Session 2")
    
    q_texts2 = [q["question"] for q in gen_qs2]
    
    # 4. Verify No Overlap
    overlap = set(q_texts1).intersection(set(q_texts2))
    print(f"\nOverlap count: {len(overlap)}")
    if len(overlap) > 0:
        print("FAIL: Found overlapping questions!")
        for q in overlap:
            print(f"- {q}")
    else:
        print("SUCCESS: No overlapping questions found.")

    # 5. Cleanup test data
    print("\nCleaning up...")
    await Question.find(Question.round_id.in_([str(r1.id), str(r2.id)])).delete()
    await InterviewRound.find(InterviewRound.id.in_([r1.id, r2.id])).delete()
    await InterviewSession.find(InterviewSession.id.in_([s1.id, s2.id])).delete()
    print("Cleanup done.")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv("backend/.env")
    asyncio.run(test_variety())
