from fastapi import APIRouter, HTTPException, Depends
from auth_models import User
from auth_routes import get_current_user
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime

from avatar_interview_service import (
    create_avatar_session,
    get_avatar_greeting,
    start_avatar_round,
    process_avatar_answer,
    finalize_avatar_session
)
from avatar_interview_models import AvatarInterviewSession, AvatarQuestion, AvatarResponse
from models import Resume

logger = logging.getLogger("avatar_interview_routes")
router = APIRouter(prefix="/api/avatar-interview", tags=["avatar-interview"])


# Request Models
class StartAvatarInterviewRequest(BaseModel):
    resume_id: str
    rounds: List[str] = ["hr", "technical"]


class SubmitAvatarAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer_text: str
    time_taken_seconds: int
    is_voice: bool = True


# Endpoints

@router.post("/start")
async def start_avatar_interview(
    request: StartAvatarInterviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Start a new AI Avatar Interview session
    """
    try:
        # Verify resume exists and belongs to user
        resume = await Resume.get(request.resume_id)
        if not resume or resume.user_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Create session
        session = await create_avatar_session(
            user_id=str(current_user.id),
            resume_id=request.resume_id,
            rounds=request.rounds
        )
        
        # Start first round
        first_round = request.rounds[0]
        round_data = await start_avatar_round(
            session_id=str(session.id),
            round_type=first_round,
            resume_content=resume.content
        )
        
        # Get greeting
        greeting = await get_avatar_greeting()
        
        return {
            "session_id": str(session.id),
            "greeting": greeting,
            "current_round": first_round,
            "rounds": request.rounds,
            "first_question": round_data.get("first_question"),
            "total_questions": round_data.get("total_questions")
        }
        
    except Exception as e:
        logger.error(f"Error starting avatar interview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}")
async def get_avatar_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get current avatar interview session state
    """
    try:
        session = await AvatarInterviewSession.get(session_id)
        if not session or session.user_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get current question if exists
        current_question = None
        if session.current_question_id:
            question = await AvatarQuestion.get(session.current_question_id)
            if question:
                current_question = {
                    "id": str(question.id),
                    "text": question.question_text,
                    "voice_text": question.voice_text,
                    "type": question.question_type,
                    "options": question.options,
                    "number": question.question_number,
                    "is_followup": question.is_followup
                }
        
        return {
            "session_id": str(session.id),
            "status": session.status,
            "current_round": session.current_round,
            "rounds": session.rounds,
            "current_question": current_question,
            "transcript": session.transcript,
            "questions_answered": session.questions_answered,
            "followups_asked": session.followups_asked,
            "total_time_seconds": session.total_time_seconds,
            "is_paused": session.is_paused
        }
        
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit-answer")
async def submit_avatar_answer(
    request: SubmitAvatarAnswerRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Submit answer to avatar interview question
    May return follow-up question or next main question
    """
    try:
        # Verify session ownership
        session = await AvatarInterviewSession.get(request.session_id)
        if not session or session.user_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get resume content for evaluation
        resume = await Resume.get(session.resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Process answer
        result = await process_avatar_answer(
            session_id=request.session_id,
            question_id=request.question_id,
            answer_text=request.answer_text,
            time_taken=request.time_taken_seconds,
            is_voice=request.is_voice,
            resume_content=resume.content
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/next-round")
async def start_next_round(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Start the next round in the avatar interview
    """
    try:
        session = await AvatarInterviewSession.get(session_id)
        if not session or session.user_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Find next round
        current_index = session.rounds.index(session.current_round) if session.current_round else -1
        if current_index + 1 >= len(session.rounds):
            return {"message": "No more rounds", "all_complete": True}
        
        next_round = session.rounds[current_index + 1]
        
        # Get resume
        resume = await Resume.get(session.resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Start next round
        round_data = await start_avatar_round(
            session_id=session_id,
            round_type=next_round,
            resume_content=resume.content
        )
        
        return {
            "current_round": next_round,
            "first_question": round_data.get("first_question"),
            "total_questions": round_data.get("total_questions")
        }
        
    except Exception as e:
        logger.error(f"Error starting next round: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pause")
async def pause_avatar_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Pause the avatar interview session
    """
    try:
        session = await AvatarInterviewSession.get(session_id)
        if not session or session.user_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Session not found")
        
        session.is_paused = True
        session.last_pause_at = datetime.utcnow()
        await session.save()
        
        return {"message": "Session paused", "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Error pausing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resume")
async def resume_avatar_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Resume a paused avatar interview session
    """
    try:
        session = await AvatarInterviewSession.get(session_id)
        if not session or session.user_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Session not found")
        
        if session.last_pause_at:
            pause_duration = (datetime.utcnow() - session.last_pause_at).total_seconds()
            session.total_paused_time += int(pause_duration)
        
        session.is_paused = False
        session.last_pause_at = None
        await session.save()
        
        return {"message": "Session resumed", "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Error resuming session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/finalize")
async def finalize_avatar_interview(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Finalize the avatar interview and generate report
    """
    try:
        session = await AvatarInterviewSession.get(session_id)
        if not session or session.user_id != str(current_user.id):
            raise HTTPException(status_code=404, detail="Session not found")
        
        result = await finalize_avatar_session(session_id)
        
        return result
        
    except Exception as e:
        logger.error(f"Error finalizing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_avatar_interview_history(
    current_user: User = Depends(get_current_user)
):
    """
    Get user's avatar interview history
    """
    try:
        sessions = await AvatarInterviewSession.find(
            AvatarInterviewSession.user_id == str(current_user.id)
        ).sort("-created_at").to_list()
        
        history = []
        for session in sessions:
            avg_score = session.total_score / session.questions_answered if session.questions_answered > 0 else 0
            history.append({
                "session_id": str(session.id),
                "created_at": session.created_at,
                "status": session.status,
                "rounds": session.rounds,
                "questions_answered": session.questions_answered,
                "average_score": round(avg_score, 2),
                "total_time_seconds": session.total_time_seconds
            })
        
        return {"history": history}
        
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
