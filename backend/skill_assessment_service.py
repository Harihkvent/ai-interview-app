"""
Skill Assessment Service - Manage standalone skill tests
"""
from typing import Optional, List, Dict
from datetime import datetime
import logging

from skill_assessment_models import SkillTest, SkillTestAttempt, SkillTestQuestion
from ai_utils import call_krutrim_api

logger = logging.getLogger("skill_assessment_service")


async def get_available_tests(user_id: str, category: Optional[str] = None, difficulty: Optional[str] = None) -> List[SkillTest]:
    """Get list of available skill tests (user's own tests + system tests)"""
    try:
        from beanie.operators import Or
        
        # Filter to show only tests created by the user OR system tests
        query = SkillTest.find(
            SkillTest.is_active == True,
            Or(
                SkillTest.created_by == user_id,
                SkillTest.created_by == "system"
            )
        )
        
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
            # Extract just the letter (A, B, C, or D) from both answers
            import re
            
            # Extract letter from user's answer (handles "A", "A.", "A. Option text", etc.)
            user_answer_match = re.match(r'^([A-D])', answer.strip().upper())
            user_answer_letter = user_answer_match.group(1) if user_answer_match else answer.strip().upper()
            
            # Extract letter from correct answer
            correct_answer_match = re.match(r'^([A-D])', question.correct_answer.strip().upper())
            correct_answer_letter = correct_answer_match.group(1) if correct_answer_match else question.correct_answer.strip().upper()
            
            # Compare just the letters
            is_correct = user_answer_letter == correct_answer_letter
            
            logger.info(f"Answer comparison - User: '{user_answer_letter}', Correct: '{correct_answer_letter}', Match: {is_correct}")
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


async def skip_test_question(
    attempt_id: str,
    question_id: str
) -> Dict:
    """Skip a question without answering it"""
    try:
        attempt = await SkillTestAttempt.get(attempt_id)
        if not attempt:
            raise ValueError("Attempt not found")
        
        if attempt.status != "in-progress":
            raise ValueError("Test is not in progress")
        
        # Mark question as skipped
        skip_data = {
            "question_id": question_id,
            "answer": "",
            "is_skipped": True,
            "time_taken": 0
        }
        attempt.answers.append(skip_data)
        attempt.skipped_count += 1
        
        await attempt.save()
        
        logger.info(f"Skipped question {question_id} in attempt {attempt_id}")
        
        return {
            "message": "Question skipped"
        }
    except Exception as e:
        logger.error(f"Error skipping question: {str(e)}")
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
        
        # Calculate score based on answered questions only (excluding skipped)
        answered_questions = attempt.total_questions - attempt.skipped_count
        
        if answered_questions > 0:
            attempt.score = (attempt.correct_answers / answered_questions) * 100
        else:
            # If all questions were skipped, score is 0
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
        
        logger.info(f"Completed skill test attempt {attempt_id} with score {attempt.score}% ({attempt.correct_answers}/{answered_questions} answered, {attempt.skipped_count} skipped)")
        
        return {
            "score": attempt.score,
            "passed": attempt.passed,
            "proficiency_level": attempt.proficiency_level,
            "correct_answers": attempt.correct_answers,
            "total_questions": attempt.total_questions,
            "answered_questions": answered_questions,
            "skipped_count": attempt.skipped_count,
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
                # Check if question was skipped
                is_skipped = answer_data.get("is_skipped", False)
                
                detailed_answers.append({
                    "question_text": question.question_text,
                    "user_answer": answer_data["answer"],
                    "correct_answer": question.correct_answer,
                    "is_correct": answer_data.get("is_correct", False) if not is_skipped else None,
                    "is_skipped": is_skipped,
                    "explanation": question.explanation,
                    "time_taken": answer_data["time_taken"]
                })
        
        # Calculate answered questions (excluding skipped)
        answered_questions = attempt.total_questions - attempt.skipped_count
        
        return {
            "test_name": test.skill_name if test else "Unknown",
            "score": attempt.score,
            "passed": attempt.passed,
            "proficiency_level": attempt.proficiency_level,
            "correct_answers": attempt.correct_answers,
            "total_questions": attempt.total_questions,
            "answered_questions": answered_questions,
            "skipped_count": attempt.skipped_count,
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
    Handles many formats:
    - "Correct Answer: B" / "Answer: B" lines
    - Asterisk-marked options: "*B. Option" or "B. Option *"
    - Bold-marked options: "**B. Option**"
    - Parenthetical markers: "B. Option (correct)"
    - Checkmark markers: "B. Option ✓"
    """
    import re
    questions = []
    lines = text.strip().split('\n')
    
    current_question = None
    current_options = []
    current_correct_answer = None
    current_explanation = None
    
    def _save_question():
        """Save the current question if valid."""
        nonlocal current_question, current_options, current_correct_answer, current_explanation
        if current_question and len(current_options) >= 4:
            if current_correct_answer and current_correct_answer in 'ABCD':
                questions.append({
                    "question": current_question,
                    "options": current_options[:4],
                    "correct_answer": current_correct_answer,
                    "explanation": current_explanation or f"The correct answer for this {skill_name} question is {current_correct_answer}."
                })
            else:
                logger.warning(f"Skipping question without valid correct answer: {current_question[:50]}...")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check for correct answer patterns (many formats)
        # Matches: "Correct Answer: B", "Answer: B", "Correct: B", "Ans: B", "Answer - B"
        answer_match = re.match(
            r'^(?:correct\s+)?(?:answer|ans)\s*[:\-]?\s*(?:option\s+)?([A-D])\b',
            line, re.IGNORECASE
        )
        if answer_match:
            current_correct_answer = answer_match.group(1).upper()
            continue
        
        # Also check for "The correct answer is B" or "The answer is B"
        answer_match2 = re.match(
            r'^(?:the\s+)?(?:correct\s+)?answer\s+is\s+(?:option\s+)?([A-D])\b',
            line, re.IGNORECASE
        )
        if answer_match2:
            current_correct_answer = answer_match2.group(1).upper()
            continue
        
        # Check for explanation patterns
        explanation_match = re.match(r'^(?:explanation|why|reason)\s*:?\s*(.+)', line, re.IGNORECASE)
        if explanation_match:
            current_explanation = explanation_match.group(1).strip()
            continue
            
        # Check if it's a question (starts with number or "Question")
        question_match = re.match(r'^(?:(?:question\s*)?\d+[.):\s]|question\s)', line, re.IGNORECASE)
        if question_match:
            # Save previous question
            _save_question()
            
            # Start new question - strip the number prefix
            current_question = re.sub(r'^(?:question\s*)?\d+[.):\s]+\s*', '', line, flags=re.IGNORECASE).strip()
            current_options = []
            current_correct_answer = None
            current_explanation = None
            
        # Check if it's an option (A., B., C., D.) with various markers for correct answer
        elif len(line) >= 2 and line.lstrip('*').strip()[:1].upper() in 'ABCD':
            # Remove leading asterisks/bold markers to get the letter
            clean_line = line.lstrip('* ')
            if len(clean_line) >= 2 and clean_line[0].upper() in 'ABCD' and clean_line[1] in '.):- ':
                letter = clean_line[0].upper()
                option_text = letter + '. ' + clean_line[2:].strip()
                
                # Detect correct answer markers
                is_marked_correct = False
                
                # Check for asterisk markers: *B. Option* or B. Option *
                if line.startswith('*') or line.endswith('*') or '**' in line:
                    is_marked_correct = True
                
                # Check for (correct) or (right) or (answer) markers
                if re.search(r'\((?:correct|right|answer|✓|✔)\)', option_text, re.IGNORECASE):
                    is_marked_correct = True
                    option_text = re.sub(r'\s*\((?:correct|right|answer|✓|✔)\)', '', option_text, flags=re.IGNORECASE).strip()
                
                # Check for checkmark or arrow markers
                if any(marker in option_text for marker in ['✓', '✔', '←', '⬅', '✅']):
                    is_marked_correct = True
                    for marker in ['✓', '✔', '←', '⬅', '✅']:
                        option_text = option_text.replace(marker, '').strip()
                
                if is_marked_correct:
                    current_correct_answer = letter
                    # Clean bold markers from option text
                    option_text = option_text.replace('**', '').replace('*', '').strip()
                    # Re-add the letter prefix if it got stripped
                    if not option_text.startswith(letter):
                        option_text = letter + '. ' + option_text
                
                current_options.append(option_text)
    
    # Don't forget the last question
    _save_question()
    
    return questions[:count]


async def generate_skill_questions(skill_name: str, category: str, count: int = 10) -> List[str]:
    """Generate skill test questions using AI with retry logic"""
    import json
    from ai_utils import clean_ai_json
    
    max_attempts = 2
    
    for attempt_num in range(1, max_attempts + 1):
        try:
            logger.info(f"Generating {count} questions for {skill_name} (attempt {attempt_num}/{max_attempts})")
            
            # System message to enforce JSON output
            system_message = {
                "role": "system",
                "content": "You are a JSON API that generates quiz questions. You MUST respond with ONLY a valid JSON array. No markdown, no explanations, no text before or after the JSON. Your entire response must be parseable by json.loads()."
            }
            
            user_prompt = f"""Generate exactly {count} multiple-choice questions about {skill_name} ({category} category).

RULES:
1. Return ONLY a valid JSON array - absolutely NO text before or after
2. Each question MUST have exactly 4 options (A, B, C, D)
3. Each question MUST have a correct_answer field with a SINGLE letter (A, B, C, or D)
4. Each question MUST have a detailed explanation of WHY the correct answer is right
5. DISTRIBUTE correct answers evenly across A, B, C, and D - do NOT make them all the same letter
6. Questions should have varying difficulty (easy, medium, hard)

JSON FORMAT - return exactly this structure:
[{{
  "question": "What does the 'self' parameter refer to in Python classes?",
  "options": ["A. The class itself", "B. The current instance of the class", "C. The parent class", "D. A global variable"],
  "correct_answer": "B",
  "explanation": "In Python, 'self' refers to the current instance of the class. It allows access to instance attributes and methods. It is automatically passed when calling methods on an object."
}}, {{
  "question": "Which OOP principle allows a child class to provide a specific implementation of a method defined in its parent class?",
  "options": ["A. Encapsulation", "B. Abstraction", "C. Polymorphism", "D. Inheritance"],
  "correct_answer": "C",
  "explanation": "Polymorphism allows objects of different classes to respond to the same method call in different ways. Method overriding is a form of polymorphism where a child class provides its own implementation of a parent class method."
}}]

Generate {count} questions about {skill_name} now. Return ONLY the JSON array:"""

            messages = [system_message, {"role": "user", "content": user_prompt}]
            
            # More tokens for better quality - ~300 tokens per question with explanations
            max_tokens_needed = min(max(2500, count * 350), 4000)
            response_text = await call_krutrim_api(
                messages, temperature=0.7, max_tokens=max_tokens_needed, 
                operation="generate_skill_questions"
            )
            
            if not response_text or not response_text.strip():
                logger.error("Empty response from AI API")
                if attempt_num < max_attempts:
                    continue
                raise ValueError("AI returned empty response")
            
            logger.info(f"Raw AI response length: {len(response_text)}")
            logger.info(f"Raw AI response (first 500 chars): {response_text[:500]}")
            
            # Try to parse as JSON first
            questions_data = None
            
            cleaned_response = clean_ai_json(response_text)
            logger.info(f"Cleaned response (first 300 chars): {cleaned_response[:300]}")
            
            try:
                questions_data = json.loads(cleaned_response)
                logger.info(f"Successfully parsed JSON response with {len(questions_data) if isinstance(questions_data, list) else 'non-list'} items")
            except json.JSONDecodeError as e:
                logger.warning(f"JSON decode failed: {str(e)}")
                logger.warning("Attempting to parse as plain text format...")
                
                # Fallback: Parse plain text format
                questions_data = parse_text_questions(response_text, skill_name, count)
                if questions_data:
                    logger.info(f"Successfully parsed {len(questions_data)} questions from text format")
                else:
                    logger.error("Text parsing also returned 0 questions")
                    if attempt_num < max_attempts:
                        logger.info("Retrying with a new API call...")
                        continue
                    raise ValueError("AI response could not be parsed as JSON or text format. Please try again.")
            
            # Handle dict wrapper
            if isinstance(questions_data, dict):
                for key, value in questions_data.items():
                    if isinstance(value, list) and len(value) > 0:
                        logger.info(f"Unwrapped questions list from dict key '{key}'")
                        questions_data = value
                        break
                else:
                    raise ValueError(f"Expected list of questions, got dict with keys: {list(questions_data.keys())}")
            
            if not isinstance(questions_data, list):
                raise ValueError(f"Expected list of questions, got {type(questions_data)}")
            
            if len(questions_data) == 0:
                if attempt_num < max_attempts:
                    logger.info("Got 0 questions, retrying...")
                    continue
                raise ValueError("AI returned empty question list")
            
            # Validate and save questions
            question_ids = []
            answer_distribution = {'A': 0, 'B': 0, 'C': 0, 'D': 0}
            
            for i, q_data in enumerate(questions_data):
                try:
                    # Validate required fields
                    q_text = q_data.get("question", "").strip()
                    q_options = q_data.get("options", [])
                    q_correct = q_data.get("correct_answer", "").strip().upper()
                    q_explanation = q_data.get("explanation", "").strip()
                    
                    if not q_text:
                        logger.warning(f"Question {i+1}: empty question text, skipping")
                        continue
                    
                    if len(q_options) < 4:
                        logger.warning(f"Question {i+1}: only {len(q_options)} options, skipping")
                        continue
                    
                    # Validate correct answer is A, B, C, or D
                    if q_correct not in ('A', 'B', 'C', 'D'):
                        # Try to extract just the letter from strings like "A. Option text"
                        if q_correct and q_correct[0] in 'ABCD':
                            q_correct = q_correct[0]
                        else:
                            logger.warning(f"Question {i+1}: invalid correct_answer '{q_correct}', skipping")
                            continue
                    
                    if not q_explanation:
                        q_explanation = f"The correct answer is {q_correct}."
                    
                    answer_distribution[q_correct] += 1
                    
                    question = SkillTestQuestion(
                        skill_name=skill_name,
                        category=category,
                        question_text=q_text,
                        question_type="mcq",
                        options=q_options[:4],
                        correct_answer=q_correct,
                        explanation=q_explanation,
                        difficulty="medium"
                    )
                    await question.insert()
                    question_ids.append(str(question.id))
                except Exception as qe:
                    logger.error(f"Question {i+1} failed: {str(qe)}")
                    continue
            
            logger.info(f"Answer distribution: {answer_distribution}")
            
            if len(question_ids) == 0:
                if attempt_num < max_attempts:
                    logger.info("No valid questions created, retrying...")
                    continue
                raise ValueError("Failed to create any valid questions from AI response")
            
            if len(question_ids) < count:
                logger.warning(f"Only created {len(question_ids)} questions out of {count} requested.")
            
            logger.info(f"Successfully created {len(question_ids)} out of {count} requested questions")
            return question_ids
            
        except Exception as e:
            if attempt_num < max_attempts:
                logger.warning(f"Attempt {attempt_num} failed: {str(e)}, retrying...")
                continue
            logger.error(f"Error generating questions after {max_attempts} attempts: {str(e)}")
            raise
