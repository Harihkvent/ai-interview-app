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
from ai_engine.agents.job_scout import job_scout_graph

async def verify_job_scout():
    print("\n[INFO] Verifying Job Scout Agent...")
    try:
        await init_db()
        
        # 1. Use the resume we created in previous verification (simulated reuse)
        # Or create a new one for search context
        resume = Resume(
            user_id="scout_user",
            filename="scout_test.pdf",
            content="Senior Python Developer with 5 years experience in Django and React.",
            is_primary=True
        )
        await resume.insert()
        print(f"   Context Resume ID: {resume.id}")
        
        # 2. Invoke Job Scout
        query = "Find me a python backend job"
        print(f"   Invoking Agent with query: '{query}'")
        
        result = await job_scout_graph.ainvoke({
            "user_query": query,
            "resume_id": str(resume.id)
        })
        
        # 3. Verify
        print("\n   --- Results ---")
        found_jobs = result.get("found_jobs", [])
        response = result.get("final_response", "")
        
        print(f"   Jobs Found: {len(found_jobs)}")
        if found_jobs:
            print(f"   Top Fit: {found_jobs[0]['title']} ({found_jobs[0]['match_score']}%)")
            
        print(f"\n   AI Response:\n   {response[:300]}...") # Print first 300 chars
        
        if len(found_jobs) > 0 and len(response) > 50:
            print("\n   [PASS] Scout Verification PASSED")
        else:
            print("\n   [WARN] Scout Verification INCOMPLETE (No jobs or no response)")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\n   [FAIL] Verification Failed: {repr(e)}")

if __name__ == "__main__":
    asyncio.run(verify_job_scout())
