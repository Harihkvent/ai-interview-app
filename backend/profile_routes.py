from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body
from typing import List, Optional
from datetime import datetime

from auth_routes import get_current_user
from auth_models import User
from models import Resume, UserPreferences
from file_handler import extract_resume_text
# lazy import to avoid circular dependency if needed, or structured better
from resume_parser import extract_candidate_info

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

# ============= Resume Management =============

@router.post("/resumes")
async def upload_resume(
    file: UploadFile = File(...),
    is_primary: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Upload a new resume. If first resume, sets as active."""
    try:
        # Extract text
        file_path, resume_text = await extract_resume_text(file)
        candidate_name, candidate_email = extract_candidate_info(resume_text)
        
        # Check if creating first resume
        count = await Resume.find(Resume.user_id == str(current_user.id)).count()
        if count == 0:
            is_primary = True
            
        resume = Resume(
            user_id=str(current_user.id),
            filename=file.filename,
            name=file.filename, # User can rename later
            content=resume_text,
            file_path=file_path,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            is_primary=is_primary
        )
        await resume.insert()
        
        # If primary (or first), update User's active context
        if is_primary or not current_user.active_resume_id:
            current_user.active_resume_id = str(resume.id)
            await current_user.save()
            
        # Trigger Agentic Parsing
        try:
            from ai_engine.agents.resume_manager import resume_graph
            # Invoke the graph
            await resume_graph.ainvoke({
                "resume_id": str(resume.id), 
                "resume_text": resume_text
            })
            # Reload to get updated fields
            resume = await Resume.get(resume.id)
        except Exception as e:
            # Don't fail the upload if AI fails, just log it
            print(f"Agentic parsing failed: {e}")
            
        return {
            "id": str(resume.id),
            "filename": resume.filename,
            "is_primary": resume.is_primary,
            "message": "Resume uploaded and processed by AI",
            "summary": resume.summary # Return summary immediately
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resumes")
async def get_resumes(current_user: User = Depends(get_current_user)):
    """Get all resumes for the user."""
    resumes = await Resume.find(Resume.user_id == str(current_user.id)).sort("-uploaded_at").to_list()
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "filename": r.filename,
            "is_primary": str(r.id) == current_user.active_resume_id,
            "uploaded_at": r.uploaded_at
        }
        for r in resumes
    ]

@router.put("/resumes/active")
async def set_active_resume(
    resume_id: str = Body(..., embed=True), 
    current_user: User = Depends(get_current_user)
):
    """Switch the active resume context."""
    resume = await Resume.get(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if resume.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    current_user.active_resume_id = str(resume.id)
    await current_user.save()
    
    return {"message": f"Active resume switched to {resume.filename}"}

@router.delete("/resumes/{resume_id}")
async def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a resume."""
    resume = await Resume.get(resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if resume.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    await resume.delete()
    
    # If active resume was deleted, unset it
    if current_user.active_resume_id == resume_id:
        # Try find another one
        other = await Resume.find(Resume.user_id == str(current_user.id)).first_or_none()
        current_user.active_resume_id = str(other.id) if other else None
        await current_user.save()
        
    return {"message": "Resume deleted"}

# ============= Preferences =============

@router.get("/preferences")
async def get_preferences(current_user: User = Depends(get_current_user)):
    """Get user preferences."""
    prefs = await UserPreferences.find_one(UserPreferences.user_id == str(current_user.id))
    if not prefs:
        return {} 
    return prefs.dict()

@router.put("/preferences")
async def update_preferences(
    prefs_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update user preferences."""
    prefs = await UserPreferences.find_one(UserPreferences.user_id == str(current_user.id))
    if not prefs:
        prefs = UserPreferences(user_id=str(current_user.id), **prefs_data)
        await prefs.insert()
    else:
        # Update fields
        for k, v in prefs_data.items():
            if hasattr(prefs, k):
                setattr(prefs, k, v)
        await prefs.save()
        
    return {"message": "Preferences updated", "preferences": prefs.dict()}
