"""
Data Merger Script for Job Matcher Enhancement

This script combines job data from multiple CSV sources to create
an enriched dataset for the job matcher model.
"""

import pandas as pd
import os
from typing import Set

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# Input files
JOB_TITLE_DES_PATH = os.path.join(PROJECT_ROOT, 'job_title_des.csv')
JOB_DATASET_PATH = os.path.join(PROJECT_ROOT, 'job_dataset.csv')

# Output file
MERGED_OUTPUT_PATH = os.path.join(PROJECT_ROOT, 'job_data_merged.csv')


def load_job_title_des() -> pd.DataFrame:
    """Load the existing job_title_des.csv file"""
    print(f"📂 Loading {os.path.basename(JOB_TITLE_DES_PATH)}...")
    # Use quoting to handle multiline descriptions properly
    df = pd.read_csv(JOB_TITLE_DES_PATH, quoting=1, on_bad_lines='skip')
    print(f"   ✅ Loaded {len(df)} rows")
    return df


def load_job_dataset() -> pd.DataFrame:
    """Load and transform job_dataset.csv to match expected format"""
    print(f"📂 Loading {os.path.basename(JOB_DATASET_PATH)}...")
    df = pd.read_csv(JOB_DATASET_PATH)
    print(f"   ✅ Loaded {len(df)} rows")
    
    # Transform to match job_title_des format
    # Combine Skills, Responsibilities, and Keywords into a rich description
    def create_description(row):
        parts = []
        
        # Add experience level
        if pd.notna(row.get('ExperienceLevel')):
            exp = str(row['ExperienceLevel']).strip()
            if exp:
                parts.append(f"Experience Level: {exp}")
        
        # Add years of experience if available
        if pd.notna(row.get('YearsOfExperience')):
            years = str(row['YearsOfExperience']).strip()
            if years:
                parts.append(f"Years of Experience: {years}")
        
        # Add skills
        if pd.notna(row.get('Skills')):
            skills = str(row['Skills']).strip()
            if skills:
                parts.append(f"Required Skills: {skills}")
        
        # Add responsibilities
        if pd.notna(row.get('Responsibilities')):
            resp = str(row['Responsibilities']).strip()
            if resp:
                parts.append(f"Responsibilities: {resp}")
        
        # Add keywords
        if pd.notna(row.get('Keywords')):
            keywords = str(row['Keywords']).strip()
            if keywords:
                parts.append(f"Keywords: {keywords}")
        
        return ". ".join(parts) if parts else "No description available."
    
    # Create the transformed DataFrame
    transformed_df = pd.DataFrame({
        'Job Title': df['Title'],
        'Job Description': df.apply(create_description, axis=1)
    })
    
    print(f"   🔄 Transformed to standard format")
    return transformed_df


def deduplicate_by_title(df: pd.DataFrame, similarity_threshold: float = 0.9) -> pd.DataFrame:
    """
    Remove duplicate jobs based on exact title AND similar description
    We keep entries with the same title if descriptions are different
    """
    print(f"🔍 Deduplicating {len(df)} jobs...")
    
    # Create a composite key from normalized title + first 100 chars of description
    df['_normalized_title'] = df['Job Title'].str.lower().str.strip()
    df['_desc_snippet'] = df['Job Description'].fillna('').str[:100].str.lower().str.strip()
    df['_composite_key'] = df['_normalized_title'] + '|||' + df['_desc_snippet']
    
    # Drop duplicates keeping first occurrence
    df_deduped = df.drop_duplicates(subset='_composite_key', keep='first')
    
    # Remove the helper columns
    df_deduped = df_deduped.drop(columns=['_normalized_title', '_desc_snippet', '_composite_key'])
    
    removed = len(df) - len(df_deduped)
    print(f"   ✅ Removed {removed} duplicate entries")
    
    return df_deduped.reset_index(drop=True)


def merge_datasets():
    """Main function to merge all job datasets"""
    print("\n" + "=" * 60)
    print("🚀 Job Data Merger - Starting")
    print("=" * 60 + "\n")
    
    # Load datasets
    df_existing = load_job_title_des()
    df_new = load_job_dataset()
    
    # Add source column for tracking
    df_existing['_source'] = 'job_title_des'
    df_new['_source'] = 'job_dataset'
    
    # Merge datasets
    print(f"\n📊 Merging datasets...")
    df_merged = pd.concat([df_existing, df_new], ignore_index=True)
    print(f"   Total before deduplication: {len(df_merged)}")
    
    # Deduplicate
    df_final = deduplicate_by_title(df_merged)
    
    # Count contributions from each source
    source_counts = df_final['_source'].value_counts()
    print(f"\n📈 Source breakdown:")
    for source, count in source_counts.items():
        print(f"   - {source}: {count} jobs")
    
    # Remove source column before saving
    df_final = df_final.drop(columns=['_source'])
    
    # Reset index column to be sequential
    df_final.insert(0, '', range(len(df_final)))
    
    # Save merged dataset
    print(f"\n💾 Saving merged dataset to {os.path.basename(MERGED_OUTPUT_PATH)}...")
    df_final.to_csv(MERGED_OUTPUT_PATH, index=False)
    print(f"   ✅ Saved {len(df_final)} jobs")
    
    print("\n" + "=" * 60)
    print("✅ Merge complete!")
    print("=" * 60 + "\n")
    
    return df_final


if __name__ == "__main__":
    merge_datasets()
