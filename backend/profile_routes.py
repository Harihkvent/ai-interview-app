from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body
from typing import List, Optional
from datetime import datetime

from auth_routes import get_current_user
from auth_models import User
from models import Resume, UserPreferences
from file_handler import extract_resume_text
from resume_service import process_resume_upload

router = APIRouter(tags=["profile"])

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
        # Update fields, excluding ID fields to avoid validation errors
        update_data = {k: v for k, v in prefs_data.items() if k not in ["id", "_id", "user_id"]}
        if update_data:
            await prefs.update({"$set": update_data})
            # Update the object in memory for the response
            for k, v in update_data.items():
                if hasattr(prefs, k):
                    setattr(prefs, k, v)
        
    return {"message": "Preferences updated", "preferences": prefs.dict()}

@router.put("/")
async def update_profile(
    profile_data: dict = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Update general user profile details"""
    if "full_name" in profile_data:
        current_user.full_name = profile_data["full_name"]
    if "username" in profile_data:
        current_user.username = profile_data["username"]
    if "current_location" in profile_data:
        current_user.current_location = profile_data["current_location"]
    
    await current_user.save()
    return {"message": "Profile updated successfully", "user": {
        "full_name": current_user.full_name,
        "username": current_user.username,
        "current_location": current_user.current_location
    }}

@router.post("/photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload and persist profile photo"""
    try:
        import os
        from file_handler import BASE_UPLOAD_DIR
        
        # Create profile_photos directory if not exists
        profile_photo_dir = os.path.join(BASE_UPLOAD_DIR, "profile_photos")
        os.makedirs(profile_photo_dir, exist_ok=True)
        
        # Save file
        file_ext = os.path.splitext(file.filename)[1]
        file_name = f"profile_{current_user.id}{file_ext}"
        file_path = os.path.join(profile_photo_dir, file_name)
        
        with open(file_path, "wb") as buffer:
            import shutil
            shutil.copyfileobj(file.file, buffer)
            
        # Update user model with URL (using relative path for now)
        # In a real app this would be a full URL from a CDN
        photo_url = f"/uploads/profile_photos/{file_name}"
        current_user.profile_picture_url = photo_url
        await current_user.save()
        
        return {"message": "Photo uploaded successfully", "photo_url": photo_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
