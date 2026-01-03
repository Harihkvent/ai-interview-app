import asyncio
import os
import sys
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from ai_engine.agents.supervisor import supervisor_graph
from database import init_db
import logging

# Set up logging for test
logging.basicConfig(level=logging.INFO)

async def debug_agent():
    # Initialize DB
    await init_db()
    
    print("\n--- Debugging Agent: 'does i have any savrd jobs' ---")
    user_id = "some_test_id" # Use a valid ID if testing against real data
    
    query = "does i have any savrd jobs"
    
    state = {
        "user_query": query,
        "user_id": user_id,
        "active_resume_id": None,
        "next_agent": None,
        "final_response": None
    }
    
    try:
        # We use ainvoke here just like the route does
        result = await supervisor_graph.ainvoke(state)
        print(f"\nQUERY: {query}")
        print(f"NEXT AGENT: {result.get('next_agent')}")
        print(f"RESPONSE: {result.get('final_response')}")
    except Exception as e:
        import traceback
        print(f"\n❌ ERROR CAUGHT: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_agent())
