import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "ai_engine"))

from ai_engine.agents.supervisor import supervisor_graph
from database import init_db
import logging

# Set up logging for test
logging.basicConfig(level=logging.INFO)

async def test_mcp_flow():
    # Initialize DB (needed for JobMatch queries in MCP server)
    await init_db()
    
    print("\n--- Testing MCP Flow: List Saved Jobs ---")
    # Mock a User ID - replace with a real one if you have data
    # For test, we'll just check if it routes correctly
    user_id = "test_user_678"
    
    query = "Show me my saved jobs"
    
    state = {
        "user_query": query,
        "user_id": user_id,
        "active_resume_id": None,
        "next_agent": None,
        "final_response": None
    }
    
    try:
        result = await supervisor_graph.ainvoke(state)
        print(f"\nQUERY: {query}")
        print(f"NEXT AGENT: {result.get('next_agent')}")
        print(f"RESPONSE: {result.get('final_response')}")
    except Exception as e:
        import traceback
        print(f"Error in test: {e}")
        traceback.print_exc()

    print("\n--- Testing MCP Flow: Apply to Job ---")
    query = "Apply for the Python Developer job"
    state["user_query"] = query
    
    try:
        result = await supervisor_graph.ainvoke(state)
        print(f"\nQUERY: {query}")
        print(f"NEXT AGENT: {result.get('next_agent')}")
        print(f"RESPONSE: {result.get('final_response')}")
    except Exception as e:
        print(f"Error in test: {e}")

if __name__ == "__main__":
    asyncio.run(test_mcp_flow())
