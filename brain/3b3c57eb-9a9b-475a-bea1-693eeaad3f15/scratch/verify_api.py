import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/.env")

API_BASE_URL = "http://localhost:8000"

async def verify():
    print("--- Verifying Dashboard & Scheduling API ---")
    
    # We need a token. I'll try to find one or just check the endpoints exist.
    async with httpx.AsyncClient() as client:
        try:
            # Check Health
            resp = await client.get(f"{API_BASE_URL}/health")
            print(f"Health Check: {resp.status_code}")
            
            # Check Scheduling Routes (Unauthorized check is enough to verify path exists)
            resp = await client.get(f"{API_BASE_URL}/api/schedule/upcoming")
            print(f"Upcoming Schedules Route (Unauthorized): {resp.status_code}")
            if resp.status_code != 404:
                print("✅ /api/schedule/upcoming route exists")
            
            resp = await client.get(f"{API_BASE_URL}/user/dashboard")
            print(f"User Dashboard Route (Unauthorized): {resp.status_code}")
            if resp.status_code != 404:
                print("✅ /user/dashboard route exists")
                
        except Exception as e:
            print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    asyncio.run(verify())
