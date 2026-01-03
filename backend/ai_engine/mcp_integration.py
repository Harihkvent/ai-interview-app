import os
import sys
from langchain_mcp_adapters.tools import load_mcp_tools
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import logging

logger = logging.getLogger("mcp_integration")

from contextlib import asynccontextmanager

@asynccontextmanager
async def get_mcp_session():
    """
    Context manager that connects to the local MCP server and yields a session.
    """
    # Fix: mcp_server.py is in backend/, which is parent of ai_engine/
    server_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mcp_server.py")
    
    server_params = StdioServerParameters(
        command=sys.executable,
        args=[server_path],
        env=os.environ.copy()
    )
    
    logger.info(f"Connecting to MCP server at {server_path}...")
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session

async def get_mcp_tools(session):
    """
    Converts MCP tools from a session to LangChain-compatible tools.
    """
    if not session:
        return []
    try:
        tools = await load_mcp_tools(session)
        logger.info(f"Successfully loaded {len(tools)} tools from MCP session.")
        return tools
    except Exception as e:
        logger.error(f"Failed to load MCP tools: {e}")
        return []
