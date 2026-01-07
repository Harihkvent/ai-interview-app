"""
Skill Assessment API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel

from auth_routes import get_current_user
from auth_models import User
from skill_assessment_service import (
    get_available_tests,
    get_test_details,
    start_skill_test,
    submit_test_answer,
    complete_skill_test,
    get_test_results,
    get_user_test_history,
    generate_skill_questions
)

router = APIRouter()


# Request/Response Models
class SubmitAnswerRequest(BaseModel):
    question_id: str
    answer: str
    time_taken: int


class GenerateTestRequest(BaseModel):
    skill_name: str
    category: str
    count: int = 10


# Endpoints
@router.get("")
async def list_skill_tests(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List available skill tests (user's own tests + system tests)"""
    try:
        tests = await get_available_tests(str(current_user.id), category, difficulty)
        
        return {
            "tests": [
                {
                    "test_id": str(t.id),
                    "skill_name": t.skill_name,
                    "category": t.category,
                    "difficulty": t.difficulty,
                    "total_questions": t.total_questions,
                    "duration_minutes": t.duration_minutes,
                    "passing_score": t.passing_score,
                    "description": t.description,
                    "created_by": t.created_by
                }
                for t in tests
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{test_id}")
async def get_test(
    test_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific skill test"""
    try:
        test = await get_test_details(test_id)
        
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        return {
            "test_id": str(test.id),
            "skill_name": test.skill_name,
            "category": test.category,
            "difficulty": test.difficulty,
            "total_questions": test.total_questions,
            "duration_minutes": test.duration_minutes,
            "passing_score": test.passing_score,
            "description": test.description,
            "tags": test.tags
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{test_id}/start")
async def start_test(
    test_id: str,
    current_user: User = Depends(get_current_user)
):
    """Start a skill test"""
    try:
        attempt = await start_skill_test(str(current_user.id), test_id)
        
        # Get first question
        from skill_assessment_models import SkillTest, SkillTestQuestion
        test = await SkillTest.get(test_id)
        
        if test and test.question_ids:
            first_question = await SkillTestQuestion.get(test.question_ids[0])
            question_data = {
                "question_id": str(first_question.id),
                "question_text": first_question.question_text,
                "question_type": first_question.question_type,
                "options": first_question.options,
                "question_number": 1
            } if first_question else None
        else:
            question_data = None
        
        return {
            "attempt_id": str(attempt.id),
            "test_id": test_id,
            "status": attempt.status,
            "started_at": attempt.started_at.isoformat(),
            "total_questions": attempt.total_questions,
            "current_question": question_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attempts/{attempt_id}")
async def get_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get details of a skill test attempt"""
    try:
        from skill_assessment_models import SkillTestAttempt, SkillTest, SkillTestQuestion
        
        attempt = await SkillTestAttempt.get(attempt_id)
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")
        
        if attempt.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get current question
        test = await SkillTest.get(attempt.skill_test_id)
        current_question = None
        
        # Calculate current question index from number of answers submitted
        current_question_index = len(attempt.answers)
        
        if test and test.question_ids and current_question_index < len(test.question_ids):
            question_id = test.question_ids[current_question_index]
            question = await SkillTestQuestion.get(question_id)
            
            if question:
                current_question = {
                    "question_id": str(question.id),
                    "question_text": question.question_text,
                    "question_type": question.question_type,
                    "options": question.options,
                    "question_number": current_question_index + 1
                }
        
        return {
            "attempt_id": str(attempt.id),
            "test_id": str(attempt.skill_test_id),
            "status": attempt.status,
            "started_at": attempt.started_at.isoformat(),
            "total_questions": attempt.total_questions,
            "current_question_index": current_question_index,
            "current_question": current_question
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attempts/{attempt_id}/answer")
async def submit_answer(
    attempt_id: str,
    request: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user)
):
    """Submit an answer for a question"""
    try:
        # Verify ownership
        from skill_assessment_models import SkillTestAttempt, SkillTest, SkillTestQuestion
        attempt = await SkillTestAttempt.get(attempt_id)
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")
        
        if attempt.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        result = await submit_test_answer(
            attempt_id,
            request.question_id,
            request.answer,
            request.time_taken
        )
        
        # Get next question
        # Reload attempt to get updated answers count
        attempt = await SkillTestAttempt.get(attempt_id)
        test = await SkillTest.get(attempt.skill_test_id)
        
        next_question = None
        current_question_index = len(attempt.answers)
        
        if test and test.question_ids and current_question_index < len(test.question_ids):
            question_id = test.question_ids[current_question_index]
            question = await SkillTestQuestion.get(question_id)
            
            if question:
                next_question = {
                    "question_id": str(question.id),
                    "question_text": question.question_text,
                    "question_type": question.question_type,
                    "options": question.options,
                    "question_number": current_question_index + 1
                }
        
        return {
            **result,
            "next_question": next_question
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attempts/{attempt_id}/complete")
async def complete_test(
    attempt_id: str,
    current_user: User = Depends(get_current_user)
):
    """Complete a skill test and get results"""
    try:
        # Verify ownership
        from skill_assessment_models import SkillTestAttempt
        attempt = await SkillTestAttempt.get(attempt_id)
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")
        
        if attempt.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        results = await complete_skill_test(attempt_id)
        
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attempts/{attempt_id}/results")
async def get_results(
    attempt_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get detailed results for a completed test"""
    try:
        # Verify ownership
        from skill_assessment_models import SkillTestAttempt
        attempt = await SkillTestAttempt.get(attempt_id)
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")
        
        if attempt.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        results = await get_test_results(attempt_id)
        
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/all")
async def get_history(
    current_user: User = Depends(get_current_user)
):
    """Get user's skill test history"""
    try:
        history = await get_user_test_history(str(current_user.id))
        
        return {"history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
async def generate_test(
    request: GenerateTestRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate a custom skill test using AI"""
    try:
        question_ids = await generate_skill_questions(
            request.skill_name,
            request.category,
            request.count
        )
        
        # Create test
        from skill_assessment_models import SkillTest
        test = SkillTest(
            skill_name=request.skill_name,
            category=request.category,
            total_questions=len(question_ids),
            question_ids=question_ids,
            description=f"AI-generated test for {request.skill_name}",
            created_by=str(current_user.id)
        )
        await test.insert()
        
        return {
            "test_id": str(test.id),
            "skill_name": test.skill_name,
            "total_questions": test.total_questions,
            "message": "Test generated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{test_id}")
async def delete_test(
    test_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a skill test (only if created by the user)"""
    try:
        from skill_assessment_models import SkillTest, SkillTestAttempt, SkillTestQuestion
        
        # Get the test
        test = await SkillTest.get(test_id)
        
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        # Check if user created this test
        if test.created_by != str(current_user.id):
            raise HTTPException(
                status_code=403, 
                detail="You can only delete tests you created"
            )
        
        # Delete all associated attempts
        attempts = await SkillTestAttempt.find(
            SkillTestAttempt.skill_test_id == test_id
        ).to_list()
        
        for attempt in attempts:
            await attempt.delete()
        
        # Delete all associated questions
        if test.question_ids:
            for question_id in test.question_ids:
                try:
                    question = await SkillTestQuestion.get(question_id)
                    if question:
                        await question.delete()
                except:
                    pass  # Question might already be deleted
        
        # Delete the test itself
        await test.delete()
        
        return {
            "message": f"Test '{test.skill_name}' deleted successfully",
            "deleted_attempts": len(attempts),
            "deleted_questions": len(test.question_ids) if test.question_ids else 0
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/attempts/{attempt_id}")
async def delete_attempt(
    attempt_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a test attempt"""
    try:
        from skill_assessment_models import SkillTestAttempt
        
        # Get the attempt
        attempt = await SkillTestAttempt.get(attempt_id)
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")
        
        # Check if user owns this attempt
        if attempt.user_id != str(current_user.id):
            raise HTTPException(
                status_code=403, 
                detail="You can only delete your own test attempts"
            )
        
        # Delete the attempt
        await attempt.delete()
        
        return {
            "message": "Test attempt deleted successfully",
            "attempt_id": attempt_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
