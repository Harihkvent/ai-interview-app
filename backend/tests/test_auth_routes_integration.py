import pytest
import sys
import os
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch, PropertyMock
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from auth_models import User

client = TestClient(app)

# Define a mock field that supports operators
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
def mock_beanie_fields_auth():
    with patch.object(User, 'email', SimpleMock(), create=True), \
         patch.object(User, 'username', SimpleMock(), create=True), \
         patch.object(User, 'created_at', SimpleMock(), create=True):
        yield

@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = "user123"
    user.email = "test@example.com"
    user.username = "testuser"
    user.full_name = "Test User"
    user.hashed_password = User.hash_password("password123")
    user.verify_password.return_value = True
    user.is_blocked = False
    user.is_active = True
    user.role = "user"
    user.restricted_services = []
    user.current_location = "Remote"
    user.profile_picture_url = None
    user.created_at = datetime.utcnow()
    user.last_login = None
    user.save = AsyncMock()
    user.insert = AsyncMock()
    return user

@pytest.mark.asyncio
async def test_register_user_success(mock_user):
    register_data = {
        "email": "new@example.com",
        "username": "newuser",
        "password": "password123",
        "full_name": "New User"
    }
    
    # Patch find_one and User class constructor to handle the registration logic
    with patch('auth_routes.User.find_one', new_callable=AsyncMock) as mock_find_one, \
         patch('auth_routes.User', return_value=mock_user) as MockUserClass:
        
        mock_find_one.return_value = None
        MockUserClass.hash_password = User.hash_password
        MockUserClass.find_one = mock_find_one
        
        response = client.post("/auth/register", json=register_data)
        
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert mock_user.insert.called

@pytest.mark.asyncio
async def test_login_success(mock_user):
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    # Ensure our mock_user has everything needed for login
    mock_user.verify_password = MagicMock(return_value=True)
    
    with patch('auth_routes.User.find_one', new_callable=AsyncMock) as mock_find_one:
        mock_find_one.return_value = mock_user
        
        response = client.post("/auth/login", json=login_data)
        
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert response.json()["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_get_me(mock_user):
    from auth_routes import get_current_user
    
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    response = client.get("/auth/me")
    
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"
    
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]
