import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

# Add current directory to path so we can import models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auth_models import User

async def promote_user(email: str):
    """Promote a user to admin role"""
    load_dotenv()
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    
    client = AsyncIOMotorClient(mongodb_url)
    db = client["ai_interview_db"]
    
    await init_beanie(database=db, document_models=[User])
    
    user = await User.find_one(User.email == email)
    if not user:
        print(f"Error: User with email {email} not found.")
        return
        
    user.role = "admin"
    await user.save()
    print(f"Success: User {email} has been promoted to admin.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_user.py <email>")
    else:
        email = sys.argv[1]
        asyncio.run(promote_user(email))
