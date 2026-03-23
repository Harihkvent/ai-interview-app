
import asyncio
import os
import sys

# Add project root and backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

from database import init_db
from models import Resume

async def test_resume_file_logic():
    print("\n[INFO] Testing Resume File Serving Logic...")
    try:
        await init_db()
        
        # Find any resume
        resume = await Resume.find_one()
        if not resume:
            print("   [WARN] No resumes found in DB to test with.")
            return

        print(f"   [DEBUG] Testing with resume: {resume.filename} (ID: {resume.id})")
        print(f"   [DEBUG] File path: {resume.file_path}")
        
        if not resume.file_path:
            print("   [FAIL] Resume has no file_path.")
            return
            
        if not os.path.exists(resume.file_path):
            print(f"   [FAIL] Physical file does not exist at {resume.file_path}")
            return
            
        # Verify media type logic (mimic backend)
        ext = os.path.splitext(resume.file_path)[1].lower()
        media_type = "application/pdf" if ext == ".pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        print(f"   [PASS] Physical file exists. Suggested media type: {media_type}")
        
    except Exception as e:
        print(f"   [FAIL] Error during testing: {e}")

if __name__ == "__main__":
    asyncio.run(test_resume_file_logic())
