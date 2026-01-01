from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from ml_job_matcher import calculate_hybrid_scores, load_job_database

class JobSearchInput(BaseModel):
    query: str = Field(description="The job title or keywords to search for")
    resume_context: Optional[str] = Field(description="The full text of the resume to personalize ranking")
    location: Optional[str] = Field(description="Preferred location (optional)")

class JobSearchTool:
    """
    Tool to search for jobs using the internal database and ML ranking.
    """
    name = "job_search"
    description = "Search for jobs in the internal database. Use this to find relevant positions."

    def run(self, query: str, resume_context: str = "", limit: int = 5) -> List[Dict]:
        """
        Executes the search.
        If resume_context is provided, it uses hybrid ranking (Semantic + TF-IDF).
        If only query is provided, we might need a fallback, but ml_job_matcher currently requires resume_text.
        
        Strategy: 
        1. If resume_context is present, use `calculate_hybrid_scores`.
        2. If NO resume_context, we construct a fake 'resume' from the query to leverage the existing semantic search 
           (searching by similarity to the query string).
        """
        
        search_text = resume_context if resume_context else query
        
        print(f"🔎 [JobSearchTool] Searching for: '{query}' with context length {len(search_text)}")
        
        # We reuse the existing semantic matcher. 
        # It takes "resume_text" and matches against jobs.
        # So passing the search query as "resume_text" works for semantic search!
        
        matches = calculate_hybrid_scores(
            resume_text=search_text, 
            top_n=limit
        )
        
        # Filter by simple text limit or query if needed?
        # The semantic search might return anything based on similarity.
        # Let's trust the ranking for now.
        
        results = []
        for m in matches:
            results.append({
                "id": m.get("index"),
                "title": m.get("job_title"),
                "description": m.get("job_description")[:200] + "...", # Truncate for token efficiency
                "match_score": m.get("match_percentage"),
                "skills": m.get("matched_skills"),
                "missing": m.get("missing_skills")
            })
            
        return results

    async def arun(self, query: str, resume_context: str = "", limit: int = 5):
        # Sync wrapper for async context if needed
        return self.run(query, resume_context, limit)
