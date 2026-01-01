from typing import TypedDict, Optional, List, Dict, Any, Literal
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage

from ai_engine.krutrim_adapter import KrutrimLLM
from ai_utils import get_agent_llm, clean_ai_json
from ai_engine.agents.job_scout import job_scout_graph
# from ai_engine.agents.resume_manager import resume_graph # Resume is usually triggered by upload, not chat yet.

import json
import logging

logger = logging.getLogger("agent.supervisor")

# --- State ---
class SupervisorState(TypedDict):
    user_query: str
    user_id: str
    active_resume_id: Optional[str]
    
    # Routing decision
    next_agent: Optional[Literal["job_scout", "general_chat"]]
    
    # Outputs
    final_response: Optional[str]
    
# --- Nodes ---

async def supervisor_node(state: SupervisorState):
    """
    The Brain: Decides which agent should handle the query.
    """
    logger.info(f"Supervisor dispatching: {state['user_query']}")
    
    prompt = f"""
    You are the Supervisor of an AI Career Platform.
    Your goal is to route the user's request to the correct specialist.
    
    Specialists:
    1. "job_scout": STRICTLY for finding open job listings, searching for roles (e.g. "Find me X jobs", "Show python roles").
    2. "general_chat": For interview preparation, resume tips, career advice, motivation, or general questions.
    
    User Request: "{state['user_query']}"
    
    Return ONLY a JSON object: {{ "next_agent": "job_scout" }} or {{ "next_agent": "general_chat" }}
    """
    
    try:
        llm = get_agent_llm(temperature=0.1)
        response = await llm.ainvoke(prompt)
        cleaned = clean_ai_json(response)
        data = json.loads(cleaned)
        
        decision = "general_chat"
        if isinstance(data, dict):
            decision = data.get("next_agent", "general_chat")
        
        if decision not in ["job_scout", "general_chat"]:
             decision = "general_chat"
             
        return {"next_agent": decision}
        
    except Exception as e:
        logger.error(f"Supervisor failed: {e}")
        return {"next_agent": "general_chat"} # Fallback

async def call_job_scout(state: SupervisorState):
    """Invoke Job Scout Sub-Graph"""
    logger.info("Calling Job Scout...")
    result = await job_scout_graph.ainvoke({
        "user_query": state["user_query"],
        "resume_id": state.get("active_resume_id")
    })
    return {"final_response": result.get("final_response")}

async def call_general_chat(state: SupervisorState):
    """Simple direct LLM chat"""
    logger.info("Calling General Chat...")
    prompt = f"""
    You are a helpful AI Career Assistant. Answer the user's question.
    User: {state['user_query']}
    """
    llm = get_agent_llm(temperature=0.7)
    response = await llm.ainvoke(prompt)
    return {"final_response": response}

# --- Graph ---
def build_supervisor_graph():
    workflow = StateGraph(SupervisorState)
    
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("job_scout", call_job_scout)
    workflow.add_node("general_chat", call_general_chat)
    
    workflow.set_entry_point("supervisor")
    
    # Conditional Edges
    workflow.add_conditional_edges(
        "supervisor",
        lambda x: x["next_agent"],
        {
            "job_scout": "job_scout",
            "general_chat": "general_chat"
        }
    )
    
    workflow.add_edge("job_scout", END)
    workflow.add_edge("general_chat", END)
    
    return workflow.compile()

supervisor_graph = build_supervisor_graph()
