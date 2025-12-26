"""
User Dashboard and Roadmap Management Routes
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime

from auth_routes import get_current_user
from auth_models import User
from models import InterviewSession, CareerRoadmap, InterviewRound, Answer, Question, Resume, JobMatch
from file_handler import extract_resume_text

router = APIRouter(prefix="/user", tags=["user"])

# ============= User Dashboard =============

# ... (dashboard logic)

# ============= Resume Management =============

@router.get("/resumes")
async def get_user_resumes(current_user: User = Depends(get_current_user)):
    """Get all saved resumes for the user"""
    resumes = await Resume.find(Resume.user_id == str(current_user.id)).sort("-uploaded_at").to_list()
    return [
        {
            "id": str(r.id),
            "filename": r.filename,
            "name": r.name or r.filename,
            "uploaded_at": r.uploaded_at.isoformat(),
            "candidate_name": r.candidate_name,
            "candidate_email": r.candidate_email
        }
        for r in resumes
    ]

@router.post("/resumes")
async def upload_user_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a resume to user profile without starting a session"""
    try:
        # Extract text from resume and save to disk
        file_path, resume_text = await extract_resume_text(file)
        
        # Extract candidate info
        from resume_parser import extract_candidate_info
        candidate_name, candidate_email = extract_candidate_info(resume_text)
        
        # Save resume to database
        resume = Resume(
            user_id=str(current_user.id),
            filename=file.filename,
            name=file.filename,
            content=resume_text,
            file_path=file_path,
            candidate_name=candidate_name,
            candidate_email=candidate_email
        )
        await resume.insert()
        
        return {
            "id": str(resume.id),
            "message": "Resume uploaded successfully",
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/resumes/{resume_id}")
async def delete_user_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a saved resume"""
    resume = await Resume.get(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if resume.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this resume")
        
    await resume.delete()
    return {"message": "Resume deleted successfully"}

# ============= Interview History =============

@router.post("/jobs/{job_db_id}/save")
async def toggle_save_job(
    job_db_id: str,
    current_user: User = Depends(get_current_user)
):
    """Toggle the saved status of a job match"""
    try:
        from bson import ObjectId
        job = await JobMatch.get(job_db_id)
        if not job:
            # Try to find by SerpApi job_id if query fails
            job = await JobMatch.find_one(JobMatch.job_id == job_db_id)
            
        if not job:
            raise HTTPException(status_code=404, detail="Job match not found")
        
        # Ensure user owns this match or it's a global live job they want to save
        # For now, we allow saving any job they can see
        job.is_saved = not job.is_saved
        job.user_id = str(current_user.id) # Ensure it's linked to this user
        await job.save()
        
        return {
            "job_id": str(job.id),
            "is_saved": job.is_saved,
            "message": "Job saved successfully" if job.is_saved else "Job removed from saved"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/saved")
async def get_saved_jobs(current_user: User = Depends(get_current_user)):
    """Get all jobs saved by the user"""
    try:
        saved_jobs = await JobMatch.find(
            JobMatch.user_id == str(current_user.id),
            JobMatch.is_saved == True
        ).to_list()
        
        return {
            "total": len(saved_jobs),
            "jobs": saved_jobs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
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

@router.delete("/interviews/{session_id}")
async def delete_interview(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an interview session and all its related data (cascading)"""
    session = await InterviewSession.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    # Verify ownership
    if session.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")
        
    # Delete related rounds, questions, and answers
    rounds = await InterviewRound.find(InterviewRound.session_id == session_id).to_list()
    for r in rounds:
        questions = await Question.find(Question.round_id == str(r.id)).to_list()
        for q in questions:
            await Answer.find(Answer.question_id == str(q.id)).delete()
            await q.delete()
        await r.delete()
        
    # Delete job matches and roadmaps
    await JobMatch.find(JobMatch.session_id == session_id).delete()
    await CareerRoadmap.find(CareerRoadmap.session_id == session_id).delete()
    
    # Delete resume (optional: keep file, delete DB entry)
    await Resume.find(Resume.session_id == session_id).delete()
    
    # Finally delete the session
    await session.delete()
    
    return {"message": "Interview history deleted successfully"}

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
