import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

from ai_utils import get_agent_llm
from models import Resume, UserPreferences
from auth_models import User
from database import init_db

async def verify_llm():
    print("\n🔮 Verifying Krutrim LLM Adapter...")
    try:
        llm = get_agent_llm()
        print(f"   Instance created: {type(llm)}")
        response = llm.invoke("Say 'System Operational' if you can hear me.")
        print(f"   Response received: {response}")
        if "Operational" in response or "System" in response:
            print("   ✅ LLM Verified")
        else:
            print("   ⚠️ LLM Response unclear, but connected.")
    except Exception as e:
        print(f"   ❌ LLM Failed: {e}")

async def verify_db():
    print("\n💾 Verifying Database Models...")
    try:
        await init_db()
        
        # Test Resume Model Instantiation (Mock)
        resume = Resume(
            user_id="test_user",
            filename="test.pdf",
            name="Test Resume",
            content="Skills: Python, React",
            is_primary=True
        )
        print(f"   Resume model created: {resume.name}")
        
        # Test User Preferences
        prefs = UserPreferences(
            user_id="test_user",
            target_role="Software Engineer"
        )
        print(f"   Preferences model created for role: {prefs.target_role}")
        
        # Test User Active Context Field (using Auth Model)
        user = User(
            email="test@test.com",
            username="test",
            active_resume_id="12345"
        )
        print(f"   User active_resume_id field exists: {user.active_resume_id}")
        
        print("   ✅ DB Models Verified (Schema Check)")
        
    except Exception as e:
        print(f"   ❌ DB Verification Failed: {e}")

async def main():
    await verify_db()
    await verify_llm()

if __name__ == "__main__":
    asyncio.run(main())
