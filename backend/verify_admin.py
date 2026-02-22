import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import init_db
from auth_models import User

async def verify_admin():
    load_dotenv()
    print("Initializing database...")
    await init_db()
    
    admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "harikiran926@gmail.com")
    user = await User.find_one(User.email == admin_email)
    
    if user:
        print(f"✅ User {admin_email} found.")
        print(f"✅ Role: {user.role}")
        if user.role == "admin":
            print("🚀 Admin verification SUCCESSFUL!")
        else:
            print("❌ Admin verification FAILED: Role is not admin.")
    else:
        print(f"❌ Admin verification FAILED: User {admin_email} not found.")

if __name__ == "__main__":
    asyncio.run(verify_admin())
