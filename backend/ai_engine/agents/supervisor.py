from typing import TypedDict, Optional, List, Dict, Any, Literal
import json
import logging
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage

from ai_engine.krutrim_adapter import KrutrimLLM
from ai_utils import get_agent_llm, clean_ai_json
from ai_engine.agents.job_scout import job_scout_graph
from ai_engine.mcp_integration import get_mcp_session, get_mcp_tools

logger = logging.getLogger("agent.supervisor")

# --- State ---
class SupervisorState(TypedDict):
    user_query: str
    user_id: str
    active_resume_id: Optional[str]
    
    # Routing decision
    next_agent: Optional[Literal["job_scout", "general_chat", "mcp_services"]]
    
    # Outputs
    final_response: Optional[str]
    
# --- Nodes ---

async def supervisor_node(state: SupervisorState):
    """
    The Brain: Decides which agent should handle the query.
    """
    logger.info(f"Supervisor dispatching: {state['user_query']}")
    
    # Keyword Heuristic for reliability
    query_lower = state['user_query'].lower()
    if any(k in query_lower for k in ["saved", "savrd", "my jobs", "listed jobs", "my applications", "apply for", "apply to", "can you apply"]):
        logger.info("Supervisor: Keyword match for mcp_services")
        return {"next_agent": "mcp_services"}
    
    prompt = f"""You are a routing agent. Analyze the user query and select ONE specialist.

User Query: "{state['user_query']}"

Specialists:
1. "job_scout" - Search for NEW job listings
2. "mcp_services" - Access user's saved jobs, applications, or apply for jobs
3. "general_chat" - Career advice, resume tips, interview prep

CRITICAL: Respond with ONLY valid JSON. No explanations, no markdown, no extra text.

Examples:
- "Find me python jobs" → {{"next_agent": "job_scout"}}
- "Show my saved jobs" → {{"next_agent": "mcp_services"}}
- "Can you apply for them" → {{"next_agent": "mcp_services"}}
- "How to improve resume?" → {{"next_agent": "general_chat"}}

Your response (JSON only):"""
    
    
    try:
        llm = get_agent_llm(temperature=0.1)
        response = await llm.ainvoke(prompt)
        
        # Log the raw response for debugging
        raw_text = response.content if hasattr(response, 'content') else str(response)
        logger.info(f"Supervisor Raw Response: {raw_text}")
        
        cleaned = clean_ai_json(raw_text)
        decision = "general_chat"
        
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict):
                decision = data.get("next_agent", "general_chat")
        except json.JSONDecodeError:
            logger.warning(f"Supervisor JSON parse failed, falling back to regex: {cleaned}")
            # Regex fallback: Look for names in the raw text
            if "mcp_services" in raw_text.lower():
                decision = "mcp_services"
            elif "job_scout" in raw_text.lower():
                decision = "job_scout"
        
        if decision not in ["job_scout", "general_chat", "mcp_services"]:
             decision = "general_chat"
             
        logger.info(f"Supervisor Decision: {decision}")
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

async def call_mcp_services(state: SupervisorState):
    """Invoke the MCP-powered agent for internal services using manual pattern"""
    logger.info("Calling MCP Services...")
    
    try:
        async with get_mcp_session() as session:
            tools = await get_mcp_tools(session)
            if not tools:
                return {"final_response": "I'm having trouble accessing my internal service tools right now."}
                
            llm = get_agent_llm(temperature=0.1)
            
            # Pattern: 1. Decide which tool to call
            tool_desc = "\n".join([f"- {t.name}: {t.description}" for t in tools])
            prompt = f"""You are a tool selector. Analyze the user query and select the appropriate tool.

User ID: {state['user_id']}
User Query: "{state['user_query']}"

Available Tools:
{tool_desc}

CRITICAL: You must respond with ONLY a valid JSON object. No explanations, no markdown, no additional text.

Examples:
- For "show my saved jobs": {{"tool": "list_saved_jobs", "args": {{"user_id": "{state['user_id']}"}}}}
- For "get job 123": {{"tool": "get_application_info", "args": {{"job_id": "123"}}}}
- For unclear queries: {{"tool": "none", "reason": "unclear request"}}

Your response (JSON only):"""
            
            response = await llm.ainvoke(prompt)
            raw_text = response.content if hasattr(response, 'content') else str(response)
            logger.info(f"MCP Tool Selection Response: {raw_text}")
            
            # Try to parse JSON
            try:
                cleaned = clean_ai_json(raw_text)
                data = json.loads(cleaned)
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse LLM response as JSON: {e}. Raw: {raw_text[:200]}")
                # Fallback: Check if query is about listing saved jobs or applying
                query_lower = state['user_query'].lower()
                if any(k in query_lower for k in ["saved", "my jobs", "list", "show"]):
                    logger.info("Fallback: Detected saved jobs query, using list_saved_jobs")
                    data = {"tool": "list_saved_jobs", "args": {"user_id": state['user_id']}}
                elif any(k in query_lower for k in ["apply", "application"]):
                    logger.info("Fallback: Detected application query")
                    data = {"tool": "none", "reason": "To apply for a job, please provide the job ID or specify which job you'd like to apply to."}
                else:
                    return {"final_response": "I'm having trouble understanding your request. Could you please rephrase it?"}
            
            tool_name = data.get("tool")
            if tool_name and tool_name != "none":
                # 2. Execute the tool
                selected_tool = next((t for t in tools if t.name == tool_name), None)
                if selected_tool:
                    args = data.get("args", {})
                    # Ensure user_id is passed if needed
                    if tool_name == "list_saved_jobs" and state.get("user_id"):
                        args["user_id"] = state["user_id"]
                    
                    logger.info(f"Executing tool {tool_name} with args: {args}")
                    try:
                        # arun is often more robust at handling argument types in LangChain
                        tool_result = await selected_tool.arun(args)
                    except Exception as tool_e:
                        logger.error(f"Tool {tool_name} execution failed: {tool_e}")
                        # Last ditch effort: if it's a single arg tool and failed, try passing the first value
                        if isinstance(args, dict) and len(args) == 1:
                            val = list(args.values())[0]
                            tool_result = await selected_tool.arun(val)
                        else:
                            raise tool_e
                    
                    # 3. Synthesize response
                    synth_prompt = f"""You are an Application Assistant. 
The user asked: "{state['user_query']}"
The tool '{tool_name}' returned: {json.dumps(tool_result)}

Provide a helpful and conversational summary to the user."""
                    final_response = await llm.ainvoke(synth_prompt)
                    return {"final_response": final_response}
            
            return {"final_response": data.get("reason", "I can help you with your saved jobs or applications. What would you like to do?")}
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        
        # Capture sub-exceptions if it's an ExceptionGroup (common in TaskGroups/AnyIO)
        sub_errors = ""
        if hasattr(e, "exceptions"):
            for i, sub_e in enumerate(e.exceptions):
                sub_errors += f"\n  Sub-error {i}: {sub_e}"
                
        logger.error(f"MCP Services failed: {e}{sub_errors}\n{error_detail}")
        return {"final_response": "I encountered an error while trying to process your application request."}

# --- Graph ---
def build_supervisor_graph():
    workflow = StateGraph(SupervisorState)
    
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("job_scout", call_job_scout)
    workflow.add_node("general_chat", call_general_chat)
    workflow.add_node("mcp_services", call_mcp_services)
    
    workflow.set_entry_point("supervisor")
    
    # Conditional Edges
    workflow.add_conditional_edges(
        "supervisor",
        lambda x: x["next_agent"],
        {
            "job_scout": "job_scout",
            "general_chat": "general_chat",
            "mcp_services": "mcp_services"
        }
    )
    
    workflow.add_edge("job_scout", END)
    workflow.add_edge("general_chat", END)
    workflow.add_edge("mcp_services", END)
    
    return workflow.compile()

supervisor_graph = build_supervisor_graph()
