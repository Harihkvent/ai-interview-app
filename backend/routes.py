from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import io
import logging

logger = logging.getLogger("routes")

from models import InterviewSession, Resume, InterviewRound, Question, Answer, Message, JobMatch, CareerRoadmap
from question_service import evaluate_answer, generate_ai_response
from report_generator import generate_pdf_report, calculate_overall_score, generate_final_report_data
from file_handler import extract_resume_text
from session_service import create_new_session
from roadmap_generator import create_career_roadmap
from metrics import (
    interview_sessions_total,
    interview_sessions_active,
    interview_sessions_completed,
    record_round_start,
    record_round_completion,
    record_round_switch,
    record_answer_metrics
)

from auth_routes import get_current_user
from auth_models import User
from mq_service import publish_question_generation

router = APIRouter()

# ============= Request/Response Models =============

class ChatRequest(BaseModel):
    message: str
    session_id: str

class ChatResponse(BaseModel):
    response: str
    session_id: str

class SubmitAnswerRequest(BaseModel):
    question_id: str
    answer_text: str
    time_taken_seconds: int
    status: str = "submitted" # drafted, submitted, skipped

class SubmitAnswerResponse(BaseModel):
    evaluation: str
    score: float
    next_question: Optional[dict] = None
    round_complete: bool = False
    interview_complete: bool = False

class GenerateRoadmapRequest(BaseModel):
    session_id: str
    target_job_title: str

class StartInterviewFromRoleRequest(BaseModel):
    target_job_title: str

class JumpQuestionRequest(BaseModel):
    session_id: str
    question_id: str

class GenerateQuestionsOnlyRequest(BaseModel):
    resume_text: str
    round_type: str
    num_questions: Optional[int] = 5
    job_title: Optional[str] = "General"

class SaveGeneratedSessionRequest(BaseModel):
    resume_text: str
    resume_filename: str
    round_type: str
    questions: list[dict] # Expected to have question_text, type, options, answer

# ============= Resume Upload & Session Start =============

@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    session_type: str = "interview",
    job_title: str = "General Interview",
    current_user: User = Depends(get_current_user)
):
    """Upload resume and create new interview session"""
    try:
        # Extract text from resume and save to disk
        file_path, resume_text = await extract_resume_text(file)
        
        # Extract candidate info
        from resume_parser import extract_candidate_info
        candidate_name, candidate_email = extract_candidate_info(resume_text)
        
        # Create new session and initialization rounds via SessionService
        new_session = await create_new_session(
            user_id=str(current_user.id),
            session_type=session_type,
            job_title=job_title
        )
        
        # Save resume with extracted info, user_id, and file_path
        resume = Resume(
            user_id=str(current_user.id),
            # session_id=str(new_session.id), # Resume does not have session_id
            filename=file.filename,
            name=file.filename,
            content=resume_text,
            file_path=file_path,
            candidate_name=candidate_name,
            candidate_email=candidate_email
        )
        await resume.insert()
        
        # Update session with resume_id
        new_session.resume_id = str(resume.id)
        await new_session.save()

        # Trigger background generation for all rounds via Worker to ensure immediate availability
        round_types = ["aptitude", "technical", "hr"]
        for r_type in round_types:
            await publish_question_generation(str(new_session.id), r_type, resume_text)
        return {
            "session_id": str(new_session.id),
            "resume_id": str(resume.id),
            "message": "Resume uploaded successfully. Ready to start interview.",
            "filename": file.filename,
            "candidate_name": candidate_name,
            "candidate_email": candidate_email
        }
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-saved-resume/{resume_id}")
async def analyze_saved_resume(
    resume_id: str,
    session_type: str = "interview",
    job_title: str = "General Interview",
    current_user: User = Depends(get_current_user)
):
    """Start analysis and create session for an already uploaded resume"""
    try:
        # Verify resume exists and belongs to user
        resume = await Resume.get(resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        if resume.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to use this resume")
            
        # Create new session
        new_session = InterviewSession(
            user_id=str(current_user.id),
            status="active",
            started_at=datetime.utcnow(),
            resume_id=str(resume.id),
            session_type=session_type,
            job_title=job_title
        )
        await new_session.insert()
        
        # Update resume with new session_id (linking to most recent session)
        # resume.session_id = str(new_session.id) # Resume does not have session_id
        # await resume.save()
        
        # Create all three rounds
        round_types = ["aptitude", "technical", "hr"]
        for round_type in round_types:
            round_obj = InterviewRound(
                session_id=str(new_session.id),
                round_type=round_type,
                status="pending"
            )
            await round_obj.insert()
            
            # Trigger background generation for this round
            await publish_question_generation(str(new_session.id), round_type, resume.content)
            
        return {
            "session_id": str(new_session.id),
            "resume_id": str(resume.id),
            "message": "Session created from saved resume. Ready to start analysis.",
            "filename": resume.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/active-session")
async def get_active_session(
    session_type: str = "interview",
    current_user: User = Depends(get_current_user)
):
    """Retrieve the most recent active (unfinished) session for the user by type"""
    try:
        session = await InterviewSession.find(
            InterviewSession.user_id == str(current_user.id),
            InterviewSession.status == "active",
            InterviewSession.session_type == session_type
        ).sort("-created_at").first_or_none()
        
        if not session:
            return {"session_id": None}
            
        return {
            "session_id": str(session.id),
            "status": session.status,
            "created_at": session.created_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start-interview-from-role")
async def start_interview_from_role(
    request: StartInterviewFromRoleRequest,
    current_user: User = Depends(get_current_user)
):
    """Start a new interview session directly for a specified role (using user's most recent resume)"""
    try:
        # Find user's most recent resume
        # We need to find the most recent session that has a resume
        recent_session = await InterviewSession.find(
            InterviewSession.user_id == str(current_user.id),
            InterviewSession.resume_id != None
        ).sort("-created_at").first_or_none()
        
        if not recent_session:
            raise HTTPException(status_code=400, detail="No previous resume found. Please upload a resume first.")
            
        resume = await Resume.get(recent_session.resume_id)
        
        # Create new session
        new_session = InterviewSession(
            user_id=str(current_user.id),
            status="active",
            started_at=datetime.utcnow(),
            resume_id=str(resume.id),
            session_type="interview",
            job_title=request.target_job_title
        )
        await new_session.insert()
        
        # Create all three rounds
        round_types = ["aptitude", "technical", "hr"]
        for round_type in round_types:
            round_obj = InterviewRound(
                session_id=str(new_session.id),
                round_type=round_type,
                status="pending"
            )
            await round_obj.insert()
            
            # Trigger background generation for this round
            await publish_question_generation(str(new_session.id), round_type, resume.content)
            
        return {
            "session_id": str(new_session.id),
            "message": f"Interview started for {request.target_job_title}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= Question Generation =============

@router.post("/start-round/{session_id}")
async def start_round(session_id: str, round_type: str):
    """Start a specific round and generate questions"""
    try:
        logger.info(f"Starting round {round_type} for session {session_id}")
        # Verify session exists
        interview_session = await InterviewSession.get(session_id)
        if not interview_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get resume
        if not interview_session.resume_id:
            raise HTTPException(status_code=404, detail="Resume not found for session")
        resume = await Resume.get(interview_session.resume_id)
        if not resume:
             raise HTTPException(status_code=404, detail="Resume not found")
        
        # Get the round
        round_obj = await InterviewRound.find_one(
            InterviewRound.session_id == session_id,
            InterviewRound.round_type == round_type
        )
        
        if not round_obj:
            raise HTTPException(status_code=404, detail="Round not found")
        
        # Update round status
        round_obj.status = "active"
        round_obj.started_at = datetime.utcnow()
        await round_obj.save()
        
        # Track metrics
        record_round_start(round_type)
        
        # Use activate_round for consolidated logic (bulk generation, caching, etc)
        from session_service import activate_round
        result = await activate_round(session_id, round_type, resume.content)
        
        return result
    except Exception as e:
        logger.error(f"Error initiating round {round_type} for session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= Answer Submission & Evaluation =============

@router.post("/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(request: SubmitAnswerRequest):
    """Submit answer and get evaluation"""
    try:
        # Get question
        question = await Question.get(request.question_id)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Get round
        round_obj = await InterviewRound.get(question.round_id)
        if not round_obj:
            raise HTTPException(status_code=404, detail="Round not found")
        
        # Get session and resume for context
        interview_session = await InterviewSession.get(round_obj.session_id)
        resume = None
        if interview_session and interview_session.resume_id:
            resume = await Resume.get(interview_session.resume_id)
        
        # Evaluate answer
        if question.question_type == "mcq":
            is_correct = request.answer_text.strip().lower() == question.correct_answer.strip().lower()
            eval_result = {
                "score": 10.0 if is_correct else 0.0,
                "evaluation": f"Correct! The answer is {question.correct_answer}." if is_correct else f"Incorrect. The correct answer was {question.correct_answer}."
            }
        else:
            # Evaluate descriptive answer using Krutrim
            eval_result = await evaluate_answer(
                question.question_text,
                request.answer_text,
                resume.content if resume else "",
                round_obj.round_type  # Pass round_type for metrics
            )
        
        # Save answer
        answer = await Answer.find_one(Answer.question_id == request.question_id)
        if not answer:
            answer = Answer(
                question_id=request.question_id,
                answer_text=request.answer_text,
                evaluation=eval_result.get("evaluation") if request.status == "submitted" else None,
                score=eval_result.get("score", 0) if request.status == "submitted" else 0,
                time_taken_seconds=request.time_taken_seconds,
                status=request.status
            )
            await answer.insert()
        else:
            answer.answer_text = request.answer_text
            if request.status == "submitted":
                answer.evaluation = eval_result.get("evaluation")
                answer.score = eval_result.get("score", 0)
            answer.time_taken_seconds += request.time_taken_seconds
            answer.status = request.status
            answer.answered_at = datetime.utcnow()
            await answer.save()
        
        # Update round time
        round_obj.total_time_seconds += request.time_taken_seconds
        
        # If submitted, increment index only if it's the sequential next (optional, but let's just update last_accessed)
        round_obj.last_accessed_at = datetime.utcnow()
        await round_obj.save()
        
        # Update session time
        interview_session.total_time_seconds += request.time_taken_seconds
        await interview_session.save()
        
        # Track answer metrics
        record_answer_metrics(
            round_obj.round_type,
            eval_result["score"],
            request.time_taken_seconds
        )
        
        # Get all questions in this round
        all_questions = await Question.find(Question.round_id == str(round_obj.id)).to_list()
        
        # Check if round is complete
        answered_questions = []
        for q in all_questions:
            ans = await Answer.find_one(Answer.question_id == str(q.id))
            if ans:
                answered_questions.append(q)
        
        round_complete = len(answered_questions) >= len(all_questions)
        
        # Get next question if available
        next_question = None
        if not round_complete:
            next_q = await Question.find_one(
                Question.round_id == str(round_obj.id),
                Question.question_number == question.question_number + 1
            )
            
            if next_q:
                next_question = {
                    "id": str(next_q.id),
                    "text": next_q.question_text,
                    "type": next_q.question_type,
                    "options": next_q.options,
                    "number": next_q.question_number
                }
        
        # If round complete, update status
        if round_complete:
            round_obj.status = "completed"
            round_obj.completed_at = datetime.utcnow()
            await round_obj.save()
            
            # Track round completion metrics
            duration = (round_obj.completed_at - round_obj.started_at).total_seconds() if round_obj.started_at else 0
            record_round_completion(round_obj.round_type, int(duration))
        
        # Check if entire interview is complete
        all_rounds = await InterviewRound.find(
            InterviewRound.session_id == round_obj.session_id
        ).to_list()
        
        interview_complete = all(r.status == "completed" for r in all_rounds)
        
        if interview_complete:
            # Calculate final score
            session_report_data = await generate_final_report_data(str(interview_session.id))
            final_score = session_report_data.get('total_score', 0.0)
            
            interview_session.status = "completed"
            interview_session.total_score = final_score
            interview_session.completed_at = datetime.utcnow()
            await interview_session.save()
            
            # Track session completion
            interview_sessions_completed.inc()
            interview_sessions_active.dec()
        
        return SubmitAnswerResponse(
            evaluation=eval_result["evaluation"],
            score=eval_result["score"],
            next_question=next_question,
            round_complete=round_complete,
            interview_complete=interview_complete
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= Round Progression =============

@router.get("/next-round/{session_id}")
async def get_next_round(session_id: str):
    """Get the next pending round"""
    try:
        # Get all rounds for this session
        rounds = await InterviewRound.find(
            InterviewRound.session_id == session_id
        ).to_list()
        
        # Find next pending round
        round_order = ["aptitude", "technical", "hr"]
        for round_type in round_order:
            for round_obj in rounds:
                if round_obj.round_type == round_type and round_obj.status == "pending":
                    return {
                        "round_type": round_type,
                        "round_id": str(round_obj.id),
                        "message": f"Ready to start {round_type.capitalize()} round"
                    }
        
        return {
            "round_type": None,
            "message": "All rounds completed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= Dynamic Round Switching =============

@router.post("/switch-round/{session_id}")
async def switch_round(session_id: str, round_type: str):
    """Switch to a different round dynamically"""
    try:
        # Verify session exists
        interview_session = await InterviewSession.get(session_id)
        if not interview_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get current round if any
        current_round = None
        if interview_session.current_round_id:
            current_round = await InterviewRound.get(interview_session.current_round_id)
        
        # Get target round
        target_round = await InterviewRound.find_one(
            InterviewRound.session_id == session_id,
            InterviewRound.round_type == round_type
        )
        
        if not target_round:
            raise HTTPException(status_code=404, detail=f"Round {round_type} not found")
        
        # Track round switch metrics
        if current_round:
            record_round_switch(current_round.round_type, round_type)
        
        # Update session current round
        interview_session.current_round_id = str(target_round.id)
        await interview_session.save()
        
        # If target round is pending, start it
        if target_round.status == "pending":
            target_round.status = "active"
            target_round.started_at = datetime.utcnow()
            await target_round.save()
            record_round_start(round_type)
            
            # Generate questions if not already generated
            existing_questions = await Question.find(
                Question.round_id == str(target_round.id)
            ).to_list()
            
            if not existing_questions:
                # Get resume for question generation
                # Get resume for question generation
                resume = None
                if interview_session.resume_id:
                    resume = await Resume.get(interview_session.resume_id)
                if resume:
                    questions_list = await generate_questions_from_resume(
                        resume.content,
                        round_type
                    )
                    
                    # Save questions
                    for i, q_data in enumerate(questions_list, 1):
                        question = Question(
                            round_id=str(target_round.id),
                            question_text=q_data["question"],
                            question_type=q_data.get("type", "descriptive"),
                            options=q_data.get("options"),
                            correct_answer=q_data.get("answer"),
                            question_number=i
                        )
                        await question.insert()
        
        # Get first unanswered question in this round
        all_questions = await Question.find(
            Question.round_id == str(target_round.id)
        ).sort("+question_number").to_list()
        
        next_question = None
        for q in all_questions:
            ans = await Answer.find_one(Answer.question_id == str(q.id))
            if not ans:
                next_question = {
                    "id": str(q.id),
                    "text": q.question_text,
                    "type": q.question_type,
                    "options": q.options,
                    "number": q.question_number
                }
                break
        
        return {
            "round_id": str(target_round.id),
            "round_type": round_type,
            "status": target_round.status,
            "current_question": next_question,
            "total_questions": len(all_questions),
            "message": f"Switched to {round_type} round"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rounds-status/{session_id}")
async def get_rounds_status(session_id: str):
    """Get status of all rounds for a session"""
    try:
        # Verify session exists
        interview_session = await InterviewSession.get(session_id)
        if not interview_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get all rounds
        rounds = await InterviewRound.find(
            InterviewRound.session_id == session_id
        ).to_list()
        
        rounds_status = []
        for round_obj in rounds:
            # Count questions
            all_questions = await Question.find(
                Question.round_id == str(round_obj.id)
            ).to_list()
            
            # Count answered questions
            answered_count = 0
            for q in all_questions:
                ans = await Answer.find_one(Answer.question_id == str(q.id))
                if ans:
                    answered_count += 1
            
            rounds_status.append({
                "round_id": str(round_obj.id),
                "round_type": round_obj.round_type,
                "status": round_obj.status,
                "total_questions": len(all_questions),
                "answered_questions": answered_count,
                "is_current": str(round_obj.id) == interview_session.current_round_id
            })
        
        return {
            "session_id": session_id,
            "rounds": rounds_status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= Report Generation =============

@router.get("/report/{session_id}")
async def download_report(session_id: str):
    """Generate and download PDF report"""
    try:
        # Verify session exists
        interview_session = await InterviewSession.get(session_id)
        if not interview_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Generate PDF
        pdf_bytes = await generate_pdf_report(session_id)
        
        # Return as downloadable file
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=interview_report_{session_id}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= Session Info =============

@router.get("/session/{session_id}")
async def get_session_info(session_id: str):
    """Get session information and statistics"""
    try:
        interview_session = await InterviewSession.get(session_id)
        if not interview_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get resume
        resume = None
        if interview_session.resume_id:
            resume = await Resume.get(interview_session.resume_id)
        
        # Get rounds
        rounds = await InterviewRound.find(
            InterviewRound.session_id == session_id
        ).to_list()
        
        rounds_info = []
        for round_obj in rounds:
            # Count questions
            questions_count = await Question.find(
                Question.round_id == str(round_obj.id)
            ).to_list()
            
            # Count answered questions
            answered_count = 0
            for q in questions_count:
                ans = await Answer.find_one(Answer.question_id == str(q.id))
                if ans:
                    answered_count += 1
            
            rounds_info.append({
                "round_type": round_obj.round_type,
                "status": round_obj.status,
                "total_questions": len(questions_count),
                "answered_questions": answered_count,
                "time_seconds": round_obj.total_time_seconds
            })
        
        return {
            "session_id": session_id,
            "status": interview_session.status,
            "resume_filename": resume.filename if resume else None,
            "total_time_seconds": interview_session.total_time_seconds,
            "current_round_id": interview_session.current_round_id,
            "rounds": rounds_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= Legacy Endpoints (for backward compatibility) =============

@router.post("/start")
async def start_interview():
    """Start a new interview session (legacy)"""
    new_session = InterviewSession(status="active")
    await new_session.insert()
    
    initial_message = await generate_ai_response([])
    
    ai_message = Message(
        session_id=str(new_session.id),
        role="assistant",
        content=initial_message
    )
    await ai_message.insert()
    
    return {
        "session_id": str(new_session.id),
        "message": initial_message
    }

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message and get AI response (legacy)"""
    db_session = await InterviewSession.get(request.session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    user_message = Message(
        session_id=request.session_id,
        role="user",
        content=request.message
    )
    await user_message.insert()
    
    messages = await Message.find(
        Message.session_id == request.session_id
    ).sort("+timestamp").to_list()
    
    api_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
    
    ai_response = await generate_ai_response(api_messages)
    
    ai_message = Message(
        session_id=request.session_id,
        role="assistant",
        content=ai_response
    )
    await ai_message.insert()
    
    return ChatResponse(response=ai_response, session_id=request.session_id)

@router.get("/history/{session_id}")
async def get_history(session_id: str):
    """Get interview history for a session (legacy)"""
    db_session = await InterviewSession.get(session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = await Message.find(
        Message.session_id == session_id
    ).sort("+timestamp").to_list()
    
    return {
        "session_id": session_id,
        "status": db_session.status,
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat()
            }
            for msg in messages
        ]
    }

# ============= Unified Session & Navigation =============

@router.get("/session/state/{session_id}")
async def get_session_state_endpoint(session_id: str):
    """Get the full state of the interview session"""
    try:
        from session_service import get_full_session_state
        state = await get_full_session_state(session_id)
        return state
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/pause/{session_id}")
async def pause_session_endpoint(session_id: str):
    """Toggle pause state for the session"""
    try:
        from session_service import toggle_session_pause
        result = await toggle_session_pause(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/jump")
async def jump_question(request: JumpQuestionRequest):
    """Jump to a specific question and update current_round_id if needed"""
    try:
        session = await InterviewSession.get(request.session_id)
        question = await Question.get(request.question_id)
        if not session or not question:
            raise HTTPException(status_code=404, detail="Session or Question not found")
        
        session.current_round_id = question.round_id
        session.current_question_id = str(question.id)
        await session.save()
        
        # Update round timing
        round_obj = await InterviewRound.get(question.round_id)
        round_obj.last_accessed_at = datetime.utcnow()
        await round_obj.save()
        
        return {
            "session_id": request.session_id,
            "round_id": question.round_id,
            "question_id": str(question.id),
            "question_number": question.question_number
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/end/{session_id}")
async def end_session_for_verification(session_id: str):
    """End interview session - marks as completed"""
    try:
        session = await InterviewSession.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Mark all rounds as completed
        rounds = await InterviewRound.find(
            InterviewRound.session_id == session_id
        ).to_list()
        
        for round_obj in rounds:
            if round_obj.status != "completed":
                round_obj.status = "completed"
                round_obj.completed_at = datetime.utcnow()
                await round_obj.save()
        
        # Mark session as completed
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        await session.save()
        
        # Update metrics
        interview_sessions_completed.inc()
        interview_sessions_active.dec()
        
        return {
            "status": "completed", 
            "message": "Interview ended successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-questions-only")
async def generate_questions_only(request: GenerateQuestionsOnlyRequest):
    """Standalone endpoint that generates questions without starting an interview session - uses cache if available"""
    try:
        from question_service import generate_questions
        questions = await generate_questions(
            request.resume_text,
            request.round_type,
            request.job_title
        )
        
        return {
            "round_type": request.round_type,
            "questions": questions,
            "job_title": request.job_title
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-text")
async def extract_text_from_file(file: UploadFile = File(...)):
    """Extract text from a resume file (PDF or DOCX)"""
    try:
        _, text = await extract_resume_text(file)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= Job Matching Endpoints =============

@router.post("/analyze-resume/{session_id}")
async def analyze_resume(session_id: str, current_user: User = Depends(get_current_user)):
    """Analyze resume and generate job matches using hybrid ML approach - uses cache if available"""
    try:
        # Get session first
        session = await InterviewSession.get(session_id)
        if not session:
             raise HTTPException(status_code=404, detail="Session not found")

        # Get resume via session
        resume = await Resume.get(session.resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Check if matches already exist (cached)
        existing_matches = await JobMatch.find(
            JobMatch.session_id == session_id,
            JobMatch.is_live == False
        ).to_list()
        
        if existing_matches:
            # Return cached results
            print(f"✅ Returning {len(existing_matches)} cached job matches for session {session_id}")
            formatted_matches = []
            for m in existing_matches:
                m_id = str(m.id) if hasattr(m, 'id') and m.id else str(getattr(m, '_id', 'UNKNOWN'))
                formatted_matches.append({
                    "rank": getattr(m, 'rank', 0),
                    "job_title": m.job_title,
                    "company_name": m.company_name,
                    "location": m.location,
                    "job_description": m.job_description,
                    "match_percentage": m.match_percentage,
                    "matched_skills": m.matched_skills,
                    "missing_skills": m.missing_skills,
                    "thumbnail": m.thumbnail,
                    "via": m.via,
                    "apply_link": m.apply_link,
                    "is_live": m.is_live,
                    "is_saved": m.is_saved,
                    "id": m_id,
                    "job_id": m.job_id
                })
            return {
                "session_id": session_id,
                "total_matches": len(formatted_matches),
                "top_matches": formatted_matches,
                "message": "Resume analyzed successfully (cached)",
                "method": "TF-IDF (40%) + Sentence Transformers (60%)",
                "from_cache": True
            }
        
        # Run ML job matching (hybrid: TF-IDF + Semantic)
        from ml_job_matcher import analyze_resume_and_match
        matches = await analyze_resume_and_match(session_id, resume.content, top_n=10, user_id=str(current_user.id))
        
        return {
            "session_id": session_id,
            "total_matches": len(matches),
            "top_matches": [
                {
                    "rank": getattr(m, 'rank', 0),
                    "job_title": m.job_title,
                    "company_name": m.company_name,
                    "location": m.location,
                    "job_description": m.job_description,
                    "match_percentage": m.match_percentage,
                    "matched_skills": m.matched_skills,
                    "missing_skills": m.missing_skills,
                    "thumbnail": m.thumbnail,
                    "via": m.via,
                    "apply_link": m.apply_link,
                    "is_live": m.is_live,
                    "is_saved": m.is_saved,
                    "id": str(m.id) if hasattr(m, 'id') and m.id else str(getattr(m, '_id', 'UNKNOWN')),
                    "job_id": m.job_id
                }
                for m in matches
            ],
            "message": "Resume analyzed successfully using hybrid ML approach",
            "method": "TF-IDF (40%) + Sentence Transformers (60%)",
            "from_cache": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-resume-live/{session_id}")
async def analyze_resume_live(session_id: str, location: str = "India", current_user: User = Depends(get_current_user)):
    """Analyze resume and generate LIVE job matches using SerpApi"""
    try:
        # Get session first
        session = await InterviewSession.get(session_id)
        if not session:
             raise HTTPException(status_code=404, detail="Session not found")

        # Get resume via session
        resume = await Resume.get(session.resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Run LIVE job matching
        from ml_job_matcher import analyze_resume_and_match_live
        matches = await analyze_resume_and_match_live(session_id, resume.content, top_n=10, location=location, user_id=str(current_user.id))
        
        return {
            "session_id": session_id,
            "total_matches": len(matches),
            "top_matches": [
                {
                    "rank": getattr(m, 'rank', 0),
                    "job_title": m.job_title,
                    "company_name": m.company_name,
                    "location": m.location,
                    "job_description": m.job_description,
                    "match_percentage": m.match_percentage,
                    "matched_skills": m.matched_skills,
                    "missing_skills": m.missing_skills,
                    "thumbnail": m.thumbnail,
                    "via": m.via,
                    "apply_link": m.apply_link,
                    "is_live": m.is_live,
                    "is_saved": m.is_saved,
                    "id": str(m.id) if hasattr(m, 'id') and m.id else str(getattr(m, '_id', 'UNKNOWN')),
                    "job_id": m.job_id
                }
                for m in matches
            ],
            "message": "Resume analyzed successfully with LIVE jobs from SerpApi",
            "location": location
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/job-matches/{session_id}")
async def get_job_matches(session_id: str):
    """Get stored job matches for a session"""
    try:
        matches = await JobMatch.find(
            JobMatch.session_id == session_id
        ).sort("+rank").to_list()
        
        if not matches:
            raise HTTPException(
                status_code=404, 
                detail="No job matches found. Please analyze resume first."
            )
        
        return {
            "session_id": session_id,
            "total_matches": len(matches),
            "matches": [
                {
                    "rank": m.rank,
                    "job_title": m.job_title,
                    "match_percentage": m.match_percentage,
                    "matched_skills": m.matched_skills,
                    "missing_skills": m.missing_skills,
                    "job_description": m.job_description[:300] + "...",
                    "company_name": m.company_name,
                    "location": m.location,
                    "thumbnail": m.thumbnail,
                    "via": m.via,
                    "apply_link": m.apply_link,
                    "is_live": m.is_live,
                    "is_saved": m.is_saved,
                    "id": str(m.id) if hasattr(m, 'id') and m.id else str(getattr(m, '_id', 'UNKNOWN')),
                    "job_id": m.job_id
                }
                for m in matches
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= Career Roadmap Endpoints =============

@router.post("/generate-roadmap")
async def generate_roadmap(
    request: GenerateRoadmapRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate AI-powered career roadmap for selected job - uses cache if available"""
    try:
        # Get resume
        # Get session first
        session = await InterviewSession.get(request.session_id)
        if not session:
             raise HTTPException(status_code=404, detail="Session not found")

        # Get resume
        if not session.resume_id:
             raise HTTPException(status_code=404, detail="Resume not found for this session")
             
        resume = await Resume.get(session.resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        # Check if roadmap already exists (cached)
        existing_roadmap = await CareerRoadmap.find_one(
            CareerRoadmap.session_id == request.session_id,
            CareerRoadmap.target_role == request.target_job_title
        )
        
        if existing_roadmap and existing_roadmap.milestones and len(existing_roadmap.milestones) > 0:
            # Return cached roadmap
            print(f"✅ Returning cached roadmap for session {request.session_id}, role {request.target_job_title}")
            return {
                "session_id": request.session_id,
                "target_role": existing_roadmap.target_role,
                "roadmap_content": existing_roadmap.roadmap_content,
                "milestones": existing_roadmap.milestones,
                "skills_gap": existing_roadmap.skills_gap,
                "estimated_timeline": existing_roadmap.estimated_timeline,
                "message": "Career roadmap retrieved (cached)",
                "from_cache": True
            }
        
        # If cache exists but is invalid (empty milestones), delete it
        if existing_roadmap:
            print(f"⚠️ Found cached roadmap with empty milestones. Regenerating...")
            await existing_roadmap.delete()
        
        # Get selected job match
        job_match = await JobMatch.find_one(
            JobMatch.session_id == request.session_id,
            JobMatch.job_title == request.target_job_title
        )
        
        if not job_match:
            raise HTTPException(
                status_code=404, 
                detail=f"Job match not found for '{request.target_job_title}'. Please select from analyzed jobs."
            )
        
        roadmap = await create_career_roadmap(
            str(current_user.id) if current_user and hasattr(current_user, 'id') else None,
            request.session_id,
            resume.content,
            job_match.job_title,
            job_match.job_description
        )
        
        return {
            **roadmap,
            "message": "Career roadmap generated successfully",
            "from_cache": False
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/roadmap/{session_id}")
async def get_roadmap(session_id: str):
    """Get stored career roadmap for a session"""
    try:
        roadmap = await CareerRoadmap.find_one(
            CareerRoadmap.session_id == session_id
        )
        
        if not roadmap:
            raise HTTPException(
                status_code=404, 
                detail="No roadmap found. Please generate a roadmap first."
            )
        
        return {
            "roadmap_id": str(roadmap.id),
            "target_role": roadmap.target_role,
            "skills_gap": roadmap.skills_gap,
            "milestones": roadmap.milestones,
            "estimated_timeline": roadmap.estimated_timeline,
            "created_at": roadmap.created_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-generated-session")
async def save_generated_session(
    request: SaveGeneratedSessionRequest,
    current_user: User = Depends(get_current_user)
):
    """Save a session from the standalone generator"""
    try:
        # 1. Create new session
        new_session = InterviewSession(
            user_id=str(current_user.id),
            status="active",
            started_at=datetime.utcnow()
        )
        await new_session.insert()
        interview_sessions_total.inc()
        interview_sessions_active.inc()

        # 2. Save Resume
        # We don't have the raw file, so we store text as content
        resume = Resume(
            user_id=str(current_user.id),
            session_id=str(new_session.id),
            filename=request.resume_filename,
            name=request.resume_filename,
            content=request.resume_text,
            raw_content=b"", # No raw bytes available from text-only input
            candidate_name="Candidate", # Could extract if we had parser here
            candidate_email="" 
        )
        await resume.insert()
        
        new_session.resume_id = str(resume.id)
        
        # 3. Create Rounds
        round_types = ["aptitude", "technical", "hr"]
        
        for r_type in round_types:
            is_active = (r_type == request.round_type)
            round_obj = InterviewRound(
                session_id=str(new_session.id),
                round_type=r_type,
                status="active" if is_active else "pending",
                started_at=datetime.utcnow() if is_active else None
            )
            # Set job title for generated session
            if is_active:
                new_session.job_title = f"{request.round_type.capitalize()} Interview"
                new_session.session_type = "interview"
            await round_obj.insert()
            
            if is_active:
                active_round_id = str(round_obj.id)
                new_session.current_round_id = active_round_id
                
                # 4. Save Questions for the active round
                for i, q_data in enumerate(request.questions, 1):
                    # Handle frontend data format mismatch if any
                    q_text = q_data.get("question") or q_data.get("question_text")
                    q_type = q_data.get("type") or q_data.get("question_type") or "descriptive"
                    
                    question = Question(
                        round_id=active_round_id,
                        question_text=q_text,
                        question_type=q_type,
                        options=q_data.get("options"),
                        correct_answer=q_data.get("answer") or q_data.get("correct_answer"),
                        question_number=i
                    )
                    await question.insert()

        await new_session.save()
        
        return {
            "session_id": str(new_session.id),
            "message": "Session saved successfully"
        }

    except Exception as e:
        logger.error(f"Error saving generated session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
