import logging
import os
from fastapi import UploadFile, HTTPException
from models import Resume
from file_handler import extract_resume_text, calculate_content_hash
from resume_parser import extract_candidate_info

logger = logging.getLogger("resume_service")

async def process_resume_upload(user_id: str, file: UploadFile) -> tuple[Resume, bool]:
    """
    Process a resume upload: extract text, calculate hash, check for duplicates.
    Returns: (Resume object, is_duplicate boolean)
    """
    try:
        # 1. Extract text
        file_path, resume_text = await extract_resume_text(file)
        
        # 2. Calculate hash
        content_hash = calculate_content_hash(resume_text)
        
        # 3. Check for existing duplicate for this user
        existing_resume = await Resume.find_one(
            Resume.user_id == user_id,
            Resume.content_hash == content_hash
        )
        
        if existing_resume:
            logger.info(f"Duplicate resume found for user {user_id}: {existing_resume.id}")
            # Clean up the newly uploaded file since we'll reuse the existing one
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.warning(f"Failed to remove duplicate upload file {file_path}: {e}")
            
            return existing_resume, True
            
        # 4. New resume - extract info and create record
        candidate_name, candidate_email = extract_candidate_info(resume_text)
        
        resume = Resume(
            user_id=user_id,
            filename=file.filename,
            name=file.filename,
            content=resume_text,
            file_path=file_path,
            content_hash=content_hash,
            candidate_name=candidate_name,
            candidate_email=candidate_email
        )
        await resume.insert()
        
        # 5. Trigger Agentic Parsing in background
        try:
            from ai_engine.agents.resume_manager import resume_graph
            await resume_graph.ainvoke({
                "resume_id": str(resume.id),
                "resume_text": resume_text
            })
            # Reload to get AI updates
            resume = await Resume.get(resume.id)
        except Exception as e:
            logger.error(f"Agentic parsing failed for resume {resume.id}: {e}")
            
        return resume, False

    except Exception as e:
        logger.error(f"Error processing resume upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
