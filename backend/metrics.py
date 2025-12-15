"""
Prometheus Metrics Configuration for AI Interview Application

This module defines and configures all Prometheus metrics for monitoring:
- Interview sessions and rounds
- Question generation and answering
- AI service (Krutrim) performance
- Database operations
"""

from prometheus_client import Counter, Histogram, Gauge, Info
import time
from functools import wraps
from typing import Callable, Any

# ============= Session Metrics =============

interview_sessions_total = Counter(
    'interview_sessions_total',
    'Total number of interview sessions created'
)

interview_sessions_active = Gauge(
    'interview_sessions_active',
    'Number of currently active interview sessions'
)

interview_sessions_completed = Counter(
    'interview_sessions_completed_total',
    'Total number of completed interview sessions'
)

# ============= Round Metrics =============

interview_rounds_started = Counter(
    'interview_rounds_started_total',
    'Total number of interview rounds started',
    ['round_type']  # aptitude, technical, hr
)

interview_rounds_completed = Counter(
    'interview_rounds_completed_total',
    'Total number of interview rounds completed',
    ['round_type']
)

interview_rounds_switched = Counter(
    'interview_rounds_switched_total',
    'Total number of round switches performed',
    ['from_round', 'to_round']
)

round_duration_seconds = Histogram(
    'interview_round_duration_seconds',
    'Duration of interview rounds in seconds',
    ['round_type'],
    buckets=[30, 60, 120, 300, 600, 900, 1800, 3600]  # 30s to 1 hour
)

# ============= Question Metrics =============

questions_generated = Counter(
    'questions_generated_total',
    'Total number of questions generated',
    ['round_type']
)

questions_answered = Counter(
    'questions_answered_total',
    'Total number of questions answered',
    ['round_type']
)

question_generation_duration = Histogram(
    'question_generation_duration_seconds',
    'Time taken to generate questions',
    ['round_type'],
    buckets=[0.5, 1, 2, 5, 10, 15, 30]  # 0.5s to 30s
)

# ============= Answer Evaluation Metrics =============

answer_evaluations = Counter(
    'answer_evaluations_total',
    'Total number of answer evaluations performed',
    ['round_type']
)

answer_evaluation_duration = Histogram(
    'answer_evaluation_duration_seconds',
    'Time taken to evaluate answers',
    ['round_type'],
    buckets=[0.5, 1, 2, 5, 10, 15, 30]
)

answer_scores = Histogram(
    'answer_scores',
    'Distribution of answer scores',
    ['round_type'],
    buckets=[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
)

answer_time_taken = Histogram(
    'answer_time_taken_seconds',
    'Time taken by candidates to answer questions',
    ['round_type'],
    buckets=[10, 30, 60, 120, 300, 600, 900]  # 10s to 15 min
)

# ============= AI Service (Krutrim) Metrics =============

krutrim_api_calls = Counter(
    'krutrim_api_calls_total',
    'Total number of Krutrim API calls',
    ['operation', 'status']  # operation: generate_questions, evaluate_answer; status: success, error
)

krutrim_api_duration = Histogram(
    'krutrim_api_duration_seconds',
    'Duration of Krutrim API calls',
    ['operation'],
    buckets=[0.5, 1, 2, 5, 10, 15, 30, 60]
)

krutrim_api_errors = Counter(
    'krutrim_api_errors_total',
    'Total number of Krutrim API errors',
    ['operation', 'error_type']
)

# ============= Database Metrics =============

db_operations = Counter(
    'db_operations_total',
    'Total number of database operations',
    ['operation', 'collection', 'status']  # operation: insert, update, find, delete
)

db_operation_duration = Histogram(
    'db_operation_duration_seconds',
    'Duration of database operations',
    ['operation', 'collection'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2]  # 1ms to 2s
)

db_connection_pool_size = Gauge(
    'db_connection_pool_size',
    'Current database connection pool size'
)

db_active_connections = Gauge(
    'db_active_connections',
    'Number of active database connections'
)

db_errors = Counter(
    'db_errors_total',
    'Total number of database errors',
    ['operation', 'collection', 'error_type']
)

# ============= HTTP Metrics =============

http_requests = Counter(
    'http_requests_total',
    'Total number of HTTP requests',
    ['method', 'endpoint', 'status_code']
)

http_request_duration = Histogram(
    'http_request_duration_seconds',
    'Duration of HTTP requests',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
)

# ============= Application Info =============

app_info = Info(
    'ai_interview_app',
    'AI Interview Application Information'
)

app_info.info({
    'version': '1.0.0',
    'description': 'AI-powered interview system with Krutrim integration'
})

# ============= Metric Helper Functions =============

def track_krutrim_call(operation: str):
    """Decorator to track Krutrim API calls"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                krutrim_api_calls.labels(operation=operation, status='success').inc()
                krutrim_api_duration.labels(operation=operation).observe(duration)
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                error_type = type(e).__name__
                
                krutrim_api_calls.labels(operation=operation, status='error').inc()
                krutrim_api_errors.labels(operation=operation, error_type=error_type).inc()
                krutrim_api_duration.labels(operation=operation).observe(duration)
                
                raise
        return wrapper
    return decorator

def track_db_operation(operation: str, collection: str):
    """Decorator to track database operations"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                db_operations.labels(operation=operation, collection=collection, status='success').inc()
                db_operation_duration.labels(operation=operation, collection=collection).observe(duration)
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                error_type = type(e).__name__
                
                db_operations.labels(operation=operation, collection=collection, status='error').inc()
                db_errors.labels(operation=operation, collection=collection, error_type=error_type).inc()
                db_operation_duration.labels(operation=operation, collection=collection).observe(duration)
                
                raise
        return wrapper
    return decorator

def record_answer_metrics(round_type: str, score: float, time_taken: int):
    """Record metrics for an answered question"""
    questions_answered.labels(round_type=round_type).inc()
    answer_scores.labels(round_type=round_type).observe(score)
    answer_time_taken.labels(round_type=round_type).observe(time_taken)

def record_round_start(round_type: str):
    """Record metrics when a round starts"""
    interview_rounds_started.labels(round_type=round_type).inc()

def record_round_completion(round_type: str, duration_seconds: int):
    """Record metrics when a round completes"""
    interview_rounds_completed.labels(round_type=round_type).inc()
    round_duration_seconds.labels(round_type=round_type).observe(duration_seconds)

def record_round_switch(from_round: str, to_round: str):
    """Record metrics when user switches rounds"""
    interview_rounds_switched.labels(from_round=from_round, to_round=to_round).inc()
