import pytest
import sys
import os
from unittest.mock import MagicMock, patch
from datetime import datetime
import jwt

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from auth_routes import create_access_token, SECRET_KEY, ALGORITHM
from auth_models import User

# Mock User settings for unit testing without DB
User.Settings = MagicMock()
User.Settings.name = "users"

def test_password_hashing():
    """Test that password hashing and verification works correctly"""
    password = "secret_password"
    hashed = User.hash_password(password)
    
    assert hashed != password
    # Bypass beanie settings check during instantiation
    with patch('auth_models.User.get_settings'):
        user = User(email="test@example.com", username="testuser", password_hash=hashed)
        assert user.verify_password(password) is True
        assert user.verify_password("wrong_password") is False

def test_create_access_token():
    """Test JWT token creation and structure"""
    data = {"sub": "user_123", "role": "admin"}
    token = create_access_token(data)
    
    assert isinstance(token, str)
    
    # Decode and verify
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded["sub"] == "user_123"
    assert decoded["role"] == "admin"
    assert "exp" in decoded

@pytest.mark.asyncio
async def test_get_current_user_no_token():
    """Test standard dependency failure when no token is provided"""
    from auth_routes import get_current_user
    from fastapi import HTTPException
    
    with pytest.raises(HTTPException) as excinfo:
        await get_current_user(token_query=None, credentials=None)
    
    assert excinfo.value.status_code == 401
    assert "Could not validate credentials" in excinfo.value.detail
