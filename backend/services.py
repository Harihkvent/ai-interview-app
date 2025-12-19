import json
import time
import re
from ai_utils import call_krutrim_api, clean_ai_json

# Question counts per round
ROUND_CONFIG = {
    "aptitude": {"mcq": 5, "descriptive": 0},
    "technical": {"mcq": 10, "descriptive": 10},
    "hr": {"mcq": 0, "descriptive": 5}
}


async def generate_questions_from_resume(resume_text: str, round_type: str) -> list[dict]:
    """
    Generate round-specific questions based on resume using Krutrim
    Returns list of question objects: {text, type, options, correct_answer}
    """
    start_time = time.time()
    
    config = ROUND_CONFIG.get(round_type, {"mcq": 0, "descriptive": 5})
    num_mcq = config["mcq"]
    num_desc = config["descriptive"]
    
    questions = []
    
    # Generate MCQs if needed
    if num_mcq > 0:
        content_focus = "aptitude, mathematics, and logical reasoning" if round_type == "aptitude" else f"technical topics related to this resume: {resume_text[:500]}"
        
        prompt = f"""Generate exactly {num_mcq} multiple-choice questions (MCQs) for {content_focus}.
        
IMPORTANT RULES:
1. Each question must be challenging and professional.
2. Each MCQ MUST have exactly 4 distinct, meaningful options.
3. DO NOT use generic placeholders like "Option A", "Option 1", etc. Provide actual possible answers.
4. Provide exactly one correct answer which must be one of the strings in the options list.
5. Return ONLY a JSON array of objects.

Format:
[
  {{
    "question": "What is the time complexity of a binary search?",
    "options": ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
    "answer": "O(log n)",
    "type": "mcq"
  }}
]

Generate {num_mcq} MCQs now:"""

        messages = [
            {"role": "system", "content": "You are an expert technical recruiter. You always return valid JSON arrays focused on high-quality interview questions. Never use placeholders for options."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = await call_krutrim_api(messages, temperature=0.7, max_tokens=3000, operation="generate_mcq")
            mcqs = parse_json_questions(response, num_mcq, "mcq")
            if not mcqs:
                raise ValueError("Parsed MCQ list is empty")
            questions.extend(mcqs[:num_mcq])
        except Exception as e:
            print(f"Error generating MCQs: {e}")
            for i in range(num_mcq):
                questions.append(get_fallback_question(round_type, i+1, "mcq"))

    # Generate Descriptive questions if needed
    if num_desc > 0:
        content_focus = f"technical interview questions specifically based on this resume content: {resume_text[:500]}" if round_type == "technical" else "professional HR and behavioral questions to assess culture fit and soft skills"
        
        prompt = f"""Generate exactly {num_desc} high-quality descriptive interview questions for {content_focus}.
        
RULES:
1. Questions should be open-ended and require a detailed response.
2. Focus on specific skills mentioned in the resume for technical rounds.
3. Return ONLY a JSON array of objects.

Format:
[
  {{
    "question": "Tell me about a time you had to optimize a slow database query?",
    "type": "descriptive"
  }}
]

Generate {num_desc} questions now:"""

        messages = [
            {"role": "system", "content": "You are an expert interviewer. You always return valid JSON arrays of professional questions."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = await call_krutrim_api(messages, temperature=0.7, max_tokens=2500, operation="generate_desc")
            descs = parse_json_questions(response, num_desc, "descriptive")
            if not descs:
                raise ValueError("Parsed descriptive list is empty")
            questions.extend(descs[:num_desc])
        except Exception as e:
            print(f"Error generating descriptive questions: {e}")
            for i in range(num_desc):
                questions.append(get_fallback_question(round_type, len(questions)+1, "descriptive"))

    # Record metrics
    duration = time.time() - start_time
    questions_generated.labels(round_type=round_type).inc(len(questions))
    question_generation_duration.labels(round_type=round_type).observe(duration)
    
    return questions

def parse_json_questions(response: str, expected_count: int, q_type: str) -> list[dict]:
    """Helper to parse JSON questions from API response with aggressive cleaning"""
    response = clean_ai_json(response)
    
    try:
        # Clean control characters inside the string manually if json.loads fails
        try:
            parsed = json.loads(response, strict=False)
        except json.JSONDecodeError:
            # Last ditch effort: remove all non-printable characters except space/newline/etc
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

def get_fallback_question(round_type: str, question_num: int, q_type: str = "descriptive") -> dict:
    """Get meaningful fallback questions when AI generation fails"""
    if q_type == "mcq":
        return {
            "question": f"Fallback {round_type} MCQ #{question_num}: What is the output of 1 + 1?",
            "type": "mcq",
            "options": ["1", "2", "3", "4"],
            "answer": "2"
        }
    
    fallbacks = {
        "aptitude": [
            "If you have 5 apples and give away 2, then buy 3 more, how many apples do you have?",
            "What comes next in the sequence: 2, 4, 8, 16, __?",
            "If all roses are flowers and some flowers fade quickly, can we conclude that some roses fade quickly?"
        ],
        "technical": [
            "Explain the difference between a stack and a queue data structure.",
            "What is the time complexity of binary search?",
            "Describe the concept of object-oriented programming."
        ],
        "hr": [
            "Tell me about yourself and your background.",
            "What are your greatest strengths?",
            "Describe a challenging situation you faced and how you overcame it."
        ]
    }
    
    questions_list = fallbacks.get(round_type, fallbacks["technical"])
    return {
        "question": questions_list[(question_num - 1) % len(questions_list)],
        "type": "descriptive"
    }

async def evaluate_answer(question: str, answer: str, resume_context: str, round_type: str = "general") -> dict:
    """
    Evaluate user answer using Krutrim
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
    
    response = await call_krutrim_api(messages, temperature=0.5, max_tokens=500, operation="evaluate_answer")
    
    # Parse JSON response
    try:
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
        print(f"Error parsing evaluation: {e}")
        # Fallback evaluation
        return {
            "evaluation": "Thank you for your answer. Your response has been recorded.",
            "score": 5.0
        }

async def generate_report_content_with_krutrim(session_data: dict) -> str:
    """
    Use Krutrim AI to analyze interview performance and generate comprehensive report content
    session_data should contain: resume, rounds with questions/answers/evaluations, scores, times
    """
    # Simplify the data to avoid token limits
    rounds_summary = []
    for round_data in session_data.get('rounds', []):
        round_summary = {
            'type': round_data.get('round_type', 'Unknown'),
            'questions_count': len(round_data.get('questions_answers', [])),
            'avg_score': sum(qa.get('score', 0) for qa in round_data.get('questions_answers', [])) / max(len(round_data.get('questions_answers', [])), 1)
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
        response = await call_krutrim_api(messages, temperature=0.7, max_tokens=800)
        return response
    except Exception as e:
        print(f"Error generating report with Krutrim: {e}")
        # Return a fallback report
        return generate_fallback_report(session_data)

def generate_fallback_report(session_data: dict) -> str:
    """Generate a basic report when AI generation fails"""
    total_score = session_data.get('total_score', 0)
    
    performance_level = "Excellent" if total_score >= 8 else "Good" if total_score >= 6 else "Satisfactory" if total_score >= 4 else "Needs Improvement"
    
    report = f"""# Executive Summary

The candidate completed all interview rounds with an overall score of {total_score:.1f}/10, demonstrating {performance_level.lower()} performance across aptitude, technical, and HR assessments.

## Performance Highlights

- **Overall Score**: {total_score:.1f}/10 ({performance_level})
- **Interview Duration**: {session_data.get('total_time_formatted', 'N/A')}
- **Rounds Completed**: {len(session_data.get('rounds', []))} of 3

### Round-by-Round Performance

"""
    
    for round_data in session_data.get('rounds', []):
        qas = round_data.get('questions_answers', [])
        if qas:
            avg_score = sum(qa.get('score', 0) for qa in qas) / len(qas)
            report += f"- **{round_data.get('round_type', 'Unknown')} Round**: {avg_score:.1f}/10 ({len(qas)} questions)\n"
    
    report += f"""

## Strengths Identified

- Completed all interview rounds successfully
- Demonstrated engagement throughout the process
- Provided responses to all questions

## Areas for Improvement

- Continue developing technical skills
- Practice articulating thoughts clearly
- Work on time management during assessments

## Overall Recommendation

Based on the interview performance, the candidate shows {"strong potential" if total_score >= 7 else "potential for growth"} and would benefit from {"continued development in key areas" if total_score < 7 else "opportunities to apply their skills"}.

**Final Assessment**: {performance_level}
"""
    
    return report

# Legacy function for backward compatibility
async def generate_ai_response(messages: list) -> str:
    """Generate AI response using Krutrim API (legacy)"""
    system_prompt = """You are an AI interviewer conducting a professional job interview. 
Your role is to:
1. Ask relevant technical and behavioral questions
2. Follow up on candidate responses
3. Provide constructive feedback
4. Maintain a professional yet friendly tone
5. Adapt questions based on the candidate's experience level

Start by greeting the candidate and asking them to introduce themselves."""
    
    api_messages = [{"role": "system", "content": system_prompt}] + messages
    return await call_krutrim_api(api_messages, temperature=0.7, max_tokens=500, operation="chat")


