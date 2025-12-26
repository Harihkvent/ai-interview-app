from fastapi import APIRouter, HTTPException, Depends
from auth_models import User
from auth_routes import get_current_user
import logging

from session_service import (
    create_new_session, 
    activate_round, 
    process_answer
)

from models import InterviewSession, Resume, InterviewRound, Question
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("interview_router")
router = APIRouter(prefix="/api/interview", tags=["interview"])

# Request Models
class StartRoundRequest(BaseModel):
    session_id: str
    round_type: str

class SubmitAnswerRequest(BaseModel):
    question_id: str
    answer_text: str
    time_taken_seconds: int

class SwitchRoundRequest(BaseModel):
    session_id: str
    round_type: str

# Endpoints

@router.post("/start-round")
async def start_round_endpoint(request: StartRoundRequest, current_user: User = Depends(get_current_user)):
    """Start or resume a specific round"""
    try:
        # Verify session ownership
        session = await InterviewSession.get(request.session_id)
        if not session or session.user_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Session not found")
            
        resume = await Resume.find_one(Resume.session_id == request.session_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        result = await activate_round(request.session_id, request.round_type, resume.content)
        return result
    except Exception as e:
        logger.error(f"Error starting round: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit-answer")
async def submit_answer_endpoint(request: SubmitAnswerRequest, current_user: User = Depends(get_current_user)):
    """Submit an answer for evaluation"""
    try:
        result = await process_answer(
            request.question_id, 
            request.answer_text, 
            request.time_taken_seconds
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/switch-round")
async def switch_round_endpoint(request: SwitchRoundRequest, current_user: User = Depends(get_current_user)):
    """Switch to a different round dynamically"""
    try:
        session = await InterviewSession.get(request.session_id)
        if not session or session.user_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Session not found")
            
        resume = await Resume.find_one(Resume.session_id == request.session_id)
        
        result = await activate_round(request.session_id, request.round_type, resume.content if resume else "")
        return {
            "message": f"Switched to {request.round_type}",
            "round_details": result
        }
    except Exception as e:
        logger.error(f"Error switching round: {e}")
        raise HTTPException(status_code=500, detail=str(e))
