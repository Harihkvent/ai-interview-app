from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from models import InterviewSession, Message
from services import generate_ai_response
from database import get_session

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: int

class ChatResponse(BaseModel):
    response: str
    session_id: int

@router.post("/start")
async def start_interview(session: Session = Depends(get_session)):
    """Start a new interview session"""
    # Create new session
    new_session = InterviewSession(status="active")
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    
    # Generate initial greeting
    initial_message = await generate_ai_response([])
    
    # Save AI greeting
    ai_message = Message(
        session_id=new_session.id,
        role="assistant",
        content=initial_message
    )
    session.add(ai_message)
    session.commit()
    
    return {
        "session_id": new_session.id,
        "message": initial_message
    }

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, session: Session = Depends(get_session)):
    """Send a message and get AI response"""
    # Verify session exists
    db_session = session.get(InterviewSession, request.session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Save user message
    user_message = Message(
        session_id=request.session_id,
        role="user",
        content=request.message
    )
    session.add(user_message)
    session.commit()
    
    # Get conversation history
    statement = select(Message).where(Message.session_id == request.session_id).order_by(Message.timestamp)
    messages = session.exec(statement).all()
    
    # Format for API
    api_messages = [{"role": msg.role, "content": msg.content} for msg in messages]
    
    # Generate AI response
    ai_response = await generate_ai_response(api_messages)
    
    # Save AI response
    ai_message = Message(
        session_id=request.session_id,
        role="assistant",
        content=ai_response
    )
    session.add(ai_message)
    session.commit()
    
    return ChatResponse(response=ai_response, session_id=request.session_id)

@router.get("/history/{session_id}")
def get_history(session_id: int, session: Session = Depends(get_session)):
    """Get interview history for a session"""
    # Verify session exists
    db_session = session.get(InterviewSession, session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all messages
    statement = select(Message).where(Message.session_id == session_id).order_by(Message.timestamp)
    messages = session.exec(statement).all()
    
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
def end_interview(session_id: int, session: Session = Depends(get_session)):
    """End an interview session"""
    db_session = session.get(InterviewSession, session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db_session.status = "completed"
    session.add(db_session)
    session.commit()
    
    return {"message": "Interview ended", "session_id": session_id}
