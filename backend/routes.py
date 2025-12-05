from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import io

from models import InterviewSession, Resume, InterviewRound, Question, Answer, Message
from services import generate_questions_from_resume, evaluate_answer, generate_ai_response
from report_generator import generate_pdf_report
from file_handler import extract_resume_text

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

class SubmitAnswerResponse(BaseModel):
    evaluation: str
    score: float
    next_question: Optional[dict] = None
    round_complete: bool = False
    interview_complete: bool = False

# ============= Resume Upload & Session Start =============

@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    """Upload resume and create new interview session"""
    try:
        # Extract text from resume
        file_path, resume_text = await extract_resume_text(file)
        
        # Extract candidate info
        from resume_parser import extract_candidate_info
        candidate_name, candidate_email = extract_candidate_info(resume_text)
        
        # Create new session
        new_session = InterviewSession(
            status="active",
            started_at=datetime.utcnow()
        )
        await new_session.insert()
        
        # Save resume with extracted info
        resume = Resume(
            session_id=str(new_session.id),
            filename=file.filename,
            content=resume_text,
            candidate_name=candidate_name,
            candidate_email=candidate_email
        )
        await resume.insert()
        
        # Update session with resume_id
        new_session.resume_id = str(resume.id)
        await new_session.save()
        
        # Create all three rounds
        round_types = ["aptitude", "technical", "hr"]
        for round_type in round_types:
            round_obj = InterviewRound(
                session_id=str(new_session.id),
                round_type=round_type,
                status="pending"
            )
            await round_obj.insert()
        
        return {
            "session_id": str(new_session.id),
            "resume_id": str(resume.id),
            "message": "Resume uploaded successfully. Ready to start interview.",
            "filename": file.filename,
            "candidate_name": candidate_name,
            "candidate_email": candidate_email
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= Question Generation =============

@router.post("/start-round/{session_id}")
async def start_round(session_id: str, round_type: str):
    """Start a specific round and generate questions"""
    try:
        # Verify session exists
        interview_session = await InterviewSession.get(session_id)
        if not interview_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get resume
        resume = await Resume.find_one(Resume.session_id == session_id)
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
        
        # Update session current round
        interview_session.current_round_id = str(round_obj.id)
        await interview_session.save()
        
        # Generate questions
        questions_list = await generate_questions_from_resume(resume.content, round_type)
        
        # Save questions to database
        for i, question_text in enumerate(questions_list, 1):
            question = Question(
                round_id=str(round_obj.id),
                question_text=question_text,
                question_number=i
            )
            await question.insert()
        
        # Get first question
        first_question = await Question.find_one(
            Question.round_id == str(round_obj.id),
            Question.question_number == 1
        )
        
        return {
            "round_id": str(round_obj.id),
            "round_type": round_type,
            "total_questions": len(questions_list),
            "current_question": {
                "id": str(first_question.id),
                "text": first_question.question_text,
                "number": first_question.question_number
            } if first_question else None
        }
    except Exception as e:
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
        resume = await Resume.find_one(Resume.session_id == round_obj.session_id)
        
        # Evaluate answer using Krutrim
        eval_result = await evaluate_answer(
            question.question_text,
            request.answer_text,
            resume.content if resume else ""
        )
        
        # Save answer
        answer = Answer(
            question_id=request.question_id,
            answer_text=request.answer_text,
            evaluation=eval_result["evaluation"],
            score=eval_result["score"],
            time_taken_seconds=request.time_taken_seconds
        )
        await answer.insert()
        
        # Update round time
        round_obj.total_time_seconds += request.time_taken_seconds
        round_obj.current_question_index += 1
        await round_obj.save()
        
        # Update session time
        interview_session.total_time_seconds += request.time_taken_seconds
        await interview_session.save()
        
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
                    "number": next_q.question_number
                }
        
        # If round complete, update status
        if round_complete:
            round_obj.status = "completed"
            round_obj.completed_at = datetime.utcnow()
            await round_obj.save()
        
        # Check if entire interview is complete
        all_rounds = await InterviewRound.find(
            InterviewRound.session_id == round_obj.session_id
        ).to_list()
        
        interview_complete = all(r.status == "completed" for r in all_rounds)
        
        if interview_complete:
            interview_session.status = "completed"
            interview_session.completed_at = datetime.utcnow()
            await interview_session.save()
        
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
        resume = await Resume.find_one(Resume.session_id == session_id)
        
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

@router.post("/end/{session_id}")
async def end_interview(session_id: str):
    """End an interview session (legacy)"""
    db_session = await InterviewSession.get(session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db_session.status = "completed"
    await db_session.save()
    
    return {"message": "Interview ended", "session_id": session_id}
