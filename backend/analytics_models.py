from typing import Optional, List, Dict
from beanie import Document
from pydantic import Field
from datetime import datetime

class PerformanceMetrics(Document):
    """Aggregate performance metrics for a user"""
    user_id: str
    total_interviews: int = 0
    total_completed: int = 0
    avg_score: float = 0.0
    total_time_spent_seconds: int = 0
    
    # Round-wise performance: {round_type: {avg_score, total_questions, avg_time}}
    round_performance: Dict[str, Dict] = {}
    
    # Skill-wise performance: {skill: {score, count}}
    skill_performance: Dict[str, Dict] = {}
    
    # Improvement trend: [{date, score}]
    improvement_trend: List[Dict] = []
    
    # Best and worst rounds
    best_round_type: Optional[str] = None
    worst_round_type: Optional[str] = None
    
    # Streaks and achievements
    current_streak: int = 0  # Days with at least one interview
    longest_streak: int = 0
    
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "performance_metrics"


class AnalyticsSnapshot(Document):
    """Historical snapshot of user metrics for trend analysis"""
    user_id: str
    snapshot_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Snapshot of metrics at this point in time
    metrics_data: Dict = {
        "total_interviews": 0,
        "avg_score": 0.0,
        "total_time_spent": 0,
        "round_scores": {},
        "skill_scores": {}
    }
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "analytics_snapshots"
        indexes = ["user_id", "snapshot_date"]
