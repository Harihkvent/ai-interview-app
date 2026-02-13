"""
User Service - Handle user stats, skill points, and rankings
"""
from typing import Dict, List
from models import InterviewSession, Answer, UserPreferences
from auth_models import User
from skill_assessment_models import SkillTestAttempt

async def calculate_skill_points(user_id: str) -> int:
    """
    Calculate skill points based on interview performance and skill tests.
    Formula: (sum of interview scores * 10) + (sum of skill test scores)
    """
    # 1. Get interview scores
    sessions = await InterviewSession.find(
        InterviewSession.user_id == user_id,
        InterviewSession.status == "completed"
    ).to_list()
    interview_points = sum(s.total_score for s in sessions) * 10
    
    # 2. Get skill test scores
    skill_attempts = await SkillTestAttempt.find(
        SkillTestAttempt.user_id == user_id,
        SkillTestAttempt.status == "completed"
    ).to_list()
    skill_points = sum(a.score for a in skill_attempts)
    
    return int(interview_points + skill_points)

async def get_global_rank(user_id: str) -> Dict:
    """
    Get the global rank of a user based on total skill points.
    Returns: {"rank": int, "total_users": int, "percentile": float}
    """
    # This is a bit expensive, in a real app we'd cache this or use an aggregation pipeline
    users = await User.find_all().to_list()
    all_stats = []
    
    for user in users:
        points = await calculate_skill_points(str(user.id))
        all_stats.append({"user_id": str(user.id), "points": points})
    
    # Sort by points descending
    all_stats.sort(key=lambda x: x["points"], reverse=True)
    
    # Find user rank
    rank = 0
    for i, stat in enumerate(all_stats):
        if stat["user_id"] == user_id:
            rank = i + 1
            break
            
    total_users = len(all_stats)
    percentile = ((total_users - (rank - 1)) / total_users) * 100 if total_users > 0 else 0
    
    return {
        "rank": rank,
        "total_users": total_users,
        "percentile": round(percentile, 1)
    }

async def get_user_performance_summary(user_id: str) -> Dict:
    """Aggregate all profile stats for the user"""
    points = await calculate_skill_points(user_id)
    rank_info = await get_global_rank(user_id)
    
    return {
        "skill_points": points,
        "global_rank": rank_info["rank"],
        "percentile": rank_info["percentile"],
        "total_users": rank_info["total_users"]
    }
