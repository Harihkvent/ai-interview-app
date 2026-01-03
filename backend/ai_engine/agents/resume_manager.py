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
    return f"""You are an expert Career Coach. Analyze this resume and provide personalized feedback.

CRITICAL INSTRUCTIONS:
1. Read the resume carefully and identify the candidate's ACTUAL skills, experience, and achievements
2. Write a professional summary that mentions their SPECIFIC expertise (e.g., "Java developer", "AI engineer", "DevOps specialist")
3. Provide 3 SPECIFIC improvement suggestions based on what's MISSING or WEAK in THIS resume

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{{
    "summary": "Write 2-3 sentences about this candidate's expertise and experience",
    "improvements": ["First specific tip", "Second specific tip", "Third specific tip"]
}}

RULES:
- NO placeholders like "[Your text here]" - write actual content
- NO markdown formatting or code blocks
- NO explanations outside the JSON
- Ensure valid JSON syntax (check commas!)
- Base everything on the ACTUAL resume content below

Resume Content:
{text[:4000]}

Generate the JSON now:"""

# --- Nodes ---

async def parse_resume_node(state: ResumeState):
    """Node 1: Parse raw text into structured JSON"""
    logger.info(f"Parsing resume {state['resume_id']}...")
    try:
        llm = get_agent_llm(temperature=0.1) # Low temp for extraction
        response = await llm.ainvoke(get_parse_prompt(state["resume_text"]))
        
        # Extract content properly
        raw_text = response.content if hasattr(response, 'content') else str(response)
        logger.debug(f"Parse raw response (first 200 chars): {raw_text[:200]}")
        
        cleaned_json = clean_ai_json(raw_text)
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
        
        # Extract content and log for debugging
        raw_text = response.content if hasattr(response, 'content') else str(response)
        logger.info(f"Analysis raw response (first 500 chars): {raw_text[:500]}")
        
        try:
            cleaned_json = clean_ai_json(raw_text)
            data = json.loads(cleaned_json)
            
            # Validate that we got personalized content
            if isinstance(data, dict):
                summary = data.get("summary", "")
                # Check for placeholder text
                if "[Your personalized summary here]" in summary or "[" in summary:
                    logger.warning("LLM included placeholder text! Cleaning...")
                    # Try to extract the actual content after the placeholder
                    if "," in summary:
                        parts = summary.split(",", 1)
                        if len(parts) > 1:
                            summary = parts[1].strip()
                            data["summary"] = summary
                
                # Check for the old example
                if "Experienced engineer with strong background in system design" in summary:
                    logger.warning("LLM returned the old example summary!")
                    data = {
                        "summary": "Professional with technical expertise and hands-on experience.",
                        "improvements": ["Add quantifiable achievements", "Include relevant certifications", "Expand on project outcomes"]
                    }
            
            return {"analysis": data}
            
        except json.JSONDecodeError as je:
            logger.error(f"JSON parsing failed: {je}. Raw response: {raw_text[:200]}")
            # Fallback: Try to extract any useful information
            fallback_data = {
                "summary": "Technical professional with diverse skill set and experience.",
                "improvements": [
                    "Add specific metrics and achievements to quantify impact",
                    "Include relevant certifications or training",
                    "Highlight leadership and collaboration experiences"
                ]
            }
            logger.info("Using fallback analysis data")
            return {"analysis": fallback_data}
            
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
