"""
ML-Powered Job Matching Engine
Hybrid approach: TF-IDF + Sentence Transformers
"""

import pandas as pd
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer, util
from typing import List, Dict, Tuple
import numpy as np
from models import JobMatch
import os

# Global cache for performance
_job_database = None
_tfidf_vectorizer = None
_tfidf_job_vectors = None
_semantic_model = None
_semantic_job_embeddings = None

# Common technical skills database
SKILLS_KEYWORDS = [
    'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
    'node.js', 'nodejs', 'fastapi', 'django', 'flask', 'express',
    'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'cloud',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch',
    'scikit-learn', 'pandas', 'numpy', 'data science', 'ai',
    'git', 'github', 'gitlab', 'agile', 'scrum', 'devops',
    'rest api', 'graphql', 'microservices', 'ci/cd',
    'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'spring boot', 'hibernate', '.net', 'c#', 'c++',
    'go', 'golang', 'rust', 'scala', 'kotlin', 'swift',
    'ios', 'android', 'flutter', 'react native',
    'tableau', 'power bi', 'excel', 'spark', 'hadoop',
    'nlp', 'computer vision', 'opencv', 'keras'
]

def load_job_database() -> pd.DataFrame:
    """Load and cache job database from CSV"""
    global _job_database
    if _job_database is None:
        csv_path = os.path.join(os.path.dirname(__file__), '..', 'job_title_des.csv')
        _job_database = pd.read_csv(csv_path)
        print(f"✅ Loaded {len(_job_database)} jobs from database")
    return _job_database

def preprocess_text(text: str) -> str:
    """Clean and normalize text for matching"""
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def extract_skills(text: str) -> List[str]:
    """Extract technical skills from text"""
    text_lower = text.lower()
    found_skills = []
    
    for skill in SKILLS_KEYWORDS:
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(skill)
    
    return list(set(found_skills))

def initialize_tfidf_matcher():
    """Initialize and cache TF-IDF vectorizer"""
    global _tfidf_vectorizer, _tfidf_job_vectors
    
    if _tfidf_vectorizer is None:
        print("🔄 Initializing TF-IDF matcher...")
        jobs_df = load_job_database()
        
        # Combine title and description for better matching
        jobs_df['combined'] = jobs_df['Job Title'].fillna('') + ' ' + jobs_df['Job Description'].fillna('')
        job_texts = jobs_df['combined'].apply(preprocess_text).tolist()
        
        # Create TF-IDF vectorizer
        _tfidf_vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.8,
            stop_words='english'
        )
        
        # Fit and transform job descriptions
        _tfidf_job_vectors = _tfidf_vectorizer.fit_transform(job_texts)
        print(f"✅ TF-IDF matcher initialized ({_tfidf_job_vectors.shape})")
    
    return _tfidf_vectorizer, _tfidf_job_vectors

def initialize_semantic_matcher():
    """Initialize and cache Sentence Transformer model"""
    global _semantic_model, _semantic_job_embeddings
    
    if _semantic_model is None:
        print("🔄 Initializing Semantic matcher (this may take 2-3 minutes)...")
        jobs_df = load_job_database()
        
        # Load pre-trained model
        _semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Combine title and description
        jobs_df['combined'] = jobs_df['Job Title'].fillna('') + '. ' + jobs_df['Job Description'].fillna('')
        job_texts = jobs_df['combined'].tolist()
        
        # Encode all jobs (this takes time but only done once)
        _semantic_job_embeddings = _semantic_model.encode(
            job_texts,
            show_progress_bar=True,
            convert_to_tensor=True,
            batch_size=32
        )
        print(f"✅ Semantic matcher initialized ({_semantic_job_embeddings.shape})")
    
    return _semantic_model, _semantic_job_embeddings

def calculate_tfidf_scores(resume_text: str, top_n: int = 50) -> List[Tuple[int, float]]:
    """Calculate TF-IDF match scores"""
    vectorizer, job_vectors = initialize_tfidf_matcher()
    
    # Preprocess and vectorize resume
    processed_resume = preprocess_text(resume_text)
    resume_vector = vectorizer.transform([processed_resume])
    
    # Calculate cosine similarity
    similarities = cosine_similarity(resume_vector, job_vectors)[0]
    
    # Get top N indices with scores
    top_indices = similarities.argsort()[-top_n:][::-1]
    return [(idx, similarities[idx]) for idx in top_indices if similarities[idx] > 0.1]

def calculate_semantic_scores(resume_text: str, top_n: int = 50) -> List[Tuple[int, float]]:
    """Calculate semantic similarity scores using Sentence Transformers"""
    model, job_embeddings = initialize_semantic_matcher()
    
    # Encode resume
    resume_embedding = model.encode(resume_text, convert_to_tensor=True)
    
    # Calculate cosine similarity
    similarities = util.cos_sim(resume_embedding, job_embeddings)[0]
    similarities_np = similarities.cpu().numpy()
    
    # Get top N indices with scores
    top_indices = similarities_np.argsort()[-top_n:][::-1]
    return [(idx, similarities_np[idx]) for idx in top_indices if similarities_np[idx] > 0.1]

def calculate_hybrid_scores(resume_text: str, top_n: int = 10) -> List[Dict]:
    """
    Calculate hybrid scores combining TF-IDF and Semantic matching
    
    Args:
        resume_text: Resume content
        top_n: Number of top matches to return
    
    Returns:
        List of job matches with hybrid scores
    """
    jobs_df = load_job_database()
    resume_skills = extract_skills(resume_text)
    
    # Get scores from both methods
    print("📊 Calculating TF-IDF scores...")
    tfidf_scores = calculate_tfidf_scores(resume_text, top_n=50)
    
    print("📊 Calculating Semantic scores...")
    semantic_scores = calculate_semantic_scores(resume_text, top_n=50)
    
    # Combine scores
    combined_scores = {}
    
    # Add TF-IDF scores
    for idx, score in tfidf_scores:
        combined_scores[idx] = {
            'tfidf_score': score,
            'semantic_score': 0.0
        }
    
    # Add Semantic scores
    for idx, score in semantic_scores:
        if idx in combined_scores:
            combined_scores[idx]['semantic_score'] = score
        else:
            combined_scores[idx] = {
                'tfidf_score': 0.0,
                'semantic_score': score
            }
    
    # Calculate hybrid score (40% TF-IDF + 60% Semantic)
    matches = []
    for idx, scores in combined_scores.items():
        tfidf = scores['tfidf_score']
        semantic = scores['semantic_score']
        
        # Weighted combination
        hybrid_score = 0.4 * tfidf + 0.6 * semantic
        
        # Extract skills for this job
        job_desc = str(jobs_df.iloc[idx]['Job Description'])
        job_skills = extract_skills(job_desc)
        
        matched_skills = list(set(resume_skills) & set(job_skills))
        missing_skills = list(set(job_skills) - set(resume_skills))
        
        matches.append({
            'index': int(idx),  # Convert numpy.int64 to Python int
            'job_title': str(jobs_df.iloc[idx]['Job Title']),
            'job_description': job_desc,
            'match_percentage': round(float(hybrid_score * 100), 2),  # Python float with 2 decimals
            'tfidf_score': round(float(tfidf * 100), 2),
            'semantic_score': round(float(semantic * 100), 2),
            'matched_skills': matched_skills,
            'missing_skills': missing_skills[:10]  # Limit to top 10
        })
    
    # Sort by hybrid score
    matches.sort(key=lambda x: x['match_percentage'], reverse=True)
    
    return matches[:top_n]

async def analyze_resume_and_match(session_id: str, resume_text: str, top_n: int = 10) -> List[Dict]:
    """
    Main function to analyze resume and find job matches
    
    Args:
        session_id: Interview session ID
        resume_text: Resume content
        top_n: Number of top matches to return
    
    Returns:
        List of job matches
    """
    print(f"\n🎯 Analyzing resume for session {session_id}...")
    
    # Calculate hybrid matches
    matches = calculate_hybrid_scores(resume_text, top_n=top_n)
    
    # Store matches in database
    print(f"💾 Storing {len(matches)} matches in database...")
    for rank, match in enumerate(matches, 1):
        job_match = JobMatch(
            session_id=session_id,
            job_title=match['job_title'],
            job_description=match['job_description'],
            match_percentage=match['match_percentage'],
            matched_skills=match['matched_skills'],
            missing_skills=match['missing_skills'],
            rank=rank
        )
        await job_match.insert()
    
    print(f"✅ Analysis complete! Top match: {matches[0]['job_title']} ({matches[0]['match_percentage']}%)")
    
    return matches

# Warm-up function to initialize models at startup
def warmup_models():
    """Pre-load models to avoid first-request delay"""
    print("\n🔥 Warming up ML models...")
    try:
        initialize_tfidf_matcher()
        initialize_semantic_matcher()
        print("✅ All models ready!\n")
    except Exception as e:
        print(f"⚠️  Model warmup failed: {e}")
        print("Models will be initialized on first use.\n")
