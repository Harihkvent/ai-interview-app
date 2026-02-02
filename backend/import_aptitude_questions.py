"""
Aptitude Question CSV Importer
Imports aptitude questions from CSV files into MongoDB QuestionBank.

Supports multiple CSV formats:
- Standard format: question,optionA,optionB,optionC,optionD,correct_answer
- Kaggle GATE format: Question,Option1,Option2,Option3,Option4,Answer
- Custom format: question_text,options (JSON array),answer

Usage:
    python import_aptitude_questions.py --file aptitude_questions.csv
    python import_aptitude_questions.py --file questions.csv --category aptitude
"""

import asyncio
import argparse
import csv
import json
import os
import sys
from typing import List, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import QuestionBank

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGODB_URL = os.getenv("MONGODB_URL")


def detect_csv_format(headers: List[str]) -> str:
    """Detect the CSV format based on headers"""
    headers_lower = [h.lower().strip() for h in headers]
    
    # Kaggle GATE format
    if 'question' in headers_lower and 'option1' in headers_lower:
        return "kaggle_gate"
    
    # Standard format with optionA, optionB, etc.
    if 'optiona' in headers_lower or 'option_a' in headers_lower:
        return "standard"
    
    # JSON options format
    if 'options' in headers_lower:
        return "json_options"
    
    # Try to infer from column count (question + 4 options + answer = 6 columns)
    if len(headers) >= 6:
        return "positional"
    
    return "unknown"


def parse_row(row: Dict[str, str], format_type: str, row_num: int) -> Optional[Dict]:
    """Parse a CSV row based on detected format"""
    try:
        question_text = None
        options = []
        correct_answer = None
        
        if format_type == "kaggle_gate":
            # Kaggle format: Question, Option1, Option2, Option3, Option4, Answer
            question_text = row.get('Question') or row.get('question')
            options = [
                row.get('Option1') or row.get('option1', ''),
                row.get('Option2') or row.get('option2', ''),
                row.get('Option3') or row.get('option3', ''),
                row.get('Option4') or row.get('option4', '')
            ]
            correct_answer = row.get('Answer') or row.get('answer')
            
        elif format_type == "standard":
            # Standard: question, optionA/option_a, optionB/option_b, etc.
            question_text = row.get('question') or row.get('Question')
            options = [
                row.get('optionA') or row.get('option_a') or row.get('OptionA', ''),
                row.get('optionB') or row.get('option_b') or row.get('OptionB', ''),
                row.get('optionC') or row.get('option_c') or row.get('OptionC', ''),
                row.get('optionD') or row.get('option_d') or row.get('OptionD', '')
            ]
            correct_answer = row.get('correct_answer') or row.get('answer') or row.get('Answer')
            
        elif format_type == "json_options":
            # JSON options: question, options (JSON array), answer
            question_text = row.get('question') or row.get('Question')
            options_str = row.get('options') or row.get('Options', '[]')
            try:
                options = json.loads(options_str)
            except json.JSONDecodeError:
                # Try splitting by comma
                options = [o.strip() for o in options_str.split(',')]
            correct_answer = row.get('answer') or row.get('Answer') or row.get('correct_answer')
            
        elif format_type == "positional":
            # Positional: assume columns are question, opt1, opt2, opt3, opt4, answer
            values = list(row.values())
            if len(values) >= 6:
                question_text = values[0]
                options = values[1:5]
                correct_answer = values[5]
        
        # Validate parsed data
        if not question_text or not question_text.strip():
            print(f"  ⚠️  Row {row_num}: Empty question, skipping")
            return None
            
        options = [str(o).strip() for o in options if o and str(o).strip()]
        if len(options) < 4:
            print(f"  ⚠️  Row {row_num}: Less than 4 options ({len(options)}), skipping")
            return None
            
        if not correct_answer:
            print(f"  ⚠️  Row {row_num}: No correct answer, skipping")
            return None
        
        # Normalize correct answer (handle "A", "B", "C", "D" or full option text)
        correct_answer = str(correct_answer).strip()
        if correct_answer.upper() in ['A', 'B', 'C', 'D']:
            idx = ord(correct_answer.upper()) - ord('A')
            if idx < len(options):
                correct_answer = options[idx]
        
        return {
            "question_text": question_text.strip(),
            "options": options[:4],  # Ensure exactly 4 options
            "correct_answer": correct_answer,
            "category": "aptitude",
            "question_type": "mcq"
        }
        
    except Exception as e:
        print(f"  ❌ Row {row_num}: Error parsing - {str(e)}")
        return None


async def import_questions_from_csv(
    file_path: str,
    category: str = "aptitude",
    skip_duplicates: bool = True
) -> int:
    """Import questions from CSV file into MongoDB QuestionBank"""
    
    print(f"\n📂 Reading CSV file: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return 0
    
    questions_to_insert = []
    existing_questions = set()
    
    # Get existing questions to avoid duplicates
    if skip_duplicates:
        existing = await QuestionBank.find(
            QuestionBank.category == category,
            QuestionBank.question_type == "mcq"
        ).to_list()
        existing_questions = {q.question_text.lower().strip() for q in existing}
        print(f"📊 Found {len(existing_questions)} existing {category} questions in DB")
    
    # Read and parse CSV
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        # Try to detect delimiter
        sample = f.read(2048)
        f.seek(0)
        
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=',;\t|')
        except csv.Error:
            dialect = csv.excel  # Default to comma-separated
        
        reader = csv.DictReader(f, dialect=dialect)
        headers = reader.fieldnames or []
        
        print(f"📋 CSV Headers: {headers}")
        
        format_type = detect_csv_format(headers)
        print(f"🔍 Detected format: {format_type}")
        
        if format_type == "unknown":
            print("⚠️  Unknown CSV format. Will try positional parsing.")
            format_type = "positional"
        
        row_num = 0
        duplicates = 0
        
        for row in reader:
            row_num += 1
            parsed = parse_row(row, format_type, row_num)
            
            if parsed:
                # Check for duplicates
                if skip_duplicates and parsed["question_text"].lower().strip() in existing_questions:
                    duplicates += 1
                    continue
                
                # Override category if specified
                parsed["category"] = category
                questions_to_insert.append(QuestionBank(**parsed))
                existing_questions.add(parsed["question_text"].lower().strip())
    
    print(f"\n📊 Parsing complete:")
    print(f"   - Total rows: {row_num}")
    print(f"   - Valid questions: {len(questions_to_insert)}")
    print(f"   - Duplicates skipped: {duplicates}")
    
    # Insert into database
    if questions_to_insert:
        print(f"\n💾 Inserting {len(questions_to_insert)} questions into MongoDB...")
        await QuestionBank.insert_many(questions_to_insert)
        print(f"✅ Successfully imported {len(questions_to_insert)} questions!")
    else:
        print("⚠️  No new questions to import.")
    
    return len(questions_to_insert)


async def main():
    parser = argparse.ArgumentParser(description='Import aptitude questions from CSV')
    parser.add_argument('--file', '-f', required=True, help='Path to CSV file')
    parser.add_argument('--category', '-c', default='aptitude', help='Question category (default: aptitude)')
    parser.add_argument('--allow-duplicates', action='store_true', help='Allow duplicate questions')
    
    args = parser.parse_args()
    
    print("🚀 Aptitude Question Importer")
    print("=" * 50)
    
    # Connect to database
    print(f"\n🔗 Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGODB_URL)
    await init_beanie(database=client.ai_interview_db, document_models=[QuestionBank])
    print("✅ Connected to MongoDB")
    
    # Import questions
    imported = await import_questions_from_csv(
        args.file,
        category=args.category,
        skip_duplicates=not args.allow_duplicates
    )
    
    # Show final count
    total = await QuestionBank.find(
        QuestionBank.category == args.category,
        QuestionBank.question_type == "mcq"
    ).count()
    
    print(f"\n📈 Total {args.category} MCQs in database: {total}")
    print("\n✨ Import complete!")


if __name__ == "__main__":
    asyncio.run(main())
