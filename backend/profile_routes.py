from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body
from typing import List, Optional
from datetime import datetime

from auth_routes import get_current_user
from auth_models import User
from models import Resume, UserPreferences
from file_handler import extract_resume_text
from resume_service import process_resume_upload

router = APIRouter(prefix="/api/v1/profile", tags=["profile"])

# ============= Resume Management =============

@router.post("/resumes")
async def upload_resume(
    file: UploadFile = File(...),
    is_primary: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Upload a new resume. deduplicates by content hash."""
    try:
        resume, is_duplicate = await process_resume_upload(str(current_user.id), file)
        
        # Check if creating first resume
        count = await Resume.find(Resume.user_id == str(current_user.id)).count()
        if count == 1 and not is_duplicate:
            resume.is_primary = True
            await resume.save()
            
        # If primary (or first), update User's active context
        if is_primary or not current_user.active_resume_id:
            current_user.active_resume_id = str(resume.id)
            await current_user.save()
            
        return {
            "id": str(resume.id),
            "filename": resume.filename,
            "is_primary": str(resume.id) == current_user.active_resume_id,
            "is_duplicate": is_duplicate,
            "message": "Resume processed successfully" if not is_duplicate else "Resume already exists in vault",
            "summary": resume.summary
        }
    except HTTPException as he:
        raise he
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
