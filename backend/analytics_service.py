"""
Analytics Service - Calculate and aggregate user performance metrics
"""
from typing import Optional, Dict, List
from datetime import datetime, timedelta
import logging

from analytics_models import PerformanceMetrics, AnalyticsSnapshot
from models import InterviewSession, InterviewRound, Question, Answer

logger = logging.getLogger("analytics_service")


async def calculate_user_metrics(user_id: str) -> Dict:
    """Calculate comprehensive metrics for a user"""
    try:
        # Get all completed sessions
        sessions = await InterviewSession.find(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed"
        ).to_list()
        
        if not sessions:
            return {
                "total_interviews": 0,
                "avg_score": 0.0,
                "total_time_spent": 0,
                "round_performance": {},
                "skill_performance": {}
            }
        
        total_interviews = len(sessions)
        total_score = sum(s.total_score for s in sessions)
        avg_score = total_score / total_interviews if total_interviews > 0 else 0.0
        total_time = sum(s.total_time_seconds for s in sessions)
        
        # Calculate round-wise performance
        round_performance = await _calculate_round_performance(user_id, sessions)
        
        # Calculate improvement trend
        improvement_trend = await _calculate_improvement_trend(sessions)
        
        # Find best and worst rounds
        best_round = max(round_performance.items(), key=lambda x: x[1]["avg_score"])[0] if round_performance else None
        worst_round = min(round_performance.items(), key=lambda x: x[1]["avg_score"])[0] if round_performance else None
        
        return {
            "total_interviews": total_interviews,
            "total_completed": total_interviews,
            "avg_score": round(avg_score, 2),
            "total_time_spent_seconds": total_time,
            "round_performance": round_performance,
            "improvement_trend": improvement_trend,
            "best_round_type": best_round,
            "worst_round_type": worst_round
        }
    except Exception as e:
        logger.error(f"Error calculating user metrics: {str(e)}")
        raise


async def _calculate_round_performance(user_id: str, sessions: List) -> Dict:
    """Calculate performance breakdown by round type"""
    round_stats = {}
    
    for session in sessions:
        rounds = await InterviewRound.find(
            InterviewRound.session_id == str(session.id),
            InterviewRound.status == "completed"
        ).to_list()
        
        for round_obj in rounds:
            round_type = round_obj.round_type
            
            if round_type not in round_stats:
                round_stats[round_type] = {
                    "total_questions": 0,
                    "total_score": 0.0,
                    "total_time": 0,
                    "count": 0
                }
            
            # Get questions and answers for this round
            questions = await Question.find(
                Question.round_id == str(round_obj.id)
            ).to_list()
            
            round_score = 0.0
            for question in questions:
                answer = await Answer.find_one(
                    Answer.question_id == str(question.id)
                )
                if answer:
                    round_score += answer.score
            
            round_stats[round_type]["total_questions"] += len(questions)
            round_stats[round_type]["total_score"] += round_score
            round_stats[round_type]["total_time"] += round_obj.total_time_seconds
            round_stats[round_type]["count"] += 1
    
    # Calculate averages
    for round_type, stats in round_stats.items():
        count = stats["count"]
        stats["avg_score"] = round(stats["total_score"] / count, 2) if count > 0 else 0.0
        stats["avg_time"] = stats["total_time"] // count if count > 0 else 0
        stats["avg_questions"] = stats["total_questions"] // count if count > 0 else 0
    
    return round_stats


async def _calculate_improvement_trend(sessions: List) -> List[Dict]:
    """Calculate improvement trend over time"""
    trend = []
    
    # Sort sessions by completion date
    sorted_sessions = sorted(
        [s for s in sessions if s.completed_at],
        key=lambda x: x.completed_at
    )
    
    for session in sorted_sessions:
        trend.append({
            "date": session.completed_at.isoformat(),
            "score": round(session.total_score, 2)
        })
    
    return trend


async def get_performance_trends(user_id: str, days: int = 30) -> Dict:
    """Get performance trends for the last N days"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        sessions = await InterviewSession.find(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed",
            InterviewSession.completed_at >= cutoff_date
        ).sort("+completed_at").to_list()
        
        if not sessions:
            return {
                "period_days": days,
                "total_interviews": 0,
                "trend_data": [],
                "avg_score": 0.0
            }
        
        trend_data = []
        total_score = 0.0
        
        for session in sessions:
            trend_data.append({
                "date": session.completed_at.strftime("%Y-%m-%d"),
                "score": round(session.total_score, 2),
                "time_spent": session.total_time_seconds
            })
            total_score += session.total_score
        
        return {
            "period_days": days,
            "total_interviews": len(sessions),
            "trend_data": trend_data,
            "avg_score": round(total_score / len(sessions), 2)
        }
    except Exception as e:
        logger.error(f"Error getting performance trends: {str(e)}")
        raise


async def get_round_breakdown(user_id: str) -> Dict:
    """Get detailed round-wise performance breakdown"""
    try:
        sessions = await InterviewSession.find(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed"
        ).to_list()
        
        round_performance = await _calculate_round_performance(user_id, sessions)
        
        return {
            "round_breakdown": round_performance,
            "total_sessions": len(sessions)
        }
    except Exception as e:
        logger.error(f"Error getting round breakdown: {str(e)}")
        raise


async def create_snapshot(user_id: str) -> AnalyticsSnapshot:
    """Create a snapshot of current metrics"""
    try:
        metrics = await calculate_user_metrics(user_id)
        
        snapshot = AnalyticsSnapshot(
            user_id=user_id,
            snapshot_date=datetime.utcnow(),
            metrics_data=metrics
        )
        await snapshot.insert()
        
        return snapshot
    except Exception as e:
        logger.error(f"Error creating snapshot: {str(e)}")
        raise


async def update_or_create_metrics(user_id: str) -> PerformanceMetrics:
    """Update or create performance metrics for a user"""
    try:
        # Calculate latest metrics
        metrics_data = await calculate_user_metrics(user_id)
        
        # Find existing metrics document
        existing = await PerformanceMetrics.find_one(
            PerformanceMetrics.user_id == user_id
        )
        
        if existing:
            # Update existing
            existing.total_interviews = metrics_data["total_interviews"]
            existing.total_completed = metrics_data["total_completed"]
            existing.avg_score = metrics_data["avg_score"]
            existing.total_time_spent_seconds = metrics_data["total_time_spent_seconds"]
            existing.round_performance = metrics_data["round_performance"]
            existing.improvement_trend = metrics_data["improvement_trend"]
            existing.best_round_type = metrics_data.get("best_round_type")
            existing.worst_round_type = metrics_data.get("worst_round_type")
            existing.last_updated = datetime.utcnow()
            await existing.save()
            return existing
        else:
            # Create new
            new_metrics = PerformanceMetrics(
                user_id=user_id,
                total_interviews=metrics_data["total_interviews"],
                total_completed=metrics_data["total_completed"],
                avg_score=metrics_data["avg_score"],
                total_time_spent_seconds=metrics_data["total_time_spent_seconds"],
                round_performance=metrics_data["round_performance"],
                improvement_trend=metrics_data["improvement_trend"],
                best_round_type=metrics_data.get("best_round_type"),
                worst_round_type=metrics_data.get("worst_round_type")
            )
            await new_metrics.insert()
            return new_metrics
    except Exception as e:
        logger.error(f"Error updating metrics: {str(e)}")
        raise


async def get_analytics_dashboard(user_id: str) -> Dict:
    """Get comprehensive analytics dashboard data"""
    try:
        # Update metrics first
        metrics = await update_or_create_metrics(user_id)
        
        # Get trends
        trends_30d = await get_performance_trends(user_id, days=30)
        
        # Get round breakdown
        round_data = await get_round_breakdown(user_id)
        
        return {
            "overview": {
                "total_interviews": getattr(metrics, 'total_interviews', 0),
                "total_completed": getattr(metrics, 'total_completed', getattr(metrics, 'total_interviews', 0)),
                "avg_score": getattr(metrics, 'avg_score', 0.0),
                "total_time_spent_seconds": getattr(metrics, 'total_time_spent_seconds', 0),
                "best_round": getattr(metrics, 'best_round_type', None),
                "worst_round": getattr(metrics, 'worst_round_type', None)
            },
            "trends": trends_30d,
            "round_performance": round_data["round_breakdown"],
            "improvement_trend": getattr(metrics, 'improvement_trend', [])
        }
    except Exception as e:
        logger.error(f"Error getting analytics dashboard: {str(e)}")
        raise
