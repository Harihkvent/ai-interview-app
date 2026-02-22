from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import os
from prometheus_client import REGISTRY, generate_latest

from auth_models import User
from auth_routes import get_current_admin
from admin_models import TokenUsage, AdminActivity, AppConfig
from models import InterviewSession, CareerRoadmap, QuestionBank
from feedback_models import Feedback

router = APIRouter(prefix="/admin", tags=["admin"])

# ============= Global Analytics =============

@router.get("/stats")
async def get_stats(admin: User = Depends(get_current_admin)):
    """Get high-level system statistics with time-series data"""
    total_users = await User.count()
    total_sessions = await InterviewSession.count()
    total_roadmaps = await CareerRoadmap.count()
    
    # Token usage aggregation
    token_usage = await TokenUsage.find_all().to_list()
    total_tokens = sum(t.total_tokens for t in token_usage)
    
    # Growth (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users_30d = await User.find(User.created_at >= thirty_days_ago).count()
    
    # Time-series data for the last 7 days
    analytics = []
    for i in range(7):
        date = (datetime.utcnow() - timedelta(days=i)).date()
        start = datetime.combine(date, datetime.min.time())
        end = datetime.combine(date, datetime.max.time())
        
        user_count = await User.find(User.created_at >= start, User.created_at <= end).count()
        session_count = await InterviewSession.find(InterviewSession.created_at >= start, InterviewSession.created_at <= end).count()
        
        analytics.append({
            "date": date.strftime("%Y-%m-%d"),
            "users": user_count,
            "sessions": session_count
        })
    
    return {
        "overview": {
            "total_users": total_users,
            "total_sessions": total_sessions,
            "total_roadmaps": total_roadmaps,
            "total_tokens": total_tokens,
            "new_users_30d": new_users_30d
        },
        "analytics": list(reversed(analytics))
    }

# ============= User Management =============

@router.get("/users")
async def list_users(
    skip: int = 0, 
    limit: int = 50, 
    search: Optional[str] = None,
    admin: User = Depends(get_current_admin)
):
    """List and search users"""
    query = {}
    if search:
        query = {"$or": [
            {"email": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}}
        ]}
    
    users = await User.find(query).skip(skip).limit(limit).to_list()
    total = await User.find(query).count()
    
    return {
        "total": total,
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "username": u.username,
                "full_name": u.full_name,
                "role": u.role,
                "is_blocked": u.is_blocked,
                "restricted_services": u.restricted_services,
                "created_at": u.created_at.isoformat(),
                "last_login": u.last_login.isoformat() if u.last_login else None
            }
            for u in users
        ]
    }

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(get_current_admin)):
    """Permanently delete a user"""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await user.delete()
    
    # Audit log
    await AdminActivity(
        admin_id=str(admin.id),
        action="delete_user",
        target_user_id=user_id,
        details=f"Permanently deleted user: {user.email}"
    ).insert()
    
    return {"message": "User deleted successfully"}

# ============= Session Management =============

@router.get("/sessions")
async def list_sessions(
    skip: int = 0, 
    limit: int = 50,
    admin: User = Depends(get_current_admin)
):
    """List all interview sessions"""
    sessions = await InterviewSession.find_all().sort("-created_at").skip(skip).limit(limit).to_list()
    total = await InterviewSession.count()
    
    # Enrich with user emails (optimized fetch)
    user_ids = list(set(s.user_id for s in sessions if s.user_id))
    users = await User.find({"_id": {"$in": user_ids}}).to_list()
    user_map = {str(u.id): u.email for u in users}
    
    return {
        "total": total,
        "sessions": [
            {
                "id": str(s.id),
                "user_email": user_map.get(s.user_id, "Unknown"),
                "job_title": s.job_title,
                "status": s.status,
                "session_type": s.session_type,
                "created_at": s.created_at.isoformat(),
                "score": s.total_score
            }
            for s in sessions
        ]
    }

# ============= Skill Assessment Results =============

@router.get("/skill-tests/attempts")
async def list_skill_test_attempts(
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(get_current_admin)
):
    """List all skill test attempts"""
    from skill_assessment_models import SkillTestAttempt, SkillTest
    
    attempts = await SkillTestAttempt.find_all().sort("-started_at").skip(skip).limit(limit).to_list()
    total = await SkillTestAttempt.count()
    
    # Enrich with user info and test names
    user_ids = list(set(a.user_id for a in attempts))
    test_ids = list(set(a.skill_test_id for a in attempts))
    
    users = await User.find({"_id": {"$in": user_ids}}).to_list()
    tests = await SkillTest.find({"_id": {"$in": test_ids}}).to_list()
    
    user_map = {str(u.id): u.email for u in users}
    test_map = {str(t.id): t.skill_name for t in tests}
    
    return {
        "total": total,
        "attempts": [
            {
                "id": str(a.id),
                "user_email": user_map.get(a.user_id, "Unknown"),
                "skill_name": test_map.get(a.skill_test_id, "Unknown"),
                "status": a.status,
                "score": a.score,
                "passed": a.passed,
                "proficiency": a.proficiency_level,
                "started_at": a.started_at.isoformat()
            }
            for a in attempts
        ]
    }

# ============= Question Bank =============

@router.get("/questions")
async def list_question_bank(
    category: Optional[str] = None,
    admin: User = Depends(get_current_admin)
):
    """List questions in the bank"""
    query = {}
    if category:
        query = {"category": category}
        
    questions = await QuestionBank.find(query).to_list()
    return questions

@router.post("/questions")
async def add_to_bank(question: QuestionBank, admin: User = Depends(get_current_admin)):
    """Add a new question to the bank"""
    await question.insert()
    return {"message": "Question added to bank"}

# ============= Infrastructure & Health =============

@router.get("/health/metrics")
async def get_metrics_json(admin: User = Depends(get_current_admin)):
    """Proxy for Prometheus metrics converted to JSON-friendly format"""
    # Simple parser for raw Prometheus data
    metrics = REGISTRY.collect()
    output = {}
    for m in metrics:
        samples = []
        for s in m.samples:
            samples.append({"name": s.name, "labels": s.labels, "value": s.value})
        output[m.name] = {"documentation": m.documentation, "type": m.type, "samples": samples}
    return output

@router.get("/health/infra")
async def get_infra_health(admin: User = Depends(get_current_admin)):
    """Check connectivity to DB, Redis, and RabbitMQ"""
    from database import AsyncIOMotorClient, MONGODB_URL
    from cache_service import cache_manager
    import aio_pika
    
    health = {"mongodb": "down", "redis": "down", "rabbitmq": "down"}
    
    # MongoDB
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        await client.admin.command('ping')
        health["mongodb"] = "up"
    except: pass
    
    # Redis
    if cache_manager.enabled:
        try:
            await cache_manager.redis.ping()
            health["redis"] = "up"
        except: pass
        
    # RabbitMQ
    try:
        RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
        conn = await aio_pika.connect_robust(RABBITMQ_URL)
        await conn.close()
        health["rabbitmq"] = "up"
    except: pass
    
    return health

# ============= Feedback Management =============

@router.get("/feedback")
async def list_feedback(status: str = "open", admin: User = Depends(get_current_admin)):
    """List user feedback"""
    feedback = await Feedback.find(Feedback.status == status).to_list()
    return feedback

@router.patch("/feedback/{feedback_id}")
async def update_feedback(
    feedback_id: str, 
    update_data: Dict, 
    admin: User = Depends(get_current_admin)
):
    """Close or update feedback"""
    fb = await Feedback.get(feedback_id)
    if not fb: raise HTTPException(status_code=404, detail="Feedback not found")
    
    if "status" in update_data: fb.status = update_data["status"]
    if "admin_notes" in update_data: fb.admin_notes = update_data["admin_notes"]
    fb.updated_at = datetime.utcnow()
    
    await fb.save()
    return {"message": "Feedback updated"}
