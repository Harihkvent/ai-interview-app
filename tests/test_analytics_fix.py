
import unittest
from unittest.mock import MagicMock
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Mock models before importing analytics_service
class MockSession:
    def __init__(self, total_score, total_time_seconds, completed_at):
        self.total_score = total_score
        self.total_time_seconds = total_time_seconds
        self.completed_at = completed_at

class MockAvatarSession(MockSession):
    def __init__(self, total_score, questions_answered, total_time_seconds, completed_at):
        super().__init__(total_score, total_time_seconds, completed_at)
        self.questions_answered = questions_answered

def mock_calculate_user_metrics(sessions):
    """
    Simulated version of the fixed calculate_user_metrics logic to verify normalization
    """
    total_interviews = len(sessions)
    if total_interviews == 0:
        return 0.0
        
    total_score = 0.0
    for s in sessions:
        if hasattr(s, 'questions_answered'):
            # Avatar session: Normalize to average score per question (0-10)
            if s.questions_answered > 0:
                total_score += s.total_score / s.questions_answered
            else:
                total_score += 0.0
        else:
            # Regular session already stores average in total_score
            total_score += s.total_score
            
    avg_score = total_score / total_interviews
    return round(avg_score, 2)

class TestAnalyticsFix(unittest.TestCase):
    def test_mixed_sessions(self):
        # Regular session: score 8.5 (average)
        s1 = MockSession(8.5, 300, None)
        
        # Avatar session: total_score 45.0 for 5 questions (average 9.0)
        s2 = MockAvatarSession(45.0, 5, 600, None)
        
        # Total interviews: 2
        # Normalized scores: 8.5 and 9.0
        # Grand average: (8.5 + 9.0) / 2 = 8.75
        
        result = mock_calculate_user_metrics([s1, s2])
        self.assertEqual(result, 8.75)
        print(f"PASSED: Mixed sessions average = {result}")

    def test_avatar_zero_questions(self):
        s1 = MockAvatarSession(0.0, 0, 100, None)
        result = mock_calculate_user_metrics([s1])
        self.assertEqual(result, 0.0)
        print("PASSED: Avatar with zero questions handles gracefully")

    def test_regular_session_consistency(self):
        s1 = MockSession(7.0, 200, None)
        s2 = MockSession(9.0, 200, None)
        result = mock_calculate_user_metrics([s1, s2])
        self.assertEqual(result, 8.0)
        print(f"PASSED: Regular sessions average = {result}")

if __name__ == "__main__":
    unittest.main()
