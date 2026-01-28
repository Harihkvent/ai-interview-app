import asyncio
import os
import sys
import logging
from contextlib import asynccontextmanager

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from ai_engine.mcp_integration import get_mcp_session
from database import init_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_mcp_lifecycle")

async def test_mcp_delay():
    # Initialize DB
    await init_db()
    
    print("\n--- Testing MCP Session with Delay ---")
    
    try:
        async with get_mcp_session() as session:
            print("  Inside session...")
            if session:
                print("  Session initialized. Waiting 10s to simulate LLM call...")
                await asyncio.sleep(10)
                print("  Wait finished. Still alive?")
                
                from langchain_mcp_adapters.tools import load_mcp_tools
                tools = await load_mcp_tools(session)
                print(f"  Loaded {len(tools)} tools after delay.")
                
                if tools:
                    print(f"  Executing tool: {tools[0].name}")
                    res = await tools[0].arun({"user_id": "test_user"})
                    print(f"  Tool result: {res}")
            else:
                print("  No session established.")
    except Exception as e:
        import traceback
        print(f"❌ ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_mcp_delay())
