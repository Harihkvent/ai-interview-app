import asyncio
import pandas as pd
import numpy as np
from ml_job_matcher import calculate_hybrid_scores, load_job_database, warmup_models
import time
from typing import List, Dict

# Define Benchmark Test Cases
# Format: (Resume Text, Expected Job Title keywords for success)
TEST_CASES = [
    {
        "name": "Flutter Developer",
        "resume": "Experienced Mobile App Developer with 3 years of experience in Flutter, Dart, and Firebase. Built multiple cross-platform apps for iOS and Android. Strong knowledge of state management using Provider and Riverpod.",
        "expected": ["Flutter", "Mobile", "Cross-platform"]
    },
    {
        "name": "Django Developer",
        "resume": "Backend Engineer proficient in Python and Django framework. Experienced in building RESTful APIs using Django Rest Framework (DRF). Knowledge of PostgreSQL, Redis, and Celery. Familiar with Docker and AWS deployment.",
        "expected": ["Django", "Python", "Backend"]
    },
    {
        "name": "Machine Learning Engineer",
        "resume": "Data Scientist with a focus on Deep Learning and Computer Vision. Expertise in TensorFlow, PyTorch, and OpenCV. Experience in training CNNs and Transformers for image classification and NLP tasks. Proficient in Python and Scikit-learn.",
        "expected": ["Machine Learning", "Data Scientist", "AI"]
    },
    {
        "name": "DevOps Engineer",
        "resume": "DevOps professional with expertise in CI/CD pipelines, Kubernetes, and Docker. Strong experience in Infrastructure as Code (IaC) using Terraform and Ansible. Proficient in AWS, monitoring with Prometheus/Grafana, and Shell scripting.",
        "expected": ["DevOps", "Infrastructure", "SRE", "Cloud"]
    },
    {
        "name": "Java Developer",
        "resume": "Software Engineer with 5 years of experience in Java, Spring Boot, and Microservices architecture. Strong understanding of OOP principles, Hibernate, and SQL databases. Experienced in building scalable enterprise applications.",
        "expected": ["Java", "Spring", "Enterprise"]
    },
    {
        "name": "React Frontend Developer",
        "resume": "Frontend Developer specializing in React.js and modern JavaScript. Experience with Redux toolkit, Tailwind CSS, and TypeScript. Passionate about building responsive and performant user interfaces.",
        "expected": ["React", "Frontend", "JavaScript", "Web"]
    }
]

def is_match(actual_title: str, expected_keywords: List[str]) -> bool:
    """Check if the actual title contains any of the expected keywords (case-insensitive)"""
    actual_lower = actual_title.lower()
    return any(keyword.lower() in actual_lower for keyword in expected_keywords)

async def evaluate_model():
    print("🚀 Starting ML Model Evaluation...")
    
    # Warm up models
    warmup_models()
    
    results = []
    start_time = time.time()
    
    for i, case in enumerate(TEST_CASES, 1):
        print(f"\n[{i}/{len(TEST_CASES)}] Evaluating: {case['name']}")
        
        # Calculate scores
        matches = calculate_hybrid_scores(case['resume'], top_n=10)
        
        # Find if expected is in top N
        found_at_rank = -1
        for rank, match in enumerate(matches, 1):
            if is_match(match['job_title'], case['expected']):
                found_at_rank = rank
                break
        
        results.append({
            "name": case['name'],
            "found_at_rank": found_at_rank,
            "top_match_title": matches[0]['job_title'] if matches else "No Match",
            "top_match_score": matches[0]['match_percentage'] if matches else 0
        })
        
        if found_at_rank > 0:
            print(f"✅ Found at rank {found_at_rank}: {matches[found_at_rank-1]['job_title']} ({matches[found_at_rank-1]['match_percentage']}%)")
        else:
            print(f"❌ Not found in top 10. Top match was: {matches[0]['job_title']}")

    total_time = time.time() - start_time
    
    # Calculate Base Metrics
    total_cases = len(TEST_CASES)
    top_1_hits = sum(1 for r in results if r['found_at_rank'] == 1)
    top_3_hits = sum(1 for r in results if 1 <= r['found_at_rank'] <= 3)
    top_5_hits = sum(1 for r in results if 1 <= r['found_at_rank'] <= 5)
    mrr = sum((1.0 / r['found_at_rank']) if r['found_at_rank'] > 0 else 0 for r in results) / total_cases
    avg_score = sum(r['top_match_score'] for r in results) / total_cases

    # Calculate Traditional Metrics (Top-1 based)
    # Since each query corresponds to one true class, we can treat this as a multiclass classification.
    # Accuracy = TP / Total
    accuracy = top_1_hits / total_cases
    
    # In this specific benchmark where each query has 1 ground truth and we take 1 prediction:
    # Precision, Recall and F1 (Micro) are all equal to Accuracy.
    # Let's calculate Macro Metrics for better depth.
    
    class_metrics = {}
    for case in TEST_CASES:
        name = case['name']
        # TP: Found correctly as #1
        tp = 1 if any(r['name'] == name and r['found_at_rank'] == 1 for r in results) else 0
        # FP: Some other case predicted this class as #1
        fp = sum(1 for r in results if r['name'] != name and is_match(r['top_match_title'], case['expected']))
        # FN: This case did NOT predict its own class as #1
        fn = 1 - tp
        
        p = tp / (tp + fp) if (tp + fp) > 0 else 0
        r = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * p * r / (p + r) if (p + r) > 0 else 0
        
        class_metrics[name] = {"precision": p, "recall": r, "f1": f1}
    
    macro_precision = sum(m['precision'] for m in class_metrics.values()) / total_cases
    macro_recall = sum(m['recall'] for m in class_metrics.values()) / total_cases
    macro_f1 = sum(m['f1'] for m in class_metrics.values()) / total_cases

    with open("evaluation_report.txt", "w", encoding="utf-8") as f:
        def log(msg):
            print(msg)
            f.write(msg + "\n")

        log("\n" + "="*50)
        log("      📊 ML MODEL PERFORMANCE SUMMARY")
        log("="*50)
        log(f"Total Test Cases:   {total_cases}")
        log(f"Evaluation Time:    {total_time:.2f} seconds")
        log("-" * 50)
        log(f"Top-1 Accuracy:     {accuracy:.2%}")
        log(f"Hit@3 Rate:         {top_3_hits/total_cases:.2%}")
        log(f"Hit@5 Rate:         {top_5_hits/total_cases:.2%}")
        log(f"MRR Score:          {mrr:.4f}")
        log("-" * 50)
        log("      📈 TRADITIONAL METRICS (Top-1)")
        log("-" * 50)
        log(f"Macro Precision:    {macro_precision:.2%}")
        log(f"Macro Recall:       {macro_recall:.2%}")
        log(f"Macro F1-Score:     {macro_f1:.2%}")
        log(f"Avg Top Match %:    {avg_score:.2f}%")
        log("="*50)

        # Detailed Results Table
        log("\nDetailed breakdown:")
        log(f"{'Test Case':<25} | {'Rank':<5} | {'Match Score':<12} | {'Top Match Title'}")
        log("-" * 80)
        for r in results:
            rank_str = str(r['found_at_rank']) if r['found_at_rank'] > 0 else "N/A"
            log(f"{r['name']:<25} | {rank_str:<5} | {r['top_match_score']:>11.2f}% | {r['top_match_title']}")

        # Per-class Metrics
        log("\nPer-class Traditional Metrics:")
        log(f"{'Class':<25} | {'Prec.':<7} | {'Recall':<7} | {'F1-Score'}")
        log("-" * 55)
        for name, m in class_metrics.items():
            log(f"{name:<25} | {m['precision']:>6.2%} | {m['recall']:>6.2%} | {m['f1']:>8.2%}")

    print("\n✅ Evaluation complete. Full report saved to evaluation_report.txt")

if __name__ == "__main__":
    asyncio.run(evaluate_model())
