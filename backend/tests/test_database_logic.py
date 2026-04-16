import pytest
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch

# Mock motor before it's imported by database to avoid pymongo version mismatch errors
sys.modules["motor"] = MagicMock()
sys.modules["motor.motor_asyncio"] = MagicMock()

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import seed_admin_user

@pytest.mark.asyncio
async def test_seed_admin_user_promotion():
    """Test promoting an existing user to admin if they have the default admin email"""
    mock_user = MagicMock()
    mock_user.role = "user"
    mock_user.email = "admin@example.com"
    mock_user.save = AsyncMock()
    
    with patch('auth_models.User.find_one', new_callable=AsyncMock) as mock_find_one, \
         patch('auth_models.User.email', create=True), \
         patch('os.getenv') as mock_getenv:
        
        # Setup getenv to return our test email
        mock_getenv.side_effect = lambda k, d=None: "admin@example.com" if k == "DEFAULT_ADMIN_EMAIL" else d
        
        mock_find_one.return_value = mock_user
        
        await seed_admin_user()
        
        assert mock_user.role == "admin"
        mock_user.save.assert_awaited_once()

@pytest.mark.asyncio
async def test_seed_admin_user_creation():
    """Test creating a new admin user if they don't exist"""
    with patch('auth_models.User.find_one', new_callable=AsyncMock) as mock_find_one, \
         patch('auth_models.User.email', create=True), \
         patch('auth_models.User') as MockUserClass:
        
            # Mock env vars
            with patch('os.getenv') as mock_getenv:
                mock_getenv.side_effect = lambda k, d=None: "newadmin@example.com" if k == "DEFAULT_ADMIN_EMAIL" else d
                
                MockUserClass.find_one = mock_find_one
                MockUserClass.email = MagicMock()
                mock_find_one.return_value = None
                
                # Setup the mock instance
                mock_user_instance = MagicMock()
                mock_user_instance.insert = AsyncMock()
                MockUserClass.return_value = mock_user_instance
                MockUserClass.hash_password.return_value = "hashed_secret"
                
                await seed_admin_user()
            
            # Verify User was instantiated with correct role
            kwargs = MockUserClass.call_args.kwargs
            assert kwargs["email"] == "newadmin@example.com"
            assert kwargs["role"] == "admin"
            
            # Verify insert was called
            mock_user_instance.insert.assert_awaited_once()

@pytest.mark.asyncio
async def test_seed_admin_already_exists():
    """Test that nothing changes if admin already exists with correct role"""
    mock_user = MagicMock()
    mock_user.role = "admin"
    mock_user.save = AsyncMock()
    
    with patch('auth_models.User.find_one', new_callable=AsyncMock) as mock_find_one, \
         patch('auth_models.User.email', create=True), \
         patch('os.getenv') as mock_getenv:
        
        mock_getenv.side_effect = lambda k, d=None: "admin@example.com" if k == "DEFAULT_ADMIN_EMAIL" else d
        mock_find_one.return_value = mock_user
        
        await seed_admin_user()
        
        # Role remains admin, save NOT called
        assert mock_user.role == "admin"
        mock_user.save.assert_not_called()
