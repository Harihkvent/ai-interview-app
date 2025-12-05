import re
from typing import Optional, Tuple

def extract_email(text: str) -> Optional[str]:
    """Extract email address from text"""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    return emails[0] if emails else None

def extract_name(text: str) -> Optional[str]:
    """Extract candidate name from resume text"""
    # Try to find name in first few lines
    lines = text.split('\n')[:10]
    
    # Common patterns for names
    for line in lines:
        line = line.strip()
        # Skip empty lines and lines with email/phone
        if not line or '@' in line or re.search(r'\d{10}', line):
            continue
        
        # Look for lines with 2-4 words (typical name format)
        words = line.split()
        if 2 <= len(words) <= 4:
            # Check if it looks like a name (starts with capital letters)
            if all(word[0].isupper() for word in words if word):
                return line
    
    return None

def extract_candidate_info(resume_text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract candidate name and email from resume
    Returns: (name, email)
    """
    name = extract_name(resume_text)
    email = extract_email(resume_text)
    
    return name, email
