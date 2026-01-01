from typing import TypedDict, Optional, List, Dict, Any
from langgraph.graph import StateGraph, END

from ai_engine.krutrim_adapter import KrutrimLLM
from ai_utils import get_agent_llm, clean_ai_json
from models import Resume
from tools.search_tool import JobSearchTool
import json
import logging

logger = logging.getLogger("agent.job_scout")

# --- State ---
class JobScoutState(TypedDict):
    # Inputs
    user_query: str 
    resume_id: Optional[str]
    
    # Internal
    resume_text: Optional[str] 
    found_jobs: List[Dict] = []
    
    # Output
    final_response: Optional[str] # The chat response to user
    error: Optional[str]

# --- Nodes ---

async def load_context_node(state: JobScoutState):
    """Load resume text if ID is provided"""
    logger.info("Loading context...")
    if state.get("resume_id"):
        try:
            resume = await Resume.get(state["resume_id"])
            if resume:
                return {"resume_text": resume.content}
        except Exception as e:
            logger.error(f"Failed to load resume: {e}")
            # Continue without resume context, just pure search
    return {"resume_text": ""}

async def search_jobs_node(state: JobScoutState):
    """Call the Search Tool"""
    logger.info(f"Searching for: {state['user_query']}")
    tool = JobSearchTool()
    
    # Use resume text for personalized ranking, or just user query if no resume
    context = state.get("resume_text", "")
    query = state["user_query"]
    
    try:
        results = await tool.arun(query=query, resume_context=context, limit=5)
        return {"found_jobs": results}
    except Exception as e:
        logger.error(f"Search failed: {e}")
        return {"error": str(e), "found_jobs": []}

async def synthesize_response_node(state: JobScoutState):
    """Use AI to explain the matches"""
    logger.info("Synthesizing response...")
    jobs = state.get("found_jobs", [])
    
    if not jobs:
        return {"final_response": "I couldn't find any matching jobs in our database. Try updating your query?"}
    
    # Prepare context for LLM
    job_context = json.dumps(jobs, indent=2)
    prompt = f"""
    You are a Job Scout. The user asked: "{state['user_query']}".
    
    Here are the top job matches found (ranked by relevance):
    {job_context}
    
    Based on these matches and the user's intent, verify which are truly relevant.
    Write a helpful, encouraging response to the user:
    1. Highlight the top 2-3 best matches.
    2. Explain WHY they match (skills, role).
    3. Keep it conversational.
    
    Response:
    """
    
    try:
        llm = get_agent_llm(temperature=0.7)
        response = await llm.ainvoke(prompt)
        return {"final_response": response}
    except Exception as e:
        return {"final_response": "I found some jobs but couldn't generate a summary. Please check the dashboard."}

# --- Graph ---
def build_scout_graph():
    workflow = StateGraph(JobScoutState)
    
    workflow.add_node("load_context", load_context_node)
    workflow.add_node("search", search_jobs_node)
    workflow.add_node("synthesize", synthesize_response_node)
    
    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "search")
    workflow.add_edge("search", "synthesize")
    workflow.add_edge("synthesize", END)
    
    return workflow.compile()

job_scout_graph = build_scout_graph()
