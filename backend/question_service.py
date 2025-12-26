import json
import logging
import time
import random
from models import QuestionBank
from ai_utils import call_krutrim_api, clean_ai_json
from metrics import (
    questions_generated, 
    question_generation_duration
)

logger = logging.getLogger("question_service")

# Question counts per round
# Technical round now includes MCQs and Descriptive questions
ROUND_CONFIG = {
    "aptitude": {"mcq": 5, "descriptive": 0},
    "technical": {"mcq": 5, "descriptive": 5}, # Updated as per requirements
    "hr": {"mcq": 0, "descriptive": 5}
}

async def generate_questions(resume_text: str, round_type: str) -> list[dict]:
    """
    Generate round-specific questions based on resume using Krutrim.
    Orchestrates the generation of MCQs and Descriptive questions based on configuration.
    """
    start_time = time.time()
    
    config = ROUND_CONFIG.get(round_type, {"mcq": 0, "descriptive": 5})
    num_mcq = config["mcq"]
    num_desc = config["descriptive"]
    
    logger.info(f"Question Service: Generating {round_type} questions (MCQ: {num_mcq}, Desc: {num_desc})")
    
    questions = []
    
    # Generate MCQs
    if num_mcq > 0:
        mcqs = await _generate_mcqs(resume_text, round_type, num_mcq)
        questions.extend(mcqs)

    # Generate Descriptive
    if num_desc > 0:
        descs = await _generate_descriptive(resume_text, round_type, num_desc)
        questions.extend(descs)

    # Record metrics
    duration = time.time() - start_time
    questions_generated.labels(round_type=round_type).inc(len(questions))
    question_generation_duration.labels(round_type=round_type).observe(duration)
    
    return questions

async def _generate_mcqs(resume_text: str, round_type: str, count: int) -> list[dict]:
    """Helper to generate MCQs"""
    content_focus = "aptitude, mathematics, and logical reasoning" if round_type == "aptitude" else f"technical topics related to this resume: {resume_text[:500]}"
    
    prompt = f"""Generate exactly {count} multiple-choice questions (MCQs) for {content_focus}.
    
IMPORTANT RULES:
1. Each question must be challenging and professional.
2. Each MCQ MUST have exactly 4 distinct, meaningful options.
3. DO NOT use generic placeholders like "Option A". Provide actual answers.
4. Provide exactly one correct answer which must be one of the options.
5. Return ONLY a JSON array of objects.

Format:
[
  {{
    "question": "Question text here?",
    "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
    "answer": "Opt2",
    "type": "mcq"
  }}
]

Generate {count} MCQs now:"""

    messages = [
        {"role": "system", "content": "You are an expert technical recruiter. Return valid JSON arrays only."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await call_krutrim_api(messages, temperature=0.7, max_tokens=3000, operation=f"generate_mcq_{round_type}")
        if not response:
            raise ValueError("Empty response from AI")
            
        questions = parse_json_questions(response, count, "mcq")
        return questions[:count]
    except Exception as e:
        logger.error(f"Error generating MCQs: {e}")
        return await get_db_fallback_questions(round_type, count, "mcq")

async def _generate_descriptive(resume_text: str, round_type: str, count: int) -> list[dict]:
    """Helper to generate Descriptive questions"""
    content_focus = f"technical interview questions specific to: {resume_text[:500]}" if round_type == "technical" else "professional HR and behavioral questions"
    
    prompt = f"""Generate exactly {count} high-quality descriptive interview questions for {content_focus}.
    
RULES:
1. Questions should be open-ended.
2. Focus on specific skills in the resume if technical.
3. Return ONLY a JSON array of objects.

Format:
[
  {{
    "question": "Tell me about a time...?",
    "type": "descriptive"
  }}
]

Generate {count} questions now:"""

    messages = [
        {"role": "system", "content": "You are an expert interviewer. Return valid JSON arrays only."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await call_krutrim_api(messages, temperature=0.7, max_tokens=2500, operation=f"generate_desc_{round_type}")
        if not response:
            raise ValueError("Empty response from AI")
            
        questions = parse_json_questions(response, count, "descriptive")
        return questions[:count]
    except Exception as e:
        logger.error(f"Error generating descriptive questions: {e}")
        return await get_db_fallback_questions(round_type, count, "descriptive")

def parse_json_questions(response: str, expected_count: int, q_type: str) -> list[dict]:
    """Helper to parse JSON questions from API response with aggressive cleaning"""
    response = clean_ai_json(response)
    
    try:
        try:
            parsed = json.loads(response, strict=False)
        except json.JSONDecodeError:
            # Clean non-printable chars
            response = "".join(char for char in response if char == '\n' or char == '\r' or char == '\t' or 32 <= ord(char) <= 126)
            parsed = json.loads(response, strict=False)
        
        if not isinstance(parsed, list):
            if isinstance(parsed, dict) and "questions" in parsed:
                parsed = parsed["questions"]
            elif isinstance(parsed, dict):
                parsed = [parsed]
            else:
                return []
                
        results = []
        for item in parsed:
            if isinstance(item, dict) and "question" in item:
                # Handle options
                raw_options = item.get("options")
                options_list = []
                if isinstance(raw_options, list):
                    options_list = raw_options
                elif isinstance(raw_options, dict):
                    options_list = list(raw_options.values())
                
                raw_answer = item.get("answer") or item.get("correct_answer")
                
                q_obj = {
                    "question": item["question"],
                    "type": item.get("type", q_type),
                    "options": options_list if options_list else None,
                    "answer": str(raw_answer) if raw_answer else None
                }
                results.append(q_obj)
        
        return results
    except Exception as e:
        print(f"JSON Parse Error: {e}")
        return []

async def get_db_fallback_questions(round_type: str, count: int, q_type: str) -> list[dict]:
    """Retrieve fallback questions from the Question Bank in DB"""
    try:
        # Map round_type to category if needed (usually 1:1)
        category = round_type
        
        # specific handling for technical to include programming
        query = {
            "category": category,
            "question_type": q_type
        }
        
        # Find all matching questions
        # Using aggregation for random sampling would be better for large sets,
        # but for now, we fetch matches and sample in python to keep it simple with Beanie
        all_matches = await QuestionBank.find(
            QuestionBank.category == category,
            QuestionBank.question_type == q_type
        ).to_list()
        
        if not all_matches and q_type == "mcq" and category == "technical":
             # Fallback: maybe we have general technical questions
             all_matches = await QuestionBank.find(
                QuestionBank.category == "technical",
                QuestionBank.question_type == "mcq"
             ).to_list()
             
        if not all_matches:
            logger.warning(f"No fallback questions found in DB for {category} {q_type}. Using hardcoded.")
            return [get_hardcoded_fallback(round_type, i+1, q_type) for i in range(count)]
            
        # Sample random questions
        selected = random.sample(all_matches, min(count, len(all_matches)))
        
        # If we don't have enough, we might need to duplicate or fill with hardcoded
        results = []
        for q in selected:
            results.append({
                "question": q.question_text,
                "type": q.question_type,
                "options": q.options,
                "answer": q.correct_answer
            })
            
        # Fill remaining if needed
        while len(results) < count:
            results.append(get_hardcoded_fallback(round_type, len(results)+1, q_type))
            
        return results
        
    except Exception as e:
        logger.error(f"Error retrieving DB fallbacks: {e}")
        return [get_hardcoded_fallback(round_type, i+1, q_type) for i in range(count)]

def get_hardcoded_fallback(round_type: str, question_num: int, q_type: str = "descriptive") -> dict:
    """Get meaningful fallback questions when AI generation fails AND DB is empty"""
    if q_type == "mcq":
        return {
            "question": f"Fallback {round_type} MCQ #{question_num}: Select the best option.",
            "type": "mcq",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer": "Option A"
        }
    
    fallbacks = {
        "aptitude": [
            "If you have 5 apples and give away 2, how many do you have?",
            "What comes next: 2, 4, 8, 16...?",
            "Solve for x: 2x + 5 = 15"
        ],
        "technical": [
            "Explain the difference between a process and a thread.",
            "What is a REST API?",
            "Describe the concept of polymorphism."
        ],
        "hr": [
            "Tell me about yourself.",
            "What are your strengths and weaknesses?",
            "Where do you see yourself in 5 years?"
        ]
    }
    
    questions_list = fallbacks.get(round_type, fallbacks["technical"])
    question_text = questions_list[(question_num - 1) % len(questions_list)]
    
    return {
        "question": question_text,
        "type": "descriptive"
    }
