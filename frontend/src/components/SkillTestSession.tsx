import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';
import { useConfirmDialog } from './ConfirmDialog';

const API_BASE_URL = 'http://localhost:8000';

interface Question {
    question_id: string;
    question_text: string;
    question_type: string;
    options?: string[];
    question_number: number;
}

export const SkillTestSession: React.FC = () => {
    const { attemptId } = useParams<{ attemptId: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [answer, setAnswer] = useState('');
    const [questionNumber, setQuestionNumber] = useState(1);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [startTime, setStartTime] = useState(Date.now());
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Load initial question from the start response
    useEffect(() => {
        const loadInitialQuestion = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                // The attemptId in the URL is actually from the start response
                // We need to get the test session details
                const response = await axios.get(
                    `${API_BASE_URL}/api/skill-tests/attempts/${attemptId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                
                if (response.data.current_question) {
                    setCurrentQuestion(response.data.current_question);
                    setQuestionNumber(response.data.current_question.question_number);
                    setTotalQuestions(response.data.total_questions || 0);
                }
            } catch (err) {
                console.error('Error loading initial question:', err);
                showToast('Failed to load test. Please try again.', 'error');
                navigate('/skill-tests');
            } finally {
                setInitialLoading(false);
            }
        };

        if (attemptId) {
            loadInitialQuestion();
        }
    }, [attemptId, navigate]);

    const handleSubmitAnswer = async () => {
        if (!answer.trim() || !currentQuestion) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const timeTaken = Math.floor((Date.now() - startTime) / 1000);

            const response = await axios.post(
                `${API_BASE_URL}/api/skill-tests/attempts/${attemptId}/answer`,
                {
                    question_id: currentQuestion.question_id,
                    answer: answer,
                    time_taken: timeTaken
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.next_question) {
                setCurrentQuestion(response.data.next_question);
                setQuestionNumber(response.data.next_question.question_number);
                setAnswer('');
                setStartTime(Date.now());
            } else {
                // Test completed
                handleCompleteTest();
            }
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to submit answer', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSkipQuestion = async () => {
        if (!currentQuestion) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');

            const response = await axios.post(
                `${API_BASE_URL}/api/skill-tests/attempts/${attemptId}/skip`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.next_question) {
                setCurrentQuestion(response.data.next_question);
                setQuestionNumber(response.data.next_question.question_number);
                setAnswer('');
                setStartTime(Date.now());
            } else {
                // Test completed
                handleCompleteTest();
            }
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to skip question', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTest = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            await axios.post(
                `${API_BASE_URL}/api/skill-tests/attempts/${attemptId}/complete`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            navigate(`/skill-tests/results/${attemptId}`);
        } catch (err: any) {
            showToast(err.response?.data?.detail || 'Failed to complete test', 'error');
        }
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 flex items-center justify-center">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4 animate-pulse">📝</div>
                    <p className="text-xl text-gray-300">Loading question...</p>
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="glass-card p-8 text-center">
                        <div className="text-6xl mb-4 animate-pulse">📝</div>
                        <p className="text-xl text-gray-300">Loading question...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                            Question {questionNumber} of {totalQuestions || '...'}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-400">
                                Time: {Math.floor((Date.now() - startTime) / 1000)}s
                            </div>
                        </div>
                    </div>
                    <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-primary-500 to-purple-500 h-2 rounded-full transition-all"
                            style={{ width: `${totalQuestions ? (questionNumber / totalQuestions) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>

                {/* Question */}
                <div className="glass-card p-8">
                    <h3 className="text-2xl font-bold mb-6">{currentQuestion.question_text}</h3>

                    {currentQuestion.question_type === 'mcq' && currentQuestion.options ? (
                        <div className="space-y-3">
                            {currentQuestion.options.map((option, index) => (
                                <label
                                    key={index}
                                    className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                        answer === option
                                            ? 'border-primary-400 bg-primary-400/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="answer"
                                        value={option}
                                        checked={answer === option}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        className="mr-3"
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            rows={8}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-primary-400 focus:outline-none resize-none"
                        />
                    )}

                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={handleSubmitAnswer}
                            disabled={!answer.trim() || loading}
                            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Submitting...' : 'Submit Answer'}
                        </button>
                        <button
                            onClick={handleSkipQuestion}
                            disabled={loading}
                            className="px-6 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Skip
                        </button>
                        <button
                            onClick={async () => {
                                const confirmed = await confirm(
                                    'Exit Test',
                                    'Are you sure you want to exit? Your progress will be lost.',
                                    { confirmLabel: 'Exit', variant: 'warning' }
                                );
                                if (confirmed) {
                                    navigate('/skill-tests');
                                }
                            }}
                            className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-lg transition-colors"
                        >
                            Exit
                        </button>
                    </div>
                </div>
            </div>
            <ConfirmDialogComponent />
        </div>
    );
};
