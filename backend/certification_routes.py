"""
Certification API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel

from auth_routes import get_current_user
from auth_models import User
from certification_service import (
    search_certifications,
    get_recommended_certifications,
    get_user_certifications,
    add_user_certification,
    update_user_certification,
    delete_user_certification,
    check_expiring_certifications,
    get_certification_roadmap
)

router = APIRouter()


# Request/Response Models
class AddCertificationRequest(BaseModel):
    certification_id: str
    status: str = "planning"
    obtained_date: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    notes: Optional[str] = None


class UpdateCertificationRequest(BaseModel):
    status: Optional[str] = None
    obtained_date: Optional[str] = None
    expiry_date: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    notes: Optional[str] = None


# Endpoints
@router.get("")
async def list_certifications(
    query: Optional[str] = None,
    category: Optional[str] = None,
    provider: Optional[str] = None,
    difficulty: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Search and list certifications"""
    try:
        certs = await search_certifications(query, category, provider, difficulty)
        
        return {
            "certifications": [
                {
                    "certification_id": str(c.id),
                    "name": c.name,
                    "provider": c.provider,
                    "category": c.category,
                    "difficulty": c.difficulty,
                    "cost_range": c.cost_range,
                    "validity_months": c.validity_months,
                    "description": c.description,
                    "official_url": c.official_url,
                    "recommended_for_roles": c.recommended_for_roles
                }
                for c in certs
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations")
async def get_recommendations(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user)
):
    """Get recommended certifications based on user profile"""
    try:
        recommendations = await get_recommended_certifications(str(current_user.id), limit)
        
        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user")
async def get_user_certs(
    current_user: User = Depends(get_current_user)
):
    """Get user's certifications"""
    try:
        certs = await get_user_certifications(str(current_user.id))
        
        return {"certifications": certs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user")
async def add_certification(
    request: AddCertificationRequest,
    current_user: User = Depends(get_current_user)
):
    """Add a certification to user's profile"""
    try:
        cert_data = {
            "certification_id": request.certification_id,
            "status": request.status,
            "obtained_date": request.obtained_date,
            "credential_id": request.credential_id,
            "credential_url": request.credential_url,
            "notes": request.notes
        }
        
        user_cert = await add_user_certification(str(current_user.id), cert_data)
        
        return {
            "user_cert_id": str(user_cert.id),
            "message": "Certification added successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/user/{cert_id}")
async def update_certification(
    cert_id: str,
    request: UpdateCertificationRequest,
    current_user: User = Depends(get_current_user)
):
    """Update a user's certification"""
    try:
        # Verify ownership
        from certification_models import UserCertification
        user_cert = await UserCertification.get(cert_id)
        
        if not user_cert:
            raise HTTPException(status_code=404, detail="Certification not found")
        
        if user_cert.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        updates = {}
        if request.status:
            updates["status"] = request.status
        if request.obtained_date:
            updates["obtained_date"] = request.obtained_date
        if request.expiry_date:
            updates["expiry_date"] = request.expiry_date
        if request.credential_id:
            updates["credential_id"] = request.credential_id
        if request.credential_url:
            updates["credential_url"] = request.credential_url
        if request.notes is not None:
            updates["notes"] = request.notes
        
        updated_cert = await update_user_certification(cert_id, updates)
        
        return {
            "user_cert_id": str(updated_cert.id),
            "message": "Certification updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/user/{cert_id}")
async def delete_certification(
    cert_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a user's certification"""
    try:
        # Verify ownership
        from certification_models import UserCertification
        user_cert = await UserCertification.get(cert_id)
        
        if not user_cert:
            raise HTTPException(status_code=404, detail="Certification not found")
        
        if user_cert.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        success = await delete_user_certification(cert_id)
        
        if success:
            return {"message": "Certification deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete certification")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/roadmap")
async def get_roadmap(
    target_role: str = Query(..., description="Target job role"),
    current_user: User = Depends(get_current_user)
):
    """Get certification roadmap for a target role"""
    try:
        roadmap = await get_certification_roadmap(str(current_user.id), target_role)
        
        return roadmap
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/expiring")
async def get_expiring(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user)
):
    """Get certifications expiring soon"""
    try:
        expiring = await check_expiring_certifications(str(current_user.id), days)
        
        return {"expiring_certifications": expiring}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
