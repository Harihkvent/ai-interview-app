import os
from typing import Optional
from fastapi import UploadFile, HTTPException
import PyPDF2
from docx import Document
import io

# Directory to store uploaded resumes
UPLOAD_DIR = "uploads/resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Maximum file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024

# Allowed file extensions
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

def validate_resume_file(file: UploadFile) -> bool:
    """Validate file type and size"""
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    return True

async def save_uploaded_file(file: UploadFile) -> str:
    """Save uploaded file to disk and return file path"""
    try:
        # Generate unique filename
        timestamp = str(int(os.times().system * 1000))
        filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Read and save file
        contents = await file.read()
        
        # Check file size
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        with open(file_path, "wb") as f:
            f.write(contents)
        
        return file_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")

def parse_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    try:
        text = ""
        with open(file_path, "rb") as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")

def parse_docx(file_path: str) -> str:
    """Extract text from DOCX file"""
    try:
        doc = Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing DOCX: {str(e)}")

async def extract_resume_text(file: UploadFile) -> tuple[str, str]:
    """
    Extract text from resume file
    Returns: (file_path, extracted_text)
    """
    # Validate file
    validate_resume_file(file)
    
    # Save file
    file_path = await save_uploaded_file(file)
    
    # Extract text based on file type
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext == ".pdf":
        text = parse_pdf(file_path)
    elif file_ext == ".docx":
        text = parse_docx(file_path)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    if not text or len(text.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="Could not extract sufficient text from resume. Please ensure the file is not empty or corrupted."
        )
    
    return file_path, text
