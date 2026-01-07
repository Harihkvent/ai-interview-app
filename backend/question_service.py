import json
import logging
import time
import random
import re
from models import QuestionBank
from ai_utils import call_krutrim_api, clean_ai_json, extract_questions_fallback
from cache_service import get_cached_questions, cache_questions
from metrics import (
    questions_generated, 
    question_generation_duration,
    answer_evaluations,
    answer_evaluation_duration
)

logger = logging.getLogger("question_service")

# Question counts per round
ROUND_CONFIG = {
    "aptitude": {"mcq": 10, "descriptive": 0, "coding": 0},
    "technical": {"mcq": 10, "descriptive": 5, "coding": 2},
    "hr": {"mcq": 0, "descriptive": 5, "coding": 0}
}

async def generate_questions(resume_text: str, round_type: str, job_title: str = "General") -> list[dict]:
    """
    Generate round-specific questions based on resume using Krutrim.
    Orchestrates the generation of MCQs and Descriptive questions based on configuration.
    Uses caching to avoid redundant generation.
    """
    start_time = time.time()
    
    # Check Cache First
    cached_qs = await get_cached_questions(resume_text, job_title, round_type)
    if cached_qs:
        logger.info(f"Using cached questions for {round_type} - {job_title}")
        return cached_qs
    
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
        
    # Generate Coding
    num_coding = config.get("coding", 0)
    if num_coding > 0:
        coding_qs = await _generate_coding(resume_text, round_type, num_coding)
        questions.extend(coding_qs)

    # Record metrics
    duration = time.time() - start_time
    questions_generated.labels(round_type=round_type).inc(len(questions))
    question_generation_duration.labels(round_type=round_type).observe(duration)
    
    # Store in Cache
    if questions:
        await cache_questions(resume_text, job_title, round_type, questions)
    
    return questions

async def _generate_mcqs(resume_text: str, round_type: str, count: int) -> list[dict]:
    """Helper to generate MCQs"""
    resume_context = resume_text[:3000] # Use more context for better relevance
    content_focus = "aptitude, mathematics, and logical reasoning" if round_type == "aptitude" else f"technical topics STRICTLY related to this candidate's resume content: {resume_context}"
    
    prompt = f"""Generate exactly {count} multiple-choice questions (MCQs) for {content_focus}.
    
CRITICAL RULES:
1. Each question MUST be highly relevant to the provided resume context.
2. Each question must be challenging and professional.
2. Each MCQ MUST have exactly 4 distinct, meaningful options in a flat array of strings.
3. The "options" field MUST be a list of 4 simple strings. Do NOT put all options in one string or use labels like "A)".
4. Provide exactly one correct answer which MUST BE IDENTICAL to one of the strings in the options list.
5. Return ONLY a JSON array of objects.
6. NO markdown formatting (NO ```json), NO commentary.

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
        response = await call_krutrim_api(messages, temperature=0.7, max_tokens=1500, operation=f"generate_mcq_{round_type}")
        if not response:
            raise ValueError("Empty response from AI")
            
        questions = parse_json_questions(response, count, "mcq")
        return questions[:count]
    except Exception as e:
        logger.error(f"Error generating MCQs: {e}")
        return await get_db_fallback_questions(round_type, count, "mcq")

async def _generate_descriptive(resume_text: str, round_type: str, count: int) -> list[dict]:
    """Helper to generate Descriptive questions"""
    resume_context = resume_text[:3000]
    content_focus = f"technical interview questions based STRICTLY on the skills and experience in this resume: {resume_context}" if round_type == "technical" else f"professional HR and behavioral questions tailored to this candidate's background: {resume_context}"
    
    prompt = f"""Generate exactly {count} high-quality descriptive interview questions for {content_focus}.
    
RULES:
1. Questions MUST be strictly relevant to the resume provided.
2. Questions should be open-ended.
3. Focus on specific projects and skills mentioned in the resume.
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
        response = await call_krutrim_api(messages, temperature=0.7, max_tokens=1500, operation=f"generate_desc_{round_type}")
        if not response:
            raise ValueError("Empty response from AI")
            
        questions = parse_json_questions(response, count, "descriptive")
        return questions[:count]
    except Exception as e:
        logger.error(f"Error generating descriptive questions: {e}")
        return await get_db_fallback_questions(round_type, count, "descriptive")

async def _generate_coding(resume_text: str, round_type: str, count: int) -> list[dict]:
    """Helper to generate coding challenges based on resume"""
    content_focus = f"coding challenges for a candidate with this background: {resume_text[:2000]}"
    
    prompt = f"""Generate exactly {count} coding interview questions based on {content_focus}.
    
RULES:
1. Each question must be a coding challenge.
2. Provide a 'question' description, 'starter_code', and 'test_cases'.
3. 'test_cases' must be a JSON array of objects with 'input' and 'output' keys.
4. Return ONLY a JSON array of objects.
5. NO markdown formatting.

Format:
[
  {{
    "question": "Implement a function to...?",
    "starter_code": "def solution(n):\\n    # Your code here\\n    pass",
    "test_cases": [{{"input": "5", "output": "120"}}],
    "language": "python",
    "type": "coding"
  }}
]

Generate {count} coding challenges now:"""

    messages = [
        {"role": "system", "content": "You are a senior software engineer. Return valid JSON arrays only."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await call_krutrim_api(messages, temperature=0.7, max_tokens=1500, operation=f"generate_coding_{round_type}")
        if not response:
            raise ValueError("Empty response from AI")
            
        questions = parse_json_questions(response, count, "coding")
        return questions[:count]
    except Exception as e:
        logger.error(f"Error generating coding questions: {e}")
        return await get_db_fallback_questions(round_type, count, "coding")

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
                return extract_questions_fallback(response)
                
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
                elif isinstance(raw_options, str):
                    # AI might have stuffed all options into one string
                    # Try splitting by newlines first (most common)
                    if "\n" in raw_options:
                        options_list = [opt.strip() for opt in raw_options.split("\n") if opt.strip()]
                    # Try splitting by common separators
                    elif "," in raw_options:
                        options_list = [opt.strip() for opt in raw_options.replace("Options:", "").split(",")]
                    # Try splitting by semicolons
                    elif ";" in raw_options:
                        options_list = [opt.strip() for opt in raw_options.split(";")]
                    # If no separators, treat as single option (fallback)
                    else:
                        options_list = [raw_options.strip()]
                
                # Further sanitize options
                import re
                sanitized_options = []
                for opt in options_list:
                    if not isinstance(opt, str):
                        sanitized_options.append(str(opt))
                        continue
                    # Remove common prefixes
                    cleaned_opt = re.sub(r'^[A-D][).]\s*|^[1-4][).]\s*|^Option [A-D]:\s*|^Opt\d+:\s*|^Answer:\s*|^Options:\s*', '', opt).strip()
                    if cleaned_opt:
                        sanitized_options.append(cleaned_opt)
                
                # Log and fix if we have issues with options count for MCQs
                if q_type == "mcq" and len(sanitized_options) != 4:
                    logger.warning(f"MCQ has {len(sanitized_options)} options instead of 4. Raw options type: {type(raw_options)}, value: {str(raw_options)[:200]}")
                    # Ensure we have at least 4 options for MCQs
                    while len(sanitized_options) < 4:
                        sanitized_options.append(f"Option {len(sanitized_options) + 1}")
                    # Trim to 4 if more
                    sanitized_options = sanitized_options[:4]

                
                raw_answer = item.get("answer") or item.get("correct_answer")
                final_answer = str(raw_answer) if raw_answer else None
                if final_answer:
                    # Clean the answer string too
                    final_answer = re.sub(r'^[A-D][).]\s*|^[1-4][).]\s*|^Option [A-D]:\s*|^Answer:\s*', '', final_answer).strip()
                
                q_obj = {
                    "question": item["question"],
                    "type": item.get("type", q_type),
                    "options": sanitized_options if sanitized_options else None,
                    "answer": final_answer,
                    "starter_code": item.get("starter_code"),
                    "test_cases": item.get("test_cases"),
                    "language": item.get("language", "python")
                }
                results.append(q_obj)
        
        return results
    except Exception as e:
        logger.error(f"JSON Parse Error: {e}")
        return extract_questions_fallback(response)
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

# ============= Answer Evaluation & Reporting =============

async def evaluate_answer(question: str, answer: str, resume_context: str, round_type: str = "general") -> dict:
    """
    Evaluate user answer using Krutrim.
    Returns: {evaluation: str, score: float}
    """
    start_time = time.time()
    
    prompt = f"""You are an expert interviewer evaluating a candidate's answer.

Resume Context:
{resume_context}

Question: {question}

Candidate's Answer: {answer}

Evaluate this answer and provide:
1. A score from 0 to 10 (where 10 is excellent)
2. Constructive feedback on the answer

Return your response in this EXACT JSON format:
{{"score": <number>, "evaluation": "<your detailed feedback>"}}"""

    messages = [
        {"role": "system", "content": "You are an expert interviewer providing fair and constructive evaluations."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await call_krutrim_api(messages, temperature=0.5, max_tokens=500, operation=f"evaluate_answer_{round_type}")
        if not response:
             raise ValueError("Empty response from AI")
             
        response = clean_ai_json(response)
        result = json.loads(response, strict=False)
        
        # Record metrics
        duration = time.time() - start_time
        score = float(result.get("score", 5.0))
        answer_evaluations.labels(round_type=round_type).inc()
        answer_evaluation_duration.labels(round_type=round_type).observe(duration)
        
        return {
            "evaluation": result.get("evaluation", "Good effort!"),
            "score": score
        }
    except Exception as e:
        logger.error(f"Error evaluating answer: {e}")
        return {
            "evaluation": "Thank you for your answer. Your response has been recorded.",
            "score": 5.0
        }

async def generate_report_content_with_krutrim(session_data: dict) -> str:
    """
    Use Krutrim AI to analyze interview performance and generate comprehensive report content.
    """
    # Simplify the data to avoid token limits
    rounds_summary = []
    for round_data in session_data.get('rounds', []):
        qas = round_data.get('questions_answers', [])
        round_summary = {
            'type': round_data.get('round_type', 'Unknown'),
            'questions_count': len(qas),
            'avg_score': sum(qa.get('score', 0) for qa in qas) / max(len(qas), 1)
        }
        rounds_summary.append(round_summary)
    
    prompt = f"""Generate a professional interview performance report based on this data:

OVERALL STATISTICS:
- Total Score: {session_data.get('total_score', 0):.1f}/10
- Total Time: {session_data.get('total_time_formatted', 'N/A')}
- Rounds Completed: {len(session_data.get('rounds', []))}

ROUND PERFORMANCE:
{json.dumps(rounds_summary, indent=2)}

Generate a brief report with these sections:
1. Executive Summary (2-3 sentences)
2. Performance Highlights
3. Areas for Improvement
4. Overall Recommendation

Keep it concise and professional."""

    messages = [
        {"role": "system", "content": "You are an expert HR analyst creating concise interview reports."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await call_krutrim_api(messages, temperature=0.7, max_tokens=800, operation="generate_report")
        return response
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        return generate_fallback_report(session_data)

def generate_fallback_report(session_data: dict) -> str:
    """Generate a basic report when AI generation fails"""
    total_score = session_data.get('total_score', 0)
    performance_level = "Excellent" if total_score >= 8 else "Good" if total_score >= 6 else "Satisfactory" if total_score >= 4 else "Needs Improvement"
    
    report = f"""# Executive Summary

The candidate completed the interview with an overall score of {total_score:.1f}/10, demonstrating {performance_level.lower()} performance.

## Performance Highlights

- **Overall Score**: {total_score:.1f}/10 ({performance_level})
- **Interview Duration**: {session_data.get('total_time_formatted', 'N/A')}
- **Rounds Completed**: {len(session_data.get('rounds', []))}

### Round-by-Round Performance

"""
    for round_data in session_data.get('rounds', []):
        qas = round_data.get('questions_answers', [])
        if qas:
            avg_score = sum(qa.get('score', 0) for qa in qas) / len(qas)
            report += f"- **{round_data.get('round_type', 'Unknown')} Round**: {avg_score:.1f}/10\n"
    
    report += f"""
## Overall Recommendation
Based on the performance, the candidate shows {"strong potential" if total_score >= 7 else "potential for growth"}.
"""
    return report

async def generate_ai_response(messages: list) -> str:
    """Generate AI response using Krutrim API (legacy chat support)"""
    system_prompt = "You are an AI interviewer conducting a professional job interview. Maintain a professional yet friendly tone."
    api_messages = [{"role": "system", "content": system_prompt}] + messages
    return await call_krutrim_api(api_messages, temperature=0.7, max_tokens=500, operation="chat")
