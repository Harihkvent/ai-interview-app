import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock ml_job_matcher before it gets imported by road_map_generator
mock_ml = MagicMock()
mock_ml.extract_skills.return_value = ["Python", "SQL", "AWS"]
sys.modules['ml_job_matcher'] = mock_ml

from roadmap_generator import analyze_skills_gap, create_fallback_roadmap

@pytest.mark.asyncio
async def test_analyze_skills_gap():
    """Test the skills gap analysis logic"""
    resume_skills = ["Python", "Docker", "SQL"]
    target_jd = "Looking for a Python developer with SQL and AWS experience."
    
    result = await analyze_skills_gap(resume_skills, target_jd)
    
    assert "Python" in result["matched_skills"]
    assert "SQL" in result["matched_skills"]
    assert "AWS" in result["missing_skills"]
    assert result["match_percentage"] == 66.67

def test_create_fallback_roadmap():
    """Test that fallback roadmap has all required keys and valid structure"""
    target_role = "DevOps Engineer"
    skills_gap = {
        "matched_skills": ["Linux"],
        "missing_skills": ["Kubernetes", "Terraform"],
        "required_skills": ["Linux", "Kubernetes", "Terraform"],
        "match_percentage": 33.33
    }
    
    roadmap = create_fallback_roadmap(target_role, skills_gap)
    
    assert "current_assessment" in roadmap
    assert "milestones" in roadmap
    assert "estimated_timeline" in roadmap
    assert len(roadmap["milestones"]) == 3
    assert "Kubernetes" in str(roadmap["milestones"][0]["goals"])

@pytest.mark.asyncio
async def test_roadmap_normalization():
    """Test that key variations from AI are correctly normalized"""
    from roadmap_generator import generate_roadmap_content
    
    # Mock AI response with legacy keys
    mock_ai_content = '{ "learning_path": [{"title": "Phase 1", "learning_goals": ["Learn X"]}], "assessment": {"strengths": ["Y"]} }'
    
    with patch('httpx.AsyncClient.post') as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"choices": [{"message": {"content": mock_ai_content}}]},
            raise_for_status=lambda: None
        )
        
        result = await generate_roadmap_content("resume", "role", {"matched_skills": [], "missing_skills": [], "match_percentage": 0})
        
        # Verify normalization
        assert "milestones" in result
        assert "current_assessment" in result
        assert result["milestones"][0]["phase"] == "Phase 1"
        assert result["milestones"][0]["goals"] == ["Learn X"]
