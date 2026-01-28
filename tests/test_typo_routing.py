import asyncio
import os
import sys
import json
import logging

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from ai_engine.agents.supervisor import supervisor_graph
from database import init_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_routing")

async def test_savrd_jobs():
    # Initialize DB (needed for models if any)
    await init_db()
    
    print("\n--- Testing Supervisor Routing with Typo: 'does i have any savrd jobs' ---")
    user_id = "694eb9e0ddad8ce0cd0d9de5" # The ID from the user's logs
    
    state = {
        "user_query": "does i have any savrd jobs",
        "user_id": user_id,
        "active_resume_id": None,
        "next_agent": None,
        "final_response": None
    }
    
    try:
        result = await supervisor_graph.ainvoke(state)
        print(f"\nQUERY: {state['user_query']}")
        print(f"DECISION (next_agent): {result.get('next_agent')}")
        print(f"RESPONSE: {result.get('final_response')}")
        
        if result.get("next_agent") == "mcp_services":
            print("\n✅ SUCCESS: Correctly routed to MCP Services despite typo!")
        else:
            print("\n❌ FAILURE: Routed to", result.get("next_agent"))
            
    except Exception as e:
        import traceback
        print(f"\n❌ ERROR: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_savrd_jobs())
