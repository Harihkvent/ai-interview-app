import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()

KRUTRIM_API_KEY = os.getenv("KRUTRIM_API_KEY")
KRUTRIM_API_URL = os.getenv("KRUTRIM_API_URL", "https://cloud.olakrutrim.com/v1/chat/completions")

# Question counts per round
ROUND_QUESTIONS = {
    "aptitude": 5,
    "technical": 8,
    "hr": 5
}

async def call_krutrim_api(messages: list, temperature: float = 0.7, max_tokens: int = 1000) -> str:
    """Base function to call Krutrim API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                KRUTRIM_API_URL,
                headers={
                    "Authorization": f"Bearer {KRUTRIM_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "Krutrim-spectre-v2",
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Error calling Krutrim API: {e}")
        raise Exception(f"AI service error: {str(e)}")

async def generate_questions_from_resume(resume_text: str, round_type: str, num_questions: int = None) -> list:
    """
    Generate round-specific questions based on resume using Krutrim
    Returns list of question strings
    """
    if num_questions is None:
        num_questions = ROUND_QUESTIONS.get(round_type, 5)
    
    # Simplified prompts for better JSON generation
    prompts = {
        "aptitude": f"""Generate {num_questions} aptitude and logical reasoning interview questions.
Return ONLY a JSON array of question strings, nothing else.
Format: ["Question 1?", "Question 2?", "Question 3?"]

Questions should test:
- Logical reasoning
- Problem-solving
- Analytical thinking
- Pattern recognition

Return {num_questions} questions as a JSON array.""",
        
        "technical": f"""Based on this resume, generate {num_questions} technical interview questions:

{resume_text[:500]}

Return ONLY a JSON array of question strings, nothing else.
Format: ["Question 1?", "Question 2?", "Question 3?"]

Focus on:
- Technologies mentioned in resume
- Programming skills
- Technical concepts
- Problem-solving

Return {num_questions} questions as a JSON array.""",
        
        "hr": f"""Generate {num_questions} HR and behavioral interview questions.
Return ONLY a JSON array of question strings, nothing else.
Format: ["Question 1?", "Question 2?", "Question 3?"]

Questions should assess:
- Communication skills
- Teamwork
- Career goals
- Work ethic
- Conflict resolution

Return {num_questions} questions as a JSON array."""
    }
    
    prompt = prompts.get(round_type, prompts["technical"])
    
    messages = [
        {"role": "system", "content": "You are an expert interviewer. Return only valid JSON arrays of questions."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = await call_krutrim_api(messages, temperature=0.7, max_tokens=1000)
        print(f"Krutrim response for {round_type}: {response[:200]}")  # Debug log
        
        # Parse JSON response with multiple fallback strategies
        response = response.strip()
        
        # Try to extract JSON array
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            response = response.split("```")[1].split("```")[0].strip()
        
        # Remove any markdown or extra text
        if "[" in response and "]" in response:
            start = response.index("[")
            end = response.rindex("]") + 1
            response = response[start:end]
        
        questions = json.loads(response)
        
        if not isinstance(questions, list):
            raise ValueError("Response is not a list")
        
        if len(questions) == 0:
            raise ValueError("Empty questions list")
        
        # Ensure we have the right number of questions
        result = questions[:num_questions]
        
        # Pad with fallback if needed
        while len(result) < num_questions:
            result.append(get_fallback_question(round_type, len(result) + 1))
        
        return result
        
    except Exception as e:
        print(f"Error parsing questions: {e}")
        print(f"Raw response: {response if 'response' in locals() else 'No response'}")
        # Return meaningful fallback questions
        return [get_fallback_question(round_type, i+1) for i in range(num_questions)]

def get_fallback_question(round_type: str, question_num: int) -> str:
    """Get meaningful fallback questions when AI generation fails"""
    fallbacks = {
        "aptitude": [
            "If you have 5 apples and give away 2, then buy 3 more, how many apples do you have?",
            "What comes next in the sequence: 2, 4, 8, 16, __?",
            "If all roses are flowers and some flowers fade quickly, can we conclude that some roses fade quickly?",
            "A train travels 60 km in 1 hour. How far will it travel in 2.5 hours at the same speed?",
            "Which number doesn't belong: 2, 3, 5, 7, 9, 11?"
        ],
        "technical": [
            "Explain the difference between a stack and a queue data structure.",
            "What is the time complexity of binary search?",
            "Describe the concept of object-oriented programming.",
            "What is the difference between SQL and NoSQL databases?",
            "Explain what an API is and how it works.",
            "What is version control and why is it important?",
            "Describe the software development lifecycle.",
            "What is the difference between frontend and backend development?"
        ],
        "hr": [
            "Tell me about yourself and your background.",
            "What are your greatest strengths?",
            "Describe a challenging situation you faced and how you overcame it.",
            "Where do you see yourself in 5 years?",
            "Why do you want to work for our company?",
            "How do you handle stress and pressure?",
            "Describe a time when you worked in a team.",
            "What motivates you in your work?"
        ]
    }
    
    questions_list = fallbacks.get(round_type, fallbacks["technical"])
    return questions_list[(question_num - 1) % len(questions_list)]

async def evaluate_answer(question: str, answer: str, resume_context: str) -> dict:
    """
    Evaluate user answer using Krutrim
    Returns: {evaluation: str, score: float}
    """
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
    
    response = await call_krutrim_api(messages, temperature=0.5, max_tokens=500)
    
    # Parse JSON response
    try:
        response = response.strip()
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            response = response.split("```")[1].split("```")[0].strip()
        
        result = json.loads(response)
        
        return {
            "evaluation": result.get("evaluation", "Good effort!"),
            "score": float(result.get("score", 5.0))
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
    return await call_krutrim_api(api_messages, temperature=0.7, max_tokens=500)


