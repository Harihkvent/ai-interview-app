"""
AI-Powered Career Roadmap Generator
Uses Krutrim AI to generate personalized learning paths
"""

from typing import List, Dict, Optional
import httpx
import os
import json
from ai_utils import clean_ai_json
from models import CareerRoadmap

KRUTRIM_API_KEY = os.getenv("KRUTRIM_API_KEY")
KRUTRIM_API_URL = "https://cloud.olakrutrim.com/v1/chat/completions"

async def analyze_skills_gap(resume_skills: List[str], target_job_description: str) -> Dict:
    """
    Analyze skills gap between current and target role
    
    Args:
        resume_skills: List of skills extracted from resume
        target_job_description: Job description of target role
    
    Returns:
        Dictionary with matched, missing, and required skills
    """
    from ml_job_matcher import extract_skills
    
    # Extract required skills from job description
    required_skills = extract_skills(target_job_description)
    
    # Calculate matches and gaps
    matched_skills = list(set(resume_skills) & set(required_skills))
    missing_skills = list(set(required_skills) - set(resume_skills))
    
    # Calculate match percentage
    if required_skills:
        match_percentage = (len(matched_skills) / len(required_skills)) * 100
    else:
        match_percentage = 0
    
    return {
        'matched_skills': matched_skills,
        'missing_skills': missing_skills,
        'required_skills': required_skills,
        'match_percentage': round(match_percentage, 2)
    }

async def generate_roadmap_content(
    resume_text: str,
    target_role: str,
    skills_gap: Dict
) -> Dict:
    """
    Generate personalized career roadmap using Krutrim AI
    
    Args:
        resume_text: Full resume content
        target_role: Target job title
        skills_gap: Skills gap analysis
    
    Returns:
        Structured roadmap data
    """
    
    # Build prompt for AI
    matched_skills_str = ', '.join(skills_gap['matched_skills']) if skills_gap['matched_skills'] else 'None identified'
    missing_skills_str = ', '.join(skills_gap['missing_skills']) if skills_gap['missing_skills'] else 'None'
    
    prompt = f"""You are an expert career advisor. Generate a detailed, personalized career roadmap for someone transitioning to the role of {target_role}.

**Current Skills**: {matched_skills_str}
**Missing Skills**: {missing_skills_str}
**Match Percentage**: {skills_gap['match_percentage']}%

Create a comprehensive roadmap with:

1. **Current Assessment**
   - Strengths based on existing skills
   - Experience level estimation
   - Areas of expertise

2. **Skills Gap Analysis**
   - Critical skills to acquire
   - Nice-to-have skills
   - Priority order for learning

3. **Learning Milestones** (3-4 phases)
   Each milestone should have:
   - Phase name and duration (e.g., "Foundation (Months 1-3)")
   - Specific, actionable learning goals
   - Recommended resources (courses, books, projects, certifications)
   - Success criteria

4. **Estimated Timeline**
   - Realistic timeframe to achieve the target role
   - Consider current skill level

5. **Recommended Certifications**
   - Industry-recognized certifications
   - Relevance to target role

6. **Actionable Next Steps**
   - Immediate actions to take this week
   - Short-term goals (1-3 months)
   - Long-term goals (3-12 months)

**IMPORTANT**: Format your response as a valid JSON object with the following structure:
{{
  "current_assessment": {{
    "strengths": ["strength1", "strength2"],
    "experience_level": "Junior/Mid/Senior",
    "expertise_areas": ["area1", "area2"]
  }},
  "skills_gap": {{
    "critical_skills": ["skill1", "skill2"],
    "nice_to_have": ["skill1", "skill2"],
    "priority_order": ["skill1", "skill2", "skill3"]
  }},
  "milestones": [
    {{
      "phase": "Foundation (Months 1-3)",
      "duration": "3 months",
      "goals": ["goal1", "goal2", "goal3"],
      "resources": ["resource1", "resource2"],
      "success_criteria": ["criteria1", "criteria2"]
    }}
  ],
  "estimated_timeline": "6-12 months",
  "recommended_certifications": ["cert1", "cert2"],
  "next_steps": {{
    "immediate": ["action1", "action2"],
    "short_term": ["goal1", "goal2"],
    "long_term": ["goal1", "goal2"]
  }}
}}

Return ONLY the raw JSON object. Do not include markdown code blocks, preamble, or footer. Ensure all keys and string values use double quotes, and control characters like newlines are properly escaped. Check your commas carefully.
"""
    headers = {
        "Authorization": f"Bearer {KRUTRIM_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "Krutrim-spectre-v2",
        "messages": [
            {
                "role": "system", 
                "content": "You are an expert career advisor specializing in personalized learning paths. Always respond with valid JSON only."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 2500
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(KRUTRIM_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # Use centralized cleaning
            content = clean_ai_json(content)
            
            # Try to parse JSON
            try:
                roadmap_data = json.loads(content, strict=False)
                
                # Validation: Ensure it's a dictionary
                if not isinstance(roadmap_data, dict):
                    print(f"⚠️  AI response is not a JSON object (got {type(roadmap_data)}). Triggering fallback.")
                    raise ValueError("AI response must be a JSON object")
                
                # Normalize common key variations
                key_mapping = {
                    "learning_milestones": "milestones",
                    "learning_path": "milestones",
                    "phases": "milestones",
                    "assessment": "current_assessment",
                    "skills_analysis": "skills_gap",
                    "gaps": "skills_gap",
                    "timeline": "estimated_timeline",
                    "certifications": "recommended_certifications",
                    "action_steps": "next_steps"
                }
                
                for legacy_key, modern_key in key_mapping.items():
                    if legacy_key in roadmap_data and modern_key not in roadmap_data:
                        roadmap_data[modern_key] = roadmap_data[legacy_key]

                # Deep normalization for milestones
                if "milestones" in roadmap_data and isinstance(roadmap_data["milestones"], list):
                    for m in roadmap_data["milestones"]:
                        if "title" in m and "phase" not in m: m["phase"] = m["title"]
                        if "learning_goals" in m and "goals" not in m: m["goals"] = m["learning_goals"]
                
                print("✅ Successfully generated roadmap from AI with normalization")
                return roadmap_data
            except json.JSONDecodeError as e:
                print(f"⚠️  JSON parsing failed: {e}")
                # Try regex extraction if standard parsing fails
                import re
                # Look specifically for the largest object block
                json_match = re.search(r'(\{.*\})', content, re.DOTALL)
                if json_match:
                    try:
                        # Attempt to fix some common errors in the matched string
                        match_str = json_match.group(1)
                        # Fix unescaped newlines again just in case
                        match_str = match_str.replace('\n', ' ')
                        roadmap_data = json.loads(match_str, strict=False)
                        print("✅ Recovered JSON via specialized regex")
                        return roadmap_data
                    except:
                        pass
                
                print(f"Raw content snippet: {content[:200]}...")
                return create_fallback_roadmap(target_role, skills_gap)
                
    except Exception as e:
        print(f"❌ Krutrim API error: {e}")
        # Return fallback structure
        return create_fallback_roadmap(target_role, skills_gap)

def create_fallback_roadmap(target_role: str, skills_gap: Dict) -> Dict:
    """
    Create a fallback roadmap structure if AI generation fails
    
    Args:
        target_role: Target job title
        skills_gap: Skills gap analysis
    
    Returns:
        Basic roadmap structure
    """
    missing_skills = skills_gap['missing_skills'][:5]  # Top 5
    
    return {
        'current_assessment': {
            'strengths': skills_gap['matched_skills'][:3],
            'experience_level': 'Mid-level',
            'expertise_areas': skills_gap['matched_skills'][:2]
        },
        'skills_gap': {
            'critical_skills': missing_skills,
            'nice_to_have': [],
            'priority_order': missing_skills
        },
        'milestones': [
            {
                'phase': 'Foundation (Months 1-3)',
                'duration': '3 months',
                'goals': [
                    f'Learn {missing_skills[0] if missing_skills else "core skills"}',
                    'Build 2-3 practice projects',
                    'Study fundamentals and best practices'
                ],
                'resources': [
                    'Online courses (Coursera, Udemy, edX)',
                    'Official documentation',
                    'YouTube tutorials'
                ],
                'success_criteria': [
                    'Complete at least 1 certification course',
                    'Build and deploy 2 projects'
                ]
            },
            {
                'phase': 'Intermediate (Months 4-6)',
                'duration': '3 months',
                'goals': [
                    'Deepen knowledge in core technologies',
                    'Contribute to open-source projects',
                    'Build portfolio projects'
                ],
                'resources': [
                    'Advanced courses',
                    'GitHub open-source projects',
                    'Technical blogs and books'
                ],
                'success_criteria': [
                    'Make 5+ open-source contributions',
                    'Complete 3 portfolio projects'
                ]
            },
            {
                'phase': 'Advanced (Months 7-12)',
                'duration': '6 months',
                'goals': [
                    'Build production-ready applications',
                    'Obtain relevant certifications',
                    'Network and apply for roles'
                ],
                'resources': [
                    'Industry certifications',
                    'Real-world projects',
                    'Professional networking (LinkedIn, conferences)'
                ],
                'success_criteria': [
                    'Obtain 1-2 certifications',
                    'Deploy 2 production applications',
                    'Apply to target roles'
                ]
            }
        ],
        'estimated_timeline': '9-12 months',
        'recommended_certifications': [
            f'{target_role} related certifications',
            'Cloud certifications (AWS/Azure/GCP)',
            'Agile/Scrum certifications'
        ],
        'next_steps': {
            'immediate': [
                'Enroll in a foundational course',
                'Set up development environment',
                'Join relevant online communities'
            ],
            'short_term': [
                'Complete first certification',
                'Build first portfolio project',
                'Start contributing to open-source'
            ],
            'long_term': [
                'Build comprehensive portfolio',
                'Obtain certifications',
                'Apply for target roles'
            ]
        }
    }

async def create_career_roadmap(
    user_id: Optional[str],
    session_id: str,
    resume_text: str,
    target_role: str,
    target_job_description: str
) -> Dict:
    """
    Main function to create and store career roadmap
    
    Args:
        user_id: User who owns this roadmap
        session_id: Interview session ID
        resume_text: Full resume content
        target_role: Target job title
        target_job_description: Job description of target role
    
    Returns:
        Complete roadmap data
    """
    print(f"\n🗺️  Generating career roadmap for {target_role}...")
    
    # Extract skills from resume
    from ml_job_matcher import extract_skills
    resume_skills = extract_skills(resume_text)
    
    # Analyze skills gap
    print("📊 Analyzing skills gap...")
    skills_gap = await analyze_skills_gap(resume_skills, target_job_description)
    
    # Generate roadmap content using AI
    print("🤖 Generating personalized roadmap with AI...")
    roadmap_data = await generate_roadmap_content(resume_text, target_role, skills_gap)
    
    # Store in database
    try:
        print("💾 Saving roadmap to database...")
        roadmap = CareerRoadmap(
            user_id=str(user_id) if user_id else None,
            session_id=session_id,
            target_role=target_role,
            roadmap_content=json.dumps(roadmap_data, indent=2),
            milestones=roadmap_data.get('milestones') if isinstance(roadmap_data.get('milestones'), list) else [],
            skills_gap=skills_gap,
            is_saved=True if user_id else False,
            estimated_timeline=str(roadmap_data.get('estimated_timeline', 'Not specified'))
        )
        await roadmap.insert()
        print(f"✅ Roadmap generated successfully for user {user_id}! Timeline: {roadmap_data.get('estimated_timeline')}")
    except Exception as e:
        import traceback
        print(f"❌ Error saving roadmap to database: {e}")
        traceback.print_exc()
        # Even if saving fails, return the generated data so the user sees it
        print("⚠️ Returning generated data despite save failure")
    
    return {
        'roadmap_id': str(roadmap.id) if ('roadmap' in locals() and hasattr(roadmap, 'id') and roadmap.id) else None,
        'target_role': target_role,
        'skills_gap': skills_gap,
        'current_assessment': roadmap_data.get('current_assessment', {}),
        'milestones': roadmap_data.get('milestones', []),
        'estimated_timeline': roadmap_data.get('estimated_timeline'),
        'recommended_certifications': roadmap_data.get('recommended_certifications', []),
        'next_steps': roadmap_data.get('next_steps', {})
    }
