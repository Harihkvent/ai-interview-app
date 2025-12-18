import os
import httpx
from dotenv import load_dotenv
from typing import List, Dict
import logging

load_dotenv()

SERP_API_KEY = os.getenv("SERP_API_KEY")
SERP_API_URL = "https://serpapi.com/search"

logger = logging.getLogger(__name__)

class SerpJobService:
    @staticmethod
    async def fetch_live_jobs(query: str, location: str = "India") -> List[Dict]:
        """
        Fetch real-time job listings from Google Jobs via SerpApi.
        """
        if not SERP_API_KEY:
            logger.warning("⚠️ SERP_API_KEY not found in environment variables.")
            return []

        params = {
            "engine": "google_jobs",
            "q": query,
            "location": location,
            "api_key": SERP_API_KEY
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(SERP_API_URL, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                jobs = data.get("jobs_results", [])
                logger.info(f"✅ Successfully fetched {len(jobs)} live jobs from SerpApi")
                
                # Format jobs to match our expected structure
                formatted_jobs = []
                for job in jobs:
                    formatted_jobs.append({
                        "job_title": job.get("title", "N/A"),
                        "company_name": job.get("company_name", "N/A"),
                        "location": job.get("location", "N/A"),
                        "job_description": job.get("description", "N/A"),
                        "thumbnail": job.get("thumbnail"),
                        "via": job.get("via"),
                        "extensions": job.get("extensions", []),
                        "job_id": job.get("job_id")
                    })
                
                return formatted_jobs

        except Exception as e:
            logger.error(f"❌ Error fetching jobs from SerpApi: {e}")
            return []
