import asyncio
import os
from typing import List

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

from models import QuestionBank


# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


MONGODB_URL = os.getenv("MONGODB_URL")



async def seed_questions():
    print("Checking Question Bank...")
    
    # Check if we already have questions
    count = await QuestionBank.count()
    if count > 0:
        print(f"Question Bank already has {count} questions. Skipping seed.")
        return

    questions: List[QuestionBank] = []

    # --- Aptitude (MCQ) ---
    aptitude_qs = [
        {
            "category": "aptitude",
            "question_text": "If a car travels at 60 km/h, how long will it take to cover 300 km?",
            "options": ["4 hours", "5 hours", "6 hours", "3 hours"],
            "correct_answer": "5 hours",
            "question_type": "mcq",
            "tags": ["time-distance", "math"]
        },
        {
             "category": "aptitude",
            "question_text": "What is 15% of 200?",
            "options": ["20", "25", "30", "35"],
            "correct_answer": "30",
            "question_type": "mcq",
            "tags": ["percentage", "math"]
        },
        {
            "category": "aptitude",
            "question_text": "Find the missing number: 2, 6, 12, 20, ?",
            "options": ["28", "30", "32", "36"],
            "correct_answer": "30",
            "question_type": "mcq",
            "tags": ["sequence", "logical"]
        },
        {
             "category": "aptitude",
            "question_text": "A train 240 m long passes a pole in 24 seconds. How long will it take to pass a platform 650 m long?",
            "options": ["65 sec", "100 sec", "89 sec", "150 sec"],
            "correct_answer": "89 sec",
            "question_type": "mcq",
            "tags": ["trains", "math"]
        },
        {
            "category": "aptitude",
            "question_text": "The average of 5 consecutive numbers is 20. What is the largest of these numbers?",
            "options": ["20", "22", "24", "21"],
            "correct_answer": "22",
            "question_type": "mcq",
            "tags": ["average", "math"]
        }
    ]

    # --- Technical (MCQ & Descriptive) ---
    technical_qs = [
        # Python MCQs
        {
            "category": "technical",
            "question_text": "What data type is the object below? L = [1, 23, 'hello', 1]",
            "options": ["List", "Dictionary", "Tuple", "Array"],
            "correct_answer": "List",
            "question_type": "mcq",
            "tags": ["python", "basics"]
        },
        {
            "category": "technical",
            "question_text": "Which of the following functions can help us to find the version of python that we are currently working on?",
            "options": ["sys.version", "sys.version(1)", "sys.version()", "sys.version(0)"],
            "correct_answer": "sys.version",
            "question_type": "mcq",
            "tags": ["python", "sys"]
        },
        # General CS Descriptive
        {
            "category": "technical",
            "question_text": "Explain the difference between TCP and UDP.",
            "question_type": "descriptive",
            "tags": ["networking", "protocols"]
        },
        {
            "category": "technical",
            "question_text": "What is the Time Complexity of Binary Search?",
            "question_type": "descriptive",
            "tags": ["algorithms", "complexity"]
        },
        {
            "category": "technical",
            "question_text": "Explain the concept of 'REST' in web services.",
            "question_type": "descriptive",
            "tags": ["web", "api"]
        },
        {
            "category": "technical",
            "question_text": "What is a deadlock in operating systems?",
            "question_type": "descriptive",
            "tags": ["os", "concurrency"]
        },
        {
             "category": "technical",
            "question_text": "Describe the difference between SQL and NoSQL databases.",
            "question_type": "descriptive",
            "tags": ["database"]
        }
    ]

    # --- HR (Descriptive) ---
    hr_qs = [
        {
            "category": "hr",
            "question_text": "Tell me about a time you faced a difficult challenge at work and how you overcame it.",
            "question_type": "descriptive",
            "tags": ["behavioral"]
        },
        {
            "category": "hr",
            "question_text": "Why do you want to work for this company?",
            "question_type": "descriptive",
            "tags": ["motivation"]
        },
         {
            "category": "hr",
            "question_text": "Where do you see yourself in 5 years?",
            "question_type": "descriptive",
            "tags": ["general"]
        },
        {
            "category": "hr",
            "question_text": "What is your biggest weakness?",
            "question_type": "descriptive",
            "tags": ["self-awareness"]
        },
        {
            "category": "hr",
            "question_text": "Describe a situation where you had to work with a difficult colleague.",
            "question_type": "descriptive",
            "tags": ["teamwork"]
        }
    ]

    for q in aptitude_qs + technical_qs + hr_qs:
        questions.append(QuestionBank(**q))

    if questions:
        await QuestionBank.insert_many(questions)
        print(f"Successfully seeded {len(questions)} questions into QuestionBank.")

if __name__ == "__main__":
    async def main():
        # Database connection for standalone run
        client = AsyncIOMotorClient(MONGODB_URL)
        await init_beanie(database=client.ai_interview_db, document_models=[QuestionBank])
        await seed_questions()
    
    asyncio.run(main())
