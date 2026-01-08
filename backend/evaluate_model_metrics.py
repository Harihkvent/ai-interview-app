"""
Job Matcher Model Evaluation Script
Calculates accuracy, precision, recall, F1-score, and confusion matrix
"""

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score, roc_curve
)
import matplotlib.pyplot as plt
import seaborn as sns
from typing import List, Dict, Tuple
import time
from ml_job_matcher import calculate_hybrid_scores, load_job_database, warmup_models

# Test dataset with labeled ground truth
# Format: (resume_text, expected_job_category, expected_job_titles)
TEST_DATASET = [
    {
        "resume": """
        Senior Data Scientist with 5 years of experience in machine learning and deep learning.
        Expert in Python, TensorFlow, PyTorch, scikit-learn, pandas, and numpy.
        Built recommendation systems and NLP models. Strong background in statistics and mathematics.
        Experience with AWS, Docker, and MLOps practices.
        """,
        "expected_category": "Data Science",
        "expected_titles": ["Data Scientist", "Machine Learning Engineer", "AI Engineer", "ML Researcher"],
        "expected_skills": ["python", "tensorflow", "pytorch", "machine learning", "deep learning"]
    },
    {
        "resume": """
        Full Stack Developer with 4 years of experience building web applications.
        Proficient in React, Node.js, Express, MongoDB, and PostgreSQL.
        Experience with TypeScript, JavaScript, HTML, CSS, and REST APIs.
        Worked on microservices architecture and deployed applications on AWS.
        """,
        "expected_category": "Software Engineering",
        "expected_titles": ["Full Stack Developer", "Software Engineer", "Web Developer", "Backend Developer"],
        "expected_skills": ["react", "node.js", "javascript", "mongodb", "postgresql"]
    },
    {
        "resume": """
        DevOps Engineer with 3 years of experience in cloud infrastructure and automation.
        Expert in Docker, Kubernetes, AWS, Azure, Terraform, and Jenkins.
        Strong knowledge of CI/CD pipelines, monitoring, and infrastructure as code.
        Experience with Python scripting and Linux system administration.
        """,
        "expected_category": "DevOps",
        "expected_titles": ["DevOps Engineer", "Cloud Engineer", "Site Reliability Engineer", "Infrastructure Engineer"],
        "expected_skills": ["docker", "kubernetes", "aws", "ci/cd", "devops"]
    },
    {
        "resume": """
        Frontend Developer specializing in React and modern JavaScript frameworks.
        5 years of experience building responsive web applications with React, Redux, and TypeScript.
        Strong skills in HTML5, CSS3, SASS, and modern UI/UX design principles.
        Experience with Next.js, Vue.js, and mobile-responsive design.
        """,
        "expected_category": "Frontend Development",
        "expected_titles": ["Frontend Developer", "React Developer", "UI Developer", "JavaScript Developer"],
        "expected_skills": ["react", "javascript", "typescript", "html", "css"]
    },
    {
        "resume": """
        Mobile App Developer with expertise in iOS and Android development.
        4 years of experience building native apps with Swift and Kotlin.
        Also experienced in React Native and Flutter for cross-platform development.
        Published multiple apps on App Store and Google Play with 100k+ downloads.
        """,
        "expected_category": "Mobile Development",
        "expected_titles": ["Mobile Developer", "iOS Developer", "Android Developer", "App Developer"],
        "expected_skills": ["ios", "android", "swift", "kotlin", "react native"]
    },
    {
        "resume": """
        Backend Java Developer with 6 years of enterprise application development.
        Expert in Java, Spring Boot, Hibernate, and microservices architecture.
        Strong experience with MySQL, PostgreSQL, Redis, and message queues.
        Built scalable REST APIs and worked with Agile methodologies.
        """,
        "expected_category": "Backend Development",
        "expected_titles": ["Java Developer", "Backend Developer", "Software Engineer", "Spring Developer"],
        "expected_skills": ["java", "spring boot", "hibernate", "sql", "microservices"]
    },
    {
        "resume": """
        Data Analyst with strong skills in SQL, Python, and data visualization.
        3 years of experience analyzing business data and creating dashboards.
        Proficient in Tableau, Power BI, Excel, and statistical analysis.
        Experience with pandas, numpy, and data cleaning techniques.
        """,
        "expected_category": "Data Analytics",
        "expected_titles": ["Data Analyst", "Business Analyst", "Analytics Engineer", "BI Analyst"],
        "expected_skills": ["sql", "python", "tableau", "power bi", "excel"]
    },
    {
        "resume": """
        Cloud Architect with 7 years of experience designing scalable cloud solutions.
        Expert in AWS, Azure, and GCP with multiple cloud certifications.
        Strong knowledge of serverless architecture, Lambda, S3, EC2, and cloud security.
        Experience leading cloud migration projects and cost optimization.
        """,
        "expected_category": "Cloud Architecture",
        "expected_titles": ["Cloud Architect", "Solutions Architect", "Cloud Engineer", "AWS Architect"],
        "expected_skills": ["aws", "azure", "gcp", "cloud"]
    },
]


def calculate_match_accuracy(predictions: List[Dict], ground_truth: Dict) -> Dict:
    """
    Calculate if the model correctly identified relevant job matches
    
    Returns:
        Dictionary with binary classification metrics
    """
    # Check if any of the top predictions match expected titles
    predicted_titles = [match['job_title'].lower() for match in predictions[:5]]
    expected_titles = [title.lower() for title in ground_truth['expected_titles']]
    
    # Check for skill overlap
    predicted_skills = set()
    for match in predictions[:3]:
        predicted_skills.update([s.lower() for s in match.get('matched_skills', [])])
    
    expected_skills = set([s.lower() for s in ground_truth['expected_skills']])
    
    # Calculate metrics
    title_match = any(
        any(exp_title in pred_title or pred_title in exp_title 
            for exp_title in expected_titles)
        for pred_title in predicted_titles
    )
    
    skill_overlap = len(predicted_skills & expected_skills) / len(expected_skills) if expected_skills else 0
    
    return {
        'title_match': title_match,
        'skill_overlap_ratio': skill_overlap,
        'top_match_score': predictions[0]['match_percentage'] if predictions else 0,
        'avg_top5_score': np.mean([p['match_percentage'] for p in predictions[:5]]) if predictions else 0
    }


def evaluate_model_performance(test_data: List[Dict] = None) -> Dict:
    """
    Comprehensive model evaluation
    
    Returns:
        Dictionary containing all evaluation metrics
    """
    if test_data is None:
        test_data = TEST_DATASET
    
    print("=" * 80)
    print("🧪 JOB MATCHER MODEL EVALUATION")
    print("=" * 80)
    
    # Warm up models
    print("\n🔥 Warming up models...")
    warmup_models()
    
    results = []
    y_true = []  # Binary: 1 if correct match, 0 otherwise
    y_pred = []  # Binary predictions
    y_scores = []  # Confidence scores
    
    total_time = 0
    
    print(f"\n📊 Testing on {len(test_data)} resume samples...\n")
    
    for idx, test_case in enumerate(test_data, 1):
        print(f"Test Case {idx}/{len(test_data)}: {test_case['expected_category']}")
        print("-" * 60)
        
        # Time the prediction
        start_time = time.time()
        predictions = calculate_hybrid_scores(test_case['resume'], top_n=10)
        elapsed_time = time.time() - start_time
        total_time += elapsed_time
        
        # Calculate accuracy metrics
        metrics = calculate_match_accuracy(predictions, test_case)
        
        # Binary classification: correct if title matches OR skill overlap > 60%
        is_correct = metrics['title_match'] or metrics['skill_overlap_ratio'] >= 0.6
        confidence = metrics['top_match_score'] / 100.0
        
        y_true.append(1)  # All test cases should find correct matches
        y_pred.append(1 if is_correct else 0)
        y_scores.append(confidence)
        
        results.append({
            'test_case': idx,
            'category': test_case['expected_category'],
            'title_match': metrics['title_match'],
            'skill_overlap': metrics['skill_overlap_ratio'],
            'top_score': metrics['top_match_score'],
            'avg_score': metrics['avg_top5_score'],
            'is_correct': is_correct,
            'time_seconds': elapsed_time,
            'top_prediction': predictions[0]['job_title'] if predictions else 'None'
        })
        
        # Print results
        print(f"  ✓ Title Match: {metrics['title_match']}")
        print(f"  ✓ Skill Overlap: {metrics['skill_overlap_ratio']:.1%}")
        print(f"  ✓ Top Match: {predictions[0]['job_title']} ({metrics['top_match_score']:.1f}%)")
        print(f"  ✓ Correct: {'YES ✅' if is_correct else 'NO ❌'}")
        print(f"  ✓ Time: {elapsed_time:.2f}s\n")
    
    # Calculate overall metrics
    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    
    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    
    # Additional metrics
    avg_time = total_time / len(test_data)
    avg_top_score = np.mean([r['top_score'] for r in results])
    avg_skill_overlap = np.mean([r['skill_overlap'] for r in results])
    
    print("\n" + "=" * 80)
    print("📈 EVALUATION RESULTS")
    print("=" * 80)
    print(f"\n🎯 Classification Metrics:")
    print(f"  • Accuracy:  {accuracy:.2%}")
    print(f"  • Precision: {precision:.2%}")
    print(f"  • Recall:    {recall:.2%}")
    print(f"  • F1-Score:  {f1:.2%}")
    
    print(f"\n📊 Performance Metrics:")
    print(f"  • Average Match Score:    {avg_top_score:.2f}%")
    print(f"  • Average Skill Overlap:  {avg_skill_overlap:.1%}")
    print(f"  • Average Response Time:  {avg_time:.2f}s")
    print(f"  • Total Evaluation Time:  {total_time:.2f}s")
    
    print(f"\n🔢 Confusion Matrix:")
    print(f"  True Positives (TP):  {cm[1][1] if cm.shape[0] > 1 else 0}")
    print(f"  False Positives (FP): {cm[0][1] if cm.shape[0] > 1 else 0}")
    print(f"  True Negatives (TN):  {cm[0][0] if cm.shape[0] > 1 else 0}")
    print(f"  False Negatives (FN): {cm[1][0] if cm.shape[0] > 1 else 0}")
    
    # Detailed results table
    print(f"\n📋 Detailed Results:")
    df_results = pd.DataFrame(results)
    print(df_results.to_string(index=False))
    
    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'confusion_matrix': cm,
        'avg_match_score': avg_top_score,
        'avg_skill_overlap': avg_skill_overlap,
        'avg_response_time': avg_time,
        'total_time': total_time,
        'detailed_results': results,
        'y_true': y_true,
        'y_pred': y_pred,
        'y_scores': y_scores
    }


def plot_evaluation_metrics(evaluation_results: Dict, save_path: str = 'model_evaluation.png'):
    """
    Create visualization of evaluation metrics
    """
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle('Job Matcher Model Evaluation', fontsize=16, fontweight='bold')
    
    # 1. Confusion Matrix
    cm = evaluation_results['confusion_matrix']
    
    # Handle single-class case (all correct or all incorrect)
    if cm.shape == (1, 1):
        # Create a 2x2 matrix with zeros for missing class
        cm_display = np.zeros((2, 2), dtype=int)
        if len(evaluation_results['y_true']) > 0 and evaluation_results['y_true'][0] == 1:
            cm_display[1, 1] = cm[0, 0]  # All true positives
        else:
            cm_display[0, 0] = cm[0, 0]  # All true negatives
        cm = cm_display
    
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[0, 0],
                xticklabels=['Incorrect', 'Correct'],
                yticklabels=['Incorrect', 'Correct'])
    axes[0, 0].set_title('Confusion Matrix')
    axes[0, 0].set_ylabel('True Label')
    axes[0, 0].set_xlabel('Predicted Label')
    
    # 2. Metrics Bar Chart
    metrics = {
        'Accuracy': evaluation_results['accuracy'],
        'Precision': evaluation_results['precision'],
        'Recall': evaluation_results['recall'],
        'F1-Score': evaluation_results['f1_score']
    }
    bars = axes[0, 1].bar(metrics.keys(), metrics.values(), color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'])
    axes[0, 1].set_title('Classification Metrics')
    axes[0, 1].set_ylabel('Score')
    axes[0, 1].set_ylim([0, 1.1])
    axes[0, 1].axhline(y=0.8, color='r', linestyle='--', alpha=0.3, label='80% threshold')
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        axes[0, 1].text(bar.get_x() + bar.get_width()/2., height,
                       f'{height:.2%}', ha='center', va='bottom')
    
    # 3. Match Scores Distribution
    results = evaluation_results['detailed_results']
    match_scores = [r['top_score'] for r in results]
    axes[1, 0].hist(match_scores, bins=10, color='skyblue', edgecolor='black', alpha=0.7)
    axes[1, 0].axvline(x=np.mean(match_scores), color='red', linestyle='--', 
                       label=f'Mean: {np.mean(match_scores):.1f}%')
    axes[1, 0].set_title('Top Match Score Distribution')
    axes[1, 0].set_xlabel('Match Score (%)')
    axes[1, 0].set_ylabel('Frequency')
    axes[1, 0].legend()
    
    # 4. Response Time Analysis
    response_times = [r['time_seconds'] for r in results]
    categories = [r['category'] for r in results]
    axes[1, 1].barh(range(len(categories)), response_times, color='lightgreen', edgecolor='black')
    axes[1, 1].set_yticks(range(len(categories)))
    axes[1, 1].set_yticklabels(categories, fontsize=8)
    axes[1, 1].set_title('Response Time by Test Case')
    axes[1, 1].set_xlabel('Time (seconds)')
    axes[1, 1].axvline(x=np.mean(response_times), color='red', linestyle='--',
                      label=f'Avg: {np.mean(response_times):.2f}s')
    axes[1, 1].legend()
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"\n📊 Visualization saved to: {save_path}")
    plt.close()


def generate_classification_report(evaluation_results: Dict):
    """
    Generate detailed classification report
    """
    print("\n" + "=" * 80)
    print("📄 DETAILED CLASSIFICATION REPORT")
    print("=" * 80)
    
    y_true = evaluation_results['y_true']
    y_pred = evaluation_results['y_pred']
    
    # Check if we have both classes
    unique_labels = list(set(y_true + y_pred))
    if len(unique_labels) == 1:
        print(f"\nNote: All predictions belong to class {unique_labels[0]}")
        print("Classification report requires at least 2 classes for meaningful metrics.\n")
    else:
        report = classification_report(y_true, y_pred, 
                                       target_names=['Incorrect Match', 'Correct Match'],
                                       zero_division=0)
        print(report)
    
    # Per-category analysis
    print("\n📊 Per-Category Analysis:")
    print("-" * 80)
    results_df = pd.DataFrame(evaluation_results['detailed_results'])
    category_stats = results_df.groupby('category').agg({
        'is_correct': 'mean',
        'top_score': 'mean',
        'skill_overlap': 'mean',
        'time_seconds': 'mean'
    }).round(3)
    
    category_stats.columns = ['Accuracy', 'Avg Match Score', 'Avg Skill Overlap', 'Avg Time (s)']
    print(category_stats.to_string())


if __name__ == "__main__":
    # Run evaluation
    results = evaluate_model_performance()
    
    # Generate visualizations
    plot_evaluation_metrics(results, save_path='backend/model_evaluation.png')
    
    # Generate detailed report
    generate_classification_report(results)
    
    print("\n" + "=" * 80)
    print("✅ EVALUATION COMPLETE!")
    print("=" * 80)
    print(f"\n💡 Summary:")
    print(f"  • Model Accuracy: {results['accuracy']:.1%}")
    print(f"  • Average Match Quality: {results['avg_match_score']:.1f}%")
    print(f"  • Average Response Time: {results['avg_response_time']:.2f}s")
    print(f"\n📁 Results saved to: backend/model_evaluation.png")
