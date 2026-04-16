import pytest
import sys
import os
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from auth_routes import get_current_admin
from auth_models import User

# Mock admin user
mock_admin = MagicMock(spec=User)
mock_admin.id = "admin123"
mock_admin.role = "admin"
mock_admin.email = "admin@example.com"

def override_get_current_admin():
    return mock_admin

app.dependency_overrides[get_current_admin] = override_get_current_admin

client = TestClient(app)

# Patch Beanie class attributes to avoid AttributeError during query construction in tests
from admin_models import TokenUsage, AdminActivity, AppConfig
from models import InterviewSession, CareerRoadmap, QuestionBank
from feedback_models import Feedback

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

@pytest.fixture(autouse=True)
def mock_beanie_fields():
    with patch.object(User, 'created_at', SimpleMock(), create=True), \
         patch.object(InterviewSession, 'created_at', SimpleMock(), create=True), \
         patch.object(TokenUsage, 'total_tokens', SimpleMock(), create=True), \
         patch.object(Feedback, 'status', SimpleMock(), create=True):
        yield

@pytest.fixture(autouse=True)
def setup_overrides():
    app.dependency_overrides[get_current_admin] = override_get_current_admin
    yield
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_get_stats():
    with patch('admin_routes.User.count', new_callable=AsyncMock) as mock_user_count, \
         patch('admin_routes.InterviewSession.count', new_callable=AsyncMock) as mock_sess_count, \
         patch('admin_routes.CareerRoadmap.count', new_callable=AsyncMock) as mock_roadmap_count, \
         patch('admin_routes.TokenUsage.find_all') as mock_token_find, \
         patch('admin_routes.User.find') as mock_user_find, \
         patch('admin_routes.InterviewSession.find') as mock_sess_find:
        
        mock_user_count.return_value = 100
        mock_sess_count.return_value = 50
        mock_roadmap_count.return_value = 20
        
        # Setup for find().to_list()
        mock_token_list = AsyncMock(return_value=[])
        mock_token_find.return_value.to_list = mock_token_list
        
        # Setup for find().count()
        mock_user_find.return_value.count = AsyncMock(return_value=5)
        mock_sess_find.return_value.count = AsyncMock(return_value=2)
        
        # Mock client to avoid dependency issues if needed, but here we use the global client
        response = client.get("/admin/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert data["overview"]["total_users"] == 100
        assert data["overview"]["total_sessions"] == 50
        assert "analytics" in data

@pytest.mark.asyncio
async def test_list_users():
    mock_user = MagicMock()
    mock_user.id = "u123"
    mock_user.email = "test@example.com"
    mock_user.username = "testuser"
    mock_user.full_name = "Test User"
    mock_user.role = "user"
    mock_user.is_blocked = False
    mock_user.restricted_services = []
    mock_user.created_at = datetime.utcnow()
    mock_user.last_login = None
    
    with patch('admin_routes.User.find') as mock_find:
        mock_find.return_value.skip.return_value.limit.return_value.to_list = AsyncMock(return_value=[mock_user])
        mock_find.return_value.count = AsyncMock(return_value=1)
        
        response = client.get("/admin/users")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["users"][0]["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_delete_user_success():
    user_id = "u123"
    mock_user = MagicMock()
    mock_user.email = "user@example.com"
    mock_user.delete = AsyncMock()
    
    with patch('admin_routes.User.get', new_callable=AsyncMock) as mock_get, \
         patch('admin_routes.AdminActivity') as MockActivityClass:
        
        mock_get.return_value = mock_user
        mock_activity_instance = MagicMock()
        mock_activity_instance.insert = AsyncMock()
        MockActivityClass.return_value = mock_activity_instance
        
        response = client.delete(f"/admin/users/{user_id}")
        
        assert response.status_code == 200
        assert mock_user.delete.called
        assert MockActivityClass.called

@pytest.mark.asyncio
async def test_list_sessions():
    mock_sess = MagicMock()
    mock_sess.id = "s123"
    mock_sess.user_id = "u123"
    mock_sess.job_title = "Developer"
    mock_sess.status = "completed"
    mock_sess.session_type = "mock"
    mock_sess.created_at = datetime.utcnow()
    mock_sess.total_score = 8.5
    
    mock_user = MagicMock()
    mock_user.id = "u123"
    mock_user.email = "u123@example.com"
    
    with patch('admin_routes.InterviewSession.find_all') as mock_find_all, \
         patch('admin_routes.InterviewSession.count', new_callable=AsyncMock) as mock_count, \
         patch('admin_routes.User.find') as mock_user_find:
        
        mock_find_all.return_value.sort.return_value.skip.return_value.limit.return_value.to_list = AsyncMock(return_value=[mock_sess])
        mock_count.return_value = 1
        mock_user_find.return_value.to_list = AsyncMock(return_value=[mock_user])
        
        response = client.get("/admin/sessions")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["sessions"][0]["user_email"] == "u123@example.com"

@pytest.mark.asyncio
async def test_get_metrics_json():
    response = client.get("/admin/health/metrics")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)

@pytest.mark.asyncio
async def test_list_feedback():
    mock_fb = MagicMock()
    mock_fb.status = "open"
    
    with patch('admin_routes.Feedback.find') as mock_find:
        mock_find.return_value.to_list = AsyncMock(return_value=[mock_fb])
        
        response = client.get("/admin/feedback?status=open")
        
        assert response.status_code == 200
        assert len(response.json()) == 1
