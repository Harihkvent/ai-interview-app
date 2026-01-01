from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

from ai_engine.agents.supervisor import supervisor_graph
from auth_models import User
from models import Resume
from auth_routes import get_current_user

router = APIRouter()
logger = logging.getLogger("agent_routes")

class AgentChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    resume_id: Optional[str] = None

class AgentChatResponse(BaseModel):
    response: str
    agent_used: Optional[str] = "supervisor"

@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_agent(
    request: AgentChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Chat with the AI Supervisor (The Hive).
    The Supervisor routes the query to the appropriate specialist (Job Scout, etc.)
    """
    try:
        user_id = str(current_user.id)
        
        # Determine active resume
        active_resume_id = request.resume_id
        if not active_resume_id and current_user.active_resume_id:
            active_resume_id = current_user.active_resume_id
            
        logger.info(f"Agent Chat - User: {user_id}, Query: {request.message}")
        
        # Invoke the Graph
        # Note: 'user_id' in state is for logic, not auth (auth is handled by Depends)
        result = await supervisor_graph.ainvoke({
            "user_query": request.message,
            "user_id": user_id,
            "active_resume_id": active_resume_id
        })
        
        final_response = result.get("final_response", "I'm thinking, but got no response.")
        
        # Determine which agent was likely used based on the node execution path 
        # (This is tricky in compiled graph output, sticking to supervisor for now or inspecting state)
        next_agent = result.get("next_agent", "supervisor")
        
        return AgentChatResponse(
            response=final_response,
            agent_used=next_agent
        )
        
    except Exception as e:
        logger.error(f"Agent Request Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
