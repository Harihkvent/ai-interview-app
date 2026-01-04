"""
Certification Service - Track certifications and provide recommendations
"""
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import logging

from certification_models import Certification, UserCertification
from models import Resume

logger = logging.getLogger("certification_service")


async def search_certifications(
    query: Optional[str] = None,
    category: Optional[str] = None,
    provider: Optional[str] = None,
    difficulty: Optional[str] = None
) -> List[Certification]:
    """Search certifications with filters"""
    try:
        find_query = Certification.find()
        
        if category:
            find_query = find_query.find(Certification.category == category)
        if provider:
            find_query = find_query.find(Certification.provider == provider)
        if difficulty:
            find_query = find_query.find(Certification.difficulty == difficulty)
        
        certs = await find_query.to_list()
        
        # If query provided, filter by name/description
        if query:
            query_lower = query.lower()
            certs = [
                c for c in certs
                if query_lower in c.name.lower() or query_lower in c.description.lower()
            ]
        
        return certs
    except Exception as e:
        logger.error(f"Error searching certifications: {str(e)}")
        raise


async def get_recommended_certifications(user_id: str, limit: int = 10) -> List[Dict]:
    """Get AI-recommended certifications based on user's profile"""
    try:
        # Get user's resume
        resume = await Resume.find_one(
            Resume.user_id == user_id,
            Resume.is_primary == True
        )
        
        if not resume:
            # Get most recent resume
            resume = await Resume.find_one(
                Resume.user_id == user_id
            ).sort("-uploaded_at")
        
        # Get user's existing certifications
        user_certs = await UserCertification.find(
            UserCertification.user_id == user_id
        ).to_list()
        
        existing_cert_ids = [str(uc.certification_id) for uc in user_certs]
        
        # Get all available certifications
        all_certs = await Certification.find().to_list()
        
        # Filter out already obtained certifications
        available_certs = [c for c in all_certs if str(c.id) not in existing_cert_ids]
        
        # Use AI to rank certifications
        if resume:
            ranked_certs = await _rank_certifications_with_ai(
                resume.content,
                resume.parsed_skills,
                available_certs
            )
        else:
            # Fallback to popularity-based ranking
            ranked_certs = sorted(available_certs, key=lambda x: x.popularity_score, reverse=True)
        
        # Return top recommendations
        recommendations = []
        for cert in ranked_certs[:limit]:
            recommendations.append({
                "certification_id": str(cert.id),
                "name": cert.name,
                "provider": cert.provider,
                "category": cert.category,
                "difficulty": cert.difficulty,
                "cost_range": cert.cost_range,
                "description": cert.description,
                "official_url": cert.official_url,
                "recommended_for_roles": cert.recommended_for_roles
            })
        
        return recommendations
    except Exception as e:
        logger.error(f"Error getting recommended certifications: {str(e)}")
        raise


async def _rank_certifications_with_ai(
    resume_content: str,
    skills: List[str],
    certifications: List[Certification]
) -> List[Certification]:
    """Use AI to rank certifications based on resume"""
    try:
        from ai_utils import call_krutrim_api
        
        # Create cert list for prompt
        cert_list = "\n".join([
            f"{i+1}. {c.name} ({c.provider}) - {c.category} - {c.description[:100]}"
            for i, c in enumerate(certifications[:20])  # Limit to avoid token limits
        ])
        
        prompt = f"""Based on the following resume and skills, rank the certifications by relevance (most relevant first).

Resume Skills: {', '.join(skills)}

Available Certifications:
{cert_list}

Respond with only the numbers of the certifications in order of relevance, comma-separated (e.g., "3,1,5,2,4")."""
        
        messages = [{"role": "user", "content": prompt}]
        response_text = await call_krutrim_api(messages, temperature=0.3, operation="rank_certifications")
        
        # Parse ranking
        ranking_str = response_text.strip()
        rankings = [int(x.strip()) - 1 for x in ranking_str.split(",") if x.strip().isdigit()]
        
        # Reorder certifications
        ranked = []
        for idx in rankings:
            if 0 <= idx < len(certifications):
                ranked.append(certifications[idx])
        
        # Add remaining certifications
        for i, cert in enumerate(certifications):
            if i not in rankings:
                ranked.append(cert)
        
        return ranked
    except Exception as e:
        logger.error(f"Error ranking certifications with AI: {str(e)}")
        # Fallback to original order
        return certifications


async def get_user_certifications(user_id: str) -> List[Dict]:
    """Get user's certifications"""
    try:
        user_certs = await UserCertification.find(
            UserCertification.user_id == user_id
        ).sort("-created_at").to_list()
        
        result = []
        for uc in user_certs:
            cert = await Certification.get(uc.certification_id)
            result.append({
                "user_cert_id": str(uc.id),
                "certification_id": str(uc.certification_id),
                "name": uc.certification_name,
                "provider": uc.provider,
                "status": uc.status,
                "obtained_date": uc.obtained_date.isoformat() if uc.obtained_date else None,
                "expiry_date": uc.expiry_date.isoformat() if uc.expiry_date else None,
                "credential_id": uc.credential_id,
                "credential_url": uc.credential_url,
                "notes": uc.notes,
                "category": cert.category if cert else None,
                "difficulty": cert.difficulty if cert else None
            })
        
        return result
    except Exception as e:
        logger.error(f"Error getting user certifications: {str(e)}")
        raise


async def add_user_certification(user_id: str, cert_data: Dict) -> UserCertification:
    """Add a certification to user's profile"""
    try:
        # Get certification details
        cert = await Certification.get(cert_data["certification_id"])
        if not cert:
            raise ValueError("Certification not found")
        
        # Calculate expiry date if applicable
        expiry_date = None
        if cert.validity_months and cert_data.get("obtained_date"):
            obtained = datetime.fromisoformat(cert_data["obtained_date"])
            expiry_date = obtained + timedelta(days=cert.validity_months * 30)
        
        user_cert = UserCertification(
            user_id=user_id,
            certification_id=cert_data["certification_id"],
            certification_name=cert.name,
            provider=cert.provider,
            status=cert_data.get("status", "planning"),
            obtained_date=datetime.fromisoformat(cert_data["obtained_date"]) if cert_data.get("obtained_date") else None,
            expiry_date=expiry_date,
            credential_id=cert_data.get("credential_id"),
            credential_url=cert_data.get("credential_url"),
            notes=cert_data.get("notes")
        )
        await user_cert.insert()
        
        logger.info(f"Added certification {cert.name} for user {user_id}")
        return user_cert
    except Exception as e:
        logger.error(f"Error adding user certification: {str(e)}")
        raise


async def update_user_certification(user_cert_id: str, updates: Dict) -> UserCertification:
    """Update a user's certification"""
    try:
        user_cert = await UserCertification.get(user_cert_id)
        if not user_cert:
            raise ValueError("User certification not found")
        
        if "status" in updates:
            user_cert.status = updates["status"]
        if "obtained_date" in updates:
            user_cert.obtained_date = datetime.fromisoformat(updates["obtained_date"])
        if "expiry_date" in updates:
            user_cert.expiry_date = datetime.fromisoformat(updates["expiry_date"])
        if "credential_id" in updates:
            user_cert.credential_id = updates["credential_id"]
        if "credential_url" in updates:
            user_cert.credential_url = updates["credential_url"]
        if "notes" in updates:
            user_cert.notes = updates["notes"]
        
        user_cert.updated_at = datetime.utcnow()
        await user_cert.save()
        
        return user_cert
    except Exception as e:
        logger.error(f"Error updating user certification: {str(e)}")
        raise


async def delete_user_certification(user_cert_id: str) -> bool:
    """Delete a user's certification"""
    try:
        user_cert = await UserCertification.get(user_cert_id)
        if not user_cert:
            return False
        
        await user_cert.delete()
        logger.info(f"Deleted user certification {user_cert_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting user certification: {str(e)}")
        return False


async def check_expiring_certifications(user_id: str, days_threshold: int = 30) -> List[Dict]:
    """Check for certifications expiring soon"""
    try:
        threshold_date = datetime.utcnow() + timedelta(days=days_threshold)
        
        expiring = await UserCertification.find(
            UserCertification.user_id == user_id,
            UserCertification.status == "completed",
            UserCertification.expiry_date != None,
            UserCertification.expiry_date <= threshold_date
        ).to_list()
        
        result = []
        for uc in expiring:
            days_until_expiry = (uc.expiry_date - datetime.utcnow()).days
            result.append({
                "user_cert_id": str(uc.id),
                "name": uc.certification_name,
                "provider": uc.provider,
                "expiry_date": uc.expiry_date.isoformat(),
                "days_until_expiry": days_until_expiry
            })
        
        return result
    except Exception as e:
        logger.error(f"Error checking expiring certifications: {str(e)}")
        raise


async def get_certification_roadmap(user_id: str, target_role: str) -> Dict:
    """Get recommended certification path for a target role"""
    try:
        # Get user's current certifications
        user_certs = await get_user_certifications(user_id)
        completed_names = [uc["name"] for uc in user_certs if uc["status"] == "completed"]
        
        # Get certifications recommended for the target role
        all_certs = await Certification.find().to_list()
        relevant_certs = [
            c for c in all_certs
            if target_role.lower() in " ".join(c.recommended_for_roles).lower()
        ]
        
        # Build roadmap by difficulty
        roadmap = {
            "target_role": target_role,
            "completed": completed_names,
            "recommended_path": {
                "beginner": [],
                "intermediate": [],
                "advanced": [],
                "expert": []
            }
        }
        
        for cert in relevant_certs:
            if cert.name not in completed_names:
                roadmap["recommended_path"][cert.difficulty].append({
                    "certification_id": str(cert.id),
                    "name": cert.name,
                    "provider": cert.provider,
                    "category": cert.category,
                    "prerequisites": cert.prerequisites,
                    "cost_range": cert.cost_range,
                    "official_url": cert.official_url
                })
        
        return roadmap
    except Exception as e:
        logger.error(f"Error getting certification roadmap: {str(e)}")
        raise
