import os
import json
import asyncio
import aio_pika
import logging
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from models import Question, InterviewRound, InterviewSession, Resume, Answer, Message, JobMatch, CareerRoadmap, QuestionBank
from question_service import generate_questions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("worker")

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "ai_interview_db"
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

async def init_db():
    client = AsyncIOMotorClient(MONGO_URL)
    await init_beanie(database=client[DATABASE_NAME], document_models=[
        InterviewSession, Resume, InterviewRound, Question, Answer, Message, JobMatch, CareerRoadmap, QuestionBank
    ])
    logger.info("Worker connected to MongoDB")

async def process_task(message: aio_pika.IncomingMessage):
    async with message.process():
        data = json.loads(message.body.decode())
        session_id = data["session_id"]
        round_type = data["round_type"]
        resume_text = data["resume_text"]
        
        logger.info(f"Processing question generation for {session_id} - {round_type}")
        
        try:
            # Generate questions
            questions_list = await generate_questions(resume_text, round_type)
            
            # Find the round
            round_obj = await InterviewRound.find_one(
                InterviewRound.session_id == session_id,
                InterviewRound.round_type == round_type
            )
            
            if not round_obj:
                logger.error(f"Round {round_type} not found for session {session_id}")
                return
                
            # Save questions
            for i, q_data in enumerate(questions_list, 1):
                question = Question(
                    round_id=str(round_obj.id),
                    question_text=q_data["question"],
                    question_type=q_data.get("type", "descriptive"),
                    options=q_data.get("options"),
                    correct_answer=q_data.get("answer"),
                    starter_code=q_data.get("starter_code"),
                    test_cases=q_data.get("test_cases"),
                    language=q_data.get("language", "python"),
                    question_number=i
                )
                await question.insert()
                
            logger.info(f"Successfully generated {len(questions_list)} questions for {session_id} - {round_type}")
            
        except Exception as e:
            logger.error(f"Error in worker processing: {e}")

async def main():
    await init_db()
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=1)
    
    queue = await channel.declare_queue("question_generation", durable=True)
    
    logger.info("Worker waiting for tasks...")
    await queue.consume(process_task)
    
    try:
        await asyncio.Future()
    finally:
        await connection.close()

if __name__ == "__main__":
    asyncio.run(main())
