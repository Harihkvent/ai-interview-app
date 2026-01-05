import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

interface TestResults {
    test_name: string;
    score: number;
    passed: boolean;
    proficiency_level: string;
    correct_answers: number;
    total_questions: number;
    time_taken: number;
    recommendations: string[];
    detailed_answers: Array<{
        question_text: string;
        user_answer: string;
        correct_answer: string;
        is_correct: boolean;
        explanation: string;
        time_taken: number;
    }>;
}

export const SkillTestResults: React.FC = () => {
    const { attemptId } = useParams<{ attemptId: string }>();
    const navigate = useNavigate();
    const [results, setResults] = useState<TestResults | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadResults();
    }, [attemptId]);

    const loadResults = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const response = await axios.get(
                `${API_BASE_URL}/api/skill-tests/attempts/${attemptId}/results`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setResults(response.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load results');
            console.error('Error loading results:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 flex items-center justify-center">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4 animate-pulse">📊</div>
                    <p className="text-xl text-gray-300">Loading results...</p>
                </div>
            </div>
        );
    }

    if (error || !results) {
        return (
            <div className="p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="glass-card p-8 text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <p className="text-xl text-red-400 mb-4">{error || 'No results found'}</p>
                        <button onClick={() => navigate('/skill-tests')} className="btn-primary">
                            Back to Tests
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const scoreColor = results.passed ? 'text-green-400' : 'text-red-400';
    const scoreIcon = results.passed ? '✅' : '❌';

    return (
        <div className="p-4">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="glass-card p-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/skill-tests')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <span>←</span>
                        <span>Back to Tests</span>
                    </button>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                        📊 Test Results
                    </h2>
                    <div className="w-32"></div>
                </div>

                {/* Score Card */}
                <div className="glass-card p-8 text-center">
                    <div className="text-8xl mb-4">{scoreIcon}</div>
                    <h3 className="text-3xl font-bold mb-2">{results.test_name}</h3>
                    <div className={`text-6xl font-bold mb-4 ${scoreColor}`}>
                        {results.score.toFixed(1)}%
                    </div>
                    <p className="text-xl text-gray-300 mb-2">
                        {results.passed ? 'Congratulations! You passed!' : 'Keep practicing!'}
                    </p>
                    <p className="text-gray-400">
                        Proficiency Level: <span className="text-primary-400 font-bold capitalize">{results.proficiency_level}</span>
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-6 text-center">
                        <div className="text-4xl mb-2">✓</div>
                        <div className="text-3xl font-bold text-green-400">{results.correct_answers}</div>
                        <div className="text-sm text-gray-400">Correct Answers</div>
                    </div>
                    <div className="glass-card p-6 text-center">
                        <div className="text-4xl mb-2">📝</div>
                        <div className="text-3xl font-bold text-white">{results.total_questions}</div>
                        <div className="text-sm text-gray-400">Total Questions</div>
                    </div>
                    <div className="glass-card p-6 text-center">
                        <div className="text-4xl mb-2">⏱️</div>
                        <div className="text-3xl font-bold text-purple-400">
                            {Math.floor(results.time_taken / 60)}:{(results.time_taken % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="text-sm text-gray-400">Time Taken</div>
                    </div>
                </div>

                {/* Recommendations */}
                {results.recommendations && results.recommendations.length > 0 && (
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span>💡</span>
                            <span>Recommendations</span>
                        </h3>
                        <div className="space-y-2">
                            {results.recommendations.map((rec, index) => (
                                <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                    <p className="text-gray-300">{rec}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Detailed Answers */}
                {results.detailed_answers && results.detailed_answers.length > 0 && (
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold mb-4">Question Review</h3>
                        <div className="space-y-4">
                            {results.detailed_answers.map((answer, index) => (
                                <div
                                    key={index}
                                    className={`border-2 rounded-lg p-4 ${
                                        answer.is_correct
                                            ? 'border-green-500/30 bg-green-500/5'
                                            : 'border-red-500/30 bg-red-500/5'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-bold text-lg">Question {index + 1}</h4>
                                        <span className={`text-2xl ${answer.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                                            {answer.is_correct ? '✓' : '✗'}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 mb-3">{answer.question_text}</p>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-gray-400">Your Answer: </span>
                                            <span className={answer.is_correct ? 'text-green-400' : 'text-red-400'}>
                                                {answer.user_answer}
                                            </span>
                                        </div>
                                        {!answer.is_correct && (
                                            <div>
                                                <span className="text-gray-400">Correct Answer: </span>
                                                <span className="text-green-400">{answer.correct_answer}</span>
                                            </div>
                                        )}
                                        {answer.explanation && (
                                            <div className="mt-2 p-3 bg-white/5 rounded-lg">
                                                <span className="text-gray-400">Explanation: </span>
                                                <span className="text-gray-300">{answer.explanation}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="glass-card p-6">
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/skill-tests')}
                            className="btn-primary flex-1"
                        >
                            Take Another Test
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
