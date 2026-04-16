import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch

# Mock motor before it's imported by main -> database to avoid pymongo version mismatch errors
sys.modules["motor"] = MagicMock()
sys.modules["motor.motor_asyncio"] = MagicMock()
# Mock langchain_mcp_adapters to avoid missing langchain_core submodules in environment
sys.modules["langchain_mcp_adapters"] = MagicMock()
sys.modules["langchain_mcp_adapters.tools"] = MagicMock()

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient

# Import app AFTER patching if necessary, but here we can import and then override dependencies
from main import app
from auth_routes import get_current_user
from auth_models import User
from datetime import datetime

# Create a mock user
mock_user_instance = MagicMock(spec=User)
mock_user_instance.id = "65f1bc87-bc87-4df9-bdea-4b7638611cdd"
mock_user_instance.username = "testuser"
mock_user_instance.email = "test@example.com"
mock_user_instance.full_name = "Test User"
mock_user_instance.current_location = "Remote"
mock_user_instance.profile_picture_url = None
mock_user_instance.created_at = datetime.utcnow()
mock_user_instance.active_resume_id = None
mock_user_instance.role = "user"
mock_user_instance.is_blocked = False
mock_user_instance.restricted_services = []
mock_user_instance.last_login = None

# Dependency override
async def override_get_current_user():
    return mock_user_instance

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.clear()

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_root_endpoint():
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "version" in response.json()

@patch('user_routes.InterviewSession.find')
@patch('user_routes.InterviewSession.user_id', create=True)
@patch('user_routes.InterviewSession.session_type', create=True)
@patch('user_routes.InterviewSession.status', create=True)
@patch('user_routes.AvatarInterviewSession.find')
@patch('user_routes.AvatarInterviewSession.user_id', create=True)
@patch('user_routes.AvatarInterviewSession.status', create=True)
@patch('user_routes.CareerRoadmap.find')
@patch('user_routes.CareerRoadmap.user_id', create=True)
@patch('user_routes.CareerRoadmap.is_saved', create=True)
@patch('user_routes.get_user_performance_summary')
def test_get_user_dashboard(mock_perf, mock_roadmap_save, mock_roadmap_uid, mock_roadmap, mock_avatar_status, mock_avatar_uid, mock_avatar, mock_session_status, mock_session_type, mock_session_uid, mock_sessions):
    """Test user dashboard route with mocked DB calls"""
    
    # Setup mocks
    mock_sessions.return_value.count = AsyncMock(return_value=5)
    # mock_sessions.find(...).find(...).count()
    mock_sessions.return_value.session_type = MagicMock() # For chaining if needed
    
    # Mock for recent interviews
    mock_sessions.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
    mock_avatar.return_value.count = AsyncMock(return_value=2)
    mock_avatar.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
    mock_roadmap.return_value.count = AsyncMock(return_value=1)
    mock_roadmap.return_value.sort.return_value.limit.return_value.to_list = AsyncMock(return_value=[])
    
    # Mock Resume for active_resume
    with patch('user_routes.Resume.get', new_callable=AsyncMock) as mock_resume_get:
        mock_resume_get.return_value = None
    
    mock_perf.return_value = {
        "skill_points": 500,
        "global_rank": 1,
        "percentile": 99.9,
        "total_users": 1000
    }
    
    response = client.get("/user/dashboard")
    
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["username"] == "testuser"
    assert data["stats"]["skill_points"] == 500
    assert data["stats"]["total_interviews"] == 7 # 5 regular + 2 avatar

@patch('user_routes.Resume.find')
@patch('user_routes.Resume.user_id', create=True)
def test_get_user_resumes(mock_resume_uid, mock_resume_find):
    """Test listing user resumes"""
    mock_resume = MagicMock()
    mock_resume.id = "resume123"
    mock_resume.filename = "resume.pdf"
    mock_resume.name = "My Resume"
    mock_resume.uploaded_at.isoformat.return_value = "2024-03-24T12:00:00"
    mock_resume.candidate_name = "Test Candidate"
    mock_resume.candidate_email = "candidate@example.com"
    
    # mock_resume_find(...).sort(...).to_list()
    mock_resume_find.return_value.sort.return_value.to_list = AsyncMock(return_value=[mock_resume])
    
    response = client.get("/user/resumes")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "resume.pdf"
    assert data[0]["id"] == "resume123"
