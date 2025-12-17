"""
Authentication Routes - Login, Register, Profile Management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import jwt
import os
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from auth_models import User

router = APIRouter(prefix="/auth", tags=["authentication"])

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production-please")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

security = HTTPBearer()

# ============= Request/Response Models =============

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None

class GoogleLogin(BaseModel):
    credential: str  # Google ID token

# ============= Helper Functions =============

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Dependency to get current authenticated user from JWT token"""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await User.get(user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    
    return user

# ============= Authentication Endpoints =============

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register new user with email/password"""
    # Check if user exists
    existing_user = await User.find_one(User.email == user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Check if username exists
    existing_username = await User.find_one(User.username == user_data.username)
    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already taken"
        )
    
    # Create new user
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=User.hash_password(user_data.password),
        full_name=user_data.full_name
    )
    await user.insert()
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "created_at": user.created_at.isoformat()
        }
    )

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """Login with email/password"""
    # Find user
    user = await User.find_one(User.email == user_data.email)
    if not user or not user.verify_password(user_data.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    await user.save()
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "last_login": user.last_login.isoformat() if user.last_login else None
        }
    )

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "created_at": current_user.created_at.isoformat(),
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }

@router.put("/profile")
async def update_profile(
    profile_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    # Check if username is being changed and if it's available
    if profile_data.username and profile_data.username != current_user.username:
        existing = await User.find_one(User.username == profile_data.username)
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )
        current_user.username = profile_data.username
    
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    
    await current_user.save()
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "username": current_user.username,
            "full_name": current_user.full_name
        }
    }

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (client should delete token)"""
    return {"message": "Logged out successfully"}

@router.post("/google", response_model=TokenResponse)
async def google_auth(google_data: GoogleLogin):
    """Authenticate user with Google OAuth token"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth not configured"
        )
    
    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            google_data.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        # Extract user information from Google token
        google_user_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        
        # Check if user already exists with this Google ID
        user = await User.find_one(User.oauth_user_id == google_user_id)
        
        if not user:
            # Check if user exists with this email (account linking)
            user = await User.find_one(User.email == email)
            
            if user:
                # Link Google account to existing user
                user.oauth_provider = "google"
                user.oauth_user_id = google_user_id
                user.profile_picture_url = picture
                if not user.full_name and name:
                    user.full_name = name
                await user.save()
            else:
                # Create new user with Google account
                # Generate username from email
                username_base = email.split('@')[0]
                username = username_base
                counter = 1
                
                # Ensure unique username
                while await User.find_one(User.username == username):
                    username = f"{username_base}{counter}"
                    counter += 1
                
                user = User(
                    email=email,
                    username=username,
                    full_name=name if name else None,
                    profile_picture_url=picture,
                    oauth_provider="google",
                    oauth_user_id=google_user_id,
                    password_hash=None  # No password for OAuth users
                )
                await user.insert()
        
        # Update last login
        user.last_login = datetime.utcnow()
        await user.save()
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return TokenResponse(
            access_token=access_token,
            user={
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "profile_picture_url": user.profile_picture_url,
                "oauth_provider": user.oauth_provider
            }
        )
    
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=401,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Authentication failed: {str(e)}"
        )

