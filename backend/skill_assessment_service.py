"""
Skill Assessment Service - Manage standalone skill tests
"""
from typing import Optional, List, Dict
from datetime import datetime
import logging

from skill_assessment_models import SkillTest, SkillTestAttempt, SkillTestQuestion
from ai_utils import call_krutrim_api

logger = logging.getLogger("skill_assessment_service")


async def get_available_tests(category: Optional[str] = None, difficulty: Optional[str] = None) -> List[SkillTest]:
    """Get list of available skill tests"""
    try:
        query = SkillTest.find(SkillTest.is_active == True)
        
        if category:
            query = query.find(SkillTest.category == category)
        if difficulty:
            query = query.find(SkillTest.difficulty == difficulty)
        
        tests = await query.to_list()
        return tests
    except Exception as e:
        logger.error(f"Error getting available tests: {str(e)}")
        raise


async def get_test_details(test_id: str) -> Optional[SkillTest]:
    """Get detailed information about a skill test"""
    try:
        test = await SkillTest.get(test_id)
        return test
    except Exception as e:
        logger.error(f"Error getting test details: {str(e)}")
        raise


async def start_skill_test(user_id: str, test_id: str) -> SkillTestAttempt:
    """Start a new skill test attempt"""
    try:
        # Get test details
        test = await SkillTest.get(test_id)
        if not test:
            raise ValueError("Test not found")
        
        # Create attempt
        attempt = SkillTestAttempt(
            user_id=user_id,
            skill_test_id=test_id,
            status="in-progress",
            total_questions=test.total_questions,
            started_at=datetime.utcnow()
        )
        await attempt.insert()
        
        logger.info(f"Started skill test attempt {attempt.id} for user {user_id}")
        return attempt
    except Exception as e:
        logger.error(f"Error starting skill test: {str(e)}")
        raise


async def submit_test_answer(
    attempt_id: str,
    question_id: str,
    answer: str,
    time_taken: int
) -> Dict:
    """Submit an answer for a skill test question"""
    try:
        attempt = await SkillTestAttempt.get(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found")
        
        if attempt.status != "in-progress":
            raise ValueError("Test is not in progress")
        
        # Get question
        question = await SkillTestQuestion.get(question_id)
        if not question:
            raise ValueError("Question not found")
        
        # Evaluate answer
        is_correct = False
        if question.question_type == "mcq":
            is_correct = answer.strip().lower() == question.correct_answer.strip().lower()
        else:
            # For descriptive/coding, use AI evaluation
            is_correct = await _evaluate_descriptive_answer(question, answer)
        
        # Add answer to attempt
        answer_data = {
            "question_id": question_id,
            "answer": answer,
            "is_correct": is_correct,
            "time_taken": time_taken
        }
        attempt.answers.append(answer_data)
        
        if is_correct:
            attempt.correct_answers += 1
        
        await attempt.save()
        
        return {
            "is_correct": is_correct,
            "explanation": question.explanation if not is_correct else None
        }
    except Exception as e:
        logger.error(f"Error submitting test answer: {str(e)}")
        raise


async def _evaluate_descriptive_answer(question: SkillTestQuestion, answer: str) -> bool:
    """Evaluate descriptive answer using AI"""
    try:
        prompt = f"""Evaluate if the following answer is correct for the given question.
        
Question: {question.question_text}
Expected Answer: {question.correct_answer}
User's Answer: {answer}

Respond with only "CORRECT" or "INCORRECT" based on whether the user's answer matches the expected answer in meaning."""
        
        messages = [{"role": "user", "content": prompt}]
        result = await call_krutrim_api(messages, temperature=0.3, operation="evaluate_skill_answer")
        
        return "CORRECT" in result.strip().upper()
    except Exception as e:
        logger.error(f"Error evaluating answer: {str(e)}")
        return False


async def complete_skill_test(attempt_id: str) -> Dict:
    """Complete a skill test and calculate final score"""
    try:
        attempt = await SkillTestAttempt.get(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found")
        
        # Calculate score
        if attempt.total_questions > 0:
            attempt.score = (attempt.correct_answers / attempt.total_questions) * 100
        else:
            attempt.score = 0.0
        
        # Get test details for passing score
        test = await SkillTest.get(attempt.skill_test_id)
        attempt.passed = attempt.score >= test.passing_score if test else False
        
        # Determine proficiency level
        if attempt.score >= 90:
            attempt.proficiency_level = "expert"
        elif attempt.score >= 75:
            attempt.proficiency_level = "advanced"
        elif attempt.score >= 60:
            attempt.proficiency_level = "intermediate"
        else:
            attempt.proficiency_level = "beginner"
        
        # Generate recommendations
        attempt.recommendations = await _generate_recommendations(attempt, test)
        
        # Update status
        attempt.status = "completed"
        attempt.completed_at = datetime.utcnow()
        attempt.time_taken_seconds = int((attempt.completed_at - attempt.started_at).total_seconds())
        
        await attempt.save()
        
        logger.info(f"Completed skill test attempt {attempt_id} with score {attempt.score}%")
        
        return {
            "score": attempt.score,
            "passed": attempt.passed,
            "proficiency_level": attempt.proficiency_level,
            "correct_answers": attempt.correct_answers,
            "total_questions": attempt.total_questions,
            "time_taken": attempt.time_taken_seconds,
            "recommendations": attempt.recommendations
        }
    except Exception as e:
        logger.error(f"Error completing skill test: {str(e)}")
        raise


async def _generate_recommendations(attempt: SkillTestAttempt, test: SkillTest) -> List[str]:
    """Generate personalized recommendations based on test performance"""
    recommendations = []
    
    if attempt.score < 60:
        recommendations.append(f"Focus on building foundational knowledge in {test.skill_name}")
        recommendations.append("Consider taking beginner-level courses or tutorials")
    elif attempt.score < 75:
        recommendations.append(f"Good progress! Practice more advanced {test.skill_name} concepts")
        recommendations.append("Work on real-world projects to strengthen your skills")
    elif attempt.score < 90:
        recommendations.append(f"Strong performance! Focus on mastering edge cases in {test.skill_name}")
        recommendations.append("Consider contributing to open-source projects")
    else:
        recommendations.append(f"Excellent mastery of {test.skill_name}!")
        recommendations.append("Consider mentoring others or creating educational content")
    
    return recommendations


async def get_test_results(attempt_id: str) -> Dict:
    """Get detailed results for a completed test"""
    try:
        attempt = await SkillTestAttempt.get(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found")
        
        test = await SkillTest.get(attempt.skill_test_id)
        
        # Get question details for each answer
        detailed_answers = []
        for answer_data in attempt.answers:
            question = await SkillTestQuestion.get(answer_data["question_id"])
            if question:
                detailed_answers.append({
                    "question_text": question.question_text,
                    "user_answer": answer_data["answer"],
                    "correct_answer": question.correct_answer,
                    "is_correct": answer_data["is_correct"],
                    "explanation": question.explanation,
                    "time_taken": answer_data["time_taken"]
                })
        
        return {
            "test_name": test.skill_name if test else "Unknown",
            "score": attempt.score,
            "passed": attempt.passed,
            "proficiency_level": attempt.proficiency_level,
            "correct_answers": attempt.correct_answers,
            "total_questions": attempt.total_questions,
            "time_taken": attempt.time_taken_seconds,
            "recommendations": attempt.recommendations,
            "detailed_answers": detailed_answers
        }
    except Exception as e:
        logger.error(f"Error getting test results: {str(e)}")
        raise


async def get_user_test_history(user_id: str) -> List[Dict]:
    """Get user's skill test history"""
    try:
        attempts = await SkillTestAttempt.find(
            SkillTestAttempt.user_id == user_id
        ).sort("-started_at").to_list()
        
        history = []
        for attempt in attempts:
            test = await SkillTest.get(attempt.skill_test_id)
            history.append({
                "attempt_id": str(attempt.id),
                "test_name": test.skill_name if test else "Unknown",
                "category": test.category if test else "Unknown",
                "score": attempt.score,
                "passed": attempt.passed,
                "proficiency_level": attempt.proficiency_level,
                "status": attempt.status,
                "started_at": attempt.started_at.isoformat(),
                "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None
            })
        
        return history
    except Exception as e:
        logger.error(f"Error getting test history: {str(e)}")
        raise


def parse_text_questions(text: str, skill_name: str, count: int) -> List[Dict]:
    """
    Parse questions from plain text format when AI doesn't return JSON.
    Expected format:
    1. Question text?
    A. Option 1
    B. Option 2
    C. Option 3
    D. Option 4
    Correct Answer: B
    Explanation: Why B is correct
    """
    import re
    questions = []
    lines = text.strip().split('\n')
    
    current_question = None
    current_options = []
    current_correct_answer = None
    current_explanation = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check for correct answer patterns
        answer_match = re.match(r'^(?:correct\s+)?answer\s*:?\s*([A-D])', line, re.IGNORECASE)
        if answer_match:
            current_correct_answer = answer_match.group(1).upper()
            continue
        
        # Check for explanation patterns
        explanation_match = re.match(r'^(?:explanation|why|reason)\s*:?\s*(.+)', line, re.IGNORECASE)
        if explanation_match:
            current_explanation = explanation_match.group(1).strip()
            continue
            
        # Check if it's a question (starts with number or "Question")
        if line[0].isdigit() or line.lower().startswith('question'):
            # Save previous question if exists
            if current_question and len(current_options) >= 4:
                # Only add question if we have a valid correct answer
                if current_correct_answer and current_correct_answer in 'ABCD':
                    questions.append({
                        "question": current_question,
                        "options": current_options[:4],
                        "correct_answer": current_correct_answer,
                        "explanation": current_explanation or f"This is a {skill_name} question."
                    })
                else:
                    logger.warning(f"Skipping question without valid correct answer: {current_question[:50]}...")
            
            # Start new question
            current_question = line.lstrip('0123456789. ').strip()
            current_options = []
            current_correct_answer = None
            current_explanation = None
            
        # Check if it's an option (A., B., C., D.) - also check for asterisk marking correct answer
        elif len(line) >= 2 and line[0].upper() in 'ABCD' and line[1] in '.):':
            option_text = line.strip()
            if not option_text.startswith(line[0].upper() + '.'):
                option_text = line[0].upper() + '. ' + line[2:].strip()
            
            # Check if this option is marked with asterisk as correct
            if '*' in option_text or option_text.startswith('* '):
                current_correct_answer = line[0].upper()
                option_text = option_text.replace('*', '').strip()
            
            current_options.append(option_text)
    
    # Don't forget the last question
    if current_question and len(current_options) >= 4:
        if current_correct_answer and current_correct_answer in 'ABCD':
            questions.append({
                "question": current_question,
                "options": current_options[:4],
                "correct_answer": current_correct_answer,
                "explanation": current_explanation or f"This is a {skill_name} question."
            })
        else:
            logger.warning(f"Skipping last question without valid correct answer: {current_question[:50]}...")
    
    return questions[:count]  # Return only requested count


async def generate_skill_questions(skill_name: str, category: str, count: int = 10) -> List[str]:
    """Generate skill test questions using AI"""
    try:
        prompt = f"""You are a technical interviewer creating {count} multiple-choice questions about {skill_name} ({category} category).

CRITICAL REQUIREMENTS:
1. Return ONLY a valid JSON array - NO explanatory text before or after
2. Each question must have exactly 4 options labeled A, B, C, D
3. Specify the correct answer as a single letter (A, B, C, or D)
4. Provide a detailed explanation for why the answer is correct
5. Create REAL {skill_name} questions with varying difficulty
6. Ensure correct answers are distributed across all options (not all A)

EXACT JSON FORMAT (return array like this):
[
  {{
    "question": "What is the purpose of the SELECT statement in SQL?",
    "options": [
      "A. To retrieve data from a database",
      "B. To delete data from a database",
      "C. To update existing records",
      "D. To create a new table"
    ],
    "correct_answer": "A",
    "explanation": "The SELECT statement is used to query and retrieve data from one or more tables in a database. It's the most commonly used SQL command for data retrieval."
  }}
]

Now generate {count} {skill_name} questions following this EXACT format. Return ONLY the JSON array:"""
        
        messages = [{"role": "user", "content": prompt}]
        response_text = await call_krutrim_api(messages, temperature=0.7, max_tokens=2000, operation="generate_skill_questions")
        
        # Parse and save questions
        import json
        from ai_utils import clean_ai_json
        
        logger.info(f"Generating {count} questions for {skill_name}")
        logger.info(f"Raw AI response length: {len(response_text)}")
        logger.info(f"Raw AI response: {response_text[:300]}...")  # Log first 300 chars
        
        cleaned_response = clean_ai_json(response_text)
        logger.info(f"Cleaned response: {cleaned_response[:300]}...")
        
        questions_data = None
        
        # Try to parse JSON
        try:
            questions_data = json.loads(cleaned_response)
            logger.info("Successfully parsed JSON response")
        except json.JSONDecodeError as e:
            logger.warning(f"JSON decode failed: {str(e)}")
            logger.warning("Attempting to parse as plain text format...")
            
            # Fallback: Parse plain text format
            try:
                questions_data = parse_text_questions(response_text, skill_name, count)
                if questions_data:
                    logger.info(f"Successfully parsed {len(questions_data)} questions from text format")
                else:
                    raise ValueError("Failed to parse any questions from text format")
            except Exception as parse_err:
                logger.error(f"Text parsing also failed: {str(parse_err)}")
                raise ValueError(f"AI response could not be parsed as JSON or text format. Please try again.")
        
        if not isinstance(questions_data, list):
            raise ValueError(f"Expected list of questions, got {type(questions_data)}")
        
        if len(questions_data) == 0:
            raise ValueError("AI returned empty question list")
        
        question_ids = []
        for i, q_data in enumerate(questions_data):
            try:
                question = SkillTestQuestion(
                    skill_name=skill_name,
                    category=category,
                    question_text=q_data["question"],
                    question_type="mcq",
                    options=q_data["options"],
                    correct_answer=q_data["correct_answer"],
                    explanation=q_data.get("explanation", ""),
                    difficulty="medium"
                )
                await question.insert()
                question_ids.append(str(question.id))
            except KeyError as e:
                logger.error(f"Question {i+1} missing required field: {str(e)}")
                continue
        
        if len(question_ids) == 0:
            raise ValueError("Failed to create any valid questions from AI response")
        
        logger.info(f"Successfully created {len(question_ids)} questions")
        return question_ids
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}")
        raise
