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

# Question counts per round - STRICT CONFIGURATION
ROUND_CONFIG = {
    "aptitude": {"mcq": 10, "descriptive": 0, "coding": 0},  # Only MCQs for aptitude
    "technical": {"mcq": 7, "descriptive": 5, "coding": 3},  # Mixed with mandatory coding
    "hr": {"mcq": 0, "descriptive": 8, "coding": 0}  # Only descriptive for HR
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
        mcqs = await _generate_mcqs(resume_text, round_type, num_mcq, job_title)
        questions.extend(mcqs)

    # Generate Descriptive
    if num_desc > 0:
        descs = await _generate_descriptive(resume_text, round_type, num_desc, job_title)
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

async def _generate_mcqs(resume_text: str, round_type: str, count: int, job_title: str = "General") -> list[dict]:
    """Helper to generate MCQs with Chain-of-Thought prompting"""
    
    # === DB-FIRST APPROACH FOR APTITUDE ===
    # For aptitude questions, try to fetch from pre-populated QuestionBank first
    if round_type == "aptitude":
        db_questions = await get_db_fallback_questions("aptitude", count, "mcq")
        # If we got enough questions from DB, use them (no AI call needed)
        if db_questions and len(db_questions) >= count:
            logger.info(f"✅ Using {len(db_questions)} pre-populated aptitude questions from DB (no AI call)")
            # Randomize options for each question
            for q in db_questions:
                randomize_mcq_options(q)
            return db_questions[:count]
        else:
            logger.info(f"⚠️ Only {len(db_questions) if db_questions else 0} aptitude questions in DB, falling back to AI generation")
    
    resume_context = resume_text[:3000]
    
    # Round-specific prompting with CoT
    if round_type == "aptitude":
        focus_area = "aptitude, logical reasoning, quantitative ability, and problem-solving"
        system_role = "You are an expert aptitude test creator. Think step-by-step to create challenging questions."
        
        # Chain-of-Thought example
        cot_example = """
Let me think through creating a good aptitude MCQ:
1. Choose a topic: Speed, Distance, Time
2. Create a realistic scenario
3. Design 4 plausible options with different calculation approaches
4. Place the correct answer in position 3 (not always first!)

Result:
{
  "question": "A train travels 240 km in 4 hours. If it increases its speed by 20 km/h, how long will it take to cover the same distance?",
  "options": ["2 hours", "2.5 hours", "3 hours", "3.5 hours"],
  "answer": "3 hours",
  "type": "mcq"
}"""
        
        instructions = f"""You are creating aptitude questions. Use Chain-of-Thought reasoning:

STEP 1: Choose a topic (logical reasoning, math, patterns, data interpretation)
STEP 2: Create a clear, challenging question
STEP 3: Design 4 distinct options where:
   - All options are plausible
   - Correct answer is in DIFFERENT positions (not always first!)
   - Options represent different approaches/mistakes
STEP 4: Verify the question is clear and unambiguous

Example of thinking process:
{cot_example}

DO NOT reference the resume for aptitude questions."""

    else:  # technical
        focus_area = f"technical knowledge directly related to the candidate's skills"
        system_role = "You are a senior technical interviewer. Use step-by-step reasoning to create targeted questions."
        
        cot_example = f"""
Let me analyze the resume and create a technical MCQ:
1. Resume shows: Python, React, REST APIs
2. Choose: REST API concepts
3. Frame in second person: "In YOUR experience..."
4. Create 4 options, place correct answer in position 2

Result:
{{
  "question": "In YOUR REST API development, which HTTP method would YOU use for updating a partial resource?",
  "options": ["PUT", "PATCH", "POST", "UPDATE"],
  "answer": "PATCH",
  "type": "mcq"
}}"""
        
        instructions = f"""Analyze this resume and use Chain-of-Thought:

RESUME CONTEXT:
{resume_context}

STEP 1: Identify 2-3 key technologies from the resume
STEP 2: For each technology, think of a practical scenario
STEP 3: Frame question in SECOND PERSON (YOU/YOUR)
STEP 4: Create 4 options with correct answer in VARYING positions
STEP 5: Ensure question tests practical knowledge, not just theory

Example thinking:
{cot_example}

CRITICAL: ALL questions MUST use "YOU/YOUR" - speak directly to the candidate!"""

    prompt = f"""{instructions}

Now generate {count} MCQs following this process.

ABSOLUTE REQUIREMENTS:
1. SECOND PERSON ONLY: Use "YOU/YOUR/HAVE YOU" - NEVER "the candidate/they/their"
2. Each MCQ has EXACTLY 4 options as a JSON array
3. Correct answer MUST match one option EXACTLY
4. ⚠️ CRITICAL: Vary which position (1-4) has the correct answer - DO NOT put all correct answers first!
5. Think through each question step-by-step before writing

Return ONLY valid JSON array:
[
  {{
    "question": "Question using YOU/YOUR?",
    "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
    "answer": "Opt2",
    "type": "mcq"
  }}
]

Generate {count} MCQs now:"""

    messages = [
        {"role": "system", "content": system_role},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await call_krutrim_api(messages, temperature=0.8, max_tokens=2000, operation=f"generate_mcq_{round_type}")
        if not response:
            raise ValueError("Empty response from AI")
            
        questions = parse_json_questions(response, count, "mcq")
        
        # Validate and fix MCQs
        validated_questions = []
        for q in questions:
            if validate_and_fix_mcq(q):
                # CRITICAL: Randomize the position of the correct answer
                randomize_mcq_options(q)
                validated_questions.append(q)
        
        return validated_questions[:count]
    except Exception as e:
        logger.error(f"Error generating MCQs: {e}")
        return await get_db_fallback_questions(round_type, count, "mcq")

def randomize_mcq_options(question: dict) -> None:
    """
    Randomize the order of MCQ options to prevent answer bias.
    This ensures the correct answer is not always in the first position.
    """
    if question.get("type") != "mcq" or not question.get("options"):
        return
    
    options = question["options"]
    correct_answer = question["answer"]
    
    # Shuffle the options
    random.shuffle(options)
    
    # Update the question with shuffled options
    question["options"] = options
    
    # The answer remains the same text, just in a different position now
    logger.debug(f"Randomized options. Correct answer '{correct_answer}' now at position {options.index(correct_answer) + 1}")


async def _generate_descriptive(resume_text: str, round_type: str, count: int, job_title: str = "General") -> list[dict]:
    """Helper to generate Descriptive questions with improved prompting"""
    resume_context = resume_text[:3000]
    
    if round_type == "technical":
        system_role = "You are a senior technical interviewer conducting in-depth technical assessments."
        focus_instructions = f"""Analyze this candidate's resume for a {job_title} position:

{resume_context}

Generate {count} technical interview questions that:
1. Test deep understanding of technologies they claim to know
2. Ask about specific projects or experiences mentioned
3. Probe problem-solving and system design skills
4. Assess best practices and code quality awareness
5. Are open-ended to allow detailed responses

CRITICAL: Frame ALL questions in SECOND PERSON (YOU/YOUR) as if directly asking the candidate:
- CORRECT: "Describe YOUR approach to..."
- CORRECT: "How did YOU handle..."
- CORRECT: "Tell me about YOUR experience with..."
- WRONG: "Describe the candidate's approach..."
- WRONG: "Did the candidate work on..."

Example questions:
- "Describe the architecture of [specific project from YOUR resume]. What were the key technical challenges YOU faced?"
- "How would YOU optimize [technology from YOUR resume] for high-traffic scenarios?"
- "Explain YOUR approach to [specific skill from YOUR resume] in production environments."
- "Tell me about a time when YOU had to debug a complex issue in [technology from resume]."
"""
    else:  # hr
        system_role = "You are an experienced HR professional conducting behavioral interviews."
        focus_instructions = f"""Analyze this candidate's background:

{resume_context}

Generate {count} behavioral/HR questions that:
1. Assess cultural fit and soft skills
2. Explore leadership and teamwork experiences
3. Understand career motivations and goals
4. Evaluate problem-solving in workplace scenarios
5. Are based on their actual experience level and background

CRITICAL: Frame ALL questions in SECOND PERSON (YOU/YOUR) as if directly asking the candidate:
- CORRECT: "Tell me about a time when YOU..."
- CORRECT: "How do YOU handle..."
- CORRECT: "What are YOUR strengths..."
- WRONG: "Tell me about a time when the candidate..."
- WRONG: "What are the candidate's strengths..."

Example questions:
- "Tell me about a time when YOU had to handle a difficult team member."
- "Describe a situation where YOU had to learn a new technology quickly."
- "How do YOU prioritize tasks when working on multiple projects?"
- "What motivates YOU in YOUR work?"
"""

    prompt = f"""{focus_instructions}

RULES:
1. Questions MUST be relevant to the candidate's actual experience
2. Use the STAR method framework (Situation, Task, Action, Result)
3. Questions should be open-ended and encourage detailed responses
4. Avoid generic questions - tailor to this specific candidate
5. ALL questions MUST be in SECOND PERSON (YOU/YOUR) - speak directly to the candidate
6. Return ONLY a JSON array of objects

Format:
[
  {{
    "question": "Your tailored question here using YOU/YOUR?",
    "type": "descriptive"
  }}
]

Generate {count} questions now:"""

    messages = [
        {"role": "system", "content": system_role},
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

def validate_and_fix_mcq(question: dict) -> bool:
    """Validate and fix MCQ structure"""
    if not question.get("question") or not question.get("options") or not question.get("answer"):
        return False
    
    options = question["options"]
    answer = question["answer"]
    
    # Ensure exactly 4 options
    if len(options) != 4:
        logger.warning(f"MCQ has {len(options)} options, expected 4")
        return False
    
    # Ensure answer matches one of the options
    if answer not in options:
        logger.warning(f"Answer '{answer}' not in options: {options}")
        # Try to find closest match
        for opt in options:
            if answer.lower() in opt.lower() or opt.lower() in answer.lower():
                question["answer"] = opt
                logger.info(f"Fixed answer to: {opt}")
                return True
        # If no match, set to first option as fallback
        question["answer"] = options[0]
        logger.warning(f"Defaulting answer to first option: {options[0]}")
    
    return True

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
                    cleaned_opt = re.sub(r'^[A-D][).]\\s*|^[1-4][).]\\s*|^Option [A-D]:\\s*|^Opt\\d+:\\s*|^Answer:\\s*|^Options:\\s*', '', opt).strip()
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
                    final_answer = re.sub(r'^[A-D][).]\\s*|^[1-4][).]\\s*|^Option [A-D]:\\s*|^Answer:\\s*', '', final_answer).strip()
                
                q_obj = {
                    "question": item["question"],
                    "type": q_type,  # Always use the requested type, not AI's response
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
