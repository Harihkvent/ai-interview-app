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
        job = None
        
        # Check if it's a valid ObjectId first
        if ObjectId.is_valid(job_db_id):
            job = await JobMatch.get(job_db_id)
            
        # If not found or not an ObjectId, try SerpApi job_id
        if not job:
            job = await JobMatch.find_one(JobMatch.job_id == job_db_id)
            
        if not job:
            raise HTTPException(status_code=404, detail="Job match not found")
        
        # Ensure it's linked to this user and toggle status
        job.is_saved = not job.is_saved
        job.user_id = str(current_user.id)
        await job.save()
        
        return {
            "job_id": str(job.id),
            "is_saved": job.is_saved,
            "message": "Job saved successfully" if job.is_saved else "Job removed from saved"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/{job_id}/prepare")
async def prepare_for_job(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    """Start an interview session tailored to a specific saved job"""
    try:
        from bson import ObjectId
        # 1. Find the job
        job = None
        if ObjectId.is_valid(job_id):
            job = await JobMatch.get(job_id)
        if not job:
            job = await JobMatch.find_one(JobMatch.job_id == job_id)
            
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
            
        # 2. Find user's most recent resume
        recent_session = await InterviewSession.find(
            InterviewSession.user_id == str(current_user.id),
            InterviewSession.resume_id != None
        ).sort("-created_at").first_or_none()
        
        if not recent_session:
            raise HTTPException(status_code=400, detail="No resume found. Please upload a resume first.")
            
        # 3. Create new session
        new_session = InterviewSession(
            user_id=str(current_user.id),
            status="active",
            started_at=datetime.utcnow(),
            resume_id=recent_session.resume_id,
            session_type="interview",
            job_title=job.job_title
        )
        await new_session.insert()
        
        # 4. Create rounds
        round_types = ["aptitude", "technical", "hr"]
        for round_type in round_types:
            round_obj = InterviewRound(
                session_id=str(new_session.id),
                round_type=round_type,
                status="pending"
            )
            await round_obj.insert()
            
        return {
            "session_id": str(new_session.id),
            "message": f"Interview started for {job.job_title} at {job.company_name or 'N/A'}"
        }
    except HTTPException:
        raise
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
        
        formatted_jobs = []
        for m in saved_jobs:
            formatted_jobs.append({
                "rank": getattr(m, 'rank', 0),
                "job_title": m.job_title,
                "company_name": m.company_name,
                "location": m.location,
                "job_description": m.job_description,
                "match_percentage": m.match_percentage,
                "matched_skills": m.matched_skills,
                "missing_skills": m.missing_skills,
                "thumbnail": m.thumbnail,
                "via": m.via,
                "apply_link": m.apply_link,
                "is_live": m.is_live,
                "is_saved": m.is_saved,
                "id": str(m.id) if hasattr(m, 'id') and m.id else str(getattr(m, '_id', 'UNKNOWN')),
                "job_id": m.job_id,
                "session_id": m.session_id
            })
            
        return {
            "total": len(formatted_jobs),
            "jobs": formatted_jobs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/search/fresher")
async def search_fresher_jobs(
    query: str = "fresher jobs",
    location: str = "India",
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """
    Search for fresher jobs using SerpAPI.
    
    Parameters:
    - query: Job search query (default: "fresher jobs")
    - location: Job location (default: "India")
    - limit: Maximum number of results (default: 10)
    """
    try:
        from serp_api_service import SerpJobService
        import logging
        
        logger = logging.getLogger(__name__)
        logger.info(f"Searching for fresher jobs: query='{query}', location='{location}', limit={limit}")
        
        # Fetch jobs from SerpAPI
        jobs = await SerpJobService.fetch_live_jobs(query=query, location=location)
        
        if not jobs:
            return {
                "total": 0,
                "jobs": [],
                "message": "No fresher jobs found. Try a different query or location."
            }
        
        # Limit results
        limited_jobs = jobs[:limit]
        
        # Format response
        formatted_jobs = []
        for job in limited_jobs:
            formatted_jobs.append({
                "job_title": job.get("job_title", "N/A"),
                "company_name": job.get("company_name", "N/A"),
                "location": job.get("location", "N/A"),
                "job_description": job.get("job_description", "N/A"),
                "thumbnail": job.get("thumbnail"),
                "via": job.get("via"),
                "extensions": job.get("extensions", []),
                "job_id": job.get("job_id"),
                "apply_link": job.get("apply_link"),
                "is_live": True  # SerpAPI jobs are always live
            })
        
        logger.info(f"Successfully found {len(formatted_jobs)} fresher jobs")
        
        return {
            "total": len(formatted_jobs),
            "jobs": formatted_jobs,
            "query": query,
            "location": location
        }
    except Exception as e:
        logger.error(f"Error searching fresher jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search jobs: {str(e)}")

@router.get("/dashboard")
async def get_user_dashboard(current_user: User = Depends(get_current_user)):
    """Get user dashboard with stats and recent activity"""
    user_id = str(current_user.id)
    
    # Get total interviews
    total_interviews = await InterviewSession.find(
        InterviewSession.user_id == user_id,
        InterviewSession.session_type == "interview"
    ).count()
    
    # Get completed interviews
    completed_interviews = await InterviewSession.find(
        InterviewSession.user_id == user_id,
        InterviewSession.status == "completed",
        InterviewSession.session_type == "interview"
    ).count()
    
    # Get saved roadmaps count
    saved_roadmaps = await CareerRoadmap.find(
        CareerRoadmap.user_id == user_id,
        CareerRoadmap.is_saved == True
    ).count()
    
    # Get recent interviews (last 5)
    recent_interviews = await InterviewSession.find(
        InterviewSession.user_id == user_id,
        InterviewSession.session_type == "interview"
    ).sort("-created_at").limit(5).to_list()
    
    # Get recent roadmaps (last 3)
    recent_roadmaps = await CareerRoadmap.find(
        CareerRoadmap.user_id == user_id
    ).sort("-created_at").limit(3).to_list()

    # Get Active Resume Insights
    active_resume_data = None
    if current_user.active_resume_id:
        resume = await Resume.get(current_user.active_resume_id)
        if resume:
            active_resume_data = {
                "filename": resume.filename,
                "summary": resume.summary,
                "improvements": resume.improvements,
                "parsed_skills": resume.parsed_skills
            }
    
    return {
        "user": {
            "id": str(current_user.id),
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name
        },
        "active_resume": active_resume_data,
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
                "total_score": interview.total_score,
                "job_title": interview.job_title
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
        InterviewSession.user_id == user_id,
        InterviewSession.session_type == "interview"
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
            "job_title": interview.job_title,
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
    # Resume does not have session_id content, so we skip deleting it here.
    # await Resume.find(Resume.session_id == session_id).delete()
    
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
                "milestones_count": len(roadmap.milestones) if roadmap.milestones else 0
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
