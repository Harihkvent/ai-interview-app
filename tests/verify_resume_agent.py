import asyncio
import os
import sys

# Add project root and backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

from database import init_db
from models import Resume
from ai_engine.agents.resume_manager import resume_graph

async def verify_resume_manager():
    print("\n[INFO] Verifying Resume Manager Agent...")
    try:
        print("   [DEBUG] Initializing DB...")
        await init_db()
        print("   [DEBUG] DB Initialized.")
        
        # 1. Create Mock Resume
        print("   [DEBUG] Creating Resume Object...")
        resume = Resume(
            user_id="test_user_agent",
            filename="agent_test.pdf",
            content="""
            EXPERIENCE
            Senior Software Engineer | Tech Corp | 2020-Present
            - Led migration to Microservices.
            - Used Python, FastAPI, React.
            
            EDUCATION
            B.Tech Computer Science | IIT Bombay | 2016-2020
            """
        )
        print(f"   [DEBUG] Resume object created: {resume.filename}")
        await resume.insert()
        print(f"   Mock Resume inserted: {resume.id}")
        
        # 2. Invoke Agent
        print("   Invoking Agent (this calls Krutrim)...")
        await resume_graph.ainvoke({
            "resume_id": str(resume.id),
            "resume_text": resume.content
        })
        print("   [DEBUG] Agent Invocation Complete.")
        
        # 3. Verify Updates
        updated_resume = await Resume.get(resume.id)
        
        print("\n   --- Results ---")
        print(f"   Candidate Name: {updated_resume.candidate_name}")
        print(f"   Skills Extracted: {updated_resume.parsed_skills}")
        print(f"   Summary: {updated_resume.summary}")
        print(f"   Improvements: {updated_resume.improvements}")
        
        if updated_resume.summary and len(updated_resume.parsed_skills) > 0:
            print("\n   [PASS] Agent Verification PASSED")
        else:
            print("\n   [WARN] Agent Verification INCOMPLETE (Missing fields)")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\n   [FAIL] Verification Failed: {repr(e)}")

if __name__ == "__main__":
    asyncio.run(verify_resume_manager())
