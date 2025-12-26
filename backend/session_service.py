import logging
from datetime import datetime
from typing import Optional

from models import InterviewSession, Resume, InterviewRound, Question, Answer
from question_service import generate_questions
from metrics import (
    record_round_start,
    record_round_completion,
    record_round_switch,
    record_answer_metrics,
    interview_sessions_completed,
    interview_sessions_active
)

logger = logging.getLogger("interview_service")

async def create_new_session(user_id: str, resume_id: str = None) -> InterviewSession:
    """Initialize a new interview session with all rounds pending"""
    session = InterviewSession(
        user_id=user_id,
        status="active",
        started_at=datetime.utcnow(),
        resume_id=resume_id
    )
    await session.insert()
    
    # Initialize rounds
    round_types = ["aptitude", "technical", "hr"]
    for r_type in round_types:
        round_obj = InterviewRound(
            session_id=str(session.id),
            round_type=r_type,
            status="pending"
        )
        await round_obj.insert()
        
    return session

async def activate_round(session_id: str, round_type: str, resume_text: str) -> dict:
    """Activate a round, generating questions if needed"""
    round_obj = await InterviewRound.find_one(
        InterviewRound.session_id == session_id,
        InterviewRound.round_type == round_type
    )
    
    if not round_obj:
        raise ValueError(f"Round {round_type} not found for session {session_id}")
        
    # Update Session
    session = await InterviewSession.get(session_id)
    session.current_round_id = str(round_obj.id)
    await session.save()
    
    # Update Round
    if round_obj.status == "pending":
        round_obj.status = "active"
        round_obj.started_at = datetime.utcnow()
        await round_obj.save()
        record_round_start(round_type)

    # Check for existing questions
    existing_questions = await Question.find(
        Question.round_id == str(round_obj.id)
    ).to_list()
    
    if not existing_questions:
        # Generate new questions
        generated_qs = await generate_questions(resume_text, round_type)
        
        for i, q_data in enumerate(generated_qs, 1):
            q_model = Question(
                round_id=str(round_obj.id),
                question_text=q_data["question"],
                question_type=q_data.get("type", "descriptive"),
                options=q_data.get("options"),
                correct_answer=q_data.get("answer"),
                question_number=i
            )
            await q_model.insert()
            existing_questions.append(q_model)
            
    # Return current state
    return {
        "round_id": str(round_obj.id),
        "round_type": round_type,
        "questions": existing_questions,
        "current_question_index": round_obj.current_question_index
    }

async def process_answer(question_id: str, answer_text: str, time_taken: int) -> dict:
    """Process a submitted answer and update progress"""
    question = await Question.get(question_id)
    if not question:
        raise ValueError("Question not found")
        
    round_obj = await InterviewRound.get(question.round_id)
    
    # Evaluate
    # Note: We likely need an evaluation service or import here. 
    # For now, simplistic evaluation for MCQs to keep this service clean, 
    # but descriptive needs AI.
    # We will import the legacy evaluate_answer for now or refactor it.
    from services import evaluate_answer as ai_evaluate # Temporary bridge
    
    evaluation = {}
    if question.question_type == "mcq":
        is_correct = answer_text.strip().lower() == str(question.correct_answer).strip().lower()
        evaluation = {
            "score": 10.0 if is_correct else 0.0,
            "evaluation": "Correct" if is_correct else f"Incorrect. Answer: {question.correct_answer}"
        }
    else:
        # Need resume context, fetching resume
        resume = await Resume.find_one(Resume.session_id == round_obj.session_id)
        evaluation = await ai_evaluate(
            question.question_text, 
            answer_text, 
            resume.content if resume else "",
            round_obj.round_type
        )
        
    # Save Answer
    answer = Answer(
        question_id=question_id,
        answer_text=answer_text,
        evaluation=evaluation["evaluation"],
        score=evaluation["score"],
        time_taken_seconds=time_taken
    )
    await answer.insert()
    
    # Update Stats
    round_obj.total_time_seconds += time_taken
    round_obj.current_question_index += 1
    await round_obj.save()
    
    record_answer_metrics(round_obj.round_type, evaluation["score"], time_taken)
    
    return {
        "evaluation": evaluation,
        "round_obj": round_obj
    }
