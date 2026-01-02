from typing import TypedDict, Optional, List, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.base import BaseCheckpointSaver

from ai_engine.krutrim_adapter import KrutrimLLM
from ai_utils import get_agent_llm, clean_ai_json
from models import Resume
import json
import logging
from datetime import datetime

logger = logging.getLogger("agent.resume_manager")

# --- State Definition ---
class ResumeState(TypedDict):
    resume_id: str
    resume_text: str
    parsed_data: Optional[Dict] = None
    analysis: Optional[Dict] = None
    error: Optional[str] = None

# --- Agent Utils ---
def get_parse_prompt(text: str) -> str:
    return f"""
    You are an expert Resume Parser. Extract the following information from the resume text below into a valid JSON object.
    Ensure keys exactly match: 
    - candidate_name (string)
    - candidate_email (string)
    - skills (list of strings)
    - experience_years (float, estimate if needed)
    - current_role (string)
    - education (list of objects with: degree, school, year)

    IMPORTANT: Return ONLY the JSON object. Do not add markdown formatting. Do not use newlines inside string values.

    Resume Text:
    {text[:4000]} 
    """ # Truncate to avoid context limit if necessary

def get_analysis_prompt(text: str) -> str:
    return f"""
    You are a Career Coach. Analyze the resume text below.
    Generate a STRICT VALID JSON object with two keys:
    1. "summary": A 2-sentence professional bio. (Do not use newlines in the string)
    2. "improvements": A list of 3 actionable tips.

    Example Output:
    {{
        "summary": "Experienced engineer with strong background in system design.",
        "improvements": ["Add more quantifiable metrics", "Fix typos", "Highlight leadership experience"]
    }}

    IMPORTANT: Return ONLY the JSON object. Do not add markdown formatting or explanations.

    Analyze this text:
    {text[:4000]}
    """

# --- Nodes ---

async def parse_resume_node(state: ResumeState):
    """Node 1: Parse raw text into structured JSON"""
    logger.info(f"Parsing resume {state['resume_id']}...")
    try:
        llm = get_agent_llm(temperature=0.1) # Low temp for extraction
        response = await llm.ainvoke(get_parse_prompt(state["resume_text"]))
        
        cleaned_json = clean_ai_json(response)
        data = json.loads(cleaned_json)
        
        return {"parsed_data": data}
    except Exception as e:
        logger.error(f"Parsing failed: {e}")
        return {"error": f"Parsing failed: {str(e)}"}

async def analyze_resume_node(state: ResumeState):
    """Node 2: Generate summary and improvements"""
    logger.info(f"Analyzing resume {state['resume_id']}...")
    try:
        llm = get_agent_llm(temperature=0.7) # Higher temp for creative writing
        response = await llm.ainvoke(get_analysis_prompt(state["resume_text"]))
        
        cleaned_json = clean_ai_json(response)
        data = json.loads(cleaned_json)
        
        return {"analysis": data}
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        return {"error": f"Analysis failed: {str(e)}"}

async def save_to_db_node(state: ResumeState):
    """Node 3: Persist results to MongoDB"""
    logger.info(f"Saving resume {state['resume_id']} to DB...")
    try:
        resume = await Resume.get(state["resume_id"])
        if not resume:
            raise ValueError("Resume not found in DB")
            
        # Update Fields
        if state.get("parsed_data"):
            data = state["parsed_data"]
            if isinstance(data, dict):
                resume.candidate_name = data.get("candidate_name")
                resume.candidate_email = data.get("candidate_email")
                resume.parsed_skills = data.get("skills", [])
            else:
                 logger.warning(f"Parsed data is not a dict: {type(data)}")
            
        if state.get("analysis"):
            analysis = state["analysis"]
            if isinstance(analysis, dict):
                resume.summary = analysis.get("summary")
                resume.improvements = analysis.get("improvements", [])
            elif isinstance(analysis, list):
                # Fallback if AI just returned list of improvements
                resume.improvements = [str(i) for i in analysis]
            
        await resume.save()
        logger.info(f"Resume {state['resume_id']} updated successfully.")
        return {} # No state update needed
    except Exception as e:
        logger.error(f"DB Save failed: {e}")
        return {"error": f"DB Save failed: {str(e)}"}

# --- Graph Construction ---
def build_resume_graph():
    workflow = StateGraph(ResumeState)
    
    workflow.add_node("parser", parse_resume_node)
    workflow.add_node("analyzer", analyze_resume_node)
    workflow.add_node("saver", save_to_db_node)
    
    workflow.set_entry_point("parser")
    workflow.add_edge("parser", "analyzer")
    workflow.add_edge("analyzer", "saver")
    workflow.add_edge("saver", END)
    
    return workflow.compile()

resume_graph = build_resume_graph()
