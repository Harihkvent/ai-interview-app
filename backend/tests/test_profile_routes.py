import pytest
import sys
import os
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from auth_routes import get_current_user
from auth_models import User
from models import Resume, UserPreferences

client = TestClient(app)

# Mock current user
mock_user = MagicMock(spec=User)
mock_user.id = "user123"
mock_user.email = "user@example.com"
mock_user.username = "testuser"
mock_user.full_name = "Test User"
mock_user.active_resume_id = None
mock_user.save = AsyncMock()
mock_user.role = "user"
mock_user.is_blocked = False
mock_user.restricted_services = []
mock_user.current_location = "Remote"
mock_user.profile_picture_url = None
mock_user.created_at = datetime.utcnow()
mock_user.last_login = None

def override_get_current_user():
    return mock_user

@pytest.fixture(autouse=True)
def mock_beanie_fields():
    with patch.object(User, 'email', SimpleMock(), create=True), \
         patch.object(User, 'username', SimpleMock(), create=True), \
         patch.object(User, 'created_at', SimpleMock(), create=True):
        yield

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.clear()

# Define SimpleMock at top
class SimpleMock:
    def __getattr__(self, name): return self
    def __call__(self, *args, **kwargs): return self
    def __ge__(self, other): return self
    def __le__(self, other): return self
    def __gt__(self, other): return self
    def __lt__(self, other): return self
    def __eq__(self, other): return self
    def __ne__(self, other): return self
    def __hash__(self): return hash(id(self))
    def isoformat(self, *args, **kwargs): return "2024-03-24T12:00:00"

@pytest.fixture(autouse=True)
def mock_beanie_fields_profile():
    with patch.object(User, 'active_resume_id', SimpleMock(), create=True), \
         patch.object(Resume, 'user_id', SimpleMock(), create=True), \
         patch.object(UserPreferences, 'user_id', SimpleMock(), create=True):
        yield

@pytest.mark.asyncio
async def test_get_resumes():
    mock_resume = MagicMock()
    mock_resume.id = "r123"
    mock_resume.name = "My Resume"
    mock_resume.filename = "resume.pdf"
    mock_resume.uploaded_at = datetime.utcnow()
    
    with patch('profile_routes.Resume.find') as mock_find:
        mock_find.return_value.sort.return_value.to_list = AsyncMock(return_value=[mock_resume])
        
        response = client.get("/api/v1/profile/resumes")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["filename"] == "resume.pdf"

@pytest.mark.asyncio
async def test_set_active_resume_success():
    resume_id = "r123"
    mock_resume = MagicMock()
    mock_resume.id = resume_id
    mock_resume.user_id = "user123"
    mock_resume.filename = "resume.pdf"
    
    with patch('profile_routes.Resume.get', new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resume
        
        response = client.put("/api/v1/profile/resumes/active", json={"resume_id": resume_id})
        
        assert response.status_code == 200
        assert mock_user.active_resume_id == resume_id
        assert mock_user.save.called

@pytest.mark.asyncio
async def test_get_preferences():
    mock_prefs = MagicMock()
    mock_prefs.dict.return_value = {"theme": "dark"}
    
    with patch('profile_routes.UserPreferences.find_one', new_callable=AsyncMock) as mock_find_one:
        mock_find_one.return_value = mock_prefs
        
        response = client.get("/api/v1/profile/preferences")
        
        assert response.status_code == 200
        assert response.json()["theme"] == "dark"

@pytest.mark.asyncio
async def test_update_preferences():
    mock_prefs = MagicMock()
    mock_prefs.update = AsyncMock()
    mock_prefs.dict.return_value = {"theme": "light"}
    
    with patch('profile_routes.UserPreferences.find_one', new_callable=AsyncMock) as mock_find_one:
        mock_find_one.return_value = mock_prefs
        
        response = client.put("/api/v1/profile/preferences", json={"theme": "light"})
        
        assert response.status_code == 200
        assert mock_prefs.update.called

@pytest.mark.asyncio
async def test_update_profile():
    profile_data = {"full_name": "New Name", "username": "newuser"}
    
    response = client.put("/api/v1/profile/", json=profile_data)
    
    assert response.status_code == 200
    assert mock_user.full_name == "New Name"
    assert mock_user.username == "newuser"
    assert mock_user.save.called

@pytest.mark.asyncio
async def test_get_resume_file_from_db():
    resume_id = "r123"
    mock_resume = MagicMock()
    mock_resume.user_id = "user123"
    mock_resume.filename = "resume.pdf"
    mock_resume.file_content = b"fake pdf content"
    
    with patch('profile_routes.Resume.get', new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resume
        
        response = client.get(f"/api/v1/profile/resumes/{resume_id}/file")
        
        assert response.status_code == 200
        assert response.content == b"fake pdf content"
        assert response.headers["content-type"] == "application/pdf"
