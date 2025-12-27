import os
import json
import asyncio
import aio_pika
import logging

logger = logging.getLogger("mq_service")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

async def publish_question_generation(session_id: str, round_type: str, resume_text: str):
    """Publish a task to generate questions for a specific round"""
    try:
        connection = await aio_pika.connect_robust(RABBITMQ_URL)
        async with connection:
            channel = await connection.channel()
            queue = await channel.declare_queue("question_generation", durable=True)
            
            message_body = json.dumps({
                "session_id": session_id,
                "round_type": round_type,
                "resume_text": resume_text
            })
            
            await channel.default_exchange.publish(
                aio_pika.Message(body=message_body.encode(), delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
                routing_key="question_generation"
            )
            logger.info(f"Published question generation task for session {session_id}, round {round_type}")
    except Exception as e:
        logger.error(f"Failed to publish to RabbitMQ: {e}")
        # Fallback to sync generation if MQ fails? 
        # For now, just log.
