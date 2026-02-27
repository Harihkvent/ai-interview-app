
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import init_db
from models import InterviewSession
from avatar_interview_models import AvatarInterviewSession
from dotenv import load_dotenv

async def diagnose():
    # Load env from backend if possible
    env_path = os.path.join(os.getcwd(), 'backend', '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)
        print(f"Loaded env from {env_path}")
    else:
        load_dotenv()
        print("Loaded env from default path")

    mongodb_url = os.getenv('MONGODB_URL')
    print(f"Using MONGODB_URL: {mongodb_url}")
    
    try:
        await init_db()
        
        print("\n--- Interview Sessions (completed) ---")
        sessions = await InterviewSession.find(InterviewSession.status == "completed").to_list()
        if not sessions:
            print("No completed regular sessions found.")
        for s in sessions:
            print(f"ID: {s.id}, Score: {s.total_score}, CompletedAt: {s.completed_at}")
            
        print("\n--- Avatar Interview Sessions (completed) ---")
        avatars = await AvatarInterviewSession.find(AvatarInterviewSession.status == "completed").to_list()
        if not avatars:
            print("No completed avatar sessions found.")
        for a in avatars:
            print(f"ID: {a.id}, Score: {a.total_score}, Questions: {a.questions_answered}, CompletedAt: {a.completed_at}")
            
    except Exception as e:
        print(f"Error during diagnosis: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(diagnose())
