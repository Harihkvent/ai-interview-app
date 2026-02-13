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
import pickle

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
        csv_path = os.path.join(os.path.dirname(__file__), '..', 'job_data_merged.csv')
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

def deduplicate_jobs(matches: List[Dict], similarity_threshold: float = 0.85) -> List[Dict]:
    """
    Remove duplicate jobs based on title and description similarity
    """
    if not matches:
        return matches
    
    # Track which jobs to keep
    keep_indices = []
    seen_titles = {}  # title -> index mapping
    
    for i, match in enumerate(matches):
        title = match.get('job_title', '').lower().strip()
        description = match.get('job_description', '').lower().strip()
        
        if not title:
            continue
            
        # Check for exact title match
        is_duplicate = False
        for seen_title, seen_idx in seen_titles.items():
            # Exact title match
            if title == seen_title:
                is_duplicate = True
                # Keep the one with higher match percentage
                if match.get('match_percentage', 0) > matches[seen_idx].get('match_percentage', 0):
                    if seen_idx in keep_indices:
                        keep_indices.remove(seen_idx)
                    keep_indices.append(i)
                    seen_titles[title] = i
                break
            
            # Check title similarity (simple substring check)
            if title in seen_title or seen_title in title:
                seen_desc = matches[seen_idx].get('job_description', '').lower().strip()
                
                # Simple similarity: Jaccard similarity on words
                title_words = set(title.split())
                seen_title_words = set(seen_title.split())
                desc_words = set(description.split())
                seen_desc_words = set(seen_desc.split())
                
                if desc_words and seen_desc_words:
                    intersection = len(desc_words & seen_desc_words)
                    union = len(desc_words | seen_desc_words)
                    jaccard_sim = intersection / union if union > 0 else 0
                    
                    if jaccard_sim > similarity_threshold:
                        is_duplicate = True
                        if match.get('match_percentage', 0) > matches[seen_idx].get('match_percentage', 0):
                            if seen_idx in keep_indices:
                                keep_indices.remove(seen_idx)
                            keep_indices.append(i)
                            seen_titles[title] = i
                            # Note: we don't del seen_titles[seen_title] to avoid modifying during iteration
                        break
        
        if not is_duplicate:
            keep_indices.append(i)
            seen_titles[title] = i
    
    # Return deduplicated matches
    deduplicated = [matches[i] for i in sorted(list(set(keep_indices)))]
    
    if len(deduplicated) < len(matches):
        print(f"🔍 Deduplication: Removed {len(matches) - len(deduplicated)} duplicate jobs")
    
    return deduplicated

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
        print("🔄 Initializing Semantic matcher...")
        
        try:
            # Load pre-trained model (fast)
            _semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Paths
            csv_path = os.path.join(os.path.dirname(__file__), '..', 'job_data_merged.csv')
            cache_path = os.path.join(os.path.dirname(__file__), 'job_embeddings.pkl')
            
            # Check for valid cache
            use_cache = False
            if os.path.exists(cache_path) and os.path.exists(csv_path):
                # Cache is valid if it's newer than the CSV
                if os.path.getmtime(cache_path) > os.path.getmtime(csv_path):
                    use_cache = True
            
            if use_cache:
                try:
                    print(f"📦 Found cached embeddings. Loading from disk...")
                    with open(cache_path, 'rb') as f:
                        _semantic_job_embeddings = pickle.load(f)
                    
                    # Verify sync between CSV and PKL
                    jobs_df = load_job_database()
                    if len(_semantic_job_embeddings) != len(jobs_df):
                        print(f"⚠️ Cache mismatch: CSV has {len(jobs_df)} rows, PKL has {len(_semantic_job_embeddings)}. Invalidating cache...")
                        _semantic_job_embeddings = None
                        use_cache = False
                    else:
                        print(f"✅ Semantic matcher initialized from cache ({_semantic_job_embeddings.shape})")
                        return _semantic_model, _semantic_job_embeddings
                except Exception as e:
                    print(f"⚠️ Could not load cache ({e}). Re-computing...")
                    _semantic_job_embeddings = None
                    use_cache = False
            
            # Fallback: Compute from scratch
            if not use_cache:
                print("⏳ Computing new embeddings (this takes 2-3 minutes)...")
                jobs_df = load_job_database()
                
                # Combine title and description
                jobs_df['combined'] = jobs_df['Job Title'].fillna('') + '. ' + jobs_df['Job Description'].fillna('')
                job_texts = jobs_df['combined'].tolist()
                
                # Encode all jobs
                _semantic_job_embeddings = _semantic_model.encode(
                    job_texts,
                    show_progress_bar=True,
                    convert_to_tensor=True,
                    batch_size=32
                )
                
                # Save to cache
                try:
                    # Convert to CPU before pickling to avoid CUDA issues
                    cpu_embeddings = _semantic_job_embeddings.cpu() if hasattr(_semantic_job_embeddings, 'cpu') else _semantic_job_embeddings
                    with open(cache_path, 'wb') as f:
                        pickle.dump(cpu_embeddings, f)
                    print(f"💾 Saved embeddings to {os.path.basename(cache_path)}")
                except Exception as e:
                    print(f"⚠️ Failed to save cache: {e}")
                
            print(f"✅ Semantic matcher initialized ({_semantic_job_embeddings.shape})")
        except Exception as e:
            print(f"❌ Critical error in semantic matcher initialization: {e}")
            raise
    
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
    
    # Ensure job_embeddings is on same device as resume_embedding
    if hasattr(resume_embedding, 'device') and hasattr(job_embeddings, 'to'):
        job_embeddings = job_embeddings.to(resume_embedding.device)
    
    # Calculate cosine similarity
    similarities = util.cos_sim(resume_embedding, job_embeddings)[0]
    similarities_np = similarities.cpu().numpy() if hasattr(similarities, 'cpu') else similarities
    
    # Get top N indices with scores
    top_indices = similarities_np.argsort()[-top_n:][::-1]
    return [(int(idx), float(similarities_np[idx])) for idx in top_indices if similarities_np[idx] > 0.1]

def calculate_hybrid_scores(resume_text: str, top_n: int = 10, external_jobs: List[Dict] = None) -> List[Dict]:
    """
    Calculate hybrid scores combining TF-IDF and Semantic matching
    
    Args:
        resume_text: Resume content
        top_n: Number of top matches to return
        external_jobs: Optional list of dictionaries with 'job_title' and 'job_description'
    
    Returns:
        List of job matches with hybrid scores
    """
    if external_jobs:
        # Create a temporary DataFrame for external jobs
        jobs_df = pd.DataFrame(external_jobs)
        # Standardize column names for the logic below
        if 'job_title' in jobs_df.columns:
            jobs_df['Job Title'] = jobs_df['job_title']
        if 'job_description' in jobs_df.columns:
            jobs_df['Job Description'] = jobs_df['job_description']
    else:
        jobs_df = load_job_database()

    resume_skills = extract_skills(resume_text)
    
    # Get scores from both methods
    print(f"📊 Calculating scores for {len(jobs_df)} jobs...")
    
    if external_jobs:
        # Dynamic calculation for small set of live jobs
        # 1. TF-IDF
        processed_resume = preprocess_text(resume_text)
        jobs_df['combined'] = jobs_df['Job Title'].fillna('') + ' ' + jobs_df['Job Description'].fillna('')
        job_texts = jobs_df['combined'].apply(preprocess_text).tolist()
        
        temp_vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
        try:
            temp_job_vectors = temp_vectorizer.fit_transform(job_texts)
            temp_resume_vector = temp_vectorizer.transform([processed_resume])
            tfidf_sims = cosine_similarity(temp_resume_vector, temp_job_vectors)[0]
        except:
            tfidf_sims = np.zeros(len(jobs_df))

        # 2. Semantic
        model, _ = initialize_semantic_matcher() # reuse the model, ignore cached embeddings
        temp_job_texts = (jobs_df['Job Title'].fillna('') + '. ' + jobs_df['Job Description'].fillna('')).tolist()
        temp_job_embeddings = model.encode(temp_job_texts, convert_to_tensor=True)
        resume_embedding = model.encode(resume_text, convert_to_tensor=True)
        semantic_sims = util.cos_sim(resume_embedding, temp_job_embeddings)[0].cpu().numpy()
        
        # Create score lists compatible with the zip logic below
        tfidf_scores = [(i, tfidf_sims[i]) for i in range(len(jobs_df))]
        semantic_scores = [(i, semantic_sims[i]) for i in range(len(jobs_df))]
    else:
        tfidf_scores = calculate_tfidf_scores(resume_text, top_n=50)
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
    num_jobs = len(jobs_df)
    
    for idx, scores in combined_scores.items():
        # Safety check: ensure index is within bounds of current dataframe
        if idx >= num_jobs:
            print(f"⚠️ Index {idx} out of bounds for jobs_df (size: {num_jobs}). Skipping...")
            continue
            
        tfidf = scores['tfidf_score']
        semantic = scores['semantic_score']
        
        # Weighted combination
        hybrid_score = 0.4 * tfidf + 0.6 * semantic
        
        # Extract skills for this job
        try:
            row = jobs_df.iloc[idx]
            job_desc = str(row.get('Job Description', ''))
            job_title = str(row.get('Job Title', 'Unknown Role'))
            
            job_skills = extract_skills(job_desc)
            
            matched_skills = list(set(resume_skills) & set(job_skills))
            missing_skills = list(set(job_skills) - set(resume_skills))
            
            match_data = {
                'index': int(idx),
                'job_title': job_title,
                'job_description': job_desc,
                'match_percentage': round(float(hybrid_score * 100), 2),
                'tfidf_score': round(float(tfidf * 100), 2),
                'semantic_score': round(float(semantic * 100), 2),
                'matched_skills': matched_skills,
                'missing_skills': missing_skills[:10]
            }
            
            # Include original fields if it's an external job (company, location, etc.)
            if external_jobs:
                orig_job = external_jobs[idx]
                match_data.update({
                    'company_name': orig_job.get('company_name'),
                    'location': orig_job.get('location'),
                    'thumbnail': orig_job.get('thumbnail'),
                    'via': orig_job.get('via'),
                    'job_id': orig_job.get('job_id'),
                    'apply_link': orig_job.get('apply_link')
                })
            else:
                # Also try to get company/location from CSV if available
                match_data.update({
                    'company_name': str(row.get('Company Name', 'Unknown')),
                    'location': str(row.get('Location', 'Remote')),
                    'thumbnail': str(row.get('Thumbnail', '')),
                })
                
            matches.append(match_data)
        except Exception as e:
            print(f"⚠️ Error processing match index {idx}: {e}")
            continue
    
    # Deduplicate jobs before sorting
    matches = deduplicate_jobs(matches, similarity_threshold=0.85)
    
    # Sort by hybrid score
    matches.sort(key=lambda x: x['match_percentage'], reverse=True)
    
    return matches[:top_n]

async def analyze_resume_and_match(session_id: str, resume_text: str, top_n: int = 10, user_id: str = None) -> List[Dict]:
    """
    Main function to analyze resume and find job matches
    """
    try:
        print(f"\n🎯 Analyzing resume for session {session_id}...")
        
        # Delete existing job matches for this session to prevent duplicates
        try:
            await JobMatch.find(
                JobMatch.session_id == session_id,
                JobMatch.is_live == False
            ).delete()
        except Exception as e:
            print(f"⚠️ Note: Error clearing old matches: {e}")
        
        # Calculate hybrid matches
        matches = calculate_hybrid_scores(resume_text, top_n=top_n)
        
        if not matches:
            print("⚠️ No matches found after analysis.")
            return []
            
        # Store matches in database
        db_matches = []
        print(f"💾 Storing {len(matches)} matches in database...")
        for rank, match in enumerate(matches, 1):
            job_match = JobMatch(
                user_id=user_id,
                session_id=session_id,
                job_title=match['job_title'],
                job_description=match['job_description'],
                match_percentage=match['match_percentage'],
                matched_skills=match['matched_skills'],
                missing_skills=match['missing_skills'],
                rank=rank,
                company_name=match.get('company_name'),
                location=match.get('location'),
                thumbnail=match.get('thumbnail')
            )
            await job_match.insert()
            db_matches.append(job_match)
        
        print(f"✅ Analysis complete! Top match: {matches[0]['job_title']} ({matches[0]['match_percentage']}%)")
        return db_matches
    except Exception as e:
        import traceback
        print(f"❌ Error in analyze_resume_and_match: {e}")
        print(traceback.format_exc())
        raise

async def analyze_resume_and_match_live(session_id: str, resume_text: str, top_n: int = 10, location: str = "India", user_id: str = None) -> List[Dict]:
    """
    Main function to analyze resume and find LIVE job matches via SerpApi
    """
    from serp_api_service import SerpJobService
    print(f"\n🌍 Fetching LIVE jobs for session {session_id} in {location}...")
    
    # 1. Extract a good search query from the resume (simplified: just use top skills/titles)
    # For now, we'll try to find a job title in the resume or use a general fallback
    resume_skills = extract_skills(resume_text)
    query = "Software Engineer" # Default
    if resume_skills:
        query = f"{resume_skills[0]} Developer" # Simple heuristic
    
    # 2. Fetch from SerpApi
    live_jobs = await SerpJobService.fetch_live_jobs(query, location)
    
    if not live_jobs:
        print("⚠️ No live jobs found from SerpApi.")
        return []

    # 3. Calculate hybrid matches against the live list
    matches = calculate_hybrid_scores(resume_text, top_n=top_n, external_jobs=live_jobs)
    
    # 4. Store matches in database
    db_matches = []
    print(f"💾 Storing {len(matches)} LIVE matches in database...")
    for rank, match in enumerate(matches, 1):
        job_match = JobMatch(
            user_id=user_id,
            session_id=session_id,
            job_title=match['job_title'],
            job_description=match['job_description'],
            match_percentage=match['match_percentage'],
            matched_skills=match['matched_skills'],
            missing_skills=match['missing_skills'],
            rank=rank,
            company_name=match.get('company_name'),
            location=match.get('location'),
            thumbnail=match.get('thumbnail'),
            via=match.get('via'),
            job_id=match.get('job_id'),
            apply_link=match.get('apply_link'),
            is_live=True
        )
        await job_match.insert()
        db_matches.append(job_match)
    
    print(f"✅ Live analysis complete! Top match: {matches[0]['job_title']} at {matches[0].get('company_name')} ({matches[0]['match_percentage']}%)")
    
    return db_matches

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
