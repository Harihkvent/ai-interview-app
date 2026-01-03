from mcp.server.fastmcp import FastMCP
from database import init_db
from models import JobMatch
from typing import List, Dict
import logging
import sys

# Force logging to stderr for MCP clean pipe
# This prevents any library from accidentally printing to stdout
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)
logging.basicConfig(
    stream=sys.stderr, 
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)

# Initialize FastMCP server
mcp = FastMCP("Career-Assistant-Services")
logger = logging.getLogger("mcp_server")
db_initialized = False

async def ensure_db():
    global db_initialized
    if not db_initialized:
        await init_db()
        db_initialized = True

@mcp.tool()
async def list_saved_jobs(user_id: str) -> List[Dict]:
    """
    List all jobs that the user has saved in their profile.
    
    Args:
        user_id: The unique identifier of the user.
    """
    try:
        await ensure_db()
        jobs = await JobMatch.find(
            JobMatch.user_id == user_id,
            JobMatch.is_saved == True
        ).to_list()
        
        result = []
        for job in jobs:
            result.append({
                "id": str(job.id),
                "title": job.job_title,
                "company": job.company_name or "Unknown",
                "location": job.location or "Remote",
                "apply_link": job.apply_link
            })
        return result
    except Exception as e:
        logger.error(f"Error listing saved jobs: {e}")
        return []

@mcp.tool()
async def get_application_info(job_id: str) -> Dict:
    """
    Get application details for a specific job, including the apply link and instructions.
    
    Args:
        job_id: The ID of the job to get info for.
    """
    try:
        await ensure_db()
        from models import JobMatch
        job = await JobMatch.get(job_id)
        if not job:
            return {"error": "Job not found"}
            
        is_email = False
        if job.apply_link and ("mailto:" in job.apply_link or "@" in job.apply_link):
            is_email = True
            
        return {
            "title": job.job_title,
            "company": job.company_name,
            "apply_link": job.apply_link,
            "is_email_application": is_email,
            "instructions": "Click the link to apply." if not is_email else "Send your resume to this email."
        }
    except Exception as e:
        logger.error(f"Error getting job info: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    mcp.run()
