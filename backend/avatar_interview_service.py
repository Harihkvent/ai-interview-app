import logging
import random
from datetime import datetime
from typing import Optional, List, Dict
from avatar_interview_models import AvatarInterviewSession, AvatarQuestion, AvatarResponse
from models import Resume
from question_service import generate_questions, evaluate_answer
from ai_utils import call_krutrim_api, clean_ai_json
import json

logger = logging.getLogger("avatar_interview_service")

# Configuration for avatar interviews
AVATAR_ROUND_CONFIG = {
    "hr": {"descriptive": 6},  # 6 HR questions
    "technical": {"descriptive": 8}  # 8 Technical questions
}

FOLLOWUP_PROBABILITY = 0.35  # 35% chance of follow-up question


async def create_avatar_session(user_id: str, resume_id: str, rounds: List[str]) -> AvatarInterviewSession:
    """
    Create a new avatar interview session
    """
    session = AvatarInterviewSession(
        user_id=user_id,
        resume_id=resume_id,
        rounds=rounds,
        started_at=datetime.utcnow()
    )
    await session.insert()
    logger.info(f"Created avatar interview session {session.id} for user {user_id}")
    return session


async def get_avatar_greeting() -> str:
    """
    Generate a friendly greeting from the avatar
    """
    greetings = [
        "Hello! I'm your AI interviewer. I'm excited to learn more about you today. Ready to begin?",
        "Hi there! Thanks for joining me today. Let's have a great conversation about your experience and skills.",
        "Welcome! I'm here to conduct your interview today. Let's make this a productive and engaging session.",
    ]
    return random.choice(greetings)


async def start_avatar_round(session_id: str, round_type: str, resume_content: str) -> Dict:
    """
    Start a specific round and generate questions
    """
    session = await AvatarInterviewSession.get(session_id)
    if not session:
        raise ValueError("Session not found")
    
    # Update session
    session.current_round = round_type
    await session.save()
    
    # Get config for this round
    config = AVATAR_ROUND_CONFIG.get(round_type, {"descriptive": 5})
    num_questions = config.get("descriptive", 5)
    
    logger.info(f"Generating {num_questions} questions for avatar {round_type} round")
    
    # Generate questions using the avatar config
    from question_service import _generate_descriptive
    questions = await _generate_descriptive(resume_content, round_type, num_questions, "General")
    
    # Save questions as AvatarQuestion documents
    saved_questions = []
    question_number = 1
    
    for q_data in questions:
        # Optimize question text for voice
        voice_text = format_question_for_speech(q_data["question"])
        
        question = AvatarQuestion(
            session_id=session_id,
            round_type=round_type,
            question_text=q_data["question"],
            voice_text=voice_text,
            question_type=q_data.get("type", "descriptive"),
            question_number=question_number,
            options=q_data.get("options"),
            correct_answer=q_data.get("answer")
        )
        await question.insert()
        saved_questions.append(question)
        question_number += 1
    
    logger.info(f"Generated and saved {len(saved_questions)} questions for {round_type} round")
    
    # Set first question as current
    if saved_questions:
        session.current_question_id = str(saved_questions[0].id)
        await session.save()
        
        return {
            "round_type": round_type,
            "total_questions": len(saved_questions),
            "first_question": {
                "id": str(saved_questions[0].id),
                "text": saved_questions[0].question_text,
                "voice_text": saved_questions[0].voice_text,
                "type": saved_questions[0].question_type,
                "options": saved_questions[0].options,
                "number": saved_questions[0].question_number
            }
        }
    
    return {"error": "No questions generated"}


def format_question_for_speech(question_text: str) -> str:
    """
    Optimize question text for text-to-speech
    - Remove markdown formatting
    - Add natural pauses
    - Simplify complex sentences
    """
    # Remove markdown
    voice_text = question_text.replace("**", "").replace("*", "")
    voice_text = voice_text.replace("#", "").replace("`", "")
    
    # Add pauses for better speech rhythm (using commas)
    # This is a simple heuristic - can be improved
    if len(voice_text) > 100:
        # Add slight pause after first sentence
        sentences = voice_text.split(". ")
        if len(sentences) > 1:
            voice_text = sentences[0] + "... " + ". ".join(sentences[1:])
    
    return voice_text


async def process_avatar_answer(
    session_id: str,
    question_id: str,
    answer_text: str,
    time_taken: int,
    is_voice: bool,
    resume_content: str
) -> Dict:
    """
    Process user's answer and determine next steps
    Returns: evaluation, next question, or follow-up
    """
    session = await AvatarInterviewSession.get(session_id)
    question = await AvatarQuestion.get(question_id)
    
    if not session or not question:
        raise ValueError("Session or question not found")
    
    # Evaluate the answer
    evaluation_result = await evaluate_answer(
        question.question_text,
        answer_text,
        resume_content,
        question.round_type
    )
    
    # Save response
    response = AvatarResponse(
        session_id=session_id,
        question_id=question_id,
        answer_text=answer_text,
        is_voice_input=is_voice,
        evaluation=evaluation_result["evaluation"],
        score=evaluation_result["score"],
        time_taken_seconds=time_taken
    )
    
    # Add to transcript
    session.transcript.append({
        "role": "avatar",
        "text": question.question_text,
        "timestamp": question.asked_at or datetime.utcnow()
    })
    session.transcript.append({
        "role": "user",
        "text": answer_text,
        "timestamp": datetime.utcnow()
    })
    
    # Update session stats
    session.total_score += evaluation_result["score"]
    session.questions_answered += 1
    session.total_time_seconds += time_taken
    
    # Determine if follow-up is needed
    should_followup = await should_ask_followup(question, answer_text, evaluation_result["score"])
    
    if should_followup and not question.is_followup:
        # Generate follow-up question
        followup = await generate_followup_question(question, answer_text, resume_content)
        if followup:
            response.needs_followup = True
            response.followup_generated = True
            session.followups_asked += 1
            session.current_question_id = str(followup.id)
            await response.insert()
            await session.save()
            
            return {
                "evaluation": evaluation_result["evaluation"],
                "score": evaluation_result["score"],
                "has_followup": True,
                "acknowledgment": get_acknowledgment(),
                "next_question": {
                    "id": str(followup.id),
                    "text": followup.question_text,
                    "voice_text": followup.voice_text,
                    "type": followup.question_type,
                    "is_followup": True
                }
            }
    
    # No follow-up, move to next main question
    await response.insert()
    next_question = await get_next_question(session_id, question.round_type, question.question_number)
    
    if next_question:
        session.current_question_id = str(next_question.id)
        await session.save()
        
        return {
            "evaluation": evaluation_result["evaluation"],
            "score": evaluation_result["score"],
            "has_followup": False,
            "acknowledgment": get_acknowledgment(),
            "next_question": {
                "id": str(next_question.id),
                "text": next_question.question_text,
                "voice_text": next_question.voice_text,
                "type": next_question.question_type,
                "options": next_question.options,
                "number": next_question.question_number
            }
        }
    else:
        # Round complete
        await session.save()
        return {
            "evaluation": evaluation_result["evaluation"],
            "score": evaluation_result["score"],
            "has_followup": False,
            "acknowledgment": "Thank you for your answer.",
            "round_complete": True
        }


async def should_ask_followup(question: AvatarQuestion, answer: str, score: float) -> bool:
    """
    Determine if a follow-up question should be asked
    Based on answer quality and randomness for natural feel
    """
    # Don't ask follow-up to follow-ups
    if question.is_followup:
        return False
    
    # Don't ask follow-up if answer is too short (likely skipped or minimal)
    if len(answer.strip()) < 20:
        return False
    
    # Use probability to make it feel natural
    if random.random() > FOLLOWUP_PROBABILITY:
        return False
    
    # More likely to ask follow-up if score is mid-range (room for elaboration)
    if 4.0 <= score <= 7.5:
        return random.random() < 0.5  # 50% chance for mid-range scores
    
    return True


async def generate_followup_question(
    parent_question: AvatarQuestion,
    user_answer: str,
    resume_content: str
) -> Optional[AvatarQuestion]:
    """
    Generate a contextual follow-up question based on user's answer
    """
    prompt = f"""You are an AI interviewer conducting a {parent_question.round_type} interview.

The candidate just answered this question:
"{parent_question.question_text}"

Their answer was:
"{user_answer}"

Generate ONE natural follow-up question to probe deeper or clarify their response.

RULES:
1. Make it conversational and natural
2. Use "you/your" - speak directly to the candidate
3. Reference something specific from their answer
4. Keep it concise (one sentence)
5. Return ONLY the question text, no JSON, no formatting

Example follow-ups:
- "Can you elaborate on how you implemented that solution?"
- "What challenges did you face during that project?"
- "How did that experience shape your approach to similar problems?"

Generate the follow-up question now:"""

    messages = [
        {"role": "system", "content": "You are an expert interviewer. Generate natural, conversational follow-up questions."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await call_krutrim_api(messages, temperature=0.7, max_tokens=150, operation="generate_followup")
        if not response:
            return None
        
        # Clean up response
        followup_text = response.strip().strip('"').strip("'")
        
        # Create follow-up question
        voice_text = format_question_for_speech(followup_text)
        
        followup = AvatarQuestion(
            session_id=parent_question.session_id,
            round_type=parent_question.round_type,
            question_text=followup_text,
            voice_text=voice_text,
            question_type="descriptive",
            question_number=parent_question.question_number,  # Same number as parent
            is_followup=True,
            parent_question_id=str(parent_question.id),
            followup_reason="Probe deeper based on answer"
        )
        await followup.insert()
        
        logger.info(f"Generated follow-up question: {followup_text[:50]}...")
        return followup
        
    except Exception as e:
        logger.error(f"Error generating follow-up: {e}")
        return None


async def get_next_question(session_id: str, current_round: str, current_number: int) -> Optional[AvatarQuestion]:
    """
    Get the next main question (not follow-up) in the round
    """
    next_question = await AvatarQuestion.find_one(
        AvatarQuestion.session_id == session_id,
        AvatarQuestion.round_type == current_round,
        AvatarQuestion.question_number == current_number + 1,
        AvatarQuestion.is_followup == False
    )
    return next_question


def get_acknowledgment() -> str:
    """
    Get a natural acknowledgment phrase for the avatar to say
    """
    acknowledgments = [
        "I see.",
        "Interesting.",
        "Got it.",
        "Thank you for sharing that.",
        "That's helpful.",
        "Understood.",
        "Great, let's continue.",
    ]
    return random.choice(acknowledgments)


async def finalize_avatar_session(session_id: str) -> Dict:
    """
    Finalize the avatar interview session and calculate final stats
    """
    session = await AvatarInterviewSession.get(session_id)
    if not session:
        raise ValueError("Session not found")
    
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    
    # Calculate average score
    if session.questions_answered > 0:
        avg_score = session.total_score / session.questions_answered
    else:
        avg_score = 0.0
    
    await session.save()
    
    return {
        "session_id": session_id,
        "status": "completed",
        "total_questions": session.questions_answered,
        "followups_asked": session.followups_asked,
        "average_score": round(avg_score, 2),
        "total_time": session.total_time_seconds,
        "transcript_length": len(session.transcript)
    }
