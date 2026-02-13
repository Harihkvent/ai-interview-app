"""
Analytics Service - Calculate and aggregate user performance metrics
"""
from typing import Optional, Dict, List
from datetime import datetime, timedelta
import logging

from analytics_models import PerformanceMetrics, AnalyticsSnapshot
from models import InterviewSession, InterviewRound, Question, Answer
from avatar_interview_models import AvatarInterviewSession, AvatarQuestion, AvatarResponse
from skill_assessment_models import SkillTestAttempt, SkillTest

logger = logging.getLogger("analytics_service")


async def calculate_user_metrics(user_id: str) -> Dict:
    """Calculate comprehensive metrics for a user"""
    try:
        # Get all completed sessions
        regular_sessions = await InterviewSession.find(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed"
        ).to_list()
        
        avatar_sessions = await AvatarInterviewSession.find(
            AvatarInterviewSession.user_id == user_id,
            AvatarInterviewSession.status == "completed"
        ).to_list()
        
        sessions = regular_sessions + avatar_sessions
        
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
        
        # Calculate skill test analytics
        skill_test_analytics = await _calculate_skill_test_analytics(user_id)
        
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
            "worst_round_type": worst_round,
            "skill_test_analytics": skill_test_analytics
        }
    except Exception as e:
        logger.error(f"Error calculating user metrics: {str(e)}")
        raise


async def _calculate_round_performance(user_id: str, sessions: List) -> Dict:
    """Calculate performance breakdown by round type"""
    round_stats = {}
    
    for session in sessions:
        if isinstance(session, InterviewSession):
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
        
        elif isinstance(session, AvatarInterviewSession):
            # Avatar sessions have rounds in the model but they don't have separate InterviewRound docs
            # Instead they have round_type in AvatarQuestion and AvatarResponse
            # To match the structure, we'll iterate through completed rounds for the avatar session
            
            # Since AvatarInterviewSession doesn't explicitly track completed rounds in a separate model,
            # we infer from the current_round and questions answered if status is completed.
            # However, for simplicity, let's group by round_type in responses.
            
            responses = await AvatarResponse.find(
                AvatarResponse.session_id == str(session.id),
                AvatarResponse.status == "submitted"
            ).to_list()
            
            # Group responses by round_type (from related question)
            round_data_map = {} # round_type -> {score, count, time}
            
            for resp in responses:
                ques = await AvatarQuestion.get(resp.question_id)
                if not ques: continue
                
                rtype = ques.round_type
                if rtype not in round_data_map:
                    round_data_map[rtype] = {"score": 0.0, "count": 0, "time": 0}
                
                round_data_map[rtype]["score"] += resp.score
                round_data_map[rtype]["count"] += 1
                round_data_map[rtype]["time"] += resp.time_taken_seconds
            
            for rtype, rstats in round_data_map.items():
                if rtype not in round_stats:
                    round_stats[rtype] = {
                        "total_questions": 0,
                        "total_score": 0.0,
                        "total_time": 0,
                        "count": 0
                    }
                
                round_stats[rtype]["total_questions"] += rstats["count"]
                round_stats[rtype]["total_score"] += rstats["score"]
                round_stats[rtype]["total_time"] += rstats["time"]
                round_stats[rtype]["count"] += 1 # Treating one session's round as 1 count
    
    # Calculate averages
    for round_type, stats in round_stats.items():
        count = stats["count"]
        # Score is per session-round, so we need average per question or per session?
        # Regular logic: total_score / count (where count is number of session-rounds)
        # However, regular total_score is sum over questions. 
        # Wait, if regular total_score is sum over questions, and count is per session-round,
        # then avg_score is average per session-round.
        # For avatar, I grouped by round_type across the session.
        stats["avg_score"] = round(stats["total_score"] / stats["total_questions"], 2) if stats["total_questions"] > 0 else 0.0
        # If the UI expects score out of 10, and evaluation returns 0-10, then it's fine.
        # But regular interviews have multiple rounds, and the UI shows avg per round type.
        
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
        score = session.total_score
        session_type = "regular"
        if isinstance(session, AvatarInterviewSession):
            # Normalize to average score if it's an avatar session
            score = session.total_score / session.questions_answered if session.questions_answered > 0 else 0.0
            session_type = "avatar"
            
        trend.append({
            "date": session.completed_at.isoformat(),
            "score": round(score, 2),
            "type": session_type
        })
    
    return trend


async def _calculate_skill_test_analytics(user_id: str) -> Dict:
    """Calculate performance metrics for skill tests"""
    try:
        attempts = await SkillTestAttempt.find(
            SkillTestAttempt.user_id == user_id,
            SkillTestAttempt.status == "completed"
        ).to_list()
        
        if not attempts:
            return {
                "total_attempts": 0,
                "avg_score": 0.0,
                "pass_rate": 0.0,
                "proficiency_breakdown": {},
                "category_performance": {}
            }
        
        total_score = sum(a.score for a in attempts)
        passed_count = sum(1 for a in attempts if a.passed)
        
        proficiency_breakdown = {
            "beginner": 0,
            "intermediate": 0,
            "advanced": 0,
            "expert": 0
        }
        
        category_stats = {} # category -> {total_score, count}
        
        for attempt in attempts:
            # Update proficiency count
            lvl = attempt.proficiency_level or "beginner"
            proficiency_breakdown[lvl] = proficiency_breakdown.get(lvl, 0) + 1
            
            # Get test category
            test = await SkillTest.get(attempt.skill_test_id)
            if test:
                cat = test.category
                if cat not in category_stats:
                    category_stats[cat] = {"total_score": 0.0, "count": 0}
                category_stats[cat]["total_score"] += attempt.score
                category_stats[cat]["count"] += 1
        
        category_performance = {
            cat: round(stats["total_score"] / stats["count"], 2)
            for cat, stats in category_stats.items()
        }
        
        return {
            "total_attempts": len(attempts),
            "avg_score": round(total_score / len(attempts), 2),
            "pass_rate": round((passed_count / len(attempts)) * 100, 2),
            "proficiency_breakdown": proficiency_breakdown,
            "category_performance": category_performance
        }
    except Exception as e:
        logger.error(f"Error calculating skill test analytics: {str(e)}")
        return {}


async def get_performance_trends(user_id: str, days: int = 30) -> Dict:
    """Get performance trends for the last N days"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        regular_sessions = await InterviewSession.find(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed",
            InterviewSession.completed_at >= cutoff_date
        ).sort("+completed_at").to_list()
        
        avatar_sessions = await AvatarInterviewSession.find(
            AvatarInterviewSession.user_id == user_id,
            AvatarInterviewSession.status == "completed",
            AvatarInterviewSession.completed_at >= cutoff_date
        ).sort("+completed_at").to_list()
        
        sessions = sorted(regular_sessions + avatar_sessions, key=lambda x: x.completed_at)
        
        if not sessions:
            return {
                "period_days": days,
                "total_interviews": 0,
                "trend_data": [],
                "avg_score": 0.0
            }
        
        trend_data = []
        total_normalized_score = 0.0
        
        for session in sessions:
            score = session.total_score
            if isinstance(session, AvatarInterviewSession):
                score = session.total_score / session.questions_answered if session.questions_answered > 0 else 0.0
                
            trend_data.append({
                "date": session.completed_at.strftime("%Y-%m-%d"),
                "score": round(score, 2),
                "time_spent": session.total_time_seconds
            })
            total_normalized_score += score
        
        return {
            "period_days": days,
            "total_interviews": len(sessions),
            "trend_data": trend_data,
            "avg_score": round(total_normalized_score / len(sessions), 2)
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
            existing.total_interviews = metrics_data.get("total_interviews", 0)
            existing.total_completed = metrics_data.get("total_completed", metrics_data.get("total_interviews", 0))
            existing.avg_score = metrics_data.get("avg_score", 0.0)
            existing.total_time_spent_seconds = metrics_data.get("total_time_spent_seconds", 0)
            existing.round_performance = metrics_data.get("round_performance", {})
            existing.improvement_trend = metrics_data.get("improvement_trend", [])
            existing.best_round_type = metrics_data.get("best_round_type")
            existing.worst_round_type = metrics_data.get("worst_round_type")
            existing.last_updated = datetime.utcnow()
            await existing.save()
            return existing
        else:
            # Create new
            new_metrics = PerformanceMetrics(
                user_id=user_id,
                total_interviews=metrics_data.get("total_interviews", 0),
                total_completed=metrics_data.get("total_completed", metrics_data.get("total_interviews", 0)),
                avg_score=metrics_data.get("avg_score", 0.0),
                total_time_spent_seconds=metrics_data.get("total_time_spent_seconds", 0),
                round_performance=metrics_data.get("round_performance", {}),
                improvement_trend=metrics_data.get("improvement_trend", []),
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
            "improvement_trend": getattr(metrics, 'improvement_trend', []),
            "skill_test_analytics": await _calculate_skill_test_analytics(user_id)
        }
    except Exception as e:
        logger.error(f"Error getting analytics dashboard: {str(e)}")
        raise
