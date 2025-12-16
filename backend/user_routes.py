"""
User Dashboard and Roadmap Management Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime

from auth_routes import get_current_user
from auth_models import User
from models import InterviewSession, CareerRoadmap, InterviewRound, Answer

router = APIRouter(prefix="/user", tags=["user"])

# ============= User Dashboard =============

@router.get("/dashboard")
async def get_user_dashboard(current_user: User = Depends(get_current_user)):
    """Get user dashboard with stats and recent activity"""
    user_id = str(current_user.id)
    
    # Get total interviews
    total_interviews = await InterviewSession.find(
        InterviewSession.user_id == user_id
    ).count()
    
    # Get completed interviews
    completed_interviews = await InterviewSession.find(
        InterviewSession.user_id == user_id,
        InterviewSession.status == "completed"
    ).count()
    
    # Get saved roadmaps count
    saved_roadmaps = await CareerRoadmap.find(
        CareerRoadmap.user_id == user_id,
        CareerRoadmap.is_saved == True
    ).count()
    
    # Get recent interviews (last 5)
    recent_interviews = await InterviewSession.find(
        InterviewSession.user_id == user_id
    ).sort("-created_at").limit(5).to_list()
    
    # Get recent roadmaps (last 3)
    recent_roadmaps = await CareerRoadmap.find(
        CareerRoadmap.user_id == user_id
    ).sort("-created_at").limit(3).to_list()
    
    return {
        "user": {
            "id": str(current_user.id),
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name
        },
        "stats": {
            "total_interviews": total_interviews,
            "completed_interviews": completed_interviews,
            "saved_roadmaps": saved_roadmaps,
            "member_since": current_user.created_at.isoformat()
        },
        "recent_interviews": [
            {
                "id": str(interview.id),
                "status": interview.status,
                "created_at": interview.created_at.isoformat(),
                "total_score": interview.total_score
            }
            for interview in recent_interviews
        ],
        "recent_roadmaps": [
            {
                "id": str(roadmap.id),
                "target_role": roadmap.target_role,
                "is_saved": roadmap.is_saved,
                "created_at": roadmap.created_at.isoformat()
            }
            for roadmap in recent_roadmaps
        ]
    }

# ============= Interview History =============

@router.get("/interviews")
async def get_user_interviews(current_user: User = Depends(get_current_user)):
    """Get user's interview history"""
    user_id = str(current_user.id)
    
    interviews = await InterviewSession.find(
        InterviewSession.user_id == user_id
    ).sort("-created_at").to_list()
    
    result = []
    for interview in interviews:
        # Get rounds for this interview
        rounds = await InterviewRound.find(
            InterviewRound.session_id == str(interview.id)
        ).to_list()
        
        result.append({
            "id": str(interview.id),
            "status": interview.status,
            "created_at": interview.created_at.isoformat(),
            "completed_at": interview.completed_at.isoformat() if interview.completed_at else None,
            "total_score": interview.total_score,
            "total_time_seconds": interview.total_time_seconds,
            "rounds": [
                {
                    "type": round.round_type,
                    "status": round.status,
                    "score": round.total_score
                }
                for round in rounds
            ]
        })
    
    return {
        "total": len(result),
        "interviews": result
    }

# ============= Roadmap Management =============

@router.get("/roadmaps")
async def get_user_roadmaps(
    saved_only: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get user's roadmaps"""
    user_id = str(current_user.id)
    
    # Build query based on filters
    if saved_only:
        roadmaps = await CareerRoadmap.find(
            CareerRoadmap.user_id == user_id,
            CareerRoadmap.is_saved == True
        ).sort("-created_at").to_list()
    else:
        roadmaps = await CareerRoadmap.find(
            CareerRoadmap.user_id == user_id
        ).sort("-created_at").to_list()
    
    return {
        "total": len(roadmaps),
        "roadmaps": [
            {
                "id": str(roadmap.id),
                "target_role": roadmap.target_role,
                "estimated_timeline": roadmap.estimated_timeline,
                "is_saved": roadmap.is_saved,
                "created_at": roadmap.created_at.isoformat(),
                "skills_gap": roadmap.skills_gap,
                "milestones_count": len(roadmap.milestones)
            }
            for roadmap in roadmaps
        ]
    }

@router.post("/roadmaps/{roadmap_id}/save")
async def save_roadmap(
    roadmap_id: str,
    current_user: User = Depends(get_current_user)
):
    """Save a roadmap to user's collection"""
    roadmap = await CareerRoadmap.get(roadmap_id)
    
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Update roadmap with user_id and save status
    roadmap.user_id = str(current_user.id)
    roadmap.is_saved = True
    await roadmap.save()
    
    return {
        "message": "Roadmap saved successfully",
        "roadmap_id": str(roadmap.id),
        "target_role": roadmap.target_role
    }

@router.delete("/roadmaps/{roadmap_id}")
async def delete_roadmap(
    roadmap_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a roadmap (or unsave it)"""
    roadmap = await CareerRoadmap.get(roadmap_id)
    
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Verify ownership
    if roadmap.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this roadmap")
    
    # Either delete or just unsave
    if roadmap.is_saved:
        roadmap.is_saved = False
        await roadmap.save()
        return {"message": "Roadmap unsaved successfully"}
    else:
        await roadmap.delete()
        return {"message": "Roadmap deleted successfully"}

@router.get("/roadmaps/{roadmap_id}")
async def get_roadmap_details(
    roadmap_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get detailed roadmap information"""
    roadmap = await CareerRoadmap.get(roadmap_id)
    
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Verify ownership
    if roadmap.user_id and roadmap.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this roadmap")
    
    return {
        "id": str(roadmap.id),
        "target_role": roadmap.target_role,
        "current_role": roadmap.current_role,
        "estimated_timeline": roadmap.estimated_timeline,
        "is_saved": roadmap.is_saved,
        "created_at": roadmap.created_at.isoformat(),
        "skills_gap": roadmap.skills_gap,
        "milestones": roadmap.milestones,
        "roadmap_content": roadmap.roadmap_content
    }
