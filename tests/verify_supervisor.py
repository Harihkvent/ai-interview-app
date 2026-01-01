import asyncio
import os
import sys
from unittest.mock import MagicMock, patch

# Add project root and backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

# MOCK the slow Job Scout Graph completely before importing supervisor
# This prevents 'ml_job_matcher' from initializing BERT models
from unittest.mock import AsyncMock
sys.modules['backend.ai_engine.agents.job_scout'] = MagicMock()
mock_scout_graph = MagicMock()
mock_scout_graph.ainvoke = AsyncMock(return_value={"final_response": "Mocked Scout: I found 5 jobs for you."})
sys.modules['backend.ai_engine.agents.job_scout'].job_scout_graph = mock_scout_graph

# Now import supervisor
from ai_engine.agents.supervisor import supervisor_graph

async def verify_supervisor():
    print("\n[INFO] Verifying Supervisor Agent...")
    
    # Setup Mock Scout Response
    mock_scout_graph.ainvoke.return_value = {"final_response": "Mocked Scout: I found 5 jobs for you."}
    
    # Test Case 1: Job Search Intent
    print("\n   1. Testing Job Search Intent...")
    query_jobs = "Find me a react developer job"
    
    result_jobs = await supervisor_graph.ainvoke({
        "user_query": query_jobs,
        "user_id": "test_sup",
        "active_resume_id": "123"
    })
    
    print(f"      Q: '{query_jobs}'")
    # Check if it routed to job_scout (which is mocked to return specific string)
    # The supervisor graph calls 'job_scout' node, which calls the mock.
    response_jobs = result_jobs.get("final_response")
    print(f"      A: {response_jobs}")
    
    if "Mocked Scout" in str(response_jobs):
        print("      [PASS] Routed to Job Scout correctly")
    else:
        print("      [FAIL] Did not route to Job Scout")

    # Test Case 2: General Chat Intent
    print("\n   2. Testing General Chat Intent...")
    query_chat = "How do I prepare for a behaviour interview?"
    
    result_chat = await supervisor_graph.ainvoke({
        "user_query": query_chat,
        "user_id": "test_sup",
        "active_resume_id": "123"
    })
    
    print(f"      Q: '{query_chat}'")
    response_chat = result_chat.get("final_response")
    print(f"      A: {response_chat[:100]}...")
    
    if len(response_chat) > 10 and "Mocked Scout" not in response_chat:
        print("      [PASS] Routed to General Chat correctly")
    else:
        print("      [FAIL] Bad routing for general chat")

if __name__ == "__main__":
    asyncio.run(verify_supervisor())
