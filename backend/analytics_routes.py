"""
Analytics API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel

from auth_routes import get_current_user
from auth_models import User
from analytics_service import (
    get_analytics_dashboard,
    get_performance_trends,
    get_round_breakdown,
    create_snapshot
)

router = APIRouter()


# Response Models
class AnalyticsDashboardResponse(BaseModel):
    overview: dict
    trends: dict
    round_performance: dict
    improvement_trend: list


class PerformanceTrendsResponse(BaseModel):
    period_days: int
    total_interviews: int
    trend_data: list
    avg_score: float


class RoundBreakdownResponse(BaseModel):
    round_breakdown: dict
    total_sessions: int


# Endpoints
@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics dashboard"""
    try:
        dashboard_data = await get_analytics_dashboard(str(current_user.id))
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance-trends", response_model=PerformanceTrendsResponse)
async def get_trends(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user)
):
    """Get performance trends for specified period"""
    try:
        trends = await get_performance_trends(str(current_user.id), days)
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/round-breakdown", response_model=RoundBreakdownResponse)
async def get_breakdown(
    current_user: User = Depends(get_current_user)
):
    """Get round-wise performance breakdown"""
    try:
        breakdown = await get_round_breakdown(str(current_user.id))
        return breakdown
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/snapshot")
async def create_metrics_snapshot(
    current_user: User = Depends(get_current_user)
):
    """Create a snapshot of current metrics"""
    try:
        snapshot = await create_snapshot(str(current_user.id))
        return {
            "snapshot_id": str(snapshot.id),
            "snapshot_date": snapshot.snapshot_date.isoformat(),
            "message": "Snapshot created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
